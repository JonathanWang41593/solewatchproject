/* ============================================================================
   SoleWatch -- Single-Foot Research Firmware  (Rev A: breadboard prototype)
   Target: ESP32 Dev Module (Arduino core 3.x)
   Sensors per board: 4x FSR402 (analog) + 1x MLX90614 (I2C)
   ============================================================================
   RESEARCH-INSTRUMENT FRAMING -- READ BEFORE FLASHING OR TESTING ON A PERSON
   ----------------------------------------------------------------------------
   This firmware is an engineering research instrument for studying plantar
   pressure/temperature sensing, filtering, and statistical baselining. It is
   NOT a certified medical device and does not diagnose, predict, or rule out
   any medical condition. The "FLAG" state below means "this reading is a
   statistical outlier relative to this specific wearer's own logged data" --
   nothing more. Do not use FLAG/no-FLAG output to make any real health,
   footwear, or treatment decision. See the companion guide, Part 9 and
   Part 10, before testing this on any person, including a family member.
   ============================================================================ */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <WiFi.h>
#include <esp_now.h>
#include <string.h>
#include <math.h>

/* ---------------------------------------------------------------------------
   1. BOARD ROLE
   Flash the exact same file to both boards, changing only this one line.
   SATELLITE  = worn on one foot, samples locally and radios its frame to the
                coordinator every loop. Does not evaluate alerts itself.
   COORDINATOR = worn on the other foot, pairs its own local frame with the
                freshest satellite frame to compute side-to-side asymmetry.
   Running a single board on its own (no peer) still gives you full local
   filtering, baselining, and single-foot statistical flagging -- the
   bilateral comparison simply stays idle until a peer frame arrives.
--------------------------------------------------------------------------- */
#define ROLE_SATELLITE   0
#define ROLE_COORDINATOR 1
#define THIS_BOARD_ROLE  ROLE_COORDINATOR   /* <-- change to ROLE_SATELLITE on the other board */

/* ---------------------------------------------------------------------------
   2. HARDWARE PIN MAP
   Matches the GPIO choices already used elsewhere in this project (Part 3).
   All four FSR pins are ADC1-capable, so Wi-Fi/ESP-NOW radio use does not
   disturb analog sampling (ADC2 shares hardware with the radio on ESP32).
--------------------------------------------------------------------------- */
const uint8_t NUM_SITES = 4;
const uint8_t FSR_PIN[NUM_SITES]        = {32, 33, 34, 35};
const char *const SITE_NAME[NUM_SITES]  = {"Heel", "1st_Metatarsal", "5th_Metatarsal", "Hallux"};

const uint8_t I2C_SDA_PIN   = 21;
const uint8_t I2C_SCL_PIN   = 22;

const uint8_t LED_GREEN_PIN  = 16;   /* acquisition active, no flag */
const uint8_t LED_YELLOW_PIN = 17;   /* calibration in progress */
const uint8_t LED_RED_PIN    = 18;   /* statistical/engineering flag active */
const uint8_t BUZZER_PIN     = 27;   /* passive piezo, driven with tone() */

/* ---------------------------------------------------------------------------
   3. ELECTRICAL CONSTANTS  (see Part 4.1 for the sensitivity derivation)
--------------------------------------------------------------------------- */
const float SUPPLY_VOLTAGE = 3.3f;      /* ESP32 logic rail -- never use 5 V on these ADC pins */
const float ADC_MAX_COUNTS = 4095.0f;   /* ESP32 SAR ADC is 12-bit (0-4095), NOT 10-bit like an AVR Nano */
const float R_FIXED_OHMS   = 10000.0f;  /* fixed divider resistor -- see Part 4.1 on choosing this value */

/* ---------------------------------------------------------------------------
   4. DISCRETE MOVING-AVERAGE FILTER  (Part 4.3)
   Divides by the number of samples actually collected so far, not always by
   FILTER_WINDOW -- this removes the "ramps up from zero" startup transient
   that a naive fixed-divisor circular buffer produces during its first
   FILTER_WINDOW samples.
--------------------------------------------------------------------------- */
const uint8_t FILTER_WINDOW = 10;

class MovingAverageFilter {
  public:
    void reset() {
      for (uint8_t i = 0; i < FILTER_WINDOW; i++) _buf[i] = 0.0f;
      _index = 0;
      _total = 0.0f;
      _count = 0;
    }
    float update(float sample) {
      _total -= _buf[_index];
      _buf[_index] = sample;
      _total += sample;
      _index = (_index + 1) % FILTER_WINDOW;
      if (_count < FILTER_WINDOW) _count++;
      return _total / (float)_count;
    }
  private:
    float _buf[FILTER_WINDOW] = {0};
    uint8_t _index = 0;
    float _total = 0.0f;
    uint8_t _count = 0;
};

MovingAverageFilter fsrFilter[NUM_SITES];
MovingAverageFilter tempFilter;

/* ---------------------------------------------------------------------------
   5. RUNNING BASELINE STATISTICS -- Welford's online mean/variance algorithm
   Numerically stable, single-pass, no stored history array required --
   verified against Python's statistics.mean()/stdev() before use here.
--------------------------------------------------------------------------- */
class RunningStats {
  public:
    void reset() { _n = 0; _mean = 0.0f; _m2 = 0.0f; }
    void update(float x) {
      _n++;
      float delta = x - _mean;
      _mean += delta / (float)_n;
      float delta2 = x - _mean;
      _m2 += delta * delta2;
    }
    unsigned long count() const { return _n; }
    float mean() const { return _mean; }
    float variance() const { return (_n > 1) ? (_m2 / (float)(_n - 1)) : 0.0f; }
    float stdev() const { return sqrtf(variance()); }
  private:
    unsigned long _n = 0;
    float _mean = 0.0f;
    float _m2 = 0.0f;
};

RunningStats fsrBaseline[NUM_SITES];
RunningStats tempBaseline;

/* ---------------------------------------------------------------------------
   6. TEMPERATURE CROSS-SENSITIVITY COMPENSATION  (Part 4.2)
   betaCoeff[i]: volts of divider drift per °C for site i, at fixed load --
   measured on YOUR physical FSR units per the Phase 6 calibration protocol
   (Part 8). Every real FSR + skin-contact system needs this constant
   measured on the actual hardware; it cannot be looked up from a generic
   datasheet number, since it depends on your specific divider resistor,
   FSR sample, and mounting. Defaults are 0 (no correction) until you run
   the calibration and fill these in -- the compensation math itself is
   fully implemented and active from the first upload.
--------------------------------------------------------------------------- */
float betaCoeff[NUM_SITES]  = {0.0f, 0.0f, 0.0f, 0.0f};
float referenceTempC        = 29.4f;   /* ambient temp your calibration run was centered on */

float compensate(float rawFilteredVoltage, uint8_t site, float currentTempC) {
  return rawFilteredVoltage - betaCoeff[site] * (currentTempC - referenceTempC);
}

/* ---------------------------------------------------------------------------
   7. RESISTANCE + OPTIONAL FORCE CONVERSION
   Pressure/asymmetry detection below works entirely in compensated-voltage
   space and needs nothing in this section. Fill in forceCalib[] from your
   own Phase 3 known-weight calibration (see Part 8) if you also want a
   force-in-newtons readout; see the worked example in loop() below.
--------------------------------------------------------------------------- */
float resistanceFromDividerVoltage(float vOut) {
  /* Divider: VCC -> FSR -> node(vOut) -> R_FIXED -> GND
     vOut = VCC * R_FIXED / (R_FSR + R_FIXED)  =>  R_FSR = R_FIXED * (VCC/vOut - 1) */
  if (vOut <= 0.001f) return 1.0e9f;   /* effectively open circuit: no contact */
  return R_FIXED_OHMS * (SUPPLY_VOLTAGE / vOut - 1.0f);
}

struct ForceCalibration {
  bool  valid = false;
  float r1 = 0, f1 = 0;   /* (ohms, newtons) at calibration point 1 */
  float r2 = 0, f2 = 0;   /* (ohms, newtons) at calibration point 2 */
};
ForceCalibration forceCalib[NUM_SITES];

float forceFromResistance(uint8_t site, float rOhms) {
  ForceCalibration &c = forceCalib[site];
  if (!c.valid) return NAN;   /* Phase 3 calibration not yet loaded for this site */
  float slope = (c.f2 - c.f1) / (c.r2 - c.r1);
  return c.f1 + slope * (rOhms - c.r1);
}

/* ---------------------------------------------------------------------------
   8. STATISTICAL / EXPERIMENTAL-FLAG THRESHOLDS
   Z_SCORE_FLAG_THRESHOLD drives the actual FLAG/no-FLAG output below: it is
   computed from THIS wearer's own logged baseline, which is the honest,
   defensible comparison for an uncalibrated hobbyist sensor (see Part 9).
   LITERATURE_TEMP_DELTA_REF_C is reported alongside it, every coordinator
   cycle, purely so the printed data can be discussed against the published
   bilateral-thermometry literature (Part 7) -- it never drives FLAG output
   in this firmware.
--------------------------------------------------------------------------- */
const float Z_SCORE_FLAG_THRESHOLD      = 3.0f;   /* 3 sigma: a real statistical outlier */
const float LITERATURE_TEMP_DELTA_REF_C = 2.2f;   /* Armstrong/Lavery reference point -- reported, not enforced */

const unsigned long CALIBRATION_DURATION_MS = 30000UL;  /* 30 s baseline capture at boot */
unsigned long calibrationStartMs = 0;
bool calibrationComplete = false;

/* ---------------------------------------------------------------------------
   9. SIDE-TO-SIDE (BILATERAL) LINK -- ESP-NOW, satellite -> coordinator
   ESP-NOW needs the receiver's MAC hardcoded in advance. Get it once by
   flashing the coordinator, opening its Serial Monitor at 115200 baud, and
   reading the "My MAC address" line printed in setup() below; then paste
   those six bytes into coordinatorMac[] on the SATELLITE board only.
--------------------------------------------------------------------------- */
uint8_t coordinatorMac[6] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};  /* <-- replace on the satellite board */

struct __attribute__((packed)) SolePacket {
  uint8_t  footId;                       /* 0 = satellite, 1 = coordinator */
  float    compensatedFsr[NUM_SITES];
  float    zScore[NUM_SITES];
  float    objectTempC;
  uint32_t seq;
};

SolePacket localPacket;
SolePacket peerPacket;
volatile bool peerPacketFresh = false;
volatile unsigned long lastPeerRxMs = 0;
const unsigned long PEER_MAX_AGE_MS = 5000UL;
uint32_t txSeq = 0;

void onEspNowReceive(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  if (len != (int)sizeof(SolePacket)) return;   /* reject malformed/foreign packets */
  memcpy((void *)&peerPacket, incomingData, sizeof(SolePacket));
  peerPacketFresh = true;
  lastPeerRxMs = millis();
}

void setupEspNow() {
  WiFi.mode(WIFI_STA);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed -- bilateral link disabled, local flagging still active");
    return;
  }

  if (THIS_BOARD_ROLE == ROLE_COORDINATOR) {
    esp_now_register_recv_cb(onEspNowReceive);
  } else {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, coordinatorMac, 6);
    peer.channel = 0;          /* 0 = use the current Wi-Fi channel */
    peer.encrypt = false;
    peer.ifidx   = WIFI_IF_STA;
    if (esp_now_add_peer(&peer) != ESP_OK) {
      Serial.println("ESP-NOW add_peer failed -- check coordinatorMac[]");
    }
  }
}

/* ---------------------------------------------------------------------------
   10. OUTPUT -- status LEDs + buzzer (an engineering flag, not a medical alert)
--------------------------------------------------------------------------- */
void setFlagOutput(bool anyFlag, bool calibrating) {
  digitalWrite(LED_YELLOW_PIN, calibrating ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN,  calibrating ? LOW  : (anyFlag ? LOW : HIGH));
  digitalWrite(LED_RED_PIN,    (!calibrating && anyFlag) ? HIGH : LOW);
  if (!calibrating && anyFlag) tone(BUZZER_PIN, 2000, 150);
}

/* ---------------------------------------------------------------------------
   11. GLOBAL SENSOR OBJECT
--------------------------------------------------------------------------- */
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

/* ---------------------------------------------------------------------------
   12. SETUP
--------------------------------------------------------------------------- */
void setup() {
  Serial.begin(115200);
  delay(200);

  for (uint8_t i = 0; i < NUM_SITES; i++) pinMode(FSR_PIN[i], INPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!mlx.begin()) {
    Serial.println("MLX90614 not found -- check SDA=GPIO21/SCL=GPIO22 wiring and 3.3V power");
    while (true) {
      digitalWrite(LED_RED_PIN, !digitalRead(LED_RED_PIN));
      delay(300);
    }
  }

  for (uint8_t i = 0; i < NUM_SITES; i++) {
    fsrFilter[i].reset();
    fsrBaseline[i].reset();
  }
  tempFilter.reset();
  tempBaseline.reset();

  setupEspNow();

  uint8_t myMac[6];
  WiFi.macAddress(myMac);
  Serial.print("My MAC address (needed on the OTHER board if this is the coordinator): ");
  for (uint8_t i = 0; i < 6; i++) {
    if (myMac[i] < 0x10) Serial.print("0");
    Serial.print(myMac[i], 16);
    if (i < 5) Serial.print(":");
  }
  Serial.println();

  Serial.println("timestamp_ms,foot_role,site,adc_raw,voltage,resistance_ohms,filtered,compensated,object_temp_c,z_score,state");

  calibrationStartMs = millis();
  calibrationComplete = false;
}

/* ---------------------------------------------------------------------------
   13. MAIN LOOP
--------------------------------------------------------------------------- */
void loop() {
  unsigned long now = millis();

  float objectTempC  = mlx.readObjectTempC();
  float filteredTemp = tempFilter.update(objectTempC);

  float compensatedFsr[NUM_SITES];
  float zScore[NUM_SITES];
  bool  anyLocalFlag = false;

  for (uint8_t i = 0; i < NUM_SITES; i++) {
    int   raw          = analogRead(FSR_PIN[i]);
    float voltage       = raw * (SUPPLY_VOLTAGE / ADC_MAX_COUNTS);
    float filtered       = fsrFilter[i].update(voltage);
    float resistanceOhms = resistanceFromDividerVoltage(filtered);
    float compensated     = compensate(filtered, i, filteredTemp);
    compensatedFsr[i] = compensated;

    if (!calibrationComplete) {
      fsrBaseline[i].update(compensated);
      zScore[i] = 0.0f;
    } else {
      float sd = fsrBaseline[i].stdev();
      zScore[i] = (sd > 1.0e-6f) ? (compensated - fsrBaseline[i].mean()) / sd : 0.0f;
      if (fabsf(zScore[i]) > Z_SCORE_FLAG_THRESHOLD) anyLocalFlag = true;
    }

    /* Optional: once forceCalib[i] has been populated from your own Phase 3
       calibration (two known weights on this exact FSR), you can print an
       actual force estimate too, e.g.:
         float forceN = forceFromResistance(i, resistanceOhms);
       forceFromResistance() returns NAN until forceCalib[i].valid is set,
       which is why it is not called by default here. */

    Serial.print(now);              Serial.print(",");
    Serial.print(THIS_BOARD_ROLE);  Serial.print(",");
    Serial.print(SITE_NAME[i]);     Serial.print(",");
    Serial.print(raw);              Serial.print(",");
    Serial.print(voltage);          Serial.print(",");
    Serial.print(resistanceOhms);   Serial.print(",");
    Serial.print(filtered);         Serial.print(",");
    Serial.print(compensated);      Serial.print(",");
    Serial.print(objectTempC);      Serial.print(",");
    Serial.print(zScore[i]);        Serial.print(",");
    Serial.println(calibrationComplete ? "MONITORING" : "CALIBRATING");
  }

  if (!calibrationComplete) {
    tempBaseline.update(filteredTemp);
    if (now - calibrationStartMs >= CALIBRATION_DURATION_MS) {
      calibrationComplete = true;
      Serial.println("# Calibration complete -- baseline established, flagging is now active.");
    }
  }

  /* ---- side-to-side (bilateral) comparison ---- */
  bool  bilateralFlag    = false;
  float bilateralTempDeltaC = NAN;

  if (THIS_BOARD_ROLE == ROLE_SATELLITE) {
    localPacket.footId = 0;
    memcpy(localPacket.compensatedFsr, compensatedFsr, sizeof(compensatedFsr));
    memcpy(localPacket.zScore, zScore, sizeof(zScore));
    localPacket.objectTempC = objectTempC;
    localPacket.seq = txSeq++;
    esp_now_send(coordinatorMac, (uint8_t *)&localPacket, sizeof(localPacket));
  } else {
    bool peerFresh = peerPacketFresh && ((now - lastPeerRxMs) < PEER_MAX_AGE_MS);
    if (peerFresh && calibrationComplete) {
      bilateralTempDeltaC = fabsf(objectTempC - peerPacket.objectTempC);

      for (uint8_t i = 0; i < NUM_SITES; i++) {
        float sideDelta = fabsf(compensatedFsr[i] - peerPacket.compensatedFsr[i]);
        float pooledSd  = (fsrBaseline[i].stdev() > 1.0e-6f) ? fsrBaseline[i].stdev() : 1.0e-6f;
        float sideZ     = sideDelta / pooledSd;
        if (sideZ > Z_SCORE_FLAG_THRESHOLD) bilateralFlag = true;
      }

      Serial.print("# bilateral_temp_delta_c,");
      Serial.print(bilateralTempDeltaC);
      Serial.print(",literature_reference_c,");
      Serial.print(LITERATURE_TEMP_DELTA_REF_C);
      Serial.print(",exceeds_literature_reference,");
      Serial.println((bilateralTempDeltaC > LITERATURE_TEMP_DELTA_REF_C) ? "yes" : "no");
    } else if (!peerFresh) {
      Serial.println("# peer frame stale or absent -- bilateral comparison skipped this cycle (Part 5.5)");
    }
  }

  bool anyFlag = anyLocalFlag || bilateralFlag;
  setFlagOutput(anyFlag, !calibrationComplete);

  delay(200);   /* ~5 Hz loop rate; see Part 5 for raising this toward gait-relevant rates */
}

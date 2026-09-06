import { DisclaimerBanner } from '@/components/telemetry/disclaimer-banner'
import { GovernancePortal } from '@/components/nonprofit/governance-portal'
import { HardwareIntegration } from '@/components/nonprofit/hardware-integration'
import { KitRequestForm } from '@/components/nonprofit/kit-request-form'
import { MissionStory } from '@/components/nonprofit/mission-story'

export function NonprofitHub() {
  return (
    <div className="flex flex-col gap-8">
      <MissionStory />
      <KitRequestForm />
      <GovernancePortal />
      <HardwareIntegration />
      <DisclaimerBanner />
    </div>
  )
}

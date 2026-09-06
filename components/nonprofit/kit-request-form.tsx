'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle2, Package, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SectionLabel } from '@/components/quantum/math-block'

const ORG_TYPES = {
  'senior-center': 'Senior center / community center',
  'support-group': 'Diabetes support group',
  'stem-club': 'High school STEM / engineering club',
  library: 'Public library maker space',
  other: 'Other community organization',
} as const

const REQUEST_TYPES = {
  kit: 'Hardware kit(s) shipped to us',
  workshop: 'On-site build workshop',
  schematics: 'Schematics & code only (download)',
} as const

type OrgType = keyof typeof ORG_TYPES
type RequestType = keyof typeof REQUEST_TYPES

interface FormState {
  organization: string
  orgType: OrgType | null
  contact: string
  email: string
  requestType: RequestType | null
  participants: string
  notes: string
  acknowledged: boolean
}

const INITIAL: FormState = {
  organization: '',
  orgType: null,
  contact: '',
  email: '',
  requestType: null,
  participants: '',
  notes: '',
  acknowledged: false,
}

export function KitRequestForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitted, setSubmitted] = useState<FormState | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.organization.trim()) next.organization = 'Organization name is required.'
    if (!form.orgType) next.orgType = 'Choose the type of organization.'
    if (!form.contact.trim()) next.contact = 'A contact name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (!form.requestType) next.requestType = 'Select what you are requesting.'
    if (form.requestType !== 'schematics') {
      const n = Number(form.participants)
      if (!Number.isInteger(n) || n < 1 || n > 200) next.participants = 'Enter a whole number from 1 to 200.'
    }
    if (!form.acknowledged) next.acknowledged = 'Please confirm the educational, non-medical scope.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitted(form)
  }

  if (submitted) {
    return (
      <Card className="glow-success border-success/30 bg-card">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          <h3 className="font-mono text-lg font-semibold text-foreground">Request received</h3>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Thanks, {submitted.contact}. We will follow up at <span className="text-foreground">{submitted.email}</span>{' '}
            about {REQUEST_TYPES[submitted.requestType!].toLowerCase()} for {submitted.organization}.
            {submitted.requestType === 'schematics' && ' The download links below are available right away.'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(null)
              setForm(INITIAL)
            }}
          >
            Submit another request
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <section aria-labelledby="request-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionLabel>Workshop &amp; Hardware Kit Request</SectionLabel>
        <h2 id="request-heading" className="font-mono text-xl font-semibold tracking-tight text-foreground">
          Bring a build to your community
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Senior centers, diabetes support groups, and high school STEM clubs can request assembled kits, a hands-on
          workshop, or just the open-source files.
        </p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="font-mono text-base">Request form</CardTitle>
          </div>
          <CardDescription>All fields are required unless marked optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={form.organization}
                onChange={(e) => set('organization', e.target.value)}
                placeholder="Riverside Senior Center"
                aria-invalid={!!errors.organization}
                aria-describedby={errors.organization ? 'organization-error' : undefined}
              />
              {errors.organization && (
                <p id="organization-error" className="text-xs text-destructive">
                  {errors.organization}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-type">Organization type</Label>
              <Select items={ORG_TYPES} value={form.orgType} onValueChange={(v) => set('orgType', v as OrgType)}>
                <SelectTrigger id="org-type" className="w-full" aria-invalid={!!errors.orgType}>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORG_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.orgType && <p className="text-xs text-destructive">{errors.orgType}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact">Contact name</Label>
              <Input
                id="contact"
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
                placeholder="Jordan Lee"
                aria-invalid={!!errors.contact}
              />
              {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jordan@example.org"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="request-type">What are you requesting?</Label>
              <Select
                items={REQUEST_TYPES}
                value={form.requestType}
                onValueChange={(v) => set('requestType', v as RequestType)}
              >
                <SelectTrigger id="request-type" className="w-full" aria-invalid={!!errors.requestType}>
                  <SelectValue placeholder="Kits, a workshop, or files" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.requestType && <p className="text-xs text-destructive">{errors.requestType}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="participants">
                Expected participants{' '}
                {form.requestType === 'schematics' && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="participants"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={form.participants}
                onChange={(e) => set('participants', e.target.value)}
                placeholder="12"
                aria-invalid={!!errors.participants}
              />
              {errors.participants && <p className="text-xs text-destructive">{errors.participants}</p>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="notes">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Preferred dates, accessibility needs, whether you already have soldering equipment…"
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/8 p-3">
                <Checkbox
                  id="acknowledged"
                  checked={form.acknowledged}
                  onCheckedChange={(checked) => set('acknowledged', checked === true)}
                  aria-invalid={!!errors.acknowledged}
                  className="mt-0.5"
                />
                <Label htmlFor="acknowledged" className="text-pretty text-xs font-normal leading-relaxed text-muted-foreground">
                  I understand SoleWatch is an educational engineering testbed, not a medical device, and that any
                  &ldquo;flag&rdquo; it produces is a statistical comparison to a wearer&apos;s own baseline — never a
                  diagnosis or a basis for a health decision.
                </Label>
              </div>
              {errors.acknowledged && <p className="text-xs text-destructive">{errors.acknowledged}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <p className="text-xs text-muted-foreground">Requests are reviewed by the student team and faculty advisor.</p>
              <Button type="submit">
                <Send data-icon="inline-start" />
                Send request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

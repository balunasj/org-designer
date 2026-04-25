import { useAppStore } from '@/store'
import type { CardDensity, LayoutDirection } from '@/store'

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
    </label>
  )
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded border border-gray-200 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs py-1.5 transition-colors ${
            value === opt.value
              ? 'bg-blue-500 text-white font-medium'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4 first:mt-0">
      {label}
    </div>
  )
}

export function ConfigPanel() {
  const config = useAppStore((s) => s.config)
  const setConfig = useAppStore((s) => s.setConfig)
  const setCardFields = useAppStore((s) => s.setCardFields)

  return (
    <div className="p-3 space-y-0.5">
      <SectionHeader label="Person" />
      <Toggle label="Job Title" checked={config.cardFields.title} onChange={(v) => setCardFields({ title: v })} />
      <Toggle label="Location (Geo · Country)" checked={config.cardFields.location} onChange={(v) => setCardFields({ location: v })} />
      <Toggle label="City" checked={config.cardFields.city} onChange={(v) => setCardFields({ city: v })} />
      <Toggle label="Hire Date" checked={config.cardFields.hireDate} onChange={(v) => setCardFields({ hireDate: v })} />
      <Toggle label="Tenure" checked={config.cardFields.tenure} onChange={(v) => setCardFields({ tenure: v })} />
      <Toggle label="Report Counts" checked={config.cardFields.reportCounts} onChange={(v) => setCardFields({ reportCounts: v })} />

      <SectionHeader label="Team" />
      <Toggle label="Team Name" checked={config.cardFields.team} onChange={(v) => setCardFields({ team: v })} />

      <SectionHeader label="Card Density" />
      <SegmentControl<CardDensity>
        value={config.density}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'default', label: 'Default' },
          { value: 'comfortable', label: 'Comfortable' },
        ]}
        onChange={(density) => setConfig({ density })}
      />

      <SectionHeader label="Layout Direction" />
      <SegmentControl<LayoutDirection>
        value={config.direction}
        options={[
          { value: 'TB', label: 'Vertical' },
          { value: 'LR', label: 'Horizontal' },
        ]}
        onChange={(direction) => setConfig({ direction })}
      />

      <SectionHeader label="Grid" />
      <Toggle label="Snap to Grid" checked={config.snapToGrid} onChange={(v) => setConfig({ snapToGrid: v })} />
    </div>
  )
}

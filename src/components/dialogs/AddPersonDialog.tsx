import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store'
import { ROLE_LABELS } from '@/lib/role-colors'
import type { AddPersonAction, EditPersonAction } from '@/types/overlay'
import type { PersonRecord } from '@/types/person'

interface Props {
  managerUid: string
  editPerson?: PersonRecord
  onClose: () => void
}

export function AddPersonDialog({ managerUid, editPerson, onClose }: Props) {
  const effectiveState = useAppStore((s) => s.effectiveState)
  const pushAction = useAppStore((s) => s.pushAction)
  const isEdit = !!editPerson

  const [name, setName] = useState(editPerson?.cn ?? '')
  const [role, setRole] = useState(editPerson?.rhatJobRole ?? ROLE_LABELS[0].role)
  const [title, setTitle] = useState(editPerson?.rhatJobTitle ?? ROLE_LABELS[0].role)
  const [geo, setGeo] = useState(editPerson?.rhatGeo ?? '')
  const [country, setCountry] = useState(editPerson?.co ?? '')

  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  const geos = Array.from(new Set(
    Object.values(effectiveState?.people ?? {}).map((p) => p.rhatGeo).filter(Boolean)
  )).sort()
  const countries = Array.from(new Set(
    Object.values(effectiveState?.people ?? {}).map((p) => p.co).filter(Boolean)
  )).sort()

  const prevRole = useRef(role)
  useEffect(() => {
    if (title === prevRole.current) setTitle(role)
    prevRole.current = role
  }, [role])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const timestamp = new Date().toISOString()

    if (isEdit) {
      const action: EditPersonAction = {
        type: 'edit_person',
        uid: editPerson.uid,
        updates: {
          cn: name.trim(),
          displayName: name.trim(),
          rhatPreferredLastName: name.trim().split(' ').slice(-1)[0] ?? '',
          rhatJobTitle: title.trim() || role,
          rhatJobRole: role,
          rhatGeo: geo,
          co: country,
        },
        timestamp,
      }
      pushAction(action)
    } else {
      const uid = `placeholder-${Date.now()}`
      const person: PersonRecord = {
        uid,
        cn: name.trim(),
        displayName: name.trim(),
        rhatPreferredLastName: name.trim().split(' ').slice(-1)[0] ?? '',
        rhatJobTitle: title.trim() || role,
        rhatJobRole: role,
        rhatGeo: geo,
        co: country,
        l: '',
        rhatLocation: '',
        rhatHireDate: '',
        managerUid,
        directReports: 0,
        totalReports: 0,
        teamId: null,
        yamlRoles: [],
      }
      const action: AddPersonAction = { type: 'add_person', person, timestamp }
      pushAction(action)
    }

    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {isEdit ? 'Edit card' : 'Add new report'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Name *">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TBD, Hiring Manager"
              className="input-base"
              required
            />
          </Field>

          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-base">
              {ROLE_LABELS.filter((r) => r.role !== 'Unknown').map(({ role: r }) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
              className="input-base"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Geo">
              <select value={geo} onChange={(e) => setGeo(e.target.value)} className="input-base">
                <option value="">—</option>
                {geos.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="input-base">
                <option value="">—</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Save changes' : 'Add report'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store'
import { uniqueJobRoles } from '@/lib/role-colors'
import { TagComboBox } from '@/components/shared/TagComboBox'
import type { EditPersonAction, OverlayAction } from '@/types/overlay'
import type { PersonRecord } from '@/types/person'

const MULTIPLE = '__MULTIPLE__'

interface Props {
  people: PersonRecord[]
  onClose: () => void
}

export function EditMultipleDialog({ people, onClose }: Props) {
  const effectiveState = useAppStore((s) => s.effectiveState)
  const pushActions = useAppStore((s) => s.pushActions)

  const jobRoles = useMemo(() => {
    if (!effectiveState) return ['Unknown']
    return uniqueJobRoles(Object.values(effectiveState.people))
  }, [effectiveState])

  const commonValue = <T,>(getter: (p: PersonRecord) => T): T | typeof MULTIPLE => {
    const first = getter(people[0])
    return people.every((p) => getter(p) === first) ? first : MULTIPLE
  }

  const initialRole = commonValue((p) => p.jobRole) as string
  const initialTitle = commonValue((p) => p.jobTitle) as string
  const initialGeo = commonValue((p) => p.geo) as string
  const initialCountry = commonValue((p) => p.co) as string
  const initialTeamId = commonValue((p) => p.teamId) as string | null

  const initialTags = useMemo(() => {
    const first = JSON.stringify([...people[0].tags].sort())
    const allSame = people.every((p) => JSON.stringify([...p.tags].sort()) === first)
    return allSame ? new Set(people[0].tags) : null
  }, [people])

  const [role, setRole] = useState(initialRole === MULTIPLE ? '' : initialRole)
  const [roleChanged, setRoleChanged] = useState(false)
  const [title, setTitle] = useState(initialTitle === MULTIPLE ? '' : initialTitle)
  const [titleChanged, setTitleChanged] = useState(false)
  const [geo, setGeo] = useState(initialGeo === MULTIPLE ? '' : initialGeo)
  const [geoChanged, setGeoChanged] = useState(false)
  const [country, setCountry] = useState(initialCountry === MULTIPLE ? '' : initialCountry)
  const [countryChanged, setCountryChanged] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(
    initialTeamId === MULTIPLE ? null : initialTeamId,
  )
  const [teamChanged, setTeamChanged] = useState(false)
  const [tags, setTags] = useState<Set<string>>(initialTags ?? new Set())
  const [tagsChanged, setTagsChanged] = useState(false)
  const [teamInput, setTeamInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  const firstFieldRef = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  const geos = Array.from(
    new Set(
      Object.values(effectiveState?.people ?? {})
        .map((p) => p.geo)
        .filter(Boolean),
    ),
  ).sort()
  const countries = Array.from(
    new Set(
      Object.values(effectiveState?.people ?? {})
        .map((p) => p.co)
        .filter(Boolean),
    ),
  ).sort()

  const teams = useMemo(() => {
    if (!effectiveState) return []
    const predefined = Object.values(effectiveState.teams).map((t) => ({ id: t.id, name: t.name }))
    const customTeamIds = new Set<string>()
    Object.values(effectiveState.people).forEach((p) => {
      if (p.teamId && !effectiveState.teams[p.teamId]) {
        customTeamIds.add(p.teamId)
      }
    })
    const custom = Array.from(customTeamIds).map((id) => ({ id, name: id }))
    return [...predefined, ...custom].sort((a, b) => a.name.localeCompare(b.name))
  }, [effectiveState])

  const allTags = useMemo(() => {
    if (!effectiveState) return []
    const tagSet = new Set<string>()
    Object.values(effectiveState.people).forEach((p) => {
      p.tags.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [effectiveState])

  const filteredTeams = useMemo(() => {
    const trimmed = teamInput.trim()
    const matching = teams.filter(
      (t) => t.id !== teamId && t.name.toLowerCase().includes(trimmed.toLowerCase()),
    )
    const exactNameMatch = teams.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    return { matching, exactNameMatch, canCreate: trimmed.length > 0 && !exactNameMatch }
  }, [teams, teamInput, teamId])

  const filteredTags = useMemo(() => {
    const trimmed = tagInput.trim()
    const matching = allTags.filter(
      (t) => !tags.has(t) && t.toLowerCase().includes(trimmed.toLowerCase()),
    )
    return {
      matching,
      canCreate: trimmed.length > 0 && !allTags.includes(trimmed) && !tags.has(trimmed),
    }
  }, [allTags, tagInput, tags])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const timestamp = new Date().toISOString()
    const actions: OverlayAction[] = []

    for (const person of people) {
      const updates: Partial<PersonRecord> = {}

      if (roleChanged && role !== person.jobRole) updates.jobRole = role
      if (titleChanged && title !== person.jobTitle) updates.jobTitle = title || role
      if (geoChanged && geo !== person.geo) updates.geo = geo
      if (countryChanged && country !== person.co) updates.co = country
      if (teamChanged && (teamId || null) !== person.teamId) updates.teamId = teamId || null
      if (tagsChanged) {
        const newTags = Array.from(tags)
        if (JSON.stringify(newTags) !== JSON.stringify(person.tags)) {
          updates.tags = newTags
        }
      }

      if (Object.keys(updates).length > 0) {
        const action: EditPersonAction = {
          type: 'edit_person',
          uid: person.uid,
          updates,
          timestamp,
        }
        actions.push(action)
      }
    }

    if (actions.length > 0) {
      pushActions(actions)
    }

    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  const multiplePlaceholder = 'Multiple values'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Edit {people.length} cards</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Role">
            <select
              ref={firstFieldRef}
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setRoleChanged(true)
              }}
              className="input-base"
            >
              {initialRole === MULTIPLE && !roleChanged && (
                <option value="" disabled>
                  {multiplePlaceholder}
                </option>
              )}
              {jobRoles
                .filter((r) => r !== 'Unknown')
                .map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleChanged(true)
              }}
              placeholder={
                initialTitle === MULTIPLE && !titleChanged ? multiplePlaceholder : 'Job title'
              }
              className="input-base"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Geo">
              <select
                value={geo}
                onChange={(e) => {
                  setGeo(e.target.value)
                  setGeoChanged(true)
                }}
                className="input-base"
              >
                {initialGeo === MULTIPLE && !geoChanged && (
                  <option value="" disabled>
                    {multiplePlaceholder}
                  </option>
                )}
                <option value="">—</option>
                {geos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Country">
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  setCountryChanged(true)
                }}
                className="input-base"
              >
                {initialCountry === MULTIPLE && !countryChanged && (
                  <option value="" disabled>
                    {multiplePlaceholder}
                  </option>
                )}
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Team">
            <TagComboBox
              items={
                teamChanged || initialTeamId !== MULTIPLE
                  ? teamId
                    ? [{ id: teamId, label: teams.find((t) => t.id === teamId)?.name ?? teamId }]
                    : []
                  : []
              }
              suggestions={filteredTeams.matching.map((t) => ({ id: t.id, label: t.name }))}
              inputValue={teamInput}
              onInputChange={setTeamInput}
              onSelect={(opt) => {
                setTeamId(opt.id)
                setTeamChanged(true)
              }}
              onCreate={(label) => {
                setTeamId(filteredTeams.exactNameMatch?.id ?? label)
                setTeamChanged(true)
              }}
              onRemove={() => {
                setTeamId(null)
                setTeamChanged(true)
              }}
              canCreate={filteredTeams.canCreate}
              placeholder={
                initialTeamId === MULTIPLE && !teamChanged
                  ? multiplePlaceholder
                  : 'Search or create team...'
              }
              totalCount={teams.length}
              noun="team"
            />
          </Field>

          <Field label="Tags">
            <TagComboBox
              items={
                tagsChanged || initialTags !== null
                  ? Array.from(tags).map((t) => ({ id: t, label: t }))
                  : []
              }
              suggestions={filteredTags.matching.map((t) => ({ id: t, label: t }))}
              inputValue={tagInput}
              onInputChange={setTagInput}
              onSelect={(opt) => {
                setTags((prev) => new Set([...prev, opt.id]))
                setTagsChanged(true)
              }}
              onCreate={(label) => {
                setTags((prev) => new Set([...prev, label]))
                setTagsChanged(true)
              }}
              onRemove={(id) => {
                setTags((prev) => {
                  const next = new Set(prev)
                  next.delete(id)
                  return next
                })
                setTagsChanged(true)
              }}
              canCreate={filteredTags.canCreate}
              placeholder={
                initialTags === null && !tagsChanged
                  ? multiplePlaceholder
                  : 'Search or create tag...'
              }
              totalCount={allTags.length}
              noun="tag"
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      {children}
    </div>
  )
}

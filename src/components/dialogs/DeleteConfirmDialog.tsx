import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import type { PersonRecord } from '@/types/person'

interface Props {
  people: PersonRecord[]
  onConfirm: () => void
  onCancel: () => void
}

function formatNames(people: PersonRecord[]): string {
  if (people.length === 0) return ''
  const firstName = (p: PersonRecord) => p.cn.split(' ')[0]
  if (people.length === 1) return people[0].cn
  if (people.length === 2) return `${people[0].cn} and ${people[1].cn}`
  if (people.length === 3) return `${people[0].cn}, ${people[1].cn}, and ${people[2].cn}`
  const others = people.length - 2
  return `${firstName(people[0])}, ${firstName(people[1])}, and ${others} others`
}

export function DeleteConfirmDialog({ people, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      <div
        className="relative mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-800">Confirm deletion</h2>
            <p className="text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{formatNames(people)}</span>?
              {people.length > 1 && (
                <span className="mt-1 block text-xs text-gray-500">
                  Their direct reports will be reassigned to each person's manager.
                </span>
              )}
              {people.length === 1 && people[0] && (
                <span className="mt-1 block text-xs text-gray-500">
                  Their direct reports will be reassigned to their manager.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:outline-none"
          >
            Delete {people.length > 1 ? `${people.length} people` : 'person'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

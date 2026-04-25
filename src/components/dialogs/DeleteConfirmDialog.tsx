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
  useEffect(() => { confirmRef.current?.focus() }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      <div
        className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Confirm deletion</h2>
            <p className="text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{formatNames(people)}</span>?
              {people.length > 1 && (
                <span className="block text-xs text-gray-500 mt-1">
                  Their direct reports will be reassigned to each person's manager.
                </span>
              )}
              {people.length === 1 && people[0] && (
                <span className="block text-xs text-gray-500 mt-1">
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
            className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          >
            Delete {people.length > 1 ? `${people.length} people` : 'person'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

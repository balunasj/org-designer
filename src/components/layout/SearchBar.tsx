import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useAppStore } from '@/store'
import { searchPeople, type SearchResult } from '@/lib/search-utils'

const MAX_RESULTS = 10
const DEBOUNCE_MS = 150

export function SearchBar() {
  const effectiveState = useAppStore((s) => s.effectiveState)
  const navigateToNode = useAppStore((s) => s.navigateToNode)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Run search with debounce whenever query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || !effectiveState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setTotalMatches(0)
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      const { results: r, totalMatches: t } = searchPeople(
        query,
        effectiveState.people,
        MAX_RESULTS,
      )
      setResults(r)
      setTotalMatches(t)
      setSelectedIndex(0)
      setIsOpen(r.length > 0)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, effectiveState])

  const selectResult = useCallback(
    (result: SearchResult) => {
      navigateToNode(result.uid)
      setQuery('')
      setResults([])
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [navigateToNode],
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.blur()
  }, [])

  // Keyboard handling on the input
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) selectResult(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        clearSearch()
      }
    },
    [isOpen, results, selectedIndex, selectResult, clearSearch],
  )

  // Global hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }
      // / — focus search (only when nothing else is focused)
      if (e.key === '/' && document.activeElement === document.body) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  const hintText = isMac ? '⌘K' : 'Ctrl+K'

  return (
    <div className="relative w-full max-w-sm">
      {/* Input */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 transition-colors focus-within:border-blue-400 focus-within:bg-white">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder="Search people…"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          aria-label="Search people"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {!query && (
          <span className="flex-shrink-0 font-mono text-xs text-gray-300">{hintText}</span>
        )}
        {query && (
          <button
            onClick={clearSearch}
            className="flex-shrink-0 text-xs leading-none text-gray-300 hover:text-gray-500"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {/* Result count */}
          <div className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-400">
            {totalMatches <= MAX_RESULTS
              ? `${totalMatches} match${totalMatches === 1 ? '' : 'es'}`
              : `Showing ${MAX_RESULTS} of ${totalMatches} matches`}
          </div>

          {/* Results */}
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((r, i) => (
              <ResultItem
                key={r.uid}
                result={r}
                isHighlighted={i === selectedIndex}
                onSelect={() => selectResult(r)}
                onHover={() => setSelectedIndex(i)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface ResultItemProps {
  result: SearchResult
  isHighlighted: boolean
  onSelect: () => void
  onHover: () => void
}

function ResultItem({ result, isHighlighted, onSelect, onHover }: ResultItemProps) {
  const { person } = result
  const location = [person.rhatGeo, person.co].filter(Boolean).join(' · ')
  return (
    <li
      role="option"
      aria-selected={isHighlighted}
      className={`cursor-pointer px-3 py-2 select-none ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      onMouseDown={(e) => e.preventDefault()} // prevent input blur before click fires
      onClick={onSelect}
      onMouseMove={onHover}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-medium text-gray-900">{person.cn}</span>
        <span className="flex-shrink-0 text-xs text-gray-400">@{person.uid}</span>
      </div>
      <div className="mt-0.5 truncate text-xs text-gray-400">
        {[person.rhatJobTitle, location].filter(Boolean).join(' · ')}
      </div>
    </li>
  )
}

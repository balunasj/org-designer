import {
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  FileImage,
  FileCode,
  FileText,
  FileJson,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { useRef, useState } from 'react'
import { SearchBar } from './SearchBar'

const EXPORT_FORMATS = [
  { fmt: 'png' as const, icon: <FileImage className="h-3.5 w-3.5" />, label: 'PNG' },
  { fmt: 'svg' as const, icon: <FileCode className="h-3.5 w-3.5" />, label: 'SVG' },
  { fmt: 'pdf' as const, icon: <FileText className="h-3.5 w-3.5" />, label: 'PDF' },
  { fmt: 'json' as const, icon: <FileJson className="h-3.5 w-3.5" />, label: 'JSON' },
]

export function Toolbar() {
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const expandAll = useAppStore((s) => s.expandAll)
  const collapseAll = useAppStore((s) => s.collapseAll)
  const undoStack = useAppStore((s) => s.undoStack)
  const redoStack = useAppStore((s) => s.redoStack)
  const currentScenarioName = useAppStore((s) => s.currentScenarioName)
  const saveScenario = useAppStore((s) => s.saveScenario)
  const loadScenarioFromJson = useAppStore((s) => s.loadScenarioFromJson)
  const overlay = useAppStore((s) => s.overlay)
  const baseline = useAppStore((s) => s.baseline)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        loadScenarioFromJson(json)
      } catch {
        alert('Invalid scenario file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setDraftName(currentScenarioName)
    setEditingName(true)
    setTimeout(() => {
      nameInputRef.current?.select()
    }, 0)
  }

  const commitName = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== currentScenarioName) {
      void saveScenario(trimmed)
    }
    setEditingName(false)
  }

  const onNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitName()
    else if (e.key === 'Escape') setEditingName(false)
  }

  const handleExport = async (format: 'png' | 'svg' | 'pdf' | 'json') => {
    if (format === 'json') {
      const payload = {
        name: currentScenarioName,
        baselineImportedAt: baseline?.importedAt ?? '',
        overlay,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      download(URL.createObjectURL(blob), `org-${currentScenarioName}.json`)
      return
    }

    const el = document.querySelector('.react-flow') as HTMLElement
    if (!el) return

    if (format === 'png' || format === 'pdf') {
      const dataUrl = await toPng(el, { backgroundColor: '#f8fafc' })
      if (format === 'png') {
        download(dataUrl, `org-${currentScenarioName}.png`)
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
        const img = new Image()
        img.src = dataUrl
        await new Promise((r) => {
          img.onload = r
        })
        const pw = pdf.internal.pageSize.getWidth()
        const ph = pdf.internal.pageSize.getHeight()
        const ratio = Math.min(pw / img.width, ph / img.height)
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width * ratio, img.height * ratio)
        pdf.save(`org-${currentScenarioName}.pdf`)
      }
    } else {
      // SVG export via serializing the DOM
      const svgEl = el.querySelector('svg')
      if (!svgEl) return
      const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
      download(URL.createObjectURL(blob), `org-${currentScenarioName}.svg`)
    }
  }

  return (
    <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
      {/* Title */}
      <div className="mr-2 text-sm font-semibold whitespace-nowrap text-gray-700">
        Organization Designer
      </div>
      <div className="border-l border-gray-200 pl-3">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={onNameKeyDown}
            className="w-36 rounded border border-blue-400 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={startEditing}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Click to rename scenario"
          >
            {currentScenarioName}
          </button>
        )}
      </div>

      <div className="flex flex-1 justify-center px-4">
        <SearchBar />
      </div>

      {/* Expand/collapse */}
      <div className="mr-1 flex items-center gap-1 border-r border-gray-200 pr-3">
        <ToolBtn onClick={expandAll} title="Expand all" icon={<Maximize2 className="h-4 w-4" />} />
        <ToolBtn
          onClick={collapseAll}
          title="Collapse all"
          icon={<Minimize2 className="h-4 w-4" />}
        />
      </div>

      {/* Undo/redo */}
      <div className="mr-1 flex items-center gap-1 border-r border-gray-200 pr-3">
        <ToolBtn
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo"
          icon={<RotateCcw className="h-4 w-4" />}
        />
        <ToolBtn
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo"
          icon={<RotateCw className="h-4 w-4" />}
        />
      </div>

      {/* Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImport}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
      >
        <Download className="h-3.5 w-3.5 rotate-180" /> Import
      </button>

      {/* Export */}
      <div className="group relative">
        <button className="flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <div className="absolute top-full right-0 z-50 mt-1 hidden min-w-[100px] rounded border border-gray-200 bg-white shadow-lg group-hover:block">
          {EXPORT_FORMATS.map(({ fmt, icon, label }) => (
            <button
              key={fmt}
              onClick={() => void handleExport(fmt)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-400">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToolBtn({
  onClick,
  icon,
  title,
  disabled,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
    </button>
  )
}

function download(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

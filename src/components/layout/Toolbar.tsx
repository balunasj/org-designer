import { RotateCcw, RotateCw, Maximize2, Minimize2, Download } from 'lucide-react'
import { useAppStore } from '@/store'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

export function Toolbar() {
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const expandAll = useAppStore((s) => s.expandAll)
  const collapseAll = useAppStore((s) => s.collapseAll)
  const undoStack = useAppStore((s) => s.undoStack)
  const redoStack = useAppStore((s) => s.redoStack)
  const currentScenarioName = useAppStore((s) => s.currentScenarioName)

  const handleExport = async (format: 'png' | 'svg' | 'pdf') => {
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
        await new Promise((r) => { img.onload = r })
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
    <div className="h-11 border-b border-gray-200 bg-white flex items-center px-4 gap-3 flex-shrink-0">
      {/* Title */}
      <div className="text-sm font-semibold text-gray-700 mr-2">Org Designer</div>
      <div className="text-xs text-gray-400 border-l border-gray-200 pl-3">
        {currentScenarioName}
      </div>

      <div className="flex-1" />

      {/* Expand/collapse */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
        <ToolBtn onClick={expandAll} title="Expand all" icon={<Maximize2 className="w-4 h-4" />} />
        <ToolBtn onClick={collapseAll} title="Collapse all" icon={<Minimize2 className="w-4 h-4" />} />
      </div>

      {/* Undo/redo */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
        <ToolBtn
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo"
          icon={<RotateCcw className="w-4 h-4" />}
        />
        <ToolBtn
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo"
          icon={<RotateCw className="w-4 h-4" />}
        />
      </div>

      {/* Export */}
      <div className="relative group">
        <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 hidden group-hover:block">
          {(['png', 'svg', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => void handleExport(fmt)}
              className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 uppercase"
            >
              {fmt}
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
      className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

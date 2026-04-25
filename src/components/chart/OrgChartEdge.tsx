import type { EdgeProps } from '@xyflow/react'

export function OrgChartEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
}: EdgeProps) {
  const isLR = (data as { direction?: string })?.direction === 'LR'

  let d: string
  if (isLR) {
    // LR layout: horizontal from source → vertical rail → horizontal to target
    const midX = (sourceX + targetX) / 2
    d = `M${sourceX},${sourceY} H${midX} V${targetY} H${targetX}`
  } else {
    // TB layout: vertical from source → horizontal rail → vertical to target
    const midY = (sourceY + targetY) / 2
    d = `M${sourceX},${sourceY} V${midY} H${targetX} V${targetY}`
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={(style?.stroke as string) ?? '#94a3b8'}
      strokeWidth={(style?.strokeWidth as number) ?? 1.5}
    />
  )
}

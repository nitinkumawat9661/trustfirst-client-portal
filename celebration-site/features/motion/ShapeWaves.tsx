import type { CSSProperties } from "react"

type ShapeWavesProps = {
  className?: string
  color?: string
  cellSize?: number
}

type ShapeWaveStyle = CSSProperties & {
  "--shape-wave-color"?: string
  "--shape-wave-cell"?: string
}

export function ShapeWaves({ className = "", color = "#8b2529", cellSize = 12 }: ShapeWavesProps) {
  const style: ShapeWaveStyle = {
    "--shape-wave-color": color,
    "--shape-wave-cell": `${Math.max(12, cellSize)}px`
  }

  return (
    <div className={`shapeWaves ${className}`.trim()} style={style} aria-hidden="true">
      <span className="shapeWaveBand shapeWaveBandOne" />
      <span className="shapeWaveBand shapeWaveBandTwo" />
      <span className="shapeWaveBand shapeWaveBandThree" />
    </div>
  )
}

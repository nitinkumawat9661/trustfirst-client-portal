"use client"

import { useEffect, useRef } from "react"

type ShapeWavesProps = { className?: string; color?: string; cellSize?: number }
function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) { const h = size * .88; ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x - size / 2, y + h / 2); ctx.lineTo(x + size / 2, y + h / 2); ctx.closePath(); ctx.fill() }

export function ShapeWaves({ className = "", color = "#8b2529", cellSize = 14 }: ShapeWavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return
    let width = 0, height = 0, raf = 0, running = false, visible = true
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    function draw(now: number) {
      ctx.clearRect(0, 0, width, height)
      const t = reduced ? 0 : now * .001
      const step = Math.max(10, cellSize), cols = Math.ceil(width / step) + 2, rows = Math.ceil(height / step) + 2
      for (let row = -1; row < rows; row++) {
        const y = row * step
        for (let col = -1; col < cols; col++) {
          const x = col * step
          const waveA = height * .34 + Math.sin(x * .018 + t * .9) * 22 + Math.sin(x * .006 - t * .55) * 15
          const waveB = height * .57 + Math.sin(x * .015 - t * .72 + 1.7) * 24
          const waveC = height * .78 + Math.sin(x * .021 + t * .64 + 3.2) * 18
          const distances = [Math.abs(y - waveA), Math.abs(y - waveB), Math.abs(y - waveC)]
          const nearest = Math.min(...distances)
          if (nearest > step * 2.1) continue
          const band = distances.indexOf(nearest), intensity = Math.max(0, 1 - nearest / (step * 2.1)), size = step * (.26 + intensity * .42)
          ctx.globalAlpha = .055 + intensity * .14; ctx.fillStyle = color
          if (band === 0) drawTriangle(ctx, x, y, size)
          else if (band === 1) { ctx.beginPath(); ctx.arc(x, y, size * .46, 0, Math.PI * 2); ctx.fill() }
          else ctx.fillRect(x - size * .42, y - size * .42, size * .84, size * .84)
        }
      }
      ctx.globalAlpha = 1
    }
    function resize() { const rect = canvas.getBoundingClientRect(); width = Math.max(1, Math.round(rect.width)); height = Math.max(1, Math.round(rect.height)); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr,0,0,dpr,0,0); draw(performance.now()) }
    function loop(now: number) { if (!running) return; if (visible && !document.hidden) draw(now); raf = requestAnimationFrame(loop) }
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); if (visible) draw(performance.now()) }, { rootMargin: "120px" }); io.observe(canvas)
    resize(); if (!reduced) { running = true; raf = requestAnimationFrame(loop) }
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [cellSize, color])
  return <canvas ref={canvasRef} className={`shapeWaves ${className}`.trim()} aria-hidden="true" />
}

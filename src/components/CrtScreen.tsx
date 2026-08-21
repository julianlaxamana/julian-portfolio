import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CrtShaderCanvas from './CrtShaderCanvas'
import './CrtScreen.css'

const FONT_SIZE = 28
const LINE_HEIGHT = FONT_SIZE * 1.5
const PADDING_X = 32
const PADDING_Y = 28
const BOOT_BG_COLOR: [number, number, number] = [5 / 255, 7 / 255, 10 / 255]
const DESKTOP_BG_COLOR: [number, number, number] = [0, 128 / 255, 128 / 255]

const TASKBAR_HEIGHT = 40
const BAR_PADDING = 10
const START_PADDING_X = 10
const START_WIDTH = 88
const START_HEIGHT = 30
const GAP = 8
const DIVIDER_WIDTH = 2
const TRAY_WIDTH = 90
const TRAY_HEIGHT = 26

const START_X = BAR_PADDING
const START_Y = (TASKBAR_HEIGHT - START_HEIGHT) / 2
const DIVIDER_X = START_X + START_WIDTH + GAP
const DIVIDER_Y = (TASKBAR_HEIGHT - 28) / 2
const TRAY_Y = (TASKBAR_HEIGHT - TRAY_HEIGHT) / 2

type Line = { text: string; delayAfter?: number }

const BOOT_LINES: Line[] = [
  { text: 'JULIAN-BIOS (C) 2026 J. LAXAMANA SYSTEMS', delayAfter: 200 },
  { text: 'CPU: PORTFOLIO-CORE @ 3.80GHz' },
  { text: 'Running memory test...' },
  { text: '655360K OK', delayAfter: 150 },
  { text: '' },
  { text: 'Detecting drives...' },
  { text: '  Primary Master  : JULIAN_PORTFOLIO.DRV' },
  { text: '  Primary Slave   : COFFEE.SYS' },
  { text: '  Secondary Master: NOT DETECTED', delayAfter: 150 },
  { text: '' },
  { text: 'Loading PORTFOLIO.EXE ...', delayAfter: 100 },
]

const TYPE_SPEED = 14
const LINE_PAUSE = 60
const DESKTOP_STRENGTH = 0.15
const BOOT_STRENGTH = DESKTOP_STRENGTH

function forwardWarp(
  x: number,
  y: number,
  aspect: number,
  strength: number,
): [number, number] {
  const cx = x - 0.5
  const cy = y - 0.5
  const cax = cx * aspect
  const dist = cax * cax + cy * cy
  return [x + cx * dist * strength, y + cy * dist * strength]
}

function inverseWarp(
  targetX: number,
  targetY: number,
  aspect: number,
  strength: number,
): [number, number] {
  let x = targetX
  let y = targetY
  for (let i = 0; i < 8; i++) {
    const [fx, fy] = forwardWarp(x, y, aspect, strength)
    x -= fx - targetX
    y -= fy - targetY
  }
  return [x, y]
}

const CORNER_RADIUS = 22
const EDGE_SEGMENTS = 20
const CORNER_SEGMENTS = 10
const HALF_PI = Math.PI / 2

// Traces the exact boundary the shader clips content to (see CrtShaderCanvas's
// fragment shader: a display pixel is background once forwardWarp(vUv) leaves
// [0,1]). Sampling a rounded rect through inverseWarp keeps the clip path and
// bezel ring perfectly aligned with the warped screen curvature.
function buildCrtPath(w: number, h: number, aspect: number, strength: number): string {
  const rPx = Math.min(CORNER_RADIUS, w / 2, h / 2)
  const rx = rPx / w
  const ry = rPx / h

  const src: [number, number][] = []

  const line = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n
      src.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
    }
  }
  const arc = (cx: number, cy: number, a0: number, a1: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const t = a0 + (a1 - a0) * (i / n)
      src.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)])
    }
  }

  src.push([rx, 0])
  line(rx, 0, 1 - rx, 0, EDGE_SEGMENTS)
  arc(1 - rx, ry, -HALF_PI, 0, CORNER_SEGMENTS)
  line(1, ry, 1, 1 - ry, EDGE_SEGMENTS)
  arc(1 - rx, 1 - ry, 0, HALF_PI, CORNER_SEGMENTS)
  line(1 - rx, 1, rx, 1, EDGE_SEGMENTS)
  arc(rx, 1 - ry, HALF_PI, Math.PI, CORNER_SEGMENTS)
  line(0, 1 - ry, 0, ry, EDGE_SEGMENTS)
  arc(rx, ry, Math.PI, Math.PI * 1.5, CORNER_SEGMENTS)

  const pts = src.map(([sx, sy]) => {
    const [dx, dy] = inverseWarp(sx, sy, aspect, strength)
    return [dx * w, dy * h]
  })

  const [first, ...rest] = pts
  return (
    `M ${first[0]} ${first[1]} ` +
    rest.map(([x, y]) => `L ${x} ${y}`).join(' ') +
    ' Z'
  )
}

function formatTime(date: Date) {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function drawBevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  raised: boolean,
) {
  const edge = Math.max(1, Math.round(2))
  ctx.fillStyle = raised ? '#ffffff' : '#000000'
  ctx.fillRect(x, y, w, edge)
  ctx.fillRect(x, y, edge, h)
  ctx.fillStyle = raised ? '#000000' : '#ffffff'
  ctx.fillRect(x, y + h - edge, w, edge)
  ctx.fillRect(x + w - edge, y, edge, h)
}

export default function CrtScreen() {
  const [renderedLines, setRenderedLines] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [bootPhase, setBootPhase] = useState<'boot' | 'ready'>('boot')
  const [screenPhase, setScreenPhase] = useState<'booting' | 'desktop'>('booting')
  const [cursorOn, setCursorOn] = useState(true)
  const [startOpen, setStartOpen] = useState(false)
  const [startHitPos, setStartHitPos] = useState({ x: START_X + START_WIDTH / 2, y: START_Y + START_HEIGHT / 2 })
  const [screenRect, setScreenRect] = useState({ width: 0, height: 0, left: 0, top: 0 })
  const bootPhaseRef = useRef(bootPhase)
  const screenPhaseRef = useRef(screenPhase)
  const cancelledRef = useRef(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const screenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bootPhaseRef.current = bootPhase
  }, [bootPhase])

  useEffect(() => {
    screenPhaseRef.current = screenPhase
  }, [screenPhase])

  useEffect(() => {
    const interval = setInterval(() => setCursorOn((on) => !on), 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    cancelledRef.current = false

    async function typeLines() {
      for (const line of BOOT_LINES) {
        if (cancelledRef.current) return
        await new Promise<void>((resolve) => {
          let i = 0
          const step = () => {
            if (cancelledRef.current) return resolve()
            i++
            setRenderedLines((prev) => {
              const next = [...prev]
              next[next.length - 1] = line.text.slice(0, i)
              return next
            })
            if (i < line.text.length) {
              timeoutsRef.current.push(setTimeout(step, TYPE_SPEED))
            } else {
              timeoutsRef.current.push(
                setTimeout(resolve, line.delayAfter ?? LINE_PAUSE),
              )
            }
          }
          setRenderedLines((prev) => [...prev, ''])
          step()
        })
      }
      if (cancelledRef.current) return

      const start = Date.now()
      const duration = 900
      const tick = () => {
        if (cancelledRef.current) return
        const elapsed = Date.now() - start
        const pct = Math.min(100, Math.round((elapsed / duration) * 100))
        setProgress(pct)
        if (pct < 100) {
          timeoutsRef.current.push(setTimeout(tick, 30))
        } else {
          setBootPhase('ready')
        }
      }
      tick()
    }

    typeLines()

    return () => {
      cancelledRef.current = true
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
      setRenderedLines([])
      setProgress(0)
    }
  }, [])

  useEffect(() => {
    const skipToReady = () => {
      if (
        bootPhaseRef.current !== 'boot' ||
        screenPhaseRef.current !== 'booting'
      )
        return
      cancelledRef.current = true
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
      setRenderedLines(BOOT_LINES.map((line) => line.text))
      setProgress(100)
      setBootPhase('ready')
    }
    window.addEventListener('keydown', skipToReady)
    window.addEventListener('pointerdown', skipToReady)

    return () => {
      window.removeEventListener('keydown', skipToReady)
      window.removeEventListener('pointerdown', skipToReady)
    }
  }, [])

  useEffect(() => {
    if (bootPhase !== 'ready') return

    const finish = () => setScreenPhase('desktop')
    window.addEventListener('keydown', finish)
    window.addEventListener('pointerdown', finish)

    return () => {
      window.removeEventListener('keydown', finish)
      window.removeEventListener('pointerdown', finish)
    }
  }, [bootPhase])

  useEffect(() => {
    function updateRect() {
      const rect = screenRef.current?.getBoundingClientRect()
      if (!rect) return
      setScreenRect({
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      })
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [])

  useEffect(() => {
    if (screenPhase !== 'desktop') return

    function updateHitPos() {
      const rect = screenRef.current?.getBoundingClientRect()
      if (!rect) return
      const aspect = rect.width / rect.height
      const barY = rect.height - TASKBAR_HEIGHT
      const centerX = (START_X + START_WIDTH / 2) / rect.width
      const centerY = (barY + START_Y + START_HEIGHT / 2) / rect.height
      const [wx, wy] = inverseWarp(centerX, centerY, aspect, DESKTOP_STRENGTH)
      setStartHitPos({
        x: rect.left + wx * rect.width,
        y: rect.top + wy * rect.height,
      })
    }

    updateHitPos()
    window.addEventListener('resize', updateHitPos)
    return () => window.removeEventListener('resize', updateHitPos)
  }, [screenPhase])

  const showPrompt = bootPhase === 'ready'

  const drawBoot = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      ctx.fillStyle = `rgb(${BOOT_BG_COLOR[0] * 255}, ${BOOT_BG_COLOR[1] * 255}, ${BOOT_BG_COLOR[2] * 255})`
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.textBaseline = 'top'
      ctx.font = `${FONT_SIZE}px "Jersey 10", monospace`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(255,255,255,0.6)'
      ctx.shadowBlur = 6

      let y = PADDING_Y
      renderedLines.forEach((line) => {
        ctx.fillText(line, PADDING_X, y)
        y += LINE_HEIGHT
      })

      if (cursorOn && !showPrompt && renderedLines.length > 0) {
        const lastLine = renderedLines[renderedLines.length - 1]
        const textWidth = ctx.measureText(lastLine).width
        const cursorY = PADDING_Y + (renderedLines.length - 1) * LINE_HEIGHT
        ctx.fillRect(PADDING_X + textWidth + 2, cursorY, 12, FONT_SIZE)
      }

      if (progress > 0) {
        const barY = PADDING_Y + renderedLines.length * LINE_HEIGHT + 18

        ctx.shadowBlur = 0
        const bracketOpen = '['
        ctx.fillText(bracketOpen, PADDING_X, barY)
        const bracketWidth = ctx.measureText(bracketOpen).width

        const blockCount = 25
        const blockGap = 3
        const barInnerWidth = FONT_SIZE * 10
        const blockWidth = (barInnerWidth - blockGap * (blockCount - 1)) / blockCount
        const blockHeight = FONT_SIZE * 0.55
        const blockY = barY + FONT_SIZE * 0.22
        const barInnerX = PADDING_X + bracketWidth + 4
        const filledBlocks = Math.round((progress / 100) * blockCount)

        for (let i = 0; i < blockCount; i++) {
          const x = barInnerX + i * (blockWidth + blockGap)
          ctx.fillStyle = i < filledBlocks ? '#ffffff' : 'rgba(255,255,255,0.15)'
          ctx.fillRect(x, blockY, blockWidth, blockHeight)
        }
        ctx.fillStyle = '#ffffff'

        const bracketX = barInnerX + blockCount * (blockWidth + blockGap)
        ctx.shadowBlur = 6
        ctx.fillText(']', bracketX, barY)
        const bracketCloseWidth = ctx.measureText(']').width
        ctx.fillText(` ${progress}%`, bracketX + bracketCloseWidth, barY)

        if (showPrompt) {
          const promptY = barY + LINE_HEIGHT + 6
          const promptText = 'Press any key to continue'
          ctx.fillText(promptText, PADDING_X, promptY)
          if (cursorOn) {
            const textWidth = ctx.measureText(promptText).width
            ctx.fillRect(PADDING_X + textWidth + 2, promptY, 12, FONT_SIZE)
          }
        }
      }

      ctx.restore()
    },
    [renderedLines, progress, showPrompt, cursorOn],
  )

  const drawTaskbar = useCallback(
    (ctx: CanvasRenderingContext2D, widthCss: number, barY: number, startActive: boolean) => {
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(0, barY, widthCss, TASKBAR_HEIGHT)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, barY, widthCss, 2)

      const startY = barY + START_Y
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(START_X, startY, START_WIDTH, START_HEIGHT)
      drawBevel(ctx, START_X, startY, START_WIDTH, START_HEIGHT, !startActive)

      const logoSize = 14
      const logoX = START_X + START_PADDING_X + (startActive ? 1 : 0)
      const logoY = startY + (START_HEIGHT - logoSize) / 2 + (startActive ? 1 : 0)
      const cell = 6
      ctx.fillStyle = '#f25022'
      ctx.fillRect(logoX, logoY, cell, cell)
      ctx.fillStyle = '#7fba00'
      ctx.fillRect(logoX + cell + 1, logoY, cell, cell)
      ctx.fillStyle = '#00a4ef'
      ctx.fillRect(logoX, logoY + cell + 1, cell, cell)
      ctx.fillStyle = '#ffb900'
      ctx.fillRect(logoX + cell + 1, logoY + cell + 1, cell, cell)

      ctx.fillStyle = '#000000'
      ctx.font = 'bold 14px ui-monospace, "Courier New", Consolas, monospace'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        'Start',
        logoX + logoSize + 6 + (startActive ? 1 : 0),
        startY + START_HEIGHT / 2 + 1 + (startActive ? 1 : 0),
      )

      const dividerY = barY + DIVIDER_Y
      ctx.fillStyle = '#808080'
      ctx.fillRect(DIVIDER_X, dividerY, 1, 28)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(DIVIDER_X + 1, dividerY, 1, 28)

      const trayX = widthCss - BAR_PADDING - TRAY_WIDTH
      const trayY = barY + TRAY_Y
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(trayX, trayY, TRAY_WIDTH, TRAY_HEIGHT)
      drawBevel(ctx, trayX, trayY, TRAY_WIDTH, TRAY_HEIGHT, false)

      ctx.fillStyle = '#000000'
      ctx.font = '14px ui-monospace, "Courier New", Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(formatTime(new Date()), trayX + TRAY_WIDTH / 2, trayY + TRAY_HEIGHT / 2 + 1)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
    },
    [],
  )

  const drawDesktop = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      ctx.fillStyle = `rgb(${DESKTOP_BG_COLOR[0] * 255}, ${DESKTOP_BG_COLOR[1] * 255}, ${DESKTOP_BG_COLOR[2] * 255})`
      ctx.fillRect(0, 0, width, height)

      const gridSize = 48 * dpr
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()

      ctx.save()
      ctx.scale(dpr, dpr)
      const widthCss = width / dpr
      const heightCss = height / dpr
      drawTaskbar(ctx, widthCss, heightCss - TASKBAR_HEIGHT, startOpen)
      ctx.restore()
    },
    [drawTaskbar, startOpen],
  )

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      if (screenPhase === 'booting') {
        drawBoot(ctx, width, height, dpr)
      } else {
        drawDesktop(ctx, width, height, dpr)
      }
    },
    [screenPhase, drawBoot, drawDesktop],
  )

  const bgColor = screenPhase === 'booting' ? BOOT_BG_COLOR : DESKTOP_BG_COLOR
  const strength = screenPhase === 'booting' ? BOOT_STRENGTH : DESKTOP_STRENGTH
  const hasRect = screenRect.width > 0 && screenRect.height > 0
  const pathD = useMemo(
    () =>
      hasRect
        ? buildCrtPath(screenRect.width, screenRect.height, screenRect.width / screenRect.height, strength)
        : '',
    [hasRect, screenRect.width, screenRect.height, strength],
  )

  return (
    <>
      <div
        ref={screenRef}
        className={`crt-screen ${screenPhase === 'booting' ? 'crt-screen--booting' : 'crt-screen--desktop'}`}
        aria-hidden="true"
        style={hasRect ? { clipPath: `path("${pathD}")` } : undefined}
      >
        <CrtShaderCanvas
          draw={draw}
          bgColor={bgColor}
          strength={strength}
          className="crt-screen__canvas"
        />
        <div className="crt-screen__scanlines" />
        <div className="crt-screen__flicker" />
        <div className="crt-screen__vignette" />
      </div>

      {screenPhase === 'desktop' && (
        <div className="taskbar-hit">
          {startOpen && (
            <div
              className="taskbar-hit__start-menu"
              style={{
                left: startHitPos.x - START_WIDTH / 2,
                top: startHitPos.y - START_HEIGHT / 2 - 4,
                transform: 'translateY(-100%)',
              }}
            >
              <a href="#about">About</a>
              <a href="#projects">Projects</a>
              <a href="#contact">Contact</a>
            </div>
          )}
          <button
            type="button"
            className="taskbar-hit__start"
            aria-label="Start"
            style={{
              left: startHitPos.x - START_WIDTH / 2,
              top: startHitPos.y - START_HEIGHT / 2,
            }}
            onClick={() => setStartOpen((open) => !open)}
          />
        </div>
      )}
    </>
  )
}

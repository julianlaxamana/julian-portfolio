import { useEffect, useRef, useState } from 'react'
import CrtCanvas from './CrtCanvas'
import './BootScreen.css'

interface BootScreenProps {
  onDone: () => void
}

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

export default function BootScreen({ onDone }: BootScreenProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'boot' | 'ready'>('boot')
  const [cursorOn, setCursorOn] = useState(true)
  const phaseRef = useRef(phase)
  const cancelledRef = useRef(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

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
          setPhase('ready')
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
      if (phaseRef.current !== 'boot') return
      cancelledRef.current = true
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
      setRenderedLines(BOOT_LINES.map((line) => line.text))
      setProgress(100)
      setPhase('ready')
    }
    window.addEventListener('keydown', skipToReady)
    window.addEventListener('pointerdown', skipToReady)

    return () => {
      window.removeEventListener('keydown', skipToReady)
      window.removeEventListener('pointerdown', skipToReady)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'ready') return

    window.addEventListener('keydown', onDone)
    window.addEventListener('pointerdown', onDone)

    return () => {
      window.removeEventListener('keydown', onDone)
      window.removeEventListener('pointerdown', onDone)
    }
  }, [phase, onDone])

  return (
    <>
      <div className="boot-screen__backdrop" />
      <div className="boot-screen" aria-hidden="true">
        <CrtCanvas
          lines={renderedLines}
          progress={progress}
          showPrompt={phase === 'ready'}
          showCursor={cursorOn}
        />
        <div className="boot-screen__scanlines" />
        <div className="boot-screen__flicker" />
        <div className="boot-screen__vignette" />
      </div>
    </>
  )
}

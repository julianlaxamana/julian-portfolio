import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './Window.css'

const TITLEBAR_HEIGHT = 30
const MINIMIZE_TRANSITION = { duration: 0.28, ease: [0.4, 0, 1, 1] as const }
const CLOSE_TRANSITION = { duration: 0.18, ease: [0.4, 0, 1, 1] as const }
const OPEN_TRANSITION = { duration: 0.22, ease: [0, 0, 0.2, 1] as const }
const SNAP_TRANSITION = { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const }

// Mirrors .window / .window__titlebar / .window__controls / .window__button
// in Window.css. Kept in sync manually — used to place click targets that
// compensate for the CRT warp filter (see getWindowControlCenters below).
const WINDOW_BORDER_WIDTH = 2
const CONTROLS_PADDING_RIGHT = 4
const CONTROLS_GAP = 4
const BUTTON_WIDTH = 28
const BUTTON_HEIGHT = 26

export type WindowRect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

// The CRT warp filter on the windows layer bends what's drawn without moving
// the underlying DOM boxes, so native click hit-testing lands where the
// button *would* be unwarped, not where it's actually rendered. CrtScreen
// uses these flat centers (run through the same inverseWarp it uses for the
// taskbar) to place invisible, correctly-positioned click targets on top.
// `rect` is the window's content-box rect (x/y are the border-box position,
// width/height are the CSS `width`/`height` values, i.e. content-box size),
// matching the WindowRect passed to <Window rect=.../>.
export function getWindowControlCenters(rect: WindowRect): {
  minimize: Point
  maximize: Point
  close: Point
} {
  const y = rect.y + TITLEBAR_HEIGHT / 2
  const contentRight = rect.x + WINDOW_BORDER_WIDTH + rect.width
  const closeX = contentRight - CONTROLS_PADDING_RIGHT - BUTTON_WIDTH / 2
  const maximizeX = closeX - (BUTTON_WIDTH + CONTROLS_GAP)
  const minimizeX = maximizeX - (BUTTON_WIDTH + CONTROLS_GAP)
  return {
    minimize: { x: minimizeX, y },
    maximize: { x: maximizeX, y },
    close: { x: closeX, y },
  }
}

export const WINDOW_BUTTON_SIZE = { width: BUTTON_WIDTH, height: BUTTON_HEIGHT }

type WindowProps = {
  title: string
  icon?: ReactNode
  children?: ReactNode
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  rect: WindowRect
  maximizedRect: WindowRect
  minimizeTarget?: { x: number; y: number }
  onClose: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
  onFocus: () => void
  onRectChange: (rect: Partial<WindowRect>) => void
}

export default function Window({
  title,
  icon,
  children,
  isOpen,
  isMinimized,
  isMaximized,
  zIndex,
  rect,
  maximizedRect,
  minimizeTarget,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onRectChange,
}: WindowProps) {
  const [isDragging, setIsDragging] = useState(false)

  const activeRect = isMaximized ? maximizedRect : rect
  const targetX = isMinimized && minimizeTarget ? minimizeTarget.x : activeRect.x
  const targetY = isMinimized && minimizeTarget ? minimizeTarget.y : activeRect.y
  const transition = isDragging
    ? { duration: 0 }
    : isMinimized
      ? MINIMIZE_TRANSITION
      : isMaximized
        ? SNAP_TRANSITION
        : OPEN_TRANSITION

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="window"
          style={{ zIndex, pointerEvents: isMinimized ? 'none' : 'auto' }}
          aria-hidden={isMinimized}
          initial={{ opacity: 0, scale: 0.9, x: rect.x, y: rect.y, width: rect.width, height: rect.height }}
          animate={{
            opacity: isMinimized ? 0 : 1,
            scale: isMinimized ? 0.08 : 1,
            x: targetX,
            y: targetY,
            width: activeRect.width,
            height: activeRect.height,
          }}
          exit={{ opacity: 0, scale: 0.85, transition: CLOSE_TRANSITION }}
          transition={{ ...transition, width: { duration: 0 }, height: { duration: 0 } }}
          drag={!isMaximized && !isMinimized}
          dragMomentum={false}
          dragElastic={0}
          onPointerDown={onFocus}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_, info) => {
            setIsDragging(false)
            onRectChange({ x: rect.x + info.offset.x, y: rect.y + info.offset.y })
          }}
        >
          <div
            className="window__titlebar"
            style={{ height: TITLEBAR_HEIGHT }}
            onDoubleClick={onToggleMaximize}
          >
            <div className="window__titlebar-text">
              {icon && <span className="window__icon">{icon}</span>}
              <span className="window__title">{title}</span>
            </div>
            <div className="window__controls">
              <button
                type="button"
                className="window__button window__button--minimize"
                aria-label="Minimize"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={onMinimize}
              >
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <rect x="1" y="7" width="8" height="2" />
                </svg>
              </button>
              <button
                type="button"
                className="window__button window__button--maximize"
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={onToggleMaximize}
              >
                {isMaximized ? (
                  <svg viewBox="0 0 10 10" aria-hidden="true">
                    <rect x="2" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M1 3 V9 H7" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 10 10" aria-hidden="true">
                    <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="window__button window__button--close"
                aria-label="Close"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={onClose}
              >
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="window__body">{children}</div>
          <div className="window__crt-overlay" aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

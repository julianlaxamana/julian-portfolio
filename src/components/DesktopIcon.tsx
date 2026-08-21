import { type ReactNode, type RefObject } from 'react'
import { motion, useMotionValue, animate } from 'motion/react'
import './DesktopIcon.css'

export type IconPosition = { x: number; y: number }

type DesktopIconProps = {
  label: string
  position: IconPosition
  selected: boolean
  containerRef: RefObject<HTMLElement | null>
  onSelect: () => void
  onOpen: () => void
  // Resolves a raw drop position (e.g. against grid/collision rules) and
  // returns where the icon should actually end up, so the caller can drive
  // the motion values directly instead of relying on the `animate` prop —
  // which won't re-trigger when the resolved position is unchanged from
  // before the drag (e.g. snapping back after landing on an occupied tile).
  onPositionChange: (position: IconPosition) => IconPosition
  children: ReactNode
}

const SNAP_TRANSITION = { duration: 0.15, ease: 'easeOut' as const }

export default function DesktopIcon({
  label,
  position,
  selected,
  containerRef,
  onSelect,
  onOpen,
  onPositionChange,
  children,
}: DesktopIconProps) {
  const x = useMotionValue(position.x)
  const y = useMotionValue(position.y)

  return (
    <motion.div
      className={`desktop-icon${selected ? ' desktop-icon--selected' : ''}`}
      style={{ x, y, pointerEvents: 'auto', zIndex: 0 }}
      role="button"
      tabIndex={0}
      aria-label={label}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      onDragEnd={(_, info) => {
        const dropped = { x: position.x + info.offset.x, y: position.y + info.offset.y }
        const resolved = onPositionChange(dropped)
        animate(x, resolved.x, SNAP_TRANSITION)
        animate(y, resolved.y, SNAP_TRANSITION)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="desktop-icon__glyph">{children}</div>
      <span className="desktop-icon__label">{label}</span>
    </motion.div>
  )
}

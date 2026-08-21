import { useState, type ReactNode, type RefObject } from 'react'
import { motion } from 'motion/react'
import './DesktopIcon.css'

export type IconPosition = { x: number; y: number }

type DesktopIconProps = {
  label: string
  position: IconPosition
  selected: boolean
  containerRef: RefObject<HTMLElement | null>
  onSelect: () => void
  onOpen: () => void
  onPositionChange: (position: IconPosition) => void
  children: ReactNode
}

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
  const [isDragging, setIsDragging] = useState(false)

  return (
    <motion.div
      className={`desktop-icon${selected ? ' desktop-icon--selected' : ''}`}
      style={{ pointerEvents: 'auto', zIndex: 0 }}
      role="button"
      tabIndex={0}
      aria-label={label}
      initial={false}
      animate={{ x: position.x, y: position.y }}
      transition={isDragging ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false)
        onPositionChange({ x: position.x + info.offset.x, y: position.y + info.offset.y })
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

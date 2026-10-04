import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import CrtShaderCanvas from './CrtShaderCanvas'
import Window, { getWindowControlCenters, WINDOW_BUTTON_SIZE, type Point, type WindowRect } from './Window'
import DesktopIcon, { type IconPosition } from './DesktopIcon'
import AboutContent from './AboutContent'
import ContactContent from './ContactContent'
import SkillsContent from './SkillsContent'
import ProjectsContent from './ProjectsContent'
import ProjectWindowContent from './ProjectWindowContent'
import { getProjectById } from '../data/projects'
import './CrtScreen.css'

const FONT_SIZE = 30
const LINE_HEIGHT = FONT_SIZE * 1.5
const PADDING_X = 36
const PADDING_Y = 32
const BOOT_BG_COLOR: [number, number, number] = [5 / 255, 7 / 255, 10 / 255]
const DESKTOP_BG_COLOR: [number, number, number] = [245 / 255, 196 / 255, 0]

const TASKBAR_HEIGHT = 46
const BAR_PADDING = 12
const START_PADDING_X = 12
const START_WIDTH = 100
const START_HEIGHT = TASKBAR_HEIGHT
const GAP = 10
const DIVIDER_WIDTH = 2
const DIVIDER_HEIGHT = 32
const TRAY_WIDTH = 104
const TRAY_HEIGHT = 30
const SOUND_ICON_SIZE = 22
const SOUND_ICON_GAP = 14

const START_X = 0
const START_Y = 0
const DIVIDER_X = START_X + START_WIDTH + GAP
const DIVIDER_Y = (TASKBAR_HEIGHT - DIVIDER_HEIGHT) / 2
const TRAY_Y = (TASKBAR_HEIGHT - TRAY_HEIGHT) / 2

const TASKBAR_ICONS: { key: string; label: string; href: string }[] = [
  { key: 'about', label: 'About', href: '#about' },
  { key: 'projects', label: 'Projects', href: '#projects' },
  { key: 'contact', label: 'Contact', href: '#contact' },
  { key: 'skills', label: 'Skills', href: '#skills' },
]
const ICON_BUTTON_SIZE = 40
const ICON_GAP = 12
const ICONS_X = DIVIDER_X + DIVIDER_WIDTH + GAP + 4
const ICONS_Y = (TASKBAR_HEIGHT - ICON_BUTTON_SIZE) / 2
const TOOLTIP_GAP = 12
const TOOLTIP_HEIGHT = 26
const TOOLTIP_PADDING_X = 12

type BaseWindowKey = 'about' | 'projects' | 'contact' | 'skills'
type ProjectWindowKey = `project:${string}`
type WindowKey = BaseWindowKey | ProjectWindowKey
type DesktopIconKey = 'about' | 'projects' | 'contact' | 'skills'

type WindowInstanceState = {
  open: boolean
  minimized: boolean
  maximized: boolean
  rect: WindowRect
  restoreRect?: WindowRect
  z: number
}

const WINDOW_TITLES: Record<BaseWindowKey, string> = {
  about: 'About Me',
  projects: 'Projects',
  contact: 'Contact',
  skills: 'Skills',
}

const DEFAULT_WINDOW_RECT: Record<BaseWindowKey, WindowRect> = {
  about: { x: 170, y: 100, width: 560, height: 360 },
  projects: { x: 150, y: 110, width: 600, height: 400 },
  contact: { x: 200, y: 90, width: 520, height: 320 },
  skills: { x: 760, y: 220, width: 420, height: 300 },
}

const PROJECT_WINDOW_KEY_PREFIX = 'project:'
const PROJECT_WINDOW_DEFAULT_RECT: WindowRect = { x: 250, y: 140, width: 560, height: 460 }
const PROJECT_WINDOW_CASCADE = 32

function isProjectWindowKey(key: string): key is ProjectWindowKey {
  return key.startsWith(PROJECT_WINDOW_KEY_PREFIX)
}

function projectWindowKey(projectId: string): ProjectWindowKey {
  return `${PROJECT_WINDOW_KEY_PREFIX}${projectId}`
}

function projectIdFromKey(key: ProjectWindowKey): string {
  return key.slice(PROJECT_WINDOW_KEY_PREFIX.length)
}

function getWindowTitle(key: WindowKey): string {
  if (isProjectWindowKey(key)) {
    return getProjectById(projectIdFromKey(key))?.title ?? 'Project'
  }
  return WINDOW_TITLES[key]
}

function createInitialWindowStates(): Record<string, WindowInstanceState> {
  const keys: BaseWindowKey[] = ['about', 'projects', 'contact', 'skills']
  return Object.fromEntries(
    keys.map((key) => [
      key,
      { open: false, minimized: false, maximized: false, rect: { ...DEFAULT_WINDOW_RECT[key] }, z: 0 },
    ]),
  )
}

const MENU_WIDTH = 260
const MENU_ITEM_HEIGHT = 50
const MENU_PADDING = 10
const MENU_ICON_SIZE = 26
const MENU_ICON_LEFT = MENU_PADDING + 6
const MENU_TEXT_LEFT = MENU_ICON_LEFT + MENU_ICON_SIZE + 10
const MENU_ITEMS: { label: string; href: string }[] = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]
const MENU_HEIGHT = MENU_ITEMS.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2
const MENU_ANIM_DURATION = 220

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

const PRELOAD_IMAGE_SRCS = ['/julian.jpg', '/julian2.jpg', '/julian3.jpg', '/ucla.png', '/ccc.png']

type Line = { text: string; delayAfter?: number }

const BOOT_ASCII_ART = [
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠤⠐⠒⠒⠠⠤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠔⠉⢀⡆⠀⠀⠀⠀⠀⠀⠑⢄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⣴⠃⡄⢀⠏⢀⠎⠀⢀⠀⠀⡀⠀⠈⡷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⣸⡇⣸⠀⡜⠀⡼⠁⠀⠎⠀⢀⡇⠀⣰⢸⢱⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⢰⢿⡇⡏⣸⡇⢰⢣⣆⡾⢠⢠⢾⣱⣄⣿⣰⡆⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⢸⣾⣿⣷⣿⣾⣿⣿⢿⣵⣿⠟⠾⠟⡿⣿⣿⣇⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⢸⣟⣿⣿⡗⣟⣛⣗⠋⠓⠁⢾⣿⣿⣶⠈⣾⣿⡞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⡇⢟⣿⡷⠄⠀⠀⠀⠁⠛⠁⢰⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠘⠿⣿⣷⡲⡉⠀⠀⠀⡀⠀⠀⠀⠀⡾⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⠿⢕⣄⠀⠬⠿⠥⠒⢀⡼⣟⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⣿⣿⣶⡬⠵⡊⡇⡇⣹⡵⢤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡤⣞⣿⣿⣻⡒⣷⢷⡵⣯⡋⠒⢍⡓⢦⣄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⢀⠔⣚⡫⠗⠺⢿⠿⡿⣼⣾⣟⡛⠛⠁⠈⠑⠢⢌⡝⠣⡑⣧⡀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⢸⡿⣴⣷⠀⠀⠀⡹⢓⡟⢒⠏⠁⣀⢀⡀⠀⢠⡜⠈⢆⠱⣸⣇⡀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⢀⢷⣣⣠⢏⡀⠀⢠⠁⡼⠁⣬⠶⣶⣿⣽⠧⠤⢿⣧⠀⠈⢢⣈⡞⢧⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⢀⡮⠛⣿⣿⠀⠀⠉⠇⣸⠃⡘⠙⠒⢫⣶⡄⠀⡰⠟⣿⣿⣿⣿⠿⡈⢎⢣⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⢠⣿⠃⣸⣿⣘⣢⣤⣼⠤⡯⣰⣁⣀⣀⣈⣉⣀⣴⣁⣠⣿⣿⣿⡇⠀⠑⡄⢣⣣⠀⠀⠀⠀',
  '⠀⠀⠀⢠⣿⣷⣿⣿⣿⣿⣿⣿⣿⣴⣿⣬⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠙⢻⣿⣄⠀⠈⢆⠱⣣⡀⠀⠀',
  '⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠀⠉⢿⣿⣿⣦⠧⡘⣷⡀⠀',
  '⠀⣰⣿⣿⣿⣿⣿⡿⠃⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⢻⣿⣿⡟⠀⠀⠀⠀⠀⢻⣿⡟⠁⠙⡌⣿⡄',
  '⣰⣿⣿⣿⣿⣿⡟⠀⢀⣿⣿⣿⣿⣿⣿⣿⡿⠟⢛⠁⠀⣼⢿⣿⡇⠀⠀⠀⢀⡴⠚⠉⠀⠀⢀⣸⣾⡇',
  '⣿⣿⣿⣿⠿⠿⠷⣶⣴⣿⣿⣿⡟⢫⡏⠀⡇⢠⠫⡱⢌⠁⠻⣿⣧⠀⣀⡾⢋⣠⣴⣶⣾⣿⣿⡿⠋⠁',
  '⠻⣿⣿⣿⣷⣶⣿⣿⣿⣿⣿⣧⡇⢸⠇⢠⠃⠈⠑⢌⠢⣳⣤⣿⣿⠻⠿⣱⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀',
  '⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⢿⣿⣿⣷⣾⣤⣄⣀⡀⣽⢹⣿⣿⣷⣦⣴⣿⣿⣿⡿⠟⠉⠀⠀⠀⠀⠀',
]

const BOOT_LINES: Line[] = [
  { text: 'JULIAN-BIOS (C) 2026 J. LAXAMANA SYSTEMS', delayAfter: 100 },
  { text: 'CPU: PORTFOLIO-CORE @ 3.80GHz' },
  { text: 'Running memory test...' },
  { text: '655360K OK', delayAfter: 80 },
  { text: '' },
  { text: 'Detecting drives...' },
  { text: '  Primary Master  : JULIAN_PORTFOLIO.DRV' },
  { text: '  Primary Slave   : COFFEE.SYS' },
  { text: '  Secondary Master: NOT DETECTED', delayAfter: 80 },
  { text: '' },
  { text: 'Loading PORTFOLIO.EXE ...', delayAfter: 60 },
]

const TYPE_SPEED = 12
const CHARS_PER_STEP = 3
const LINE_PAUSE = 30
const PROGRESS_DURATION = 500
const POWER_ON_SWAP_DELAY = 90
const POWER_ON_DURATION = 420
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

// buildWarpDisplacementMap (below) encodes each axis as `128 + (dPx/scale) *
// 127`. feDisplacementMap decodes a channel as `scale * (color/255 - 0.5)`,
// whose zero point is 127.5, not 128 — so the displacement it actually
// applies comes out to `dPx * (127/255)`, roughly half of the true
// forwardWarp offset. The windows layer's *visual* bend is this weaker,
// already-rendered warp, not the full-strength one, so hit targets placed on
// top (see getWindowControlCenters/windowControlHits) need to solve for the
// same weakened mapping or they overshoot past the real button position.
const WARP_RENDER_FACTOR = 127 / 255

function renderedForwardWarp(
  x: number,
  y: number,
  aspect: number,
  strength: number,
): [number, number] {
  const [fx, fy] = forwardWarp(x, y, aspect, strength)
  return [x + (fx - x) * WARP_RENDER_FACTOR, y + (fy - y) * WARP_RENDER_FACTOR]
}

function renderedInverseWarp(
  targetX: number,
  targetY: number,
  aspect: number,
  strength: number,
): [number, number] {
  let x = targetX
  let y = targetY
  for (let i = 0; i < 8; i++) {
    const [fx, fy] = renderedForwardWarp(x, y, aspect, strength)
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
type CrtGeometry = { d: string; safeRect: WindowRect }

function buildCrtPath(w: number, h: number, aspect: number, strength: number): CrtGeometry {
  const rPx = Math.min(CORNER_RADIUS, w / 2, h / 2)
  const rx = rPx / w
  const ry = rPx / h

  const src: [number, number][] = []
  // Segment membership per point, for deriving the inscribed safe rect below:
  // corners count toward both edges they connect (e.g. the top-left corner
  // constrains both the top and left safe bounds).
  const seg: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }[] = []

  const line = (x0: number, y0: number, x1: number, y1: number, n: number, tag: (typeof seg)[number]) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n
      src.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
      seg.push(tag)
    }
  }
  const arc = (cx: number, cy: number, a0: number, a1: number, n: number, tag: (typeof seg)[number]) => {
    for (let i = 1; i <= n; i++) {
      const t = a0 + (a1 - a0) * (i / n)
      src.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)])
      seg.push(tag)
    }
  }

  src.push([rx, 0])
  seg.push({ top: true })
  line(rx, 0, 1 - rx, 0, EDGE_SEGMENTS, { top: true })
  arc(1 - rx, ry, -HALF_PI, 0, CORNER_SEGMENTS, { top: true, right: true })
  line(1, ry, 1, 1 - ry, EDGE_SEGMENTS, { right: true })
  arc(1 - rx, 1 - ry, 0, HALF_PI, CORNER_SEGMENTS, { bottom: true, right: true })
  line(1 - rx, 1, rx, 1, EDGE_SEGMENTS, { bottom: true })
  arc(rx, 1 - ry, HALF_PI, Math.PI, CORNER_SEGMENTS, { bottom: true, left: true })
  line(0, 1 - ry, 0, ry, EDGE_SEGMENTS, { left: true })
  arc(rx, ry, Math.PI, Math.PI * 1.5, CORNER_SEGMENTS, { top: true, left: true })

  const pts = src.map(([sx, sy]) => {
    const [dx, dy] = inverseWarp(sx, sy, aspect, strength)
    return [dx * w, dy * h]
  })

  const [first, ...rest] = pts
  const d =
    `M ${first[0]} ${first[1]} ` +
    rest.map(([x, y]) => `L ${x} ${y}`).join(' ') +
    ' Z'

  // Largest axis-aligned rect inscribed in the warped boundary: for each
  // side, the worst-case (most intruding) point among that side's edge and
  // adjoining corners sets that side's safe bound. Keeps window chrome
  // (titlebars, edges) from being cut off by the CRT curvature.
  const minX = Math.max(...pts.filter((_, i) => seg[i].left).map(([x]) => x))
  const maxX = Math.min(...pts.filter((_, i) => seg[i].right).map(([x]) => x))
  const minY = Math.max(...pts.filter((_, i) => seg[i].top).map(([, y]) => y))
  const maxY = Math.min(...pts.filter((_, i) => seg[i].bottom).map(([, y]) => y))

  return {
    d,
    safeRect: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  }
}

const WARP_MAP_RES = 96

// Firefox rasterizes SVG filters on the CPU, so warping the whole windows
// layer with feDisplacementMap makes every drag/animation frame stutter.
// Windows render flat there; the canvas layers still get the curvature.
const SUPPORTS_FAST_WINDOW_WARP = !/firefox/i.test(navigator.userAgent)

type WarpDisplacementMap = { dataUrl: string; scale: number }

// Builds an SVG feDisplacementMap texture that reproduces forwardWarp, so DOM
// content (windows) can be bent with the same curvature the shader applies to
// canvas layers. R/G channels encode x/y displacement in pixels, centered at
// 128 and scaled to fit the 0-255 range; `scale` is the matching
// feDisplacementMap scale attribute (in px, since primitiveUnits is
// userSpaceOnUse) needed to decode them back.
function buildWarpDisplacementMap(
  width: number,
  height: number,
  aspect: number,
  strength: number,
): WarpDisplacementMap | null {
  if (width <= 0 || height <= 0) return null
  const res = WARP_MAP_RES
  const canvas = document.createElement('canvas')
  canvas.width = res
  canvas.height = res
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const dx = new Float32Array(res * res)
  const dy = new Float32Array(res * res)
  let maxAbs = 1
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1)
      const v = j / (res - 1)
      const [wu, wv] = forwardWarp(u, v, aspect, strength)
      const idx = j * res + i
      const dxPx = (wu - u) * width
      const dyPx = (wv - v) * height
      dx[idx] = dxPx
      dy[idx] = dyPx
      maxAbs = Math.max(maxAbs, Math.abs(dxPx), Math.abs(dyPx))
    }
  }

  const scale = maxAbs * 1.05
  const imageData = ctx.createImageData(res, res)
  for (let idx = 0; idx < res * res; idx++) {
    const p = idx * 4
    imageData.data[p] = 128 + (dx[idx] / scale) * 127
    imageData.data[p + 1] = 128 + (dy[idx] / scale) * 127
    imageData.data[p + 2] = 128
    imageData.data[p + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  return { dataUrl: canvas.toDataURL(), scale }
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
  const highlight = 'rgba(255, 255, 255, 0.75)'
  const shadow = 'rgba(23, 55, 92, 0.3)'

  ctx.strokeStyle = raised ? highlight : shadow
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 0.5, y + h - 0.5)
  ctx.lineTo(x + 0.5, y + 0.5)
  ctx.lineTo(x + w - 0.5, y + 0.5)
  ctx.stroke()

  ctx.strokeStyle = raised ? shadow : highlight
  ctx.beginPath()
  ctx.moveTo(x + w - 0.5, y + 0.5)
  ctx.lineTo(x + w - 0.5, y + h - 0.5)
  ctx.lineTo(x + 0.5, y + h - 0.5)
  ctx.stroke()
}

function drawAboutIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const cx = x + size / 2
  ctx.fillStyle = '#f2b705'
  ctx.beginPath()
  ctx.arc(cx, y + size * 0.34, size * 0.17, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + size * 0.24, y + size * 0.86)
  ctx.quadraticCurveTo(x + size * 0.24, y + size * 0.56, cx, y + size * 0.56)
  ctx.quadraticCurveTo(x + size * 0.76, y + size * 0.56, x + size * 0.76, y + size * 0.86)
  ctx.closePath()
  ctx.fill()
}

function drawProjectsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const w = size * 0.74
  const h = size * 0.5
  const fx = x + (size - w) / 2
  const fy = y + size * 0.34

  ctx.fillStyle = '#f2b705'
  ctx.fillRect(fx, fy - size * 0.08, w * 0.45, size * 0.1)

  ctx.fillStyle = '#ffce3d'
  ctx.fillRect(fx, fy, w, h)
  ctx.strokeStyle = '#8a6d1a'
  ctx.lineWidth = 1
  ctx.strokeRect(fx + 0.5, fy + 0.5, w - 1, h - 1)
}

function drawContactIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const w = size * 0.74
  const h = size * 0.52
  const fx = x + (size - w) / 2
  const fy = y + (size - h) / 2

  ctx.fillStyle = '#ffce3d'
  ctx.fillRect(fx, fy, w, h)
  ctx.strokeStyle = '#8a6d1a'
  ctx.lineWidth = 1
  ctx.strokeRect(fx + 0.5, fy + 0.5, w - 1, h - 1)

  ctx.beginPath()
  ctx.moveTo(fx, fy)
  ctx.lineTo(fx + w / 2, fy + h * 0.58)
  ctx.lineTo(fx + w, fy)
  ctx.stroke()
}

function drawSkillsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const w = size * 0.6
  const h = size * 0.8
  const fx = x + (size - w) / 2
  const fy = y + (size - h) / 2
  const fold = size * 0.16

  ctx.fillStyle = '#ffce3d'
  ctx.beginPath()
  ctx.moveTo(fx, fy)
  ctx.lineTo(fx + w - fold, fy)
  ctx.lineTo(fx + w, fy + fold)
  ctx.lineTo(fx + w, fy + h)
  ctx.lineTo(fx, fy + h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8a6d1a'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#f2b705'
  ctx.beginPath()
  ctx.moveTo(fx + w - fold, fy)
  ctx.lineTo(fx + w - fold, fy + fold)
  ctx.lineTo(fx + w, fy + fold)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#8a6d1a'
  const lineWidth = w * 0.7
  const lineX = fx + w * 0.15
  const lineH = Math.max(1, size * 0.05)
  ctx.fillRect(lineX, fy + h * 0.45, lineWidth, lineH)
  ctx.fillRect(lineX, fy + h * 0.6, lineWidth, lineH)
  ctx.fillRect(lineX, fy + h * 0.75, lineWidth * 0.6, lineH)
}

const TASKBAR_ICON_DRAWERS: Record<
  string,
  (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void
> = {
  about: drawAboutIcon,
  projects: drawProjectsIcon,
  contact: drawContactIcon,
  skills: drawSkillsIcon,
}

const MENU_ICON_DRAWERS: Record<
  string,
  (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void
> = {
  '#about': drawAboutIcon,
  '#projects': drawProjectsIcon,
  '#contact': drawContactIcon,
  '#skills': drawSkillsIcon,
}

function AboutIconGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="34" r="17" fill="#f2b705" />
      <path d="M24 86 Q24 56 50 56 Q76 56 76 86 Z" fill="#f2b705" />
    </svg>
  )
}

function ProjectsIconGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="13" y="26" width="33" height="10" fill="#f2b705" />
      <rect x="13" y="34" width="74" height="50" fill="#ffce3d" stroke="#8a6d1a" strokeWidth="1" />
    </svg>
  )
}

function ContactIconGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="13" y="30" width="74" height="52" fill="#ffce3d" stroke="#8a6d1a" strokeWidth="1" />
      <path d="M13 30 L50 60 L87 30" fill="none" stroke="#8a6d1a" strokeWidth="3" />
    </svg>
  )
}

function SkillsIconGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M20 10 H65 L80 25 V90 H20 Z" fill="#ffce3d" stroke="#8a6d1a" strokeWidth="1" />
      <path d="M65 10 V25 H80 Z" fill="#f2b705" stroke="#8a6d1a" strokeWidth="1" />
      <rect x="30" y="44" width="40" height="6" fill="#8a6d1a" />
      <rect x="30" y="58" width="40" height="6" fill="#8a6d1a" />
      <rect x="30" y="72" width="26" height="6" fill="#8a6d1a" />
    </svg>
  )
}

const DESKTOP_ICON_CONFIG: { key: DesktopIconKey; label: string }[] = [
  { key: 'about', label: 'About Me' },
  { key: 'projects', label: 'Projects' },
  { key: 'contact', label: 'Contact' },
  { key: 'skills', label: 'skills.txt' },
]

const DESKTOP_ICON_GLYPHS: Record<DesktopIconKey, () => ReactElement> = {
  about: AboutIconGlyph,
  projects: ProjectsIconGlyph,
  contact: ContactIconGlyph,
  skills: SkillsIconGlyph,
}

const DESKTOP_ICON_GAP_Y = 120
const DEFAULT_ICON_POSITIONS: Record<DesktopIconKey, IconPosition> = {
  about: { x: 28, y: 28 },
  projects: { x: 28, y: 28 + DESKTOP_ICON_GAP_Y },
  contact: { x: 28, y: 28 + DESKTOP_ICON_GAP_Y * 2 },
  skills: { x: 28, y: 28 + DESKTOP_ICON_GAP_Y * 3 },
}

const ICON_GRID_ORIGIN: IconPosition = { x: 28, y: 28 }
const ICON_GRID_CELL = { width: 112, height: DESKTOP_ICON_GAP_Y }

function iconGridCell(pos: IconPosition): { col: number; row: number } {
  return {
    col: Math.max(0, Math.round((pos.x - ICON_GRID_ORIGIN.x) / ICON_GRID_CELL.width)),
    row: Math.max(0, Math.round((pos.y - ICON_GRID_ORIGIN.y) / ICON_GRID_CELL.height)),
  }
}

function iconCellToPosition(col: number, row: number): IconPosition {
  return {
    x: ICON_GRID_ORIGIN.x + col * ICON_GRID_CELL.width,
    y: ICON_GRID_ORIGIN.y + row * ICON_GRID_CELL.height,
  }
}

function gridCellKey(col: number, row: number) {
  return `${col},${row}`
}

// Snaps to the nearest grid cell, unless that tile is already occupied by
// another icon, in which case the drag is rejected — the caller should keep
// the icon at its pre-drag position instead of stacking two icons on one tile.
function snapToIconGrid(pos: IconPosition, occupiedCells: Set<string>): IconPosition | null {
  const { col, row } = iconGridCell(pos)
  if (occupiedCells.has(gridCellKey(col, row))) return null
  return iconCellToPosition(col, row)
}

function drawSoundIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  muted: boolean,
) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(x + size * 0.08, y + size * 0.35)
  ctx.lineTo(x + size * 0.34, y + size * 0.35)
  ctx.lineTo(x + size * 0.56, y + size * 0.14)
  ctx.lineTo(x + size * 0.56, y + size * 0.86)
  ctx.lineTo(x + size * 0.34, y + size * 0.65)
  ctx.lineTo(x + size * 0.08, y + size * 0.65)
  ctx.closePath()
  ctx.fill()

  if (muted) {
    ctx.strokeStyle = '#e2231a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + size * 0.64, y + size * 0.28)
    ctx.lineTo(x + size * 0.92, y + size * 0.72)
    ctx.moveTo(x + size * 0.92, y + size * 0.28)
    ctx.lineTo(x + size * 0.64, y + size * 0.72)
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.22, -Math.PI / 4, Math.PI / 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.34, -Math.PI / 4, Math.PI / 4)
    ctx.stroke()
  }
}

function drawIconTooltip(
  ctx: CanvasRenderingContext2D,
  iconCenterX: number,
  iconTopY: number,
  label: string,
) {
  ctx.font = '16px "Jersey 10", monospace'
  const textWidth = ctx.measureText(label).width
  const boxWidth = textWidth + TOOLTIP_PADDING_X * 2
  const boxX = iconCenterX - boxWidth / 2
  const boxY = iconTopY - TOOLTIP_GAP - TOOLTIP_HEIGHT

  ctx.fillStyle = '#ffffe1'
  ctx.fillRect(boxX, boxY, boxWidth, TOOLTIP_HEIGHT)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxWidth - 1, TOOLTIP_HEIGHT - 1)

  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, boxX + TOOLTIP_PADDING_X, boxY + TOOLTIP_HEIGHT / 2 + 1)
}

export default function CrtScreen() {
  const [renderedLines, setRenderedLines] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [bootPhase, setBootPhase] = useState<'boot' | 'ready'>('boot')
  const [screenPhase, setScreenPhase] = useState<'booting' | 'desktop'>('booting')
  const [poweringOn, setPoweringOn] = useState(false)
  const [cursorOn, setCursorOn] = useState(true)
  const [startOpen, setStartOpen] = useState(false)
  const [startHitPos, setStartHitPos] = useState({ x: START_X + START_WIDTH / 2, y: START_Y + START_HEIGHT / 2 })
  const [menuItemHits, setMenuItemHits] = useState<
    { label: string; href: string; x: number; y: number }[]
  >([])
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null)
  const [taskbarIconHits, setTaskbarIconHits] = useState<
    { key: string; label: string; href: string; x: number; y: number }[]
  >([])
  const [hoveredTaskbarIcon, setHoveredTaskbarIcon] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [clockText, setClockText] = useState(() => formatTime(new Date()))
  const [hoveredSound, setHoveredSound] = useState(false)
  const [soundHitPos, setSoundHitPos] = useState({ x: 0, y: 0 })
  const [screenRect, setScreenRect] = useState({ width: 0, height: 0, left: 0, top: 0 })
  const [windows, setWindows] = useState<Record<string, WindowInstanceState>>(createInitialWindowStates)
  const [iconPositions, setIconPositions] =
    useState<Record<DesktopIconKey, IconPosition>>(DEFAULT_ICON_POSITIONS)
  const [selectedIcon, setSelectedIcon] = useState<DesktopIconKey | null>(null)
  // Mirrors iconPositions synchronously so drag-end collision checks always
  // read the latest positions, independent of React's state-update timing.
  const iconPositionsRef = useRef(iconPositions)
  const windowZRef = useRef(0)
  const bootPhaseRef = useRef(bootPhase)
  const screenPhaseRef = useRef(screenPhase)
  const cancelledRef = useRef(false)
  const poweringOnRef = useRef(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const screenRef = useRef<HTMLDivElement>(null)
  const menuTransitionRef = useRef({ from: 0, to: 0, start: 0 })
  const menuTRef = useRef(0)
  const halftoneRef = useRef<{ dpr: number; pattern: CanvasPattern | null }>({
    dpr: 0,
    pattern: null,
  })

  useEffect(() => {
    bootPhaseRef.current = bootPhase
  }, [bootPhase])

  useEffect(() => {
    screenPhaseRef.current = screenPhase
  }, [screenPhase])

  useEffect(() => {
    if (screenPhase !== 'booting') return
    const interval = setInterval(() => setCursorOn((on) => !on), 500)
    return () => clearInterval(interval)
  }, [screenPhase])

  // Only re-renders (and so only redraws the taskbar) when the minute changes.
  useEffect(() => {
    if (screenPhase !== 'desktop') return
    const interval = setInterval(() => setClockText(formatTime(new Date())), 1000)
    return () => clearInterval(interval)
  }, [screenPhase])

  // Warm the browser cache for images used once the desktop appears (About
  // window photos, school logos) during the boot animation, so they're
  // already loaded by the time windows can open.
  useEffect(() => {
    PRELOAD_IMAGE_SRCS.forEach((src) => {
      const img = new Image()
      img.src = src
    })
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
            i = Math.min(line.text.length, i + CHARS_PER_STEP)
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
      const duration = PROGRESS_DURATION
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
    if (bootPhase !== 'ready' || screenPhase !== 'booting') return

    const finish = () => {
      if (poweringOnRef.current) return
      poweringOnRef.current = true
      setPoweringOn(true)
      // Swap the underlying screen content while the flash overlay is near
      // full opacity, so the boot -> desktop cut is hidden behind the bloom
      // instead of visible as a hard jump cut.
      timeoutsRef.current.push(setTimeout(() => setScreenPhase('desktop'), POWER_ON_SWAP_DELAY))
      timeoutsRef.current.push(
        setTimeout(() => {
          setPoweringOn(false)
          poweringOnRef.current = false
        }, POWER_ON_DURATION),
      )
    }
    window.addEventListener('keydown', finish)
    window.addEventListener('pointerdown', finish)

    return () => {
      window.removeEventListener('keydown', finish)
      window.removeEventListener('pointerdown', finish)
    }
  }, [bootPhase, screenPhase])

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

      // Menu items are drawn directly into the warped taskbar canvas layer
      // (see drawStartMenu), so their click targets are found the same way
      // as the Start button: warp each item's pre-warp center point.
      const menuTopY = barY - MENU_HEIGHT
      const itemCenterX = START_X + MENU_WIDTH / 2
      const hits = MENU_ITEMS.map((item, i) => {
        const itemCenterY = menuTopY + MENU_PADDING + i * MENU_ITEM_HEIGHT + MENU_ITEM_HEIGHT / 2
        const [ix, iy] = inverseWarp(
          itemCenterX / rect.width,
          itemCenterY / rect.height,
          aspect,
          DESKTOP_STRENGTH,
        )
        return {
          label: item.label,
          href: item.href,
          x: rect.left + ix * rect.width,
          y: rect.top + iy * rect.height,
        }
      })
      setMenuItemHits(hits)

      // Taskbar quick-launch icons, warped the same way.
      const iconCenterY = barY + ICONS_Y + ICON_BUTTON_SIZE / 2
      const iconHits = TASKBAR_ICONS.map((icon, i) => {
        const iconCenterX = ICONS_X + i * (ICON_BUTTON_SIZE + ICON_GAP) + ICON_BUTTON_SIZE / 2
        const [ix, iy] = inverseWarp(
          iconCenterX / rect.width,
          iconCenterY / rect.height,
          aspect,
          DESKTOP_STRENGTH,
        )
        return {
          key: icon.key,
          label: icon.label,
          href: icon.href,
          x: rect.left + ix * rect.width,
          y: rect.top + iy * rect.height,
        }
      })
      setTaskbarIconHits(iconHits)

      // Mute button, warped the same way, positioned just left of the tray clock.
      const trayX = rect.width - BAR_PADDING - TRAY_WIDTH
      const soundIconX = trayX - SOUND_ICON_GAP - SOUND_ICON_SIZE
      const soundIconY = barY + (TASKBAR_HEIGHT - SOUND_ICON_SIZE) / 2
      const [sx, sy] = inverseWarp(
        (soundIconX + SOUND_ICON_SIZE / 2) / rect.width,
        (soundIconY + SOUND_ICON_SIZE / 2) / rect.height,
        aspect,
        DESKTOP_STRENGTH,
      )
      setSoundHitPos({
        x: rect.left + sx * rect.width,
        y: rect.top + sy * rect.height,
      })
    }

    updateHitPos()
    window.addEventListener('resize', updateHitPos)
    return () => window.removeEventListener('resize', updateHitPos)
  }, [screenPhase])

  useEffect(() => {
    menuTransitionRef.current = {
      from: menuTRef.current,
      to: startOpen ? 1 : 0,
      start: performance.now(),
    }
    if (!startOpen) setHoveredMenuIndex(null)
  }, [startOpen])

  const focusWindow = useCallback((key: WindowKey) => {
    windowZRef.current = windowZRef.current >= 40 ? 1 : windowZRef.current + 1
    const z = windowZRef.current
    setWindows((prev) => ({ ...prev, [key]: { ...prev[key], z } }))
  }, [])

  const openWindow = useCallback(
    (key: WindowKey) => {
      setWindows((prev) => {
        const win = prev[key]
        if (win.open && !win.minimized) return prev
        return { ...prev, [key]: { ...win, open: true, minimized: false } }
      })
      focusWindow(key)
    },
    [focusWindow],
  )

  useEffect(() => {
    if (screenPhase !== 'desktop') return
    setWindows((prev) => {
      const win = prev.about
      if (win.open && !win.minimized) return prev
      return { ...prev, about: { ...win, open: true, minimized: false } }
    })
    setWindows((prev) => {
      const win = prev.skills
      if (win.open && !win.minimized) return prev
      return { ...prev, skills: { ...win, open: true, minimized: false } }
    })
    focusWindow('skills')
    focusWindow('about')
  }, [screenPhase, focusWindow])

  const closeWindow = useCallback((key: WindowKey) => {
    setWindows((prev) => {
      const win = prev[key]
      return {
        ...prev,
        [key]: {
          ...win,
          open: false,
          minimized: false,
          maximized: false,
          rect: win.restoreRect ?? win.rect,
          restoreRect: undefined,
        },
      }
    })
  }, [])

  const minimizeWindow = useCallback((key: WindowKey) => {
    setWindows((prev) => ({ ...prev, [key]: { ...prev[key], minimized: true } }))
  }, [])

  const toggleMaximizeWindow = useCallback(
    (key: WindowKey) => {
      setWindows((prev) => {
        const win = prev[key]
        if (win.maximized) {
          return {
            ...prev,
            [key]: { ...win, maximized: false, rect: win.restoreRect ?? win.rect, restoreRect: undefined },
          }
        }
        if (screenRect.width <= 0 || screenRect.height <= 0) {
          return { ...prev, [key]: { ...win, maximized: true } }
        }
        const aspect = screenRect.width / screenRect.height
        const { safeRect } = buildCrtPath(screenRect.width, screenRect.height, aspect, DESKTOP_STRENGTH)
        return {
          ...prev,
          [key]: {
            ...win,
            maximized: true,
            restoreRect: win.rect,
            rect: { ...win.rect, x: safeRect.x, y: safeRect.y },
          },
        }
      })
    },
    [screenRect],
  )

  const updateWindowRect = useCallback((key: WindowKey, rect: Partial<WindowRect>) => {
    setWindows((prev) => ({ ...prev, [key]: { ...prev[key], rect: { ...prev[key].rect, ...rect } } }))
  }, [])

  const launchWindow = useCallback(
    (key: WindowKey) => {
      const win = windows[key]
      if (win.open && win.minimized) {
        setWindows((prev) => ({ ...prev, [key]: { ...prev[key], minimized: false } }))
        focusWindow(key)
      } else if (win.open) {
        focusWindow(key)
      } else {
        openWindow(key)
      }
    },
    [windows, focusWindow, openWindow],
  )

  const openProjectWindow = useCallback(
    (projectId: string) => {
      const key = projectWindowKey(projectId)
      setWindows((prev) => {
        const existing = prev[key]
        if (existing) {
          if (existing.open && !existing.minimized) return prev
          return { ...prev, [key]: { ...existing, open: true, minimized: false } }
        }
        const cascadeIndex = Object.keys(prev).filter((k) => isProjectWindowKey(k)).length % 5
        const offset = cascadeIndex * PROJECT_WINDOW_CASCADE
        return {
          ...prev,
          [key]: {
            open: true,
            minimized: false,
            maximized: false,
            rect: {
              ...PROJECT_WINDOW_DEFAULT_RECT,
              x: PROJECT_WINDOW_DEFAULT_RECT.x + offset,
              y: PROJECT_WINDOW_DEFAULT_RECT.y + offset,
            },
            z: 0,
          },
        }
      })
      focusWindow(key)
    },
    [focusWindow],
  )

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

      const widthCss = width / dpr
      const artFontSize = 15
      const artLineHeight = artFontSize * 1.1
      ctx.font = `${artFontSize}px monospace`
      const artWidth = Math.max(...BOOT_ASCII_ART.map((line) => ctx.measureText(line).width))
      if (widthCss - PADDING_X * 2 - artWidth > 200) {
        ctx.shadowColor = 'rgba(255,255,255,0.5)'
        ctx.fillStyle = '#ffffff'
        const artX = widthCss - PADDING_X - artWidth
        const artY = PADDING_Y

        // Reveal the art top-to-bottom, one row at a time, in lockstep with
        // the loading bar — same typewriter-with-cursor language as the boot
        // lines above, so it reads as another part of the system "loading in".
        const exactRow = (progress / 100) * BOOT_ASCII_ART.length
        const fullRows = Math.floor(exactRow)
        const partialFraction = exactRow - fullRows

        BOOT_ASCII_ART.forEach((line, i) => {
          if (i > fullRows) return
          ctx.shadowBlur = cursorOn ? 4 : 2.5
          if (i < fullRows) {
            ctx.fillText(line, artX, artY + i * artLineHeight)
            return
          }
          const chars = Math.round(line.length * partialFraction)
          const partial = line.slice(0, chars)
          ctx.fillText(partial, artX, artY + i * artLineHeight)
          if (cursorOn) {
            const partialWidth = ctx.measureText(partial).width
            ctx.shadowBlur = 0
            ctx.fillRect(artX + partialWidth + 1, artY + i * artLineHeight, 6, artFontSize)
          }
        })
      }

      ctx.restore()
    },
    [renderedLines, progress, showPrompt, cursorOn],
  )

  const drawTaskbar = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      widthCss: number,
      barY: number,
      startActive: boolean,
      hoveredIcon: string | null,
      muted: boolean,
      hoveredSound: boolean,
      clockText: string,
    ) => {
      const barGradient = ctx.createLinearGradient(0, barY, 0, barY + TASKBAR_HEIGHT)
      barGradient.addColorStop(0, '#bfe3ff')
      barGradient.addColorStop(0.45, '#8fc9f7')
      barGradient.addColorStop(1, '#5aa3e8')
      ctx.fillStyle = barGradient
      ctx.fillRect(0, barY, widthCss, TASKBAR_HEIGHT)
      ctx.fillStyle = '#e8f5ff'
      ctx.fillRect(0, barY, widthCss, 2)

      const startY = barY + START_Y
      const startGradient = ctx.createLinearGradient(0, startY, 0, startY + START_HEIGHT)
      startGradient.addColorStop(0, '#a3e386')
      startGradient.addColorStop(0.45, '#77c455')
      startGradient.addColorStop(1, '#4f9c37')
      ctx.fillStyle = startGradient
      ctx.fillRect(START_X, startY, START_WIDTH, START_HEIGHT)
      drawBevel(ctx, START_X, startY, START_WIDTH, START_HEIGHT, !startActive)

      const logoSize = 16
      const logoX = START_X + START_PADDING_X + (startActive ? 1 : 0)
      const logoY = startY + (START_HEIGHT - logoSize) / 2 + (startActive ? 1 : 0)
      const cell = 7
      ctx.fillStyle = '#f25022'
      ctx.fillRect(logoX, logoY, cell, cell)
      ctx.fillStyle = '#7fba00'
      ctx.fillRect(logoX + cell + 1, logoY, cell, cell)
      ctx.fillStyle = '#00a4ef'
      ctx.fillRect(logoX, logoY + cell + 1, cell, cell)
      ctx.fillStyle = '#ffb900'
      ctx.fillRect(logoX + cell + 1, logoY + cell + 1, cell, cell)

      ctx.fillStyle = '#ffffff'
      ctx.font = '20px "Jersey 10", monospace'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        'Start',
        logoX + logoSize + 6 + (startActive ? 1 : 0),
        startY + START_HEIGHT / 2 + 1 + (startActive ? 1 : 0),
      )

      const dividerY = barY + DIVIDER_Y
      ctx.fillStyle = '#808080'
      ctx.fillRect(DIVIDER_X, dividerY, 1, DIVIDER_HEIGHT)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(DIVIDER_X + 1, dividerY, 1, DIVIDER_HEIGHT)

      TASKBAR_ICONS.forEach((icon, i) => {
        const iconX = ICONS_X + i * (ICON_BUTTON_SIZE + ICON_GAP)
        const iconY = barY + ICONS_Y
        const hovered = hoveredIcon === icon.key

        if (hovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.fillRect(iconX, iconY, ICON_BUTTON_SIZE, ICON_BUTTON_SIZE)
          drawBevel(ctx, iconX, iconY, ICON_BUTTON_SIZE, ICON_BUTTON_SIZE, true)
        }

        TASKBAR_ICON_DRAWERS[icon.key]?.(ctx, iconX, iconY, ICON_BUTTON_SIZE)
      })

      const trayX = widthCss - BAR_PADDING - TRAY_WIDTH
      const trayY = barY + TRAY_Y

      const soundIconX = trayX - SOUND_ICON_GAP - SOUND_ICON_SIZE
      const soundIconY = barY + (TASKBAR_HEIGHT - SOUND_ICON_SIZE) / 2
      if (hoveredSound) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.fillRect(soundIconX - 4, soundIconY - 4, SOUND_ICON_SIZE + 8, SOUND_ICON_SIZE + 8)
        drawBevel(ctx, soundIconX - 4, soundIconY - 4, SOUND_ICON_SIZE + 8, SOUND_ICON_SIZE + 8, true)
      }
      drawSoundIcon(ctx, soundIconX, soundIconY, SOUND_ICON_SIZE, muted)

      ctx.fillStyle = '#cfe8fb'
      ctx.fillRect(trayX, trayY, TRAY_WIDTH, TRAY_HEIGHT)
      drawBevel(ctx, trayX, trayY, TRAY_WIDTH, TRAY_HEIGHT, false)

      ctx.fillStyle = '#000000'
      ctx.font = '20px "Jersey 10", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(clockText, trayX + TRAY_WIDTH / 2, trayY + TRAY_HEIGHT / 2 + 1)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
    },
    [],
  )

  const drawDesktop = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      ctx.fillStyle = `rgb(${DESKTOP_BG_COLOR[0] * 255}, ${DESKTOP_BG_COLOR[1] * 255}, ${DESKTOP_BG_COLOR[2] * 255})`
      ctx.fillRect(0, 0, width, height)

      // Halftone dot texture (cached as a repeating pattern for perf),
      // radially masked so it fades out toward the edges.
      let halftone = halftoneRef.current
      if (halftone.dpr !== dpr || !halftone.pattern) {
        const tile = Math.max(1, Math.round(11 * dpr))
        const tileCanvas = document.createElement('canvas')
        tileCanvas.width = tile
        tileCanvas.height = tile
        const tctx = tileCanvas.getContext('2d')
        if (tctx) {
          tctx.fillStyle = 'rgba(222, 172, 20, 0.5)'
          tctx.beginPath()
          tctx.arc(tile / 2, tile / 2, Math.max(1, tile * 0.22), 0, Math.PI * 2)
          tctx.fill()
        }
        halftone = { dpr, pattern: ctx.createPattern(tileCanvas, 'repeat') }
        halftoneRef.current = halftone
      }
      if (halftone.pattern) {
        ctx.fillStyle = halftone.pattern
        ctx.fillRect(0, 0, width, height)

        const bgR = DESKTOP_BG_COLOR[0] * 255
        const bgG = DESKTOP_BG_COLOR[1] * 255
        const bgB = DESKTOP_BG_COLOR[2] * 255
        const cx = width / 2
        const cy = height / 2
        const radius = Math.hypot(cx, cy)
        const fade = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        fade.addColorStop(0, `rgba(${bgR}, ${bgG}, ${bgB}, 0)`)
        fade.addColorStop(0.5, `rgba(${bgR}, ${bgG}, ${bgB}, 0)`)
        fade.addColorStop(1, `rgba(${bgR}, ${bgG}, ${bgB}, 1)`)
        ctx.fillStyle = fade
        ctx.fillRect(0, 0, width, height)
      }

      // Persona 4-esque diagonal rainbow stripe band
      ctx.save()
      ctx.translate(width / 2, height / 2)
      ctx.rotate((-14 * Math.PI) / 180)
      const diag = Math.hypot(width, height)
      const unit = 6 * dpr
      const stripes: { color: string; weight: number }[] = [
        { color: '#ffffff', weight: 1 },
        { color: '#e2231a', weight: 1.4 },
        { color: '#f6c700', weight: 2.2 },
        { color: '#f39200', weight: 3 },
        { color: '#375e2f', weight: 1.2 },
        { color: '#8dc63f', weight: 1.6 },
        { color: '#4fc3e8', weight: 4 },
        { color: '#f6e400', weight: 1.6 },
        { color: '#7a6a23', weight: 1.2 },
        { color: '#e2231a', weight: 1 },
      ]
      let offset = height * 0.1
      for (const stripe of stripes) {
        const thickness = stripe.weight * unit
        ctx.fillStyle = stripe.color
        ctx.fillRect(-diag / 2, offset, diag, thickness)
        offset += thickness
      }
      ctx.restore()
    },
    [],
  )

  const drawStartMenu = useCallback(
    (ctx: CanvasRenderingContext2D, barY: number, t: number, hoveredIndex: number | null) => {
      if (t <= 0.001) return
      const menuTopY = barY - MENU_HEIGHT
      const slide = (1 - t) * (MENU_HEIGHT + 12)
      const y = menuTopY + slide

      ctx.save()
      ctx.globalAlpha = t

      const grad = ctx.createLinearGradient(0, y, 0, y + MENU_HEIGHT)
      grad.addColorStop(0, '#eaf6ff')
      grad.addColorStop(1, '#bfe0f7')
      ctx.fillStyle = grad
      ctx.fillRect(START_X, y, MENU_WIDTH, MENU_HEIGHT)

      if (hoveredIndex !== null) {
        const itemY = y + MENU_PADDING + hoveredIndex * MENU_ITEM_HEIGHT
        ctx.fillStyle = 'rgba(23, 55, 92, 0.15)'
        ctx.fillRect(START_X + 2, itemY, MENU_WIDTH - 4, MENU_ITEM_HEIGHT)
      }

      ctx.strokeStyle = 'rgba(23, 55, 92, 0.2)'
      ctx.lineWidth = 1
      for (let i = 1; i < MENU_ITEMS.length; i++) {
        const dividerY = Math.round(y + MENU_PADDING + i * MENU_ITEM_HEIGHT) + 0.5
        ctx.beginPath()
        ctx.moveTo(START_X + MENU_PADDING + 4, dividerY)
        ctx.lineTo(START_X + MENU_WIDTH - MENU_PADDING - 4, dividerY)
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(23, 55, 92, 0.35)'
      ctx.strokeRect(START_X + 0.5, y + 0.5, MENU_WIDTH - 1, MENU_HEIGHT - 1)

      ctx.font = '22px "Jersey 10", monospace'
      ctx.textBaseline = 'middle'
      MENU_ITEMS.forEach((item, i) => {
        const itemTop = y + MENU_PADDING + i * MENU_ITEM_HEIGHT
        const iconY = itemTop + (MENU_ITEM_HEIGHT - MENU_ICON_SIZE) / 2
        MENU_ICON_DRAWERS[item.href]?.(ctx, START_X + MENU_ICON_LEFT, iconY, MENU_ICON_SIZE)
      })

      ctx.fillStyle = '#3a3a3a'
      MENU_ITEMS.forEach((item, i) => {
        const itemCenterY = y + MENU_PADDING + i * MENU_ITEM_HEIGHT + MENU_ITEM_HEIGHT / 2
        ctx.fillText(item.label, START_X + MENU_TEXT_LEFT, itemCenterY + 1)
      })

      ctx.restore()
    },
    [],
  )

  // Rendered as its own warped layer, stacked above the desktop, so the
  // taskbar always visually sits in front of the Start menu instead of the
  // menu covering it. The menu is drawn into this same canvas (rather than
  // as a separate DOM overlay) so it goes through the same WebGL curvature
  // warp as everything else on the "screen".
  const drawTaskbarLayer = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.scale(dpr, dpr)
      const widthCss = width / dpr
      const heightCss = height / dpr
      const barY = heightCss - TASKBAR_HEIGHT

      const { from, to, start } = menuTransitionRef.current
      const elapsed = performance.now() - start
      const raw = Math.min(1, Math.max(0, elapsed / MENU_ANIM_DURATION))
      const eased = easeOutExpo(raw)
      menuTRef.current = from + (to - from) * eased

      drawStartMenu(ctx, barY, menuTRef.current, hoveredMenuIndex)
      drawTaskbar(ctx, widthCss, barY, startOpen, hoveredTaskbarIcon, muted, hoveredSound, clockText)

      const hoveredIndex = TASKBAR_ICONS.findIndex((icon) => icon.key === hoveredTaskbarIcon)
      if (hoveredIndex !== -1) {
        const icon = TASKBAR_ICONS[hoveredIndex]
        const iconX = ICONS_X + hoveredIndex * (ICON_BUTTON_SIZE + ICON_GAP)
        const iconCenterX = iconX + ICON_BUTTON_SIZE / 2
        const iconTopY = barY + ICONS_Y
        drawIconTooltip(ctx, iconCenterX, iconTopY, icon.label)
      }

      ctx.restore()
      // Keep rendering until the Start menu slide finishes.
      return raw < 1
    },
    [drawTaskbar, drawStartMenu, startOpen, hoveredMenuIndex, hoveredTaskbarIcon, muted, hoveredSound, clockText],
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
  const crtGeometry = useMemo(
    () =>
      hasRect
        ? buildCrtPath(screenRect.width, screenRect.height, screenRect.width / screenRect.height, strength)
        : null,
    [hasRect, screenRect.width, screenRect.height, strength],
  )
  const pathD = crtGeometry?.d ?? ''
  const windowsWarp = useMemo(
    () =>
      hasRect && screenPhase === 'desktop' && SUPPORTS_FAST_WINDOW_WARP
        ? buildWarpDisplacementMap(
            screenRect.width,
            screenRect.height,
            screenRect.width / screenRect.height,
            DESKTOP_STRENGTH,
          )
        : null,
    [hasRect, screenPhase, screenRect.width, screenRect.height],
  )

  const windowRenderData = (Object.keys(windows) as WindowKey[]).map((key) => {
    const win = windows[key]
    const minimizeIconKey = isProjectWindowKey(key) ? 'projects' : key
    const iconHit = taskbarIconHits.find((icon) => icon.key === minimizeIconKey)
    const minimizeTarget = iconHit
      ? { x: iconHit.x - screenRect.left, y: iconHit.y - screenRect.top }
      : { x: startHitPos.x - screenRect.left, y: startHitPos.y - screenRect.top }
    const safeRect = crtGeometry?.safeRect ?? { x: 0, y: 0, width: screenRect.width, height: screenRect.height }
    const maximizedRect: WindowRect = {
      x: safeRect.x,
      y: safeRect.y,
      width: safeRect.width,
      height: Math.max(0, Math.min(safeRect.height, screenRect.height - TASKBAR_HEIGHT - safeRect.y)),
    }
    return { key, win, minimizeTarget, maximizedRect }
  })

  // The CRT warp filter on the windows layer only bends what's painted, not
  // the underlying DOM boxes, so native clicks on the titlebar buttons land
  // where they'd be unwarped rather than where they're actually drawn. These
  // invisible, correctly-positioned buttons (rendered outside the filtered
  // layer, same trick as the taskbar hit targets above) fix that.
  const windowControlHits = hasRect
    ? windowRenderData
        .filter(({ win }) => win.open && !win.minimized)
        .map(({ key, win, maximizedRect }) => {
          const activeRect = win.maximized ? maximizedRect : win.rect
          const centers = getWindowControlCenters(activeRect)
          const aspect = screenRect.width / screenRect.height
          const warpToScreen = (p: Point): Point => {
            const [wu, wv] = renderedInverseWarp(
              p.x / screenRect.width,
              p.y / screenRect.height,
              aspect,
              windowsWarp ? DESKTOP_STRENGTH : 0,
            )
            return { x: screenRect.left + wu * screenRect.width, y: screenRect.top + wv * screenRect.height }
          }
          return {
            key,
            z: win.z,
            isMaximized: win.maximized,
            minimize: warpToScreen(centers.minimize),
            maximize: warpToScreen(centers.maximize),
            close: warpToScreen(centers.close),
          }
        })
    : []

  return (
    <>
      <div
        ref={screenRef}
        className={`crt-screen ${screenPhase === 'booting' ? 'crt-screen--booting' : 'crt-screen--desktop'}`}
        style={hasRect ? { clipPath: `path("${pathD}")` } : undefined}
        onClick={() => setSelectedIcon(null)}
      >
        <CrtShaderCanvas
          draw={draw}
          bgColor={bgColor}
          strength={strength}
          className="crt-screen__canvas"
        />

        {screenPhase === 'desktop' && (
          <CrtShaderCanvas
            draw={drawTaskbarLayer}
            bgColor={bgColor}
            strength={strength}
            className="crt-screen__canvas crt-screen__taskbar-layer"
          />
        )}

        {windowsWarp && (
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <defs>
              <filter
                id="crt-window-warp"
                x="0"
                y="0"
                width="100%"
                height="100%"
                primitiveUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feImage
                  href={windowsWarp.dataUrl}
                  x="0"
                  y="0"
                  width={screenRect.width}
                  height={screenRect.height}
                  preserveAspectRatio="none"
                  result="crtWindowWarpMap"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="crtWindowWarpMap"
                  scale={windowsWarp.scale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
        )}

        {screenPhase === 'desktop' && (
          <div
            className="crt-screen__windows-layer"
            style={windowsWarp ? { filter: 'url(#crt-window-warp)' } : undefined}
          >
            {DESKTOP_ICON_CONFIG.map(({ key, label }) => {
              const Glyph = DESKTOP_ICON_GLYPHS[key]
              return (
                <DesktopIcon
                  key={key}
                  label={label}
                  position={iconPositions[key]}
                  selected={selectedIcon === key}
                  containerRef={screenRef}
                  onSelect={() => setSelectedIcon(key)}
                  onOpen={() => launchWindow(key)}
                  onPositionChange={(pos) => {
                    const prev = iconPositionsRef.current
                    const occupied = new Set(
                      Object.entries(prev)
                        .filter(([otherKey]) => otherKey !== key)
                        .map(([, otherPos]) => {
                          const { col, row } = iconGridCell(otherPos as IconPosition)
                          return gridCellKey(col, row)
                        }),
                    )
                    const resolved = snapToIconGrid(pos, occupied) ?? prev[key]
                    const next = { ...prev, [key]: resolved }
                    iconPositionsRef.current = next
                    setIconPositions(next)
                    return resolved
                  }}
                >
                  <Glyph />
                </DesktopIcon>
              )
            })}
            {windowRenderData.map(({ key, win, minimizeTarget, maximizedRect }) => (
              <Window
                key={key}
                title={getWindowTitle(key)}
                isOpen={win.open}
                isMinimized={win.minimized}
                isMaximized={win.maximized}
                zIndex={win.z}
                rect={win.rect}
                maximizedRect={maximizedRect}
                minimizeTarget={minimizeTarget}
                onClose={() => closeWindow(key)}
                onMinimize={() => minimizeWindow(key)}
                onToggleMaximize={() => toggleMaximizeWindow(key)}
                onFocus={() => focusWindow(key)}
                onRectChange={(rect) => updateWindowRect(key, rect)}
              >
                {key === 'about' ? (
                  <AboutContent onOpenProject={openProjectWindow} />
                ) : key === 'contact' ? (
                  <ContactContent />
                ) : key === 'skills' ? (
                  <SkillsContent />
                ) : key === 'projects' ? (
                  <ProjectsContent onOpenProject={openProjectWindow} />
                ) : (
                  <ProjectWindowContent project={getProjectById(projectIdFromKey(key))} />
                )}
              </Window>
            ))}
          </div>
        )}

        <div className="crt-screen__overlay" aria-hidden="true">
          <div className="crt-screen__scanlines" />
          <div className="crt-screen__flicker" />
          <div className="crt-screen__vignette" />
        </div>

        {poweringOn && <div className="crt-screen__power-flash" aria-hidden="true" />}
      </div>

      {screenPhase === 'desktop' && (
        <div className="taskbar-hit">
          <button
            type="button"
            className="taskbar-hit__start"
            aria-label="Start"
            style={{
              left: startHitPos.x - START_WIDTH / 2,
              top: startHitPos.y - START_HEIGHT / 2,
              width: START_WIDTH,
              height: START_HEIGHT,
            }}
            onClick={() => setStartOpen((open) => !open)}
          />
          {taskbarIconHits.map((icon) => (
            <button
              type="button"
              key={icon.key}
              className="taskbar-hit__icon"
              aria-label={icon.label}
              style={{
                left: icon.x - ICON_BUTTON_SIZE / 2,
                top: icon.y - ICON_BUTTON_SIZE / 2,
                width: ICON_BUTTON_SIZE,
                height: ICON_BUTTON_SIZE,
              }}
              onClick={() => launchWindow(icon.key as WindowKey)}
              onMouseEnter={() => setHoveredTaskbarIcon(icon.key)}
              onMouseLeave={() =>
                setHoveredTaskbarIcon((cur) => (cur === icon.key ? null : cur))
              }
            />
          ))}
          <button
            type="button"
            className="taskbar-hit__icon"
            aria-label={muted ? 'Unmute' : 'Mute'}
            style={{
              left: soundHitPos.x - SOUND_ICON_SIZE / 2,
              top: soundHitPos.y - SOUND_ICON_SIZE / 2,
              width: SOUND_ICON_SIZE,
              height: SOUND_ICON_SIZE,
            }}
            onClick={() => setMuted((m) => !m)}
            onMouseEnter={() => setHoveredSound(true)}
            onMouseLeave={() => setHoveredSound(false)}
          />
        </div>
      )}

      {screenPhase === 'desktop' && windowControlHits.length > 0 && (
        <div className="window-controls-hit">
          {windowControlHits.map((hit) => (
            <Fragment key={hit.key}>
              <button
                type="button"
                className="window-controls-hit__button"
                aria-label="Minimize"
                style={{
                  zIndex: hit.z,
                  left: hit.minimize.x - WINDOW_BUTTON_SIZE.width / 2,
                  top: hit.minimize.y - WINDOW_BUTTON_SIZE.height / 2,
                  width: WINDOW_BUTTON_SIZE.width,
                  height: WINDOW_BUTTON_SIZE.height,
                }}
                onClick={() => minimizeWindow(hit.key)}
              />
              <button
                type="button"
                className="window-controls-hit__button"
                aria-label={hit.isMaximized ? 'Restore' : 'Maximize'}
                style={{
                  zIndex: hit.z,
                  left: hit.maximize.x - WINDOW_BUTTON_SIZE.width / 2,
                  top: hit.maximize.y - WINDOW_BUTTON_SIZE.height / 2,
                  width: WINDOW_BUTTON_SIZE.width,
                  height: WINDOW_BUTTON_SIZE.height,
                }}
                onClick={() => toggleMaximizeWindow(hit.key)}
              />
              <button
                type="button"
                className="window-controls-hit__button"
                aria-label="Close"
                style={{
                  zIndex: hit.z,
                  left: hit.close.x - WINDOW_BUTTON_SIZE.width / 2,
                  top: hit.close.y - WINDOW_BUTTON_SIZE.height / 2,
                  width: WINDOW_BUTTON_SIZE.width,
                  height: WINDOW_BUTTON_SIZE.height,
                }}
                onClick={() => closeWindow(hit.key)}
              />
            </Fragment>
          ))}
        </div>
      )}

      {screenPhase === 'desktop' && startOpen && (
        <div className="start-menu-hit">
          {menuItemHits.map((item, i) => (
            <button
              type="button"
              key={item.href}
              className="start-menu-hit__item"
              style={{
                left: item.x - MENU_WIDTH / 2,
                top: item.y - MENU_ITEM_HEIGHT / 2,
                width: MENU_WIDTH - MENU_PADDING * 2,
                height: MENU_ITEM_HEIGHT,
              }}
              aria-label={item.label}
              onClick={() => {
                setStartOpen(false)
                launchWindow(item.href.slice(1) as WindowKey)
              }}
              onMouseEnter={() => setHoveredMenuIndex(i)}
              onMouseLeave={() => setHoveredMenuIndex((cur) => (cur === i ? null : cur))}
            />
          ))}
        </div>
      )}
    </>
  )
}

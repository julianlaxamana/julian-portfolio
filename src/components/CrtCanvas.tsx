import { useEffect, useRef } from 'react'

interface CrtCanvasProps {
  lines: string[]
  progress: number
  showPrompt: boolean
  showCursor: boolean
}

const VERTEX_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uStrength;
uniform vec3 uBgColor;

void main() {
  vec2 cc = vUv - 0.5;
  float dist = dot(cc, cc);
  vec2 warped = vUv + cc * dist * uStrength;
  if (warped.x < 0.0 || warped.x > 1.0 || warped.y < 0.0 || warped.y > 1.0) {
    gl_FragColor = vec4(uBgColor, 1.0);
  } else {
    gl_FragColor = texture2D(uTexture, warped);
  }
}
`

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${info}`)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
  const program = gl.createProgram()!
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    throw new Error(`Program link error: ${info}`)
  }
  return program
}

const BG_COLOR: [number, number, number] = [5 / 255, 7 / 255, 10 / 255]
const FISHEYE_STRENGTH = 0.4
const FONT_SIZE = 28
const LINE_HEIGHT = FONT_SIZE * 1.5
const PADDING_X = 32
const PADDING_Y = 28

export default function CrtCanvas({
  lines,
  progress,
  showPrompt,
  showCursor,
}: CrtCanvasProps) {
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ lines, progress, showPrompt, showCursor })
  stateRef.current = { lines, progress, showPrompt, showCursor }

  useEffect(() => {
    const glCanvas = glCanvasRef.current
    if (!glCanvas) return

    const gl = glCanvas.getContext('webgl')
    if (!gl) return

    const sourceCanvas = document.createElement('canvas')
    const ctx = sourceCanvas.getContext('2d')!

    const program = createProgram(gl)
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    const uStrength = gl.getUniformLocation(program, 'uStrength')
    const uBgColor = gl.getUniformLocation(program, 'uBgColor')
    gl.uniform1f(uStrength, FISHEYE_STRENGTH)
    gl.uniform3f(uBgColor, BG_COLOR[0], BG_COLOR[1], BG_COLOR[2])

    let width = 0
    let height = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      width = Math.round(glCanvas!.clientWidth * dpr)
      height = Math.round(glCanvas!.clientHeight * dpr)
      glCanvas!.width = width
      glCanvas!.height = height
      sourceCanvas.width = width
      sourceCanvas.height = height
      gl!.viewport(0, 0, width, height)
    }

    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let stopped = false

    function drawSource() {
      const dpr = window.devicePixelRatio || 1
      const { lines: currentLines, progress: currentProgress, showPrompt: currentShowPrompt, showCursor: currentShowCursor } =
        stateRef.current

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = `rgb(${BG_COLOR[0] * 255}, ${BG_COLOR[1] * 255}, ${BG_COLOR[2] * 255})`
      ctx.fillRect(0, 0, width, height)

      ctx.scale(dpr, dpr)
      ctx.textBaseline = 'top'
      ctx.font = `${FONT_SIZE}px "Jersey 10", monospace`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(255,255,255,0.6)'
      ctx.shadowBlur = 6

      let y = PADDING_Y
      currentLines.forEach((line) => {
        ctx.fillText(line, PADDING_X, y)
        y += LINE_HEIGHT
      })

      if (
        currentShowCursor &&
        !currentShowPrompt &&
        currentLines.length > 0
      ) {
        const lastLine = currentLines[currentLines.length - 1]
        const textWidth = ctx.measureText(lastLine).width
        const cursorY = PADDING_Y + (currentLines.length - 1) * LINE_HEIGHT
        ctx.fillRect(PADDING_X + textWidth + 2, cursorY, 12, FONT_SIZE)
      }

      if (currentProgress > 0) {
        const barY = PADDING_Y + currentLines.length * LINE_HEIGHT + 18

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
        const filledBlocks = Math.round((currentProgress / 100) * blockCount)

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
        ctx.fillText(
          ` ${currentProgress}%`,
          bracketX + bracketCloseWidth,
          barY,
        )

        if (currentShowPrompt) {
          const promptY = barY + LINE_HEIGHT + 6
          const promptText = 'Press any key to continue'
          ctx.fillText(promptText, PADDING_X, promptY)
          if (currentShowCursor) {
            const textWidth = ctx.measureText(promptText).width
            ctx.fillRect(PADDING_X + textWidth + 2, promptY, 12, FONT_SIZE)
          }
        }
      }

      ctx.shadowBlur = 0
    }

    function frame() {
      if (stopped) return
      drawSource()
      gl!.bindTexture(gl!.TEXTURE_2D, texture)
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        sourceCanvas,
      )
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteTexture(texture)
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={glCanvasRef} className="boot-screen__canvas" />
}

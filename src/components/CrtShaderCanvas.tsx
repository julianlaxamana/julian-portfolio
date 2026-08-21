import { useEffect, useRef } from 'react'

export type CrtDrawFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
) => void

interface CrtShaderCanvasProps {
  draw: CrtDrawFn
  strength?: number
  bgColor?: [number, number, number]
  className?: string
  aspectCorrect?: boolean
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
uniform vec2 uResolution;
uniform float uAspectCorrect;

void main() {
  vec2 cc = vUv - 0.5;
  float aspect = mix(1.0, uResolution.x / uResolution.y, uAspectCorrect);
  vec2 ccAspect = vec2(cc.x * aspect, cc.y);
  float dist = dot(ccAspect, ccAspect);
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

const DEFAULT_BG_COLOR: [number, number, number] = [5 / 255, 7 / 255, 10 / 255]
const DEFAULT_STRENGTH = 0.4

export default function CrtShaderCanvas({
  draw,
  strength = DEFAULT_STRENGTH,
  bgColor = DEFAULT_BG_COLOR,
  className,
  aspectCorrect = true,
}: CrtShaderCanvasProps) {
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

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
    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uAspectCorrect = gl.getUniformLocation(program, 'uAspectCorrect')
    gl.uniform1f(uStrength, strength)
    gl.uniform3f(uBgColor, bgColor[0], bgColor[1], bgColor[2])
    gl.uniform1f(uAspectCorrect, aspectCorrect ? 1 : 0)

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
      gl!.uniform2f(uResolution, width, height)
    }

    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let stopped = false

    function frame() {
      if (stopped) return
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      drawRef.current(ctx, width, height, dpr)

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
  }, [strength, bgColor, aspectCorrect])

  return <canvas ref={glCanvasRef} className={className} />
}

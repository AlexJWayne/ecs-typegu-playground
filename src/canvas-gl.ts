import tgpu from "typegpu"
import { builtin, f32, vec2f, vec4f } from "typegpu/data"
import { add, cos, div, mul, sin, sub } from "typegpu/std"

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
export const canvas = document.createElement("canvas")
export let ctx: GPUCanvasContext
export const root = await tgpu.init()

export const canvasSize = 800

export function setupCanvasGl(): void {
  canvas.width = canvasSize
  canvas.height = canvasSize
  document.body.appendChild(canvas)

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })
}

export const quadToClipSpace = tgpu.fn(
  [vec2f, f32, builtin.vertexIndex],
  vec4f,
)((pos, size, idx) => {
  const quadVertices = [
    vec2f(-1, -1),
    vec2f(-1, 1),
    vec2f(1, 1),
    vec2f(1, 1),
    vec2f(1, -1),
    vec2f(-1, -1),
  ]
  const vertPos = add(pos, mul(size, quadVertices[idx]))
  const screenPos = mul(sub(div(vertPos, 800), 0.5), 2)
  screenPos.y *= -1
  return vec4f(screenPos, 0, 1)
})

export const quadUV = tgpu.fn(
  [builtin.vertexIndex],
  vec2f,
)((idx) => {
  const quadVertices = [
    vec2f(-1, -1),
    vec2f(-1, 1),
    vec2f(1, 1),
    vec2f(1, 1),
    vec2f(1, -1),
    vec2f(-1, -1),
  ]
  return quadVertices[idx]
})

export const step = tgpu.fn([f32, f32], f32)`(edge, x) {
  return step(edge, x);
}`

export const rotateVec2 = tgpu.fn(
  [vec2f, f32],
  vec2f,
)((vec, angle) => {
  const cosAngle = cos(angle)
  const sinAngle = sin(angle)
  return vec2f(
    vec.x * cosAngle - vec.y * sinAngle,
    vec.x * sinAngle + vec.y * cosAngle,
  )
})

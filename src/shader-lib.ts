import tgpu from "typegpu"
import { builtin, f32, vec2f } from "typegpu/data"
import { cos, sin } from "typegpu/std"

export const quadVert = tgpu.fn(
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

export const polarToCartesian = tgpu.fn(
  [vec2f],
  vec2f,
)((polar) => {
  const theta = polar.x
  const r = polar.y
  return vec2f(r * cos(theta), r * sin(theta))
})

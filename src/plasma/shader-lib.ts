import tgpu from "typegpu"
import { builtin, vec2f } from "typegpu/data"

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

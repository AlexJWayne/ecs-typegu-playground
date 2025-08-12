import tgpu from "typegpu"
import { vec2f, vec4f } from "typegpu/data"
import { clamp, length } from "typegpu/std"

export const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f },
  out: vec4f,
})(({ uv }) => {
  let a = clamp(1 - length(uv), 0, 1)
  return vec4f(1, 0, 0, a)
})

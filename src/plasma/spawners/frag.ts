import tgpu from "typegpu"
import { vec2f, vec4f } from "typegpu/data"
import { clamp, length } from "typegpu/std"

export const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f },
  out: vec4f,
})(({ uv }) => {
  let d = clamp(1 - length(uv), 0, 1)
  let a = d

  return vec4f(a, a, a, 1)
})

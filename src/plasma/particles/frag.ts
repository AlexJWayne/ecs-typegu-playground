import tgpu from "typegpu"
import { f32, vec2f, vec4f } from "typegpu/data"
import { clamp, length, pow } from "typegpu/std"

export const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f, completion: f32 },
  out: vec4f,
})(({ uv, completion }) => {
  // if (completion >= 1) return vec4f()

  let a = clamp(1 - length(uv), 0, 1)
  return vec4f(
    pow(a, 4), //
    pow(a, 8),
    1,
    pow(a, 1.2) * 0.2 * (1 - completion),
  )
  // return vec4f(
  //   1 - completion, //
  //   0,
  //   completion,
  //   completion,
  // )
})

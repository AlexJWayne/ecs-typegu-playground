import tgpu from "typegpu"
import { f32, vec2f, vec3f, vec4f } from "typegpu/data"
import { clamp, length, pow } from "typegpu/std"

export const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f, completion: f32 },
  out: vec4f,
})(({ uv, completion }) => {
  let d = clamp(1 - length(uv), 0, 1)
  const a = pow(d, 1.2) * 0.2 * (1 - completion)
  return vec4f(
    vec3f(
      pow(d, 4), //
      pow(d, 8),
      1,
    ).mul(a),
    1,
  )
})

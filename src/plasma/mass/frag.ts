import tgpu, { type TgpuBufferReadonly } from "typegpu"
import { vec2f, f32, vec4f } from "typegpu/data"
import { clamp, atan2, sin, length } from "typegpu/std"

import { type Uniforms } from "./render"

export function createFragShader(uniforms: TgpuBufferReadonly<Uniforms>) {
  const spinner = tgpu.fn(
    [vec2f, vec2f, f32],
    f32,
  )((uv, pos, mass) => {
    const theta = atan2(uv.y, uv.x)
    const offset = pos.x * 31 + pos.y * 73
    const rotSpeed = 6 * mass
    return (sin(theta * 2 + offset - uniforms.$.elapsed * rotSpeed) + 1) * 0.5
  })

  return tgpu["~unstable"].fragmentFn({
    in: {
      uv: vec2f,
      pos: vec2f,
      mass: f32,
    },
    out: vec4f,
  })(({ pos, uv, mass }) => {
    const a = clamp(1 - length(uv), 0, 1)
    const l = 1 - a

    return vec4f(
      l * 0.3, //
      l * 0.2,
      l,
      a,
    ).add(spinner(uv, pos, mass) * l * a)
  })
}

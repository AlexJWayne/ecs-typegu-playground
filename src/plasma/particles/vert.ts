import tgpu from "typegpu"
import { builtin, f32, vec2f, vec4f } from "typegpu/data"
import { atan2, clamp, cos, length, select, sin } from "typegpu/std"

import { quadVert, rotateVec2 } from "../shader-lib"

const SIZE = 0.008

export const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    vel: vec2f,
    lifetime: f32,
    age: f32,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
    completion: f32,
  },
})(({ idx, pos, vel, lifetime, age }) => {
  let localPos = quadVert(idx).mul(SIZE)
  localPos.x *= 1 + length(vel) * 10
  localPos.y *= 1 + length(vel) * -0.4

  const heading = atan2(vel.y, vel.x)
  localPos = rotateVec2(localPos, heading)

  const worldPos = pos.add(localPos)

  return {
    pos: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
    completion: select(clamp(age / lifetime, 0, 1), 0, lifetime === 0),
  }
})

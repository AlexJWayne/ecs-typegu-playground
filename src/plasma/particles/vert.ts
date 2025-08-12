import tgpu from "typegpu"
import { builtin, f32, vec2f, vec4f } from "typegpu/data"
import { atan2, cos, length, sin } from "typegpu/std"

import { quadVert, rotateVec2 } from "../shader-lib"

const SIZE = 0.008

export const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    vel: vec2f,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
  },
})(({ idx, pos, vel }) => {
  let localPos = quadVert(idx).mul(SIZE)
  localPos.x *= 1 + length(vel) * 6
  localPos.y *= 1 + length(vel) * -0.4

  const heading = atan2(vel.y, vel.x)
  localPos = rotateVec2(localPos, heading)

  const worldPos = pos.add(localPos)

  return {
    pos: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
  }
})

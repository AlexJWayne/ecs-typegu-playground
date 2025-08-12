import tgpu from "typegpu"
import { builtin, f32, vec2f, vec4f } from "typegpu/data"

import { quadVert } from "../shader-lib"

export const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    mass: f32,
  },
  out: {
    vert: builtin.position,
    uv: vec2f,
    pos: vec2f,
    mass: f32,
  },
})(({ idx, pos, mass }) => {
  let localPos = quadVert(idx).mul(mass * 0.1)
  const worldPos = pos.add(localPos)

  return {
    vert: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
    pos,
    mass,
  }
})

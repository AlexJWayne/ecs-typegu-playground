import tgpu from "typegpu"
import { builtin, f32, vec2f, vec4f } from "typegpu/data"

import { quadVert } from "../shader-lib"

export const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    radius: f32,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
  },
})(({ idx, pos, radius }) => {
  const localPos = quadVert(idx).mul(radius)
  const worldPos = pos.add(localPos)

  return {
    pos: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
  }
})

import { type World, query } from "bitecs"
import tgpu from "typegpu"
import {
  type Infer,
  arrayOf,
  builtin,
  f32,
  struct,
  vec2f,
  vec3f,
  vec4f,
} from "typegpu/data"
import { add, atan2, length, mul, sin, sub } from "typegpu/std"

import {
  ctx,
  presentationFormat,
  quadVert,
  root,
  step,
  worldToClipSpace,
} from "./canvas-gl"
import { Cell, Position, Radius } from "./components"

export function renderCells(world: World) {
  const cells = query(world, [Cell, Position])
  if (cells.length === 0) return

  if (cells.length > cellData.length) {
    throw new Error(
      `Buffer too small. Need ${cells.length} but only have ${cellData.length}`,
    )
  }

  for (const [i, cell] of cells.entries()) {
    cellData[i].pos.x = Position.x[cell]
    cellData[i].pos.y = Position.y[cell]
    cellData[i].size = Radius[cell]
  }
  cellBuffer.write(cellData)

  cellPipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "load",
      storeOp: "store",
    })
    .draw(6, cells.length)
}

const CellData = struct({
  pos: vec2f,
  size: f32,
})

const cellVertShader = tgpu["~unstable"].vertexFn({
  in: {
    pos: vec2f,
    size: f32,
    idx: builtin.vertexIndex,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
  },
})(({ pos, size, idx }) => {
  const localPos = quadVert(idx)
  return {
    pos: worldToClipSpace(add(mul(size, localPos), pos)),
    uv: localPos,
  }
})

const cellFragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f },
  out: vec4f,
})(({ uv }) => {
  const theta = atan2(uv.y, uv.x)
  const wavy = sin(theta * 12) * 0.03
  const fromCenter = sub(1, length(uv)) - wavy
  const alpha = step(0.2, fromCenter)
  return vec4f(0.5, fromCenter, 1, alpha)
})

const cellBufferCapacity = 200
const cellData: Infer<typeof CellData>[] = Array.from(
  { length: cellBufferCapacity },
  () => ({
    pos: vec2f(),
    size: 0,
  }),
)
const cellBuffer = root
  .createBuffer(arrayOf(CellData, cellBufferCapacity), cellData)
  .$usage("vertex")

const cellLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(CellData, n),
  "instance",
)

const cellPipeline = root["~unstable"]
  .withVertex(cellVertShader, cellLayout.attrib)
  .withFragment(cellFragShader, {
    format: presentationFormat,
    blend: {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
      },
      alpha: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
      },
    },
  })
  .createPipeline()
  .with(cellLayout, cellBuffer)

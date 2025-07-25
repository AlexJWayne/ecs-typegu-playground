import tgpu from "typegpu"
import {
  arrayOf,
  builtin,
  f32,
  struct,
  u16,
  vec2f,
  vec3f,
  vec4f,
} from "typegpu/data"
import * as std from "typegpu/std"
import { add, clamp, div, length, min, mul, sub } from "typegpu/std"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
const canvas = document.createElement("canvas")
let ctx: GPUCanvasContext
let root = await tgpu.init()

export function setupCanvasGl(): void {
  canvas.width = 800
  canvas.height = 800
  document.body.appendChild(canvas)

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })

  render()
}

function render() {
  quadPipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "load",
      storeOp: "store",
    })
    .draw(6, quadCount)
}

const QuadData = struct({
  pos: vec2f,
  size: f32,
})

const quadVertexShader = tgpu["~unstable"].vertexFn({
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
  const vertices = [
    vec2f(-1, -1),
    vec2f(-1, 1),
    vec2f(1, 1),
    vec2f(1, 1),
    vec2f(1, -1),
    vec2f(-1, -1),
  ]
  const uv = [
    vec2f(0, 0),
    vec2f(0, 1),
    vec2f(1, 1),
    vec2f(1, 1),
    vec2f(1, 0),
    vec2f(0, 0),
  ]

  return {
    pos: vec4f(
      add(pos, mul(size / 2, vertices[idx])), //
      0,
      1,
    ),
    uv: uv[idx],
  }
})

const quadFragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f },
  out: vec4f,
})(({ uv }) => {
  const pos = sub(uv, 0.5)
  let circle = sub(1, mul(length(pos), 2))
  const a = clamp(circle, 0, 1)
  return vec4f(vec3f(1), a)
})

const quadCount = 10
const quadsGeometryBuffer = root
  .createBuffer(
    arrayOf(QuadData, quadCount),
    Array(quadCount)
      .fill(0)
      .map((_, i) => ({
        pos: vec2f(i * 0.1, i * 0.1),
        size: 0.15,
      })),
  )
  .$usage("vertex", "storage")

// quadsGeometryBuffer.writePartial([
//   {
//     idx: 2,
//     value: {
//       pos: vec2f(0.25, 0.5),
//       size: 0.2,
//     },
//   },
// ])

const quadVertexLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(QuadData, n),
  "instance",
)

const quadPipeline = root["~unstable"]
  .withVertex(quadVertexShader, quadVertexLayout.attrib)
  .withFragment(quadFragShader, {
    format: presentationFormat,
    blend: {
      color: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
      },
    },
  })
  .createPipeline()
  .with(quadVertexLayout, quadsGeometryBuffer)

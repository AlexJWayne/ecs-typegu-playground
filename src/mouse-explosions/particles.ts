import tgpu, {
  type StorageFlag,
  type TgpuBuffer,
  type TgpuComputePipeline,
  type TgpuRenderPipeline,
  type VertexFlag,
} from "typegpu"
import {
  arrayOf,
  builtin,
  struct,
  vec2f,
  vec3f,
  vec4f,
  type BuiltinGlobalInvocationId,
  type Vec2f,
  type Vec4f,
  type WgslArray,
  type WgslStruct,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import { abs, add, clamp, length, mul } from "typegpu/std"
import { ctx, presentationFormat, root } from "./main"
import { randomOnZero } from "../jelleyfish-rockets/math"

const N = 65535

const Data = struct({
  pos: vec2f,
  vel: vec2f,
})

const layout = tgpu.vertexLayout((n: number) => arrayOf(Data, n), "instance")

const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    vel: vec2f,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
  },
})(({ idx, pos }) => {
  const localPos = mul(quadVert(idx), 0.02)
  const worldPos = add(pos, localPos)
  return {
    pos: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
  }
})

const fragShader = tgpu["~unstable"].fragmentFn({
  in: {
    uv: vec2f,
  },
  out: vec4f,
})(({ uv }) => {
  const a = clamp(1 - length(uv), 0, 1)
  return vec4f(a, 0, 1, a * 0.1)
})

let movePipeline: TgpuComputePipeline
let renderPipeline: TgpuRenderPipeline<Vec4f>
let buffer: TgpuBuffer<
  WgslArray<
    WgslStruct<{
      pos: Vec2f
      vel: Vec2f
    }>
  >
> &
  StorageFlag &
  VertexFlag

export function setupParticles() {
  buffer = root
    .createBuffer(
      arrayOf(Data, N),
      Array.from({ length: N }).map(() => ({
        pos: vec2f(0, 0),
        vel: vec2f(randomOnZero(0.002), randomOnZero(0.002)),
      })),
    )
    .$usage("vertex", "storage")
  const storage = buffer.as("mutable")

  const moveShader = tgpu["~unstable"].computeFn({
    in: {
      gid: builtin.globalInvocationId,
    },
    workgroupSize: [1],
  })(({ gid }) => {
    const idx = gid.x
    const item = storage.value[idx]
    storage.value[idx].pos = add(item.pos, item.vel)

    if (item.pos.x > 1) storage.value[idx].vel.x = -abs(item.vel.x)
    if (item.pos.x < -1) storage.value[idx].vel.x = abs(item.vel.x)
    if (item.pos.y > 1) storage.value[idx].vel.y = -abs(item.vel.y)
    if (item.pos.y < -1) storage.value[idx].vel.y = abs(item.vel.y)
  })

  movePipeline = root["~unstable"].withCompute(moveShader).createPipeline()

  renderPipeline = root["~unstable"]
    .withVertex(vertShader, layout.attrib)
    .withFragment(fragShader, {
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
    .with(layout, buffer)
}

export function renderParticles() {
  movePipeline.dispatchWorkgroups(N)
  // buffer.read().then(([data]) => console.log(data.pos.x))

  renderPipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "load",
      storeOp: "store",
    })
    .draw(6, N)
}

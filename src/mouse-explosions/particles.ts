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
  vec4f,
  type Vec2f,
  type Vec4f,
  type WgslArray,
  type WgslStruct,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import {
  abs,
  add,
  clamp,
  length,
  max,
  mul,
  normalize,
  pow,
  sub,
} from "typegpu/std"
import { ctx, mouse, presentationFormat, root } from "./main"
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
  const size = 0.06
  const localPos = mul(quadVert(idx), size)
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
  const a = pow(clamp(1 - length(uv), 0, 1), 4)
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

let uniformsBuffer: TgpuBuffer<
  WgslStruct<{
    mousePos: Vec2f
  }>
>

export function setupParticles() {
  buffer = root
    .createBuffer(
      arrayOf(Data, N),
      Array.from({ length: N }).map(() => ({
        pos: vec2f(0, 0),
        vel: vec2f(randomOnZero(0.008), randomOnZero(0.008)),
      })),
    )
    .$usage("vertex", "storage")
  const storage = buffer.as("mutable")

  uniformsBuffer = root
    .createBuffer(
      struct({
        mousePos: vec2f,
      }),
    )
    .$usage("storage")
  const uniforms = uniformsBuffer.as("mutable")

  const moveShader = tgpu["~unstable"]
    .computeFn({
      in: {
        gid: builtin.globalInvocationId,
      },
      workgroupSize: [1],
    })(({ gid }) => {
      const g = 0.0003

      const idx = gid.x
      const item = storage.value[idx]
      const pos = item.pos

      const mouseDiff = sub(uniforms.value.mousePos, pos)
      const force = g / max(pow(length(mouseDiff), 1), 0.0001)

      storage.value[idx].vel = mul(
        add(
          storage.value[idx].vel, //
          mul(mouseDiff, force),
        ),
        // 0.9995,
        1,
      )

      const vel = storage.value[idx].vel
      storage.value[idx].pos = add(pos, vel)

      if (pos.x > 1) storage.value[idx].vel.x = -abs(vel.x * 0.9)
      if (pos.x < -1) storage.value[idx].vel.x = abs(vel.x * 0.9)
      if (pos.y > 1) storage.value[idx].vel.y = -abs(vel.y * 0.9)
      if (pos.y < -1) storage.value[idx].vel.y = abs(vel.y * 0.9)
    })
    .$uses({
      uniforms,
    })
  console.log(tgpu.resolve({ externals: { moveShader } }))
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
  uniformsBuffer.write({
    mousePos: mouse,
  })
  movePipeline.dispatchWorkgroups(N)
  // buffer.read().then(([data]) => console.log(data.vel.x))

  renderPipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "load",
      storeOp: "store",
    })
    .draw(6, N)
}

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
  f32,
  struct,
  vec2f,
  vec4f,
  type F32,
  type Vec2f,
  type Vec4f,
  type WgslArray,
  type WgslStruct,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import { abs, add, atan2, clamp, length, max, mul, pow, sub } from "typegpu/std"
import { ctx, forceScale, mouse, presentationFormat, root } from "./main"
import { randomOnZero } from "../jelleyfish-rockets/math"
import { rotateVec2 } from "../jelleyfish-rockets/canvas-gl"

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
})(({ idx, pos, vel }) => {
  const size = 0.07
  let localPos = mul(quadVert(idx), size)
  localPos.x *= 1 + length(vel) * 200
  localPos.y *= 1 + length(vel) * -50

  const heading = atan2(vel.y, vel.x)
  localPos = rotateVec2(localPos, heading)

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
  return vec4f(
    pow(a, 5), //
    pow(a, 15),
    1,
    pow(a, 8) * 0.2,
  )
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
    forceScale: F32
  }>
>

export function setupParticles() {
  buffer = root
    .createBuffer(
      arrayOf(Data, N),
      Array.from({ length: N }).map(() => ({
        pos: vec2f(
          randomOnZero(0.1), //
          randomOnZero(0.1),
        ),
        vel: vec2f(
          randomOnZero(0.02), //
          randomOnZero(0.02),
        ),
      })),
    )
    .$usage("vertex", "storage")
  const storage = buffer.as("mutable")

  uniformsBuffer = root
    .createBuffer(
      struct({
        mousePos: vec2f,
        forceScale: f32,
      }),
    )
    .$usage("storage")
  const uniforms = uniformsBuffer.as("mutable" as never)

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
      let force = g / max(pow(length(mouseDiff), 1.5), 0.0001)
      force *= uniforms.value.forceScale

      storage.value[idx].vel = add(
        storage.value[idx].vel, //
        mul(mouseDiff, force),
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
  // console.log(tgpu.resolve({ externals: { moveShader } }))
  movePipeline = root["~unstable"].withCompute(moveShader).createPipeline()

  renderPipeline = root["~unstable"]
    .withVertex(vertShader, layout.attrib)
    .withFragment(fragShader, {
      format: presentationFormat,
      blend: {
        color: {
          srcFactor: "src-alpha",
          dstFactor: "one",
        },
        alpha: {
          srcFactor: "src-alpha",
          dstFactor: "one",
        },
      },
    })
    .createPipeline()
    .with(layout, buffer)
}

export function renderParticles() {
  uniformsBuffer.write({
    mousePos: mouse,
    forceScale,
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

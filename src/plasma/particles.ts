import tgpu, { type TgpuBufferMutable, type TgpuRoot } from "typegpu"
import {
  arrayOf,
  builtin,
  f32,
  struct,
  vec2f,
  vec4f,
  type v2f,
  type WgslArray,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import { abs, atan2, clamp, cos, length, max, pow, sin } from "typegpu/std"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const NX = 65535
const NY = 4
const N = NX * NY
console.log(N.toLocaleString(), "particles")

const SIZE = 0.03

const Instance = struct({
  pos: vec2f,
  vel: vec2f,
})
const Uniforms = struct({
  mouse: vec2f,
  forceScale: f32,
})

const instanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(Instance, n),
  "instance",
)

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
  let localPos = quadVert(idx).mul(SIZE)
  localPos.x *= 1 + length(vel) * 200
  localPos.y *= 1 + length(vel) * -50

  const heading = atan2(vel.y, vel.x)
  localPos = rotateVec2(localPos, heading)

  const worldPos = pos.add(localPos)

  return {
    pos: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
  }
})

const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f },
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

function createMoveShader({
  uniforms,
  instances,
}: {
  uniforms: TgpuBufferMutable<typeof Uniforms>
  instances: TgpuBufferMutable<WgslArray<typeof Instance>>
}) {
  const moveShader = tgpu["~unstable"].computeFn({
    in: {
      gid: builtin.globalInvocationId,
      numWorkgroups: builtin.numWorkgroups,
    },
    workgroupSize: [16, 16],
  })(({ gid, numWorkgroups }) => {
    const g = 0.0003

    const width = 16 * numWorkgroups.x
    const idx = gid.y * width + gid.x
    const item = instances.value[idx]
    const pos = item.pos

    const mouseDiff = uniforms.value.mouse.sub(pos)
    let force = g / max(pow(length(mouseDiff), 1.5), 0.0001)
    force *= uniforms.value.forceScale

    instances.value[idx].vel = instances.value[idx].vel.add(
      mouseDiff.mul(force),
    )

    const vel = instances.value[idx].vel
    instances.value[idx].pos = pos.add(vel)

    // todo: I think this is slow. Use a step function instead?
    if (pos.x > 1) instances.value[idx].vel.x = -abs(vel.x * 0.9)
    if (pos.x < -1) instances.value[idx].vel.x = abs(vel.x * 0.9)
    if (pos.y > 1) instances.value[idx].vel.y = -abs(vel.y * 0.9)
    if (pos.y < -1) instances.value[idx].vel.y = abs(vel.y * 0.9)
  })
  console.log(
    "move shader compiled to:\n\n",
    tgpu.resolve({ externals: { moveShader } }),
  )
  return moveShader
}

function createInstances(root: TgpuRoot) {
  const instancesBuffer = root
    .createBuffer(
      arrayOf(Instance, N),
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
  return {
    instancesBuffer,
    instances: instancesBuffer.as("mutable"),
  }
}

function createUniforms(root: TgpuRoot) {
  const uniformsBuffer = root.createBuffer(Uniforms).$usage("storage")
  return {
    uniformsBuffer,
    uniforms: uniformsBuffer.as("mutable"),
  }
}

export function setupParticles(root: TgpuRoot) {
  const { instancesBuffer, instances } = createInstances(root)
  const { uniformsBuffer, uniforms } = createUniforms(root)

  const moveShader = createMoveShader({ uniforms, instances })
  const movePipeline = root["~unstable"]
    .withCompute(moveShader)
    .createPipeline()

  const renderPipeline = root["~unstable"]
    .withVertex(vertShader, instanceLayout.attrib)
    .withFragment(fragShader, {
      format: presentationFormat,
      blend: {
        color: { srcFactor: "src-alpha", dstFactor: "one" },
        alpha: { srcFactor: "src-alpha", dstFactor: "one" },
      },
    })
    .createPipeline()
    .with(instanceLayout, instancesBuffer)

  return (ctx: GPUCanvasContext, mouse: v2f, forceScale: number) => {
    uniformsBuffer.write({ mouse, forceScale })

    movePipeline.dispatchWorkgroups(NX, NY)

    renderPipeline
      .withColorAttachment({
        view: ctx.getCurrentTexture().createView(),
        loadOp: "load",
        storeOp: "store",
      })
      .draw(6, N)
  }
}

export const rotateVec2 = tgpu.fn(
  [vec2f, f32],
  vec2f,
)((vec, angle) => {
  const cosAngle = cos(angle)
  const sinAngle = sin(angle)
  return vec2f(
    vec.x * cosAngle - vec.y * sinAngle,
    vec.x * sinAngle + vec.y * cosAngle,
  )
})

export function randomOnZero(max: number): number {
  return (Math.random() * 2 - 1) * max
}

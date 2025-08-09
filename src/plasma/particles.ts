import tgpu, {
  type StorageFlag,
  type TgpuBuffer,
  type TgpuBufferMutable,
  type TgpuBufferReadonly,
  type TgpuRoot,
  type VertexFlag,
} from "typegpu"
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
import { atan2, clamp, cos, length, max, pow, select, sin } from "typegpu/std"
import { randomRange } from "../jelleyfish-rockets/math"
import type { World } from "bitecs"
import { massesCount, massesInstanceLayout, MassInstance } from "./mass"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const NX = 65535
const NY = 4
const N = NX * NY
console.log(N.toLocaleString(), "particles")

const SIZE = 0.008

const Instance = struct({
  pos: vec2f,
  vel: vec2f,
})
const Uniforms = struct({})

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
  localPos.x *= 1 + length(vel) * 800
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
  let a = clamp(1 - length(uv), 0, 1)
  return vec4f(
    pow(a, 4), //
    pow(a, 8),
    1,
    pow(a, 1.2) * 0.2,
  )
})

function createMoveShader({
  instances,
  masses,
}: {
  instances: TgpuBufferMutable<WgslArray<typeof Instance>>
  masses: TgpuBufferReadonly<WgslArray<typeof MassInstance>>
}) {
  return tgpu["~unstable"].computeFn({
    in: {
      gid: builtin.globalInvocationId,
      numWorkgroups: builtin.numWorkgroups,
    },
    workgroupSize: [16, 16],
  })(({ gid, numWorkgroups }) => {
    const g = 0.0001

    const width = 16 * numWorkgroups.x
    const idx = gid.y * width + gid.x
    let pos = instances.$[idx].pos
    let vel = instances.$[idx].vel

    for (let i = 0; i < massesCount; i++) {
      const massValue = masses.$[i].mass
      if (massValue === 0) break

      const massPos = masses.$[i].pos
      const mouseDiff = massPos.sub(pos)

      let force = select(
        g / pow(length(mouseDiff), 1.3),
        0,
        length(mouseDiff) === 0,
      )
      force *= massValue

      vel = vel.add(mouseDiff.mul(force))
    }

    const bounced = bounce(pos, vel)
    vel = bounced.vel
    pos = bounced.pos
    pos = pos.add(vel)

    instances.$[idx].pos = pos
    instances.$[idx].vel = vel
  })
}

const bounce = tgpu.fn(
  [vec2f, vec2f],
  struct({ vel: vec2f, pos: vec2f }),
)((pos, vel) => {
  const r = vel.x > 0 && pos.x > 1
  const l = vel.x < 0 && pos.x < -1
  const t = vel.y > 0 && pos.y > 1
  const b = vel.y < 0 && pos.y < -1

  const newVel = vec2f(
    select(vel.x, -vel.x * 0.7, r || l),
    select(vel.y, -vel.y * 0.7, t || b),
  )

  const newPos = pos
  newPos.x = select(newPos.x, +2 - newPos.x, pos.x > 1)
  newPos.x = select(newPos.x, -2 - newPos.x, pos.x < -1)
  newPos.y = select(newPos.y, +2 - newPos.y, pos.y > 1)
  newPos.y = select(newPos.y, -2 - newPos.y, pos.y < -1)

  return {
    vel: newVel,
    pos: newPos,
  }
})

function createInstances(root: TgpuRoot) {
  const instancesBuffer = root
    .createBuffer(arrayOf(Instance, N))
    .$usage("vertex", "storage")
  return {
    instancesBuffer,
    instances: instancesBuffer.as("mutable"),
  }
}

function createInstanceData() {
  const side = Math.random() > 0.5 ? 1 : -1
  return {
    pos: vec2f(
      randomOnZero(0.2) + 0.6 * side, //
      randomOnZero(0.15),
    ),
    vel: vec2f(
      0, //
      randomRange(0.006, 0.01) * side,
    ),
  }
}

function createUniforms(root: TgpuRoot) {
  const uniformsBuffer = root.createBuffer(Uniforms).$usage("storage")
  return {
    uniformsBuffer,
    uniforms: uniformsBuffer.as("mutable"),
  }
}

export function setupParticles(
  root: TgpuRoot,
  massesBuffer: TgpuBuffer<WgslArray<typeof MassInstance>> &
    VertexFlag &
    StorageFlag,
) {
  const { instancesBuffer, instances } = createInstances(root)
  const { uniformsBuffer, uniforms } = createUniforms(root)

  const moveShader = createMoveShader({
    instances,
    masses: massesBuffer.as("readonly"),
  })
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
    .with(massesInstanceLayout, massesBuffer)

  function resetParticles() {
    instancesBuffer.write(Array.from({ length: N }).map(createInstanceData))
  }
  resetParticles()

  function renderParticles(ctx: GPUCanvasContext) {
    movePipeline.dispatchWorkgroups(NX, NY)

    renderPipeline
      .withColorAttachment({
        view: ctx.getCurrentTexture().createView(),
        loadOp: "load",
        storeOp: "store",
      })
      .draw(6, N)
  }

  return {
    resetParticles,
    renderParticles,
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

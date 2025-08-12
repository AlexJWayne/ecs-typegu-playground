import tgpu, {
  type StorageFlag,
  type TgpuBuffer,
  type TgpuRoot,
  type VertexFlag,
} from "typegpu"
import { type WgslArray, arrayOf, f32, struct, vec2f } from "typegpu/data"

import { randomRange } from "../../jelleyfish-rockets/math"

import { type MassInstance, massesInstanceLayout } from "../mass/render"
import { Timing } from "../timing"

import { fragShader } from "./frag"
import { createUpdateShader } from "./update"
import { vertShader } from "./vert"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const NX = Math.pow(2, 16) - 1
const NY = 4
const N = NX * NY
console.log(N.toLocaleString(), "particles")

const Instance = struct({
  pos: vec2f,
  vel: vec2f,
})
export type Instance = typeof Instance

const Uniforms = struct({
  deltaTime: f32,
})
export type Uniforms = typeof Uniforms

const instanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(Instance, n),
  "instance",
)

function createInstanceData() {
  const side = Math.random() > 0.5 ? 1 : -1
  return {
    pos: vec2f(
      randomOnZero(0.2) + 0.6 * side, //
      randomOnZero(0.15),
    ),
    vel: vec2f(
      0, //
      randomRange(0.6, 1) * side,
    ),
  }
}

export function setupParticles(
  root: TgpuRoot,
  massesBuffer: TgpuBuffer<WgslArray<MassInstance>> & VertexFlag & StorageFlag,
) {
  const uniformsBuffer = root.createBuffer(Uniforms).$usage("storage")
  const instancesBuffer = root
    .createBuffer(arrayOf(Instance, N))
    .$usage("vertex", "storage")

  const moveShader = createUpdateShader({
    instances: instancesBuffer.as("mutable"),
    masses: massesBuffer.as("readonly"),
    uniforms: uniformsBuffer.as("readonly"),
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
    uniformsBuffer.write({ deltaTime: Timing.deltaTime })

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

export function randomOnZero(max: number): number {
  return (Math.random() * 2 - 1) * max
}

import tgpu, {
  type StorageFlag,
  type TgpuBuffer,
  type TgpuRoot,
  type VertexFlag,
} from "typegpu"
import { type Infer, type WgslArray, arrayOf, vec2f } from "typegpu/data"

import { type MassInstance, massesInstanceLayout } from "../mass/render"
import { Timing } from "../timing"

import { Instance, Uniforms } from "./data"
import { fragShader } from "./frag"
import { createUpdateShader } from "./update"
import { vertShader } from "./vert"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const NX = Math.pow(2, 16) - 1
const NY = 4
const N = NX * NY
console.log(N.toLocaleString(), "particles")

const instanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(Instance, n),
  "instance",
)

function createInstanceData(): Infer<Instance> {
  const lifetime = 5
  return {
    pos: vec2f(),
    vel: vec2f(),
    lifetime,
    age: Math.random() * lifetime,
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

  const updateShader = createUpdateShader({
    instances: instancesBuffer.as("mutable"),
    masses: massesBuffer.as("readonly"),
    uniforms: uniformsBuffer.as("readonly"),
  })
  console.log(tgpu.resolve({ externals: { updateShader } }))

  const movePipeline = root["~unstable"]
    .withCompute(updateShader)
    .createPipeline()

  const renderPipeline = root["~unstable"]
    .withVertex(vertShader, instanceLayout.attrib)
    .withFragment(fragShader, {
      format: presentationFormat,
      blend: {
        // color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
        // alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
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
    uniformsBuffer.write({
      deltaTime: Timing.deltaTime,
      elapsed: Timing.elapsed,
    })
    // instancesBuffer.read().then((buffer) => console.log(buffer[0].pos.x))

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
export { Instance }

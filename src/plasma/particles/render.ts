import tgpu, {
  type StorageFlag,
  type TgpuBuffer,
  type TgpuRoot,
  type VertexFlag,
} from "typegpu"
import { type Infer, type WgslArray, arrayOf, vec2f } from "typegpu/data"

import { Position } from "../components"
import { type MassInstance, massesInstanceLayout } from "../mass/render"
import { Spawner } from "../spawners/component"
import { SpawnerStruct } from "../spawners/data"
import { Timing } from "../timing"

import { Instance, Uniforms } from "./data"
import { fragShader } from "./frag"
import { createUpdateShader } from "./update"
import { vertShader } from "./vert"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const NX = Math.pow(2, 16) - 1
const NY = 1 //4
const N = NX * NY
console.log(N.toLocaleString(), "particles per spawner")

const instanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(Instance, n),
  "instance",
)

function createInstanceData(lifetime: number): Infer<Instance> {
  return {
    pos: vec2f(),
    vel: vec2f(),
    lifetime,
    age: Math.random() * lifetime,
  }
}

export type ParticlesRenderer = ReturnType<typeof setupParticles>
export function setupParticles({
  root,
  massesBuffer,
  spawnerEid,
}: {
  root: TgpuRoot
  massesBuffer: TgpuBuffer<WgslArray<MassInstance>> & VertexFlag & StorageFlag
  spawnerEid: number
}) {
  const uniformsBuffer = root.createBuffer(Uniforms).$usage("storage")
  const instancesBuffer = root
    .createBuffer(arrayOf(Instance, N))
    .$usage("vertex", "storage")

  const updateShader = createUpdateShader({
    instances: instancesBuffer.as("mutable"),
    masses: massesBuffer.as("readonly"),
    uniforms: uniformsBuffer.as("readonly"),
  })
  // console.log(tgpu.resolve({ externals: { updateShader } }))

  const movePipeline = root["~unstable"]
    .withCompute(updateShader)
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
    const lifetime = Spawner.lifetime[spawnerEid]
    instancesBuffer.write(
      Array.from({ length: N }).map(() => createInstanceData(lifetime)),
    )
  }
  resetParticles()

  function renderParticles(ctx: GPUCanvasContext) {
    movePipeline.dispatchWorkgroups(NX, NY)
    uniformsBuffer.write({
      deltaTime: Timing.deltaTime,
      elapsed: Timing.elapsed,
      spawner: {
        pos: Position[spawnerEid],
        initialVel: Spawner.initialVel[spawnerEid],
        radius: Spawner.radius[spawnerEid],
        lifetime: Spawner.lifetime[spawnerEid],
      },
    })
    // instancesBuffer.read().then(([v]) => console.log(v))

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

export { Instance }

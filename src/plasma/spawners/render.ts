import { type World, query } from "bitecs"
import tgpu, { type TgpuRoot } from "typegpu"
import { type Infer, arrayOf, f32, struct, vec2f } from "typegpu/data"

import { Timing } from "../timing"

import { Spawner } from "./component"
import { fragShader } from "./frag"
import { vertShader } from "./vert"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const N = 32

const Instance = struct({
  pos: vec2f,
  lifetime: f32,
  initialVel: vec2f,
  radius: f32,
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

function createInstanceData(): Infer<Instance> {
  return {
    pos: vec2f(),
    initialVel: vec2f(),
    lifetime: 0,
    radius: 0,
  }
}

export function setupSpawners(root: TgpuRoot) {
  const uniformsBuffer = root.createBuffer(Uniforms).$usage("storage")
  const instancesBuffer = root
    .createBuffer(arrayOf(Instance, N))
    .$usage("vertex", "storage")

  const renderPipeline = root["~unstable"]
    .withVertex(vertShader, instanceLayout.attrib)
    .withFragment(fragShader, {
      format: presentationFormat,
      blend: {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
        alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
      },
    })
    .createPipeline()
    .with(instanceLayout, instancesBuffer)

  function resetSpawners() {
    instancesBuffer.write(Array.from({ length: N }).map(createInstanceData))
  }
  resetSpawners()

  function renderSpawners(ctx: GPUCanvasContext, world: World) {
    uniformsBuffer.write({ deltaTime: Timing.deltaTime })
    for (const [i, eid] of query(world, [Spawner]).entries()) {
      instancesBuffer.writePartial([
        {
          idx: i,
          value: {
            pos: Spawner.pos[eid],
            initialVel: Spawner.initialVel[eid],
            lifetime: Spawner.lifetime[eid],
            radius: Spawner.radius[eid],
          },
        },
      ])
    }

    renderPipeline
      .withColorAttachment({
        view: ctx.getCurrentTexture().createView(),
        loadOp: "load",
        storeOp: "store",
      })
      .draw(6, N)
  }

  return {
    resetSpawners,
    renderSpawners,
  }
}

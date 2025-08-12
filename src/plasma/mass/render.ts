import { type World, query } from "bitecs"
import tgpu, { type TgpuRoot } from "typegpu"
import { arrayOf, f32, struct, vec2f } from "typegpu/data"

import { Position } from "../components"
import { Timing } from "../timing"

import { Mass } from "./components"
import { createFragShader } from "./frag"
import { vertShader } from "./vert"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

export const massesCount = 32

export const MassInstance = struct({
  pos: vec2f,
  mass: f32,
})
export const massesInstanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(MassInstance, n),
  "instance",
)

export const Uniforms = struct({
  elapsed: f32,
})
export type Uniforms = typeof Uniforms

function createInstances(root: TgpuRoot) {
  return root
    .createBuffer(
      arrayOf(MassInstance, massesCount), //
      Array.from({ length: massesCount }).map(MassInstance),
    )
    .$usage("vertex", "storage")
}

function createUniforms(root: TgpuRoot) {
  return root.createBuffer(Uniforms).$usage("storage")
}

export function setupMasses(root: TgpuRoot) {
  const instancesBuffer = createInstances(root)
  const uniformsBuffer = createUniforms(root)

  const renderPipeline = root["~unstable"]
    .withVertex(vertShader, {
      pos: massesInstanceLayout.attrib.pos,
      mass: massesInstanceLayout.attrib.mass,
    })
    .withFragment(createFragShader(uniformsBuffer.as("readonly")), {
      format: presentationFormat,
      blend: {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
        alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
      },
    })
    .createPipeline()
    .with(massesInstanceLayout, instancesBuffer)

  return {
    massesBuffer: instancesBuffer,
    renderMasses: (ctx: GPUCanvasContext, world: World) => {
      uniformsBuffer.write({
        elapsed: Timing.elapsed,
      })
      const masses = query(world, [Mass, Position])
      for (const [idx, eid] of masses.entries()) {
        instancesBuffer.writePartial([
          {
            idx,
            value: {
              pos: Position[eid],
              mass: Mass[eid],
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
        .draw(6, massesCount)
    },
  }
}

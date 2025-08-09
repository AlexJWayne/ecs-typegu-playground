import tgpu, { type TgpuRoot } from "typegpu"
import {
  arrayOf,
  builtin,
  f32,
  struct,
  vec2f,
  vec4f,
  type v2f,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import { clamp, length } from "typegpu/std"
import { addComponents, addEntity, query, type World } from "bitecs"
import { Mass, Position } from "./components"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

export const massesCount = 32

export const MassInstance = struct({
  pos: vec2f,
  mass: f32,
})
const Uniforms = struct({})

export const massesInstanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(MassInstance, n),
  "instance",
)

const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    mass: f32,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
  },
})(({ idx, pos, mass }) => {
  let localPos = quadVert(idx).mul(mass * 0.1)
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
  const l = 1 - a
  return vec4f(
    l * 0.3, //
    l * 0.2,
    l,
    a,
  )
})

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
    .withVertex(vertShader, massesInstanceLayout.attrib)
    .withFragment(fragShader, {
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

export function addMass(world: World, pos: v2f, mass: number = 1) {
  const eid = addEntity(world)
  addComponents(world, eid, [Position, Mass])
  Position[eid] = pos
  Mass[eid] = mass
  return eid
}

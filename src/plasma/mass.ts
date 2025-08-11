import tgpu, { type TgpuBufferReadonly, type TgpuRoot } from "typegpu"
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
import { atan2, clamp, length, sin } from "typegpu/std"
import { addComponents, addEntity, query, type World } from "bitecs"
import { Position } from "./components"
import { Timing } from "./timing"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

export const Mass = [] as number[]

export const massesCount = 32

export const MassInstance = struct({
  pos: vec2f,
  mass: f32,
})
export const massesInstanceLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(MassInstance, n),
  "instance",
)

const Uniforms = struct({
  elapsed: f32,
})

const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    mass: f32,
  },
  out: {
    vert: builtin.position,
    uv: vec2f,
    pos: vec2f,
  },
})(({ idx, pos, mass }) => {
  let localPos = quadVert(idx).mul(mass * 0.1)
  const worldPos = pos.add(localPos)

  return {
    vert: vec4f(worldPos, 0, 1),
    uv: quadVert(idx),
    pos,
  }
})

function createFragShader(uniforms: TgpuBufferReadonly<typeof Uniforms>) {
  return tgpu["~unstable"].fragmentFn({
    in: { pos: vec2f, uv: vec2f },
    out: vec4f,
  })(({ pos, uv }) => {
    const a = clamp(1 - length(uv), 0, 1)
    const l = 1 - a

    const theta = atan2(uv.y, uv.x)
    const offset = pos.x * 31 + pos.y * 73
    let white = (sin(theta * 2 + offset + uniforms.$.elapsed) + 1) * 0.5 * l * a

    return vec4f(
      l * 0.3, //
      l * 0.2,
      l,
      a,
    ).add(white)
  })
}

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

export function addMass(world: World, pos: v2f, mass: number = 1) {
  const eid = addEntity(world)
  addComponents(world, eid, [Position, Mass])
  Position[eid] = pos
  Mass[eid] = mass
  return eid
}

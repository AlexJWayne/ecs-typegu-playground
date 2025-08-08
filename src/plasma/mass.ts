import tgpu, { type TgpuRoot } from "typegpu"
import {
  arrayOf,
  builtin,
  f32,
  struct,
  vec2f,
  vec3f,
  vec4f,
  type v2f,
} from "typegpu/data"
import { quadVert } from "./shader-lib"
import { clamp, length, pow } from "typegpu/std"
import { step } from "../jelleyfish-rockets/canvas-gl"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

const N = 16

const Instance = struct({
  pos: vec2f,
  mass: f32,
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
      arrayOf(Instance, N), //
      Array.from({ length: N }).map(Instance),
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

  return {
    renderMasses: (ctx: GPUCanvasContext, mouse: v2f, mass: number) => {
      instancesBuffer.writePartial([
        {
          idx: 0,
          value: {
            pos: mouse,
            mass,
          },
        },
      ])

      renderPipeline
        .withColorAttachment({
          view: ctx.getCurrentTexture().createView(),
          loadOp: "load",
          storeOp: "store",
        })
        .draw(6, N)
    },
  }
}

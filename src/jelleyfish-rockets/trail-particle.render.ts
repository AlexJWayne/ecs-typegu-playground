import { type World, query } from "bitecs"
import tgpu, {
  type TgpuBuffer,
  type TgpuRenderPipeline,
  type VertexFlag,
} from "typegpu"
import {
  type AnyWgslStruct,
  type BaseData,
  type Infer,
  type Vec4f,
  type WgslArray,
  type WgslStruct,
  arrayOf,
  builtin,
  f32,
  struct,
  vec2f,
  vec4f,
} from "typegpu/data"
import { add, atan2, length, min, mul, sub } from "typegpu/std"

import {
  ctx,
  presentationFormat,
  quadVert,
  root,
  rotateVec2,
  step,
  worldToClipSpace,
} from "./canvas-gl"
import {
  Lifetime,
  Position,
  Radius,
  TrailParticle,
  Velocity,
} from "./components"

export function renderTrailParticles(world: World) {
  const particles = query(world, [TrailParticle, Position, Velocity, Lifetime])
  if (particles.length === 0) return

  pipeline.ensureCapacity(particles.length)

  for (let i = 0; i < particles.length; i++) {
    const id = particles[i]
    const particle = pipeline.instances[i]

    particle.pos.x = Position.x[id]
    particle.pos.y = Position.y[id]
    particle.velocity.x = Velocity.x[id]
    particle.velocity.y = Velocity.y[id]
    particle.size = Radius[id]
    particle.completion = Lifetime.completion(id)
  }
  pipeline.getBuffer().write(pipeline.instances)

  pipeline.render(particles.length)
}

const ParticleData = struct({
  pos: vec2f,
  velocity: vec2f,
  size: f32,
  completion: f32,
})

const vertShader = tgpu["~unstable"].vertexFn({
  in: {
    idx: builtin.vertexIndex,
    pos: vec2f,
    velocity: vec2f,
    size: f32,
    completion: f32,
  },
  out: {
    pos: builtin.position,
    uv: vec2f,
    completion: f32,
  },
})(({ idx, pos, velocity, size, completion }) => {
  const quadVertices = [
    vec2f(-1, -1),
    vec2f(-1, 1),
    vec2f(1, 1),
    vec2f(1, 1),
    vec2f(1, -1),
    vec2f(-1, -1),
  ]
  let localVert = mul(size, quadVert(idx))
  localVert.x *= 1 + length(velocity)

  const heading = atan2(velocity.y, velocity.x)
  localVert = rotateVec2(localVert, heading)

  const worldPos = add(pos, localVert)
  return {
    pos: worldToClipSpace(worldPos),
    uv: quadVertices[idx],
    completion,
  }
})

const fragShader = tgpu["~unstable"].fragmentFn({
  in: { uv: vec2f, completion: f32 },
  out: vec4f,
})(({ uv, completion }) => {
  const fromCenter = sub(1, length(uv))
  const alpha = step(0.2, fromCenter)
  const fade = min((1 - completion) * 2, 1)
  return vec4f(
    1 - completion, //
    0,
    completion,
    alpha * fade,
  )
})

const layout = tgpu.vertexLayout(
  (n: number) => arrayOf(ParticleData, n),
  "instance",
)

let pipeline = createPipeline({
  pageSize: 1000,
  schema: ParticleData,
  initial: () => ({
    pos: vec2f(),
    velocity: vec2f(),
    size: 0,
    completion: 0,
  }),
})

function createPipeline<T extends AnyWgslStruct>({
  pageSize,
  schema,
  initial,
}: {
  pageSize: number
  schema: T
  initial: () => Infer<NoInfer<T>>
}) {
  const instances: Infer<T>[] = []

  const unboundPipeline = root["~unstable"]
    .withVertex(vertShader, layout.attrib)
    .withFragment(fragShader, {
      format: presentationFormat,
      blend: {
        color: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha",
        },
        alpha: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha",
        },
      },
    })
    .createPipeline()

  let buffer: TgpuBuffer<WgslArray<T>> & VertexFlag
  let pipeline: TgpuRenderPipeline<Vec4f>

  function ensureCapacity(count: number) {
    if (count <= instances.length) return

    for (let i = 0; i < pageSize; i++) {
      instances.push(initial())
    }
    // console.log("Expanded trail particle capacity to", particlesData.length)

    buffer?.destroy()
    buffer = root
      .createBuffer(arrayOf(schema, instances.length || 1), instances)
      .$usage("vertex")

    pipeline = unboundPipeline.with(layout, buffer)
  }

  function render(count: number) {
    if (count === 0) return

    pipeline
      .withColorAttachment({
        view: ctx.getCurrentTexture().createView(),
        loadOp: "load",
        storeOp: "store",
      })
      .draw(6, count)
  }

  return {
    instances,
    getBuffer: () => buffer,
    ensureCapacity,
    render,
  }
}

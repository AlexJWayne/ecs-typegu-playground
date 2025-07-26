import { query, type World } from "bitecs"
import {
  Lifetime,
  Position,
  Radius,
  TrailParticle,
  Velocity,
} from "./components"
import tgpu from "typegpu"
import {
  struct,
  vec2f,
  f32,
  builtin,
  vec4f,
  arrayOf,
  type Infer,
  vec3f,
} from "typegpu/data"
import {
  sub,
  length,
  min,
  max,
  add,
  div,
  mul,
  rotateX4,
  atan2,
} from "typegpu/std"
import {
  root,
  presentationFormat,
  ctx,
  quadUV,
  quadToClipSpace,
  step,
  rotateVec2,
  canvasSize,
} from "./canvas-gl"

export function renderTrailParticles(world: World) {
  const particles = query(world, [TrailParticle, Position, Velocity, Lifetime])
  if (particles.length === 0) return

  if (particles.length > particlesData.length) {
    throw new Error(
      `Buffer too small. Need ${particles.length} but only have ${particlesData.length}`,
    )
  }

  for (const [i, id] of particles.entries()) {
    const particle = particlesData[i]

    particle.pos.x = Position.x[id]
    particle.pos.y = Position.y[id]
    particle.velocity.x = Velocity.x[id]
    particle.velocity.y = Velocity.y[id]
    particle.size = Radius[id]
    particle.completion = Lifetime.completion(id)
  }
  particlesBuffer.write(particlesData)

  particlesPipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "load",
      storeOp: "store",
    })
    .draw(6, particles.length)
}

const ParticleData = struct({
  pos: vec2f,
  velocity: vec2f,
  size: f32,
  completion: f32,
})

const particleVertShader = tgpu["~unstable"].vertexFn({
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
  let localVert = mul(size, quadVertices[idx])
  localVert.x *= 1 + length(velocity)

  const heading = atan2(velocity.y, velocity.x)
  localVert = rotateVec2(localVert, heading)

  const worldPos = add(pos, localVert)
  const screenPos = mul(sub(div(worldPos, canvasSize), 0.5), 2)
  screenPos.y *= -1
  return {
    pos: vec4f(screenPos, 0, 1),
    uv: quadVertices[idx],
    completion,
  }
})

const particleFragShader = tgpu["~unstable"].fragmentFn({
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

const particleBufferCapacity = 10000
const particlesData: Infer<typeof ParticleData>[] = Array.from(
  { length: particleBufferCapacity },
  () => ({
    pos: vec2f(),
    velocity: vec2f(),
    size: 0,
    completion: 0,
  }),
)
const particlesBuffer = root
  .createBuffer(arrayOf(ParticleData, particleBufferCapacity), particlesData)
  .$usage("vertex")

const particlesLayout = tgpu.vertexLayout(
  (n: number) => arrayOf(ParticleData, n),
  "instance",
)

const particlesPipeline = root["~unstable"]
  .withVertex(particleVertShader, particlesLayout.attrib)
  .withFragment(particleFragShader, {
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
  .with(particlesLayout, particlesBuffer)

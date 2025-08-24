import { randf } from "@typegpu/noise"
import tgpu, { type TgpuBufferMutable, type TgpuBufferReadonly } from "typegpu"
import { type WgslArray, builtin, struct, u32, vec2f } from "typegpu/data"
import { cos, length, pow, select, sin } from "typegpu/std"

import { type MassInstance, massesCount } from "../mass/render"
import { polarToCartesian } from "../shader-lib"
import { SpawnerStruct } from "../spawners/data"

import { Instance, Uniforms } from "./data"

export function createUpdateShader({
  instances,
  masses,
  uniforms,
}: {
  instances: TgpuBufferMutable<WgslArray<Instance>>
  masses: TgpuBufferReadonly<WgslArray<MassInstance>>
  uniforms: TgpuBufferReadonly<Uniforms>
}) {
  return tgpu["~unstable"].computeFn({
    in: {
      gid: builtin.globalInvocationId,
      numWorkgroups: builtin.numWorkgroups,
    },
    workgroupSize: [16, 16],
  })(({ gid, numWorkgroups }) => {
    const g = 1

    const width = 16 * numWorkgroups.x
    const idx = gid.y * width + gid.x
    let pos = instances.$[idx].pos
    let vel = instances.$[idx].vel

    randf.seed(idx / instances.$.length)

    for (let i = 0; i < massesCount; i++) {
      const massValue = masses.$[i].mass
      if (massValue === 0) break

      const massPos = masses.$[i].pos
      const mouseDiff = massPos.sub(pos)

      let force = select(
        g / pow(length(mouseDiff), 1.3),
        0,
        length(mouseDiff) === 0,
      )
      force *= massValue * uniforms.$.deltaTime

      vel = vel.add(mouseDiff.mul(force))
    }

    const bounced = bounce(pos, vel)
    vel = bounced.vel
    pos = bounced.pos
    pos = pos.add(vel.mul(uniforms.$.deltaTime))

    const isExpired = instances.$[idx].age >= instances.$[idx].lifetime
    // const isFirstBorn =
    //   instances.$[idx].age <= 0

    if (isExpired) {
      instances.$[idx] = birth(uniforms.$.spawner, instances.$[idx])
    } else {
      instances.$[idx].pos = pos
      instances.$[idx].vel = vel
      instances.$[idx].age += uniforms.$.deltaTime
    }
  })
}

const bounce = tgpu.fn(
  [vec2f, vec2f], // These being unnamed here isn't ideal.
  struct({ vel: vec2f, pos: vec2f }),
)((pos, vel) => {
  const r = vel.x > 0 && pos.x > 1
  const l = vel.x < 0 && pos.x < -1
  const t = vel.y > 0 && pos.y > 1
  const b = vel.y < 0 && pos.y < -1

  const newVel = vec2f(
    select(vel.x, -vel.x * 0.7, r || l),
    select(vel.y, -vel.y * 0.7, t || b),
  )

  const newPos = pos
  newPos.x = select(newPos.x, +2 - newPos.x, pos.x > 1)
  newPos.x = select(newPos.x, -2 - newPos.x, pos.x < -1)
  newPos.y = select(newPos.y, +2 - newPos.y, pos.y > 1)
  newPos.y = select(newPos.y, -2 - newPos.y, pos.y < -1)

  return {
    vel: newVel,
    pos: newPos,
  }
})

const birth = tgpu.fn(
  [SpawnerStruct, Instance],
  Instance,
)((spawner, instance) => {
  return Instance({
    lifetime: instance.lifetime,
    pos: spawner.pos.add(randf.inUnitCircle().mul(spawner.radius)),
    vel: polarToCartesian(
      vec2f(
        randf.sample() *
          (spawner.initialVel.maxTheta - spawner.initialVel.minTheta) +
          spawner.initialVel.minTheta,
        randf.sample() *
          (spawner.initialVel.maxSpeed - spawner.initialVel.minSpeed) +
          spawner.initialVel.minSpeed,
      ),
    ),

    age: instance.age - spawner.lifetime,
  })
})

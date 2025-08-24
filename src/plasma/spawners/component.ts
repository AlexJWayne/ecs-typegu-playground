import {
  type World,
  addComponents,
  addEntity,
  observe,
  onAdd,
  query,
} from "bitecs"
import type { StorageFlag, TgpuBuffer, TgpuRoot, VertexFlag } from "typegpu"
import type { WgslArray, v2f } from "typegpu/data"

import { Position } from "../components"
import type { MassInstance } from "../mass/render"
import { type ParticlesRenderer, setupParticles } from "../particles/render"

export const Spawner = {
  lifetime: [] as number[],
  initialVel: [] as v2f[],
  radius: [] as number[],
  renderer: [] as ParticlesRenderer[],
}

export function observeSpawnerCreation(
  root: TgpuRoot,
  world: World,
  massesBuffer: TgpuBuffer<WgslArray<MassInstance>> & VertexFlag & StorageFlag,
) {
  observe(world, onAdd(Spawner), (eid) => {
    Spawner.renderer[eid] = setupParticles({
      root,
      massesBuffer,
      spawnerEid: eid,
    })
  })
}

export function addSpawner(
  world: World,
  {
    pos,
    lifetime,
    initialVel,
    radius,
  }: {
    pos: v2f
    lifetime: number
    initialVel: v2f
    radius: number
  },
): void {
  const eid = addEntity(world)

  Position[eid] = pos
  Spawner.lifetime[eid] = lifetime
  Spawner.initialVel[eid] = initialVel
  Spawner.radius[eid] = radius

  addComponents(world, eid, [Position, Spawner])
}

export function renderSpawners(ctx: GPUCanvasContext, world: World) {
  for (const eid of query(world, [Spawner])) {
    Spawner.renderer[eid].renderParticles(ctx)
  }
}

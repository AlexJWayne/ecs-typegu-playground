import { type World, addComponents, addEntity } from "bitecs"
import type { v2f } from "typegpu/data"

import { Position } from "../components"

export const Source = {
  lifetime: [] as number[],
  initialVel: [] as v2f[],
  radius: [] as number[],
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
  addComponents(world, eid, [Position, Source])

  Position[eid] = pos
  Source.lifetime[eid] = lifetime
  Source.initialVel[eid] = initialVel
  Source.radius[eid] = radius
}

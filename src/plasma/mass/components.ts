import { type World, addEntity, addComponents } from "bitecs"
import { Position } from "../components"
import type { v2f } from "typegpu/data"

export const Mass = [] as number[]

export function addMass(world: World, pos: v2f, mass: number = 1) {
  const eid = addEntity(world)
  addComponents(world, eid, [Position, Mass])
  Position[eid] = pos
  Mass[eid] = mass
  return eid
}

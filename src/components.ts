import {
  type EntityId,
  type World,
  addComponent,
  query,
  removeComponent,
} from "bitecs"
import type { v2f } from "typegpu/data"

export const Position = [] as v2f[]

export const Selected = {
  set(world: World, eid: EntityId | null) {
    const prevSelectedEids = query(world, [Selected])
    for (const prevSelectedEid of prevSelectedEids) {
      removeComponent(world, prevSelectedEid, Selected)
    }
    if (eid !== null) addComponent(world, eid, Selected)
  },
}

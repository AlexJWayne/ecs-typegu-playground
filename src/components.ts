import { type EntityId } from "bitecs"

export const Position = {
  x: [] as number[],
  y: [] as number[],

  set(eid: EntityId, x: number, y: number) {
    Position.x[eid] = x
    Position.y[eid] = y
  },
}

export const Radius = [] as number[]

export const Velocity = {
  x: [] as number[],
  y: [] as number[],

  set(eid: EntityId, x: number, y: number) {
    Velocity.x[eid] = x
    Velocity.y[eid] = y
  },

  length(eid: EntityId): number {
    return Math.sqrt(Velocity.x[eid] ** 2 + Velocity.y[eid] ** 2)
  },
}

export const Drag = [] as number[]

export const Lifetime = {
  total: [] as number[],
  current: [] as number[],

  init(eid: EntityId, total: number) {
    Lifetime.total[eid] = total
    Lifetime.current[eid] = 0
  },

  tick(eid: EntityId, elapsed: number) {
    Lifetime.current[eid] += elapsed
  },

  isDead(eid: EntityId): boolean {
    return Lifetime.current[eid] > Lifetime.total[eid]
  },

  completion(eid: EntityId): number {
    return Lifetime.current[eid] / Lifetime.total[eid]
  },
}

export enum CellState {
  Birthing,
  Moving,
  Dying,
}

export const Cell = {
  state: [] as CellState[],

  init(eid: EntityId) {
    Cell.state[eid] = CellState.Birthing
  },
}

export const TrailParticle = {}

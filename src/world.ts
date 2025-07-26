import {
  addComponent,
  addEntity,
  query,
  type World,
  removeEntity,
  hasComponent,
} from "bitecs"
import {
  Cell,
  CellState,
  Drag,
  Lifetime,
  Position,
  Radius,
  TrailParticle,
  Velocity,
} from "./components"
import { randomOnZero, randomRange } from "./math"

const SIZE = 800

export function spawnCells(world: World) {
  if (Math.random() > 0.94) spawnCell(world)
}

export function birthCells(world: World) {
  for (const cell of query(world, [Cell])) {
    if (Cell.state[cell] !== CellState.Birthing) continue
    Radius[cell] += 0.25

    if (Radius[cell] > 25) {
      Cell.state[cell] = CellState.Moving
      Velocity.set(
        cell, //
        Math.random() * 30 - 15,
        Math.random() * 30 - 15,
      )
    }
  }
}

export function moveCells(world: World) {
  for (const cell of query(world, [Cell])) {
    if (Cell.state[cell] !== CellState.Moving) continue

    if (Velocity.length(cell) < 0.1) {
      Cell.state[cell] = CellState.Dying
    }

    for (let i = 0; i < 3; i++) {
      spawnTrailParticle(
        world,
        Position.x[cell],
        Position.y[cell],
        -Velocity.x[cell],
        -Velocity.y[cell],
      )
    }
  }
}

export function killCells(world: World) {
  for (const cell of query(world, [Cell])) {
    if (Cell.state[cell] !== CellState.Dying) continue

    Radius[cell] -= 0.25
    if (Radius[cell] <= 0) removeEntity(world, cell)
  }
}

export function updateLifetimes(world: World) {
  for (const id of query(world, [Lifetime])) {
    Lifetime.tick(id, 1)
  }
}

export function removedDead(world: World) {
  const objects = query(world, [Lifetime])
  for (const object of objects) {
    if (Lifetime.isDead(object)) removeEntity(world, object)
  }
}

export function updatePositions(world: World) {
  const entities = query(world, [Position, Velocity])
  for (const id of entities) {
    Position.x[id] += Velocity.x[id]
    Position.y[id] += Velocity.y[id]

    const r = hasComponent(world, id, Radius) ? Radius[id] : 0

    if (Position.x[id] < r) Velocity.x[id] = Math.abs(Velocity.x[id])
    if (Position.y[id] < r) Velocity.y[id] = Math.abs(Velocity.y[id])
    if (Position.x[id] > SIZE - r) Velocity.x[id] = -Math.abs(Velocity.x[id])
    if (Position.y[id] > SIZE - r) Velocity.y[id] = -Math.abs(Velocity.y[id])
  }
}

export function applyDrag(world: World) {
  for (const id of query(world, [Velocity, Drag])) {
    Velocity.x[id] *= Drag[id]
    Velocity.y[id] *= Drag[id]
  }
}

function spawnCell(world: World) {
  const id = addEntity(world)
  addComponent(world, id, Cell, Position, Velocity, Drag, Radius)

  Cell.init(id)
  Position.set(id, Math.random() * SIZE, Math.random() * SIZE)
  Velocity.set(id, 0, 0)
  Drag[id] = 0.985
  Radius[id] = 0
}

function spawnTrailParticle(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
) {
  const id = addEntity(world)
  addComponent(
    world,
    id,
    TrailParticle,
    Position,
    Velocity,
    Drag,
    Radius,
    Lifetime,
  )

  Position.set(id, x, y)
  Velocity.set(
    id, //
    vx + randomOnZero(1.5),
    vy + randomOnZero(1.5),
  )
  Radius[id] = randomRange(1, 4)
  Drag[id] = 0.98
  Lifetime.init(id, randomRange(50, 150))
}

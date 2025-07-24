import { createWorld, World } from "bitecs"
import { renderWorld, setupCanvas } from "./canvas"
import {
  applyDrag,
  birthCells,
  killCells,
  moveCells,
  removedDead,
  spawnCells,
  updateLifetimes,
  updatePositions,
} from "./world"

let world: World

function main() {
  setupCanvas()
  world = createWorld()

  requestAnimationFrame(tick)
}

function tick() {
  updatePositions(world)
  applyDrag(world)

  updateLifetimes(world)
  removedDead(world)

  spawnCells(world)
  birthCells(world)
  moveCells(world)
  killCells(world)

  renderWorld(world)

  requestAnimationFrame(tick)
}

main()

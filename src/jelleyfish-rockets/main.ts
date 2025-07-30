import { createWorld, type World } from "bitecs"
import * as canvasGl from "./canvas-gl"
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
import { renderCells } from "./cell.render"
import { renderTrailParticles } from "./trail-particle.render"

let world: World

function main() {
  // setupCanvas()
  canvasGl.setupCanvasGl()
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

  // renderWorld(world)

  renderTrailParticles(world)
  renderCells(world)

  requestAnimationFrame(tick)
}

if (location.search === "?jfr") main()

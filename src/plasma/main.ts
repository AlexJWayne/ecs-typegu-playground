import { type World, createWorld, query } from "bitecs"
import tgpu from "typegpu"
import { vec2f } from "typegpu/data"

import { Position } from "./components"
import { Mass, addMass } from "./mass/component"
import { setupMasses } from "./mass/render"
import { setupParticles } from "./particles/render"
import {
  addSpawner,
  observeSpawnerCreation,
  renderSpawners,
} from "./spawners/component"
import { setupSpawners } from "./spawners/render"
import { Timing } from "./timing"

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
export const canvas = document.getElementById("canvas") as HTMLCanvasElement
export const root = await tgpu.init()
export const canvasSize = 1000

let ctx: GPUCanvasContext
let mouseDown = false
let world: World

export function setupCanvas(): void {
  canvas.width = canvasSize
  canvas.height = canvasSize

  canvas.onmousemove = (event) => {
    if (!mouseDown) return
    setMousePosition(event)
  }
  canvas.onmousedown = (event) => {
    mouseDown = true
    setMousePosition(event)
  }
  canvas.onmouseup = () => {
    mouseDown = false
  }

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })
}

function setMousePosition(event?: MouseEvent): void {
  const masses = query(world, [Mass, Position])
  const mass = masses[0]
  if (!mass) return

  const rect = canvas.getBoundingClientRect()
  if (event) {
    Position[mass].x = ((event.clientX - rect.left) / canvasSize) * 2 - 1
    Position[mass].y = -(((event.clientY - rect.top) / canvasSize) * 2 - 1)
  } else {
    Position[mass].x = 0
    Position[mass].y = 0
  }
}

function main() {
  setupCanvas()
  const { renderMasses, massesBuffer } = setupMasses(root)

  world = createWorld()
  addMass(world, vec2f(0, 0), 0.5)
  // addMass(world, vec2f(-0.5, -0.5), 0.25)
  // addMass(world, vec2f(0.5, -0.5), 0.25)
  // addMass(world, vec2f(-0.5, 0.5), 0.25)
  // addMass(world, vec2f(0.5, 0.5), 0.25)

  observeSpawnerCreation(root, world, massesBuffer)
  addSpawner(world, {
    pos: vec2f(0.6, 0),
    initialVel: vec2f(-0.3, 0.5),
    radius: 0.3,
    lifetime: 1,
  })
  addSpawner(world, {
    pos: vec2f(-0.6, 0),
    initialVel: vec2f(0.3, -0.5),
    radius: 0.1,
    lifetime: 10,
  })

  Timing.update()
  function render() {
    Timing.update()
    renderSpawners(ctx, world)
    // renderSpawners(ctx, world)
    renderMasses(ctx, world)

    requestAnimationFrame(render)
  }
  render()
}

main()

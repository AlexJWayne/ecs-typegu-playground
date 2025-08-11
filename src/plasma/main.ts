import tgpu from "typegpu"
import { setupParticles } from "./particles"
import { vec2f } from "typegpu/data"
import { addMass, setupMasses } from "./mass"
import { createWorld, query, type World } from "bitecs"
import { Mass, Position } from "./components"
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
  const { renderParticles, resetParticles } = setupParticles(root, massesBuffer)

  world = createWorld()
  addMass(world, vec2f(0, 0), 0.5)
  addMass(world, vec2f(-0.5, -0.5), 0.25)
  addMass(world, vec2f(0.5, -0.5), 0.25)
  addMass(world, vec2f(-0.5, 0.5), 0.25)
  addMass(world, vec2f(0.5, 0.5), 0.25)
  console.log(Position)

  document.getElementById("reset")!.onclick = () => {
    setMousePosition()
    resetParticles()
  }

  Timing.update()
  function render() {
    Timing.update()
    renderParticles(ctx)
    renderMasses(ctx, world)
    requestAnimationFrame(render)
  }
  render()
}

if (location.search === "?plasma") main()

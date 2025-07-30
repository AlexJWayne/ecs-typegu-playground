import tgpu from "typegpu"
import { renderParticles, setupParticles } from "./particles"

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
export const canvas = document.createElement("canvas")
export const root = await tgpu.init()
export const canvasSize = 800

export let ctx: GPUCanvasContext

export function setupCanvas(): void {
  canvas.width = canvasSize
  canvas.height = canvasSize
  document.body.appendChild(canvas)

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })
}

function main() {
  console.log("mouse explosions")
  setupCanvas()
  setupParticles()
  render()
}

function render() {
  renderParticles()
  requestAnimationFrame(render)
}
if (location.search === "?mexp") main()

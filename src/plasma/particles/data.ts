import { f32, struct, vec2f } from "typegpu/data"

export const Instance = struct({
  pos: vec2f,
  vel: vec2f,
  lifetime: f32,
  age: f32,
})
export type Instance = typeof Instance

export const Uniforms = struct({
  deltaTime: f32,
  elapsed: f32,
})
export type Uniforms = typeof Uniforms

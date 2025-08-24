import { f32, struct, vec2f } from "typegpu/data"

export const SpawnerStruct = struct({
  pos: vec2f,
  initialVel: vec2f,
  radius: f32,
  lifetime: f32,
})

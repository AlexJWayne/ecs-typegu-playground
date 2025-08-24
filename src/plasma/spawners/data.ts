import { type Infer, f32, struct, vec2f } from "typegpu/data"

export const SpawnerStruct = struct({
  pos: vec2f,
  initialVel: struct({
    minTheta: f32,
    maxTheta: f32,
    minSpeed: f32,
    maxSpeed: f32,
  }),
  radius: f32,
  lifetime: f32,
})

export type SpawnerStruct = Infer<typeof SpawnerStruct>

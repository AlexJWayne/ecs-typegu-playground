export function randomOnZero(max: number): number {
  return (Math.random() * 2 - 1) * max
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

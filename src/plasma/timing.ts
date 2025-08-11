export const Timing = {
  /* Seconds since last frame */
  deltaTime: 0,

  /* Seconds since the simulation started */
  elapsed: 0,

  /* How quickly the simulation progresses */
  timeScale: 1.0,

  update() {
    const now = performance.now() / 1000
    const unscaledDeltaTime = Math.min(now - Timing.elapsed, 1 / 30)
    Timing.deltaTime = unscaledDeltaTime * Timing.timeScale
    Timing.elapsed = now
  },
}

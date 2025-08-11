export const Timing = {
  /* Seconds since last frame */
  deltaTime: 0,

  /* Seconds since the simulation started */
  elapsed: 0,

  /* How quickly the simulation progresses */
  timeScale: 1.0,

  update() {
    const now = performance.now() / 1000
    const unscaledDeltaTime = now - Timing.elapsed
    Timing.deltaTime = unscaledDeltaTime * Timing.timeScale
    Timing.elapsed = now
  },
}

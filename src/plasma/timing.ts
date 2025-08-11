export const Timing = {
  /* Seconds since last frame */
  deltaTime: 0,

  /* Seconds since the simulation started */
  elapsed: 0,

  /* How quickly the simulation progresses */
  timeScale: 1.0,

  update() {
    const now = performance.now()
    const unscaledDeltaTime = (now - Timing.elapsed) / 1000
    Timing.deltaTime = unscaledDeltaTime * Timing.timeScale
    Timing.elapsed = now
  },
}

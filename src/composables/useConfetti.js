import confetti from 'canvas-confetti'

const MILESTONES = [1, 5, 10, 15, 20, 25, 30]

let lastCount = 0

// canvas-confetti needs concrete colour values, so read them off the token layer
// rather than hardcoding hexes that drift from the rest of the UI.
function palette() {
  const s = getComputedStyle(document.documentElement)
  return ['--profile-1', '--profile-2', '--profile-both', '--success']
    .map(n => s.getPropertyValue(n).trim())
    .filter(Boolean)
}

export function useConfetti() {
  // Adopt a count without celebrating it.
  //
  // Visits load asynchronously, so the count goes 0 -> N on startup. Without this,
  // any N that happens to be a milestone fires confetti on every single page load —
  // celebrating history instead of an achievement.
  function seed(count) {
    lastCount = count
  }

  function checkMilestone(count) {
    if (count > lastCount && MILESTONES.includes(count)) {
      if (count >= 30) bigCelebration()
      else if (count >= 10) mediumCelebration()
      else smallCelebration()
    }
    lastCount = count
  }

  function smallCelebration() {
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 }, colors: palette() })
  }

  function mediumCelebration() {
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 }, colors: palette() })
  }

  function bigCelebration() {
    // Date.now() is fine here — this is runtime animation, not build output.
    const end = Date.now() + 2500
    const colors = palette()
    const frame = () => {
      confetti({
        particleCount: 60,
        spread: 120,
        startVelocity: 35,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }

  return { checkMilestone, seed }
}

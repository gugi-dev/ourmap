import confetti from 'canvas-confetti'

const MILESTONES = [1, 5, 10, 15, 20, 25, 30]

let lastCount = 0

export function useConfetti() {
  function checkMilestone(count) {
    if (count > lastCount && MILESTONES.includes(count)) {
      if (count >= 30) {
        bigCelebration()
      } else if (count >= 10) {
        mediumCelebration()
      } else {
        smallCelebration()
      }
    }
    lastCount = count
  }

  function smallCelebration() {
    confetti({
      particleCount: 40,
      spread: 55,
      origin: { y: 0.65 },
      colors: ['#3b82f6', '#f472b6', '#a855f7', '#22c55e'],
    })
  }

  function mediumCelebration() {
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#f472b6', '#a855f7', '#22c55e', '#f59e0b'],
    })
  }

  function bigCelebration() {
    const end = Date.now() + 2500
    const frame = () => {
      confetti({
        particleCount: 60,
        spread: 120,
        startVelocity: 35,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: ['#3b82f6', '#f472b6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }

  return { checkMilestone }
}

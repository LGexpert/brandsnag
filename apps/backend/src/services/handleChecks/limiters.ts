export function createConcurrencyLimiter(maxConcurrency: number) {
  let active = 0
  const queue: Array<() => void> = []

  const acquire = async () => {
    if (active < maxConcurrency) {
      active += 1
      return
    }

    await new Promise<void>((resolve) => {
      queue.push(() => {
        active += 1
        resolve()
      })
    })
  }

  const release = () => {
    active -= 1
    const next = queue.shift()
    next?.()
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire()
      try {
        return await fn()
      } finally {
        release()
      }
    },
  }
}

export function createRpsLimiter(maxRps: number) {
  const windowMs = 1000
  const timestamps: number[] = []

  return {
    async waitTurn() {
      if (maxRps <= 0) return

      while (true) {
        const now = Date.now()

        while (timestamps.length > 0 && now - timestamps[0]! >= windowMs) {
          timestamps.shift()
        }

        if (timestamps.length < maxRps) {
          timestamps.push(now)
          return
        }

        const earliest = timestamps[0]!
        const waitMs = Math.max(0, windowMs - (now - earliest))
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    },
  }
}

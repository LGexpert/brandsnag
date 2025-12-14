const MAX_SUGGESTIONS = 8

function clampHandle(handle: string, maxLen: number) {
  return handle.length <= maxLen ? handle : handle.slice(0, maxLen)
}

export function generateHandleSuggestions(handle: string, maxLen = 30): string[] {
  const base = handle.replace(/[^A-Za-z0-9_.-]/g, '')
  const candidates = new Set<string>()

  const add = (h: string) => {
    const trimmed = clampHandle(h, maxLen)
    if (!trimmed) return
    candidates.add(trimmed)
  }

  add(`${base}_official`)
  add(`${base}.official`)
  add(`${base}_hq`)
  add(`${base}_app`)
  add(`get_${base}`)
  add(`the_${base}`)

  for (let i = 1; i <= 5; i += 1) {
    add(`${base}${i}`)
  }

  return Array.from(candidates).slice(0, MAX_SUGGESTIONS)
}

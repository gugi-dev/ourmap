import { ref } from 'vue'

// 'system' | 'light' | 'dark'
//
// Writing data-theme onto <html> is what lets the token layer's explicit override win
// over prefers-color-scheme in both directions. WorldMap watches this attribute so it
// can re-read the palette (Leaflet paints SVG attributes and can't use var()).

const KEY = 'ourmap-theme'
const mode = ref(localStorage.getItem(KEY) || 'system')

function apply() {
  const root = document.documentElement
  if (mode.value === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode.value)
}

function resolved() {
  if (mode.value !== 'system') return mode.value
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function toggle() {
  mode.value = resolved() === 'dark' ? 'light' : 'dark'
  localStorage.setItem(KEY, mode.value)
  apply()
}

apply()

export function useTheme() {
  return { mode, toggle, resolved }
}

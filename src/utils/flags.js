// Convert ISO alpha-2 country code to flag emoji
// "us" -> 🇺🇸, "fr" -> 🇫🇷
export function countryFlag(code) {
  if (!code || code.length < 2) return ''
  // Kosovo and other non-standard codes don't have flag emojis
  if (code === 'xk') return '🇽🇰'
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

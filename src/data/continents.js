export const continentMap = {
  europe: ['ad', 'al', 'at', 'ba', 'be', 'bg', 'by', 'ch', 'cy', 'cz', 'de', 'dk', 'ee', 'es', 'fi', 'fo', 'fr', 'gb', 'ge', 'gr', 'hr', 'hu', 'ie', 'is', 'it', 'li', 'lt', 'lu', 'lv', 'mc', 'md', 'me', 'mk', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'rs', 'ru', 'se', 'si', 'sk', 'sm', 'tr', 'ua', 'va', 'xk'],
  asia: ['ae', 'af', 'am', 'az', 'bd', 'bh', 'bn', 'bt', 'cn', 'hk', 'id', 'il', 'in', 'iq', 'ir', 'jo', 'jp', 'kg', 'kh', 'kp', 'kr', 'kw', 'kz', 'la', 'lb', 'lk', 'mm', 'mn', 'mo', 'mv', 'my', 'np', 'om', 'ph', 'pk', 'ps', 'qa', 'sa', 'sg', 'sy', 'th', 'tj', 'tl', 'tm', 'tw', 'uz', 'vn', 'ye'],
  africa: ['ao', 'bf', 'bi', 'bj', 'bw', 'cd', 'cf', 'cg', 'ci', 'cm', 'cv', 'dj', 'dz', 'eg', 'eh', 'er', 'et', 'ga', 'gh', 'gm', 'gn', 'gq', 'gw', 'ke', 'km', 'lr', 'ls', 'ly', 'ma', 'mg', 'ml', 'mr', 'mu', 'mw', 'mz', 'na', 'ne', 'ng', 'rw', 'sc', 'sd', 'sl', 'sn', 'so', 'ss', 'st', 'sz', 'td', 'tg', 'tn', 'tz', 'ug', 'za', 'zm', 'zw'],
  northAmerica: ['ag', 'ai', 'aw', 'bb', 'bm', 'bs', 'bz', 'ca', 'cr', 'cu', 'dm', 'do', 'gd', 'gt', 'hn', 'ht', 'jm', 'kn', 'ky', 'lc', 'mx', 'ni', 'pa', 'pr', 'sv', 'tt', 'us', 'vc'],
  southAmerica: ['ar', 'bo', 'br', 'cl', 'co', 'ec', 'fk', 'gf', 'gy', 'pe', 'py', 'sr', 'uy', 've'],
  oceania: ['as', 'au', 'fj', 'fm', 'gu', 'ki', 'mh', 'nc', 'nr', 'nz', 'pf', 'pg', 'pw', 'sb', 'to', 'tv', 'vu', 'ws'],
}

export const continents = [
  { key: 'europe', name: 'Europe', emoji: '🇪🇺', color: '#3b82f6' },
  { key: 'asia', name: 'Asia', emoji: '🌏', color: '#f59e0b' },
  { key: 'africa', name: 'Africa', emoji: '🌍', color: '#22c55e' },
  { key: 'northAmerica', name: 'N. America', emoji: '🌎', color: '#ef4444' },
  { key: 'southAmerica', name: 'S. America', emoji: '🌎', color: '#a855f7' },
  { key: 'oceania', name: 'Oceania', emoji: '🏝️', color: '#06b6d4' },
]

// Reverse lookup: country code -> continent key
export const countryToContinent = {}
for (const [continent, codes] of Object.entries(continentMap)) {
  for (const code of codes) {
    countryToContinent[code] = continent
  }
}

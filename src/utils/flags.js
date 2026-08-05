import { entityByCode } from '../data/entities.js'

// Flags are bundled SVGs in /public/flags, not emoji.
//
// Emoji can't work here: England, Scotland and Wales need Unicode tag-sequences that
// render as blank boxes on Windows and older Android, and Northern Ireland has no
// Unicode flag at all. SVG renders identically everywhere and stays crisp at any size.
//
// The filename comes from the generated `flag` field — usually the ISO alpha-2 code,
// but `gb-eng` / `gb-sct` / `gb-wls` / `gb-nir` for the UK constituent countries,
// since their ISO code is "GB" for all four and cannot tell them apart.

const PLACEHOLDER = '/flags/_placeholder.svg'

export function flagUrl(code) {
  const key = entityByCode[code]?.flag
  return key ? `/flags/${key}.svg` : PLACEHOLDER
}

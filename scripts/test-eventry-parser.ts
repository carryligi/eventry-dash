// Ad-hoc verification script: runs the Eventry parser on the real example file
// and prints the normalized output. Not a real test — just proves the parser
// produces the expected shape before we trust it in production.
//
// Usage (from repo root):
//   npx tsx scripts/test-eventry-parser.ts

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEventryExport } from '../src/lib/import/eventry-parser'

const SAMPLE_FILE =
  process.argv[2] ??
  path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'Downloads',
    'eventry_settings_512762594818392064 (1).json',
  )

console.log(`Parsing: ${SAMPLE_FILE}\n`)

const raw = JSON.parse(readFileSync(SAMPLE_FILE, 'utf-8'))
const parsed = parseEventryExport(raw)

console.log('── META ──')
console.log(parsed.meta)

console.log('\n── IDENTITY ──')
console.log({ discordUserId: parsed.discordUserId })

console.log('\n── PINGER ──')
console.log(parsed.pinger)

console.log('\n── PUSHOVER ──')
console.log(parsed.pushover)

console.log('\n── SILENTLY ──')
console.log(parsed.silently)

console.log('\n── WEBHOOK ──')
console.log(parsed.webhook)

console.log('\n── KEYWORDS ──')
console.log(`Total: ${parsed.keywords.length}`)
const scoped = parsed.keywords.filter((k) => !k.needsScope)
const scopeless = parsed.keywords.filter((k) => k.needsScope)
console.log(`With scope: ${scoped.length}`)
console.log(`Scopeless: ${scopeless.length}`)
console.log('\nScoped keywords:')
for (const kw of scoped) {
  console.log(`  • "${kw.keyword}"${kw.internalName ? ` (${kw.internalName})` : ''}`)
  console.log(`      channelIds: ${JSON.stringify(kw.channelIds)}`)
  console.log(`      categoryIds: ${JSON.stringify(kw.categoryIds)}`)
  if (kw.maxPrice !== null) console.log(`      maxPrice: ${kw.maxPrice}`)
}
console.log('\nScopeless keywords:')
for (const kw of scopeless) {
  console.log(`  • "${kw.keyword}"${kw.internalName ? ` (${kw.internalName})` : ''}`)
}

console.log('\n── AUTOSTART DISABLED ──')
console.log(parsed.autostartDisabledKeywords)

console.log('\n── ISSUES ──')
for (const issue of parsed.issues) {
  console.log(`  [${issue.kind}] ${issue.message}`)
}

console.log('\n✓ Parse erfolgreich')

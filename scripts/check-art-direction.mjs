#!/usr/bin/env node
// Regression guard: checks reference provenance, native frames and renderer configuration.
// This cannot assess aesthetic similarity; a human/visual model must inspect the gallery.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => fs.readFileSync(path.join(root, p))
const json = p => JSON.parse(read(p).toString('utf8'))

export function checkArtDirection() {
  for (const file of ['AGENTS.md','docs/ART_STYLE.md','art/style-references.json'])
    assert.ok(fs.existsSync(path.join(root, file)), `Missing art contract: ${file}`)

  const guide = read('docs/ART_STYLE.md').toString('utf8')
  assert.match(guide, /Pixel Frog.*Tiny Swords/i)
  assert.match(guide, /64.*64/)
  const registry = json('src/art/registry.json')
  const refs = json('art/style-references.json')
  const pack = json('art/pack-manifest.json')
  assert.equal(registry.tileSize, 64, 'master terrain grid must remain 64px')
  assert.equal(refs.nativeTileSize, registry.tileSize, 'reference grid changed')
  assert.equal(registry.palette.outline.toLowerCase(), '#293544', 'master outline color changed')

  const renderer = read('src/art/pixel-rendering.ts').toString('utf8')
  for (const target of ['TextureStyle', 'TextureSource'])
    assert.match(renderer, new RegExp(target + `\\.defaultOptions\\.scaleMode\\s*=\\s*['"]nearest['"]`), `Missing nearest rendering: ${target}`)

  const anchored = new Set()
  const originals = new Map(pack.retained.map(entry => [entry.file,entry.sha256]))
  // Also guard newly recovered native animation inputs, not just gallery cards.
  for(const entry of pack.retained)
    assert.equal(createHash('sha256').update(read('public/tiny-swords/'+entry.file)).digest('hex'),
      entry.sha256,`Native pack input altered: ${entry.file}`)
  let native = 0, authored = 0

  for (const ref of refs.references) {
    assert.ok(ref.id && typeof ref.role === 'string' && ref.role.length > 15, 'Each reference needs an ID and review role')
    assert.ok(!anchored.has(ref.id), `Duplicate reference ${ref.id}`)
    anchored.add(ref.id)
    assert.ok(['pack', 'authored'].includes(ref.origin), `Unknown reference origin for ${ref.id}`)
    const asset = registry.assets[ref.id]?.editorManaged ? json('art/registry-base.json').assets[ref.id] : registry.assets[ref.id]
    assert.ok(asset, `Reference missing from registry: ${ref.id}`)
    const state = asset.animations?.stand
    assert.ok(state, `Reference without stand animation: ${ref.id}`)
    assert.ok(/^tiny-swords\//.test(state.image) && !state.image.includes('..'), `Unsafe image path: ${ref.id}`)
    const location = path.join('public',state.image)
    const buf = read(location)
    const png = PNG.sync.read(buf)
    assert.equal(png.width, asset.frame[0] * state.frames, `Frame width mismatch: ${ref.id}`)
    assert.equal(png.height, asset.frame[1] * (state.rows ?? 1), `Frame height mismatch: ${ref.id}`)
    assert.ok(asset.foot[0] >= 0 && asset.foot[0] <= asset.frame[0] &&
              asset.foot[1] >= 0 && asset.foot[1] <= asset.frame[1], `Bad foot: ${ref.id}`)

    if (ref.origin === 'pack') {
      const source = state.image.slice('tiny-swords/'.length)
      assert.ok(originals.has(source), `Native reference not present in pack manifest: ${ref.id}`)
      const actual = createHash('sha256').update(buf).digest('hex')
      assert.equal(actual, originals.get(source), `Native pack master altered: ${ref.id}`)
      native++
    } else {
      // Compiled in-project sprites intentionally use hard pixel edges / binary alpha.
      // Any future exception must first be documented and reviewed, never silently bypassed.
      for (let i = 3; i < png.data.length; i += 4)
        assert.ok(png.data[i] === 0 || png.data[i] === 255, `Non-binary authored alpha: ${ref.id}`)
      authored++
    }
  }

  assert.ok(native >= 5 && authored >= 4, 'Reference coverage too small')
  const result = { nativeMasterReferences:native, authoredIdentityAndBiomeReferences:authored, total:anchored.size }
  console.log(`Art direction OK: ${result.total} pinned references (${native} native masters, ${authored} authored), 64px grid, pixelated renderer`)
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { checkArtDirection() } catch (error) {
    console.error('Art direction FAILED:', error.message)
    process.exitCode = 1
  }
}

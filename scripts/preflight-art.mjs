#!/usr/bin/env node
/** Dependency-free integrity check for the locally authored Tiny Swords world. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pngSize = file => {
  const header = Buffer.alloc(24)
  const fd = fs.openSync(file, 'r')
  try { if (fs.readSync(fd, header, 0, 24, 0) !== 24) throw Error(`Truncated PNG: ${file}`) }
  finally { fs.closeSync(fd) }
  if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || header.toString('ascii', 12, 16) !== 'IHDR')
    throw Error(`Invalid PNG header: ${file}`)
  return [header.readUInt32BE(16), header.readUInt32BE(20)]
}
const within = (parent, relative) => {
  const resolved = path.resolve(parent, relative)
  if (!resolved.startsWith(parent + path.sep)) throw Error(`Unsafe asset path: ${relative}`)
  return resolved
}
const attr = (markup, key) => markup.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1]
const requireFile = file => { if (!fs.existsSync(file)) throw Error(`Missing: ${path.relative(root, file)}`); return file }
const dimensions = (file, expected) => {
  const actual = pngSize(requireFile(file))
  if (actual.some((n, i) => n !== expected[i]))
    throw Error(`${path.relative(root, file)}: ${actual.join('×')} != ${expected.join('×')}`)
}

export function preflight() {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'src/art/registry.json'), 'utf8'))
  if (registry.tileSize !== 64) throw Error('Tiny Swords terrain must use 64×64 tiles')
  let animations = 0
  for (const [id, asset] of Object.entries(registry.assets)) {
    const [fw, fh] = asset.frame
    const [footX, footY] = asset.foot
    if (footX < 0 || footY < 0 || footX > fw || footY > fh) throw Error(`Invalid foot anchor: ${id}`)
    for (const [state, definition] of Object.entries(asset.animations)) {
      if (!Number.isInteger(definition.frames) || definition.frames < 1 || definition.fps <= 0) throw Error(`Invalid animation: ${id}/${state}`)
      dimensions(within(path.join(root, 'public'), definition.image), [fw * definition.frames, fh * (definition.rows ?? 1)])
      if (definition.visibleBounds?.length !== definition.frames) throw Error(`Frame metadata mismatch: ${id}/${state}`)
      for (const box of definition.visibleBounds) {
        if (box.length !== 4 || box[0] < 0 || box[1] < 0 || box[2] >= fw || box[3] >= fh || box[0] > box[2] || box[1] > box[3])
          throw Error(`Invalid visible bounds: ${id}/${state}`)
      }
      animations++
    }
  }
  const maps = []
  for (const name of fs.readdirSync(path.join(root, 'src/tiled')).filter(s => s.endsWith('.tmx'))) {
    const xml = fs.readFileSync(path.join(root, 'src/tiled', name), 'utf8')
    const map = xml.match(/<map\b([^>]*)>/)?.[1]
    if (!map) throw Error(`Invalid TMX: ${name}`)
    const columns = Number(attr(map, 'width')), rows = Number(attr(map, 'height'))
    if (Number(attr(map, 'tilewidth')) !== 64 || Number(attr(map, 'tileheight')) !== 64) throw Error(`Wrong map grid: ${name}`)
    const tilesets = [...xml.matchAll(/<tileset\b([^>]*\bfirstgid="\d+"[^>]*)\/>/g)].map(m => {
      const first = Number(attr(m[1], 'firstgid'))
      const file = within(path.join(root, 'src/tiled'), attr(m[1], 'source'))
      const definition = fs.readFileSync(requireFile(file), 'utf8')
      const t = definition.match(/<tileset\b([^>]*)>/)?.[1]
      const image = definition.match(/<image\b([^>]*)\/>/)?.[1]
      if (!t || !image) throw Error(`Invalid TSX: ${path.basename(file)}`)
      const count = Number(attr(t, 'tilecount'))
      if (Number(attr(t, 'tilewidth')) !== 64 || Number(attr(t, 'tileheight')) !== 64 || !Number.isInteger(count) || count < 1)
        throw Error(`Invalid tileset grid: ${path.basename(file)}`)
      dimensions(within(path.dirname(file), attr(image, 'source')), [Number(attr(image, 'width')), Number(attr(image, 'height'))])
      return { first, count }
    }).sort((a, b) => a.first - b.first)
    if (!tilesets.length) throw Error(`No tilesets: ${name}`)
    let layers = 0
    for (const match of xml.matchAll(/<layer\b([^>]*)>\s*<data\b([^>]*)>([\s\S]*?)<\/data>\s*<\/layer>/g)) {
      if (attr(match[2], 'encoding') !== 'csv') throw Error(`${name}: expected CSV tile encoding`)
      const gids = match[3].split(',').map(s => s.trim()).filter(Boolean)
      if (gids.length !== columns * rows) throw Error(`${name}: ${attr(match[1], 'name')} has ${gids.length} tiles; expected ${columns * rows}`)
      for (const value of gids) {
        if (!/^\d+$/.test(value)) throw Error(`Invalid tile ID: ${name}: ${value}`)
        const gid = (Number(value) >>> 0) & 0x0fffffff
        if (gid === 0) continue
        const source = [...tilesets].reverse().find(t => gid >= t.first)
        if (!source || gid >= source.first + source.count) throw Error(`${name}: tile ID ${gid} outside its tileset`)
      }
      layers++
    }
    if (!layers) throw Error(`No tile layers in ${name}`)
    maps.push({ name, size: `${columns}×${rows}`, layers })
  }
  const result = { assets: Object.keys(registry.assets).length, animations, maps }
  console.log(`Tiny Swords preflight OK: ${result.assets} assets, ${animations} animations, ${maps.map(m => `${m.name} ${m.size} (${m.layers} layers)`).join('; ')}`)
  return result
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { preflight() } catch (e) { console.error('Tiny Swords preflight FAILED:', e.message); process.exitCode = 1 }
}

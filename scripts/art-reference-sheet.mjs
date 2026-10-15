#!/usr/bin/env node
// Generate a static visual review sheet from existing, tracked artwork.
// No image generation, no external uploads, no browser automation required.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const json = file => JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))
const registry = json('src/art/registry.json')
const manifest = json('art/style-references.json')
const escape = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const cards = manifest.references.map(ref => {
  const asset = registry.assets[ref.id], [width,height] = asset.frame
  const image = asset.animations.stand.image
  const label = ref.origin === 'pack' ? 'NATIVE STYLE MASTER' : 'APPROVED EXTENSION'
  const img = encodeURI('../../public/' + image)
  return `<article class="card"><div class="title"><span class="${ref.origin}">${label}</span><strong>${escape(ref.id)}</strong></div>
    <div class="stage"><div class="crop" style="width:${width}px;height:${height}px"><img src="${escape(img)}" alt="${escape(ref.id)}"></div></div>
    <div class="note">${escape(ref.role)}</div><div class="meta">${width} × ${height}px / ${asset.animations.stand.frames} frames / foot ${asset.foot.join(', ')}</div></article>`
}).join('\n')

const out = path.join(root,'artifacts/art-direction/style-reference.html')
fs.mkdirSync(path.dirname(out),{recursive:true})
fs.writeFileSync(out,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Nobby World · Style reference gallery</title><style>
*{box-sizing:border-box}body{background:#16242d;color:#ebede8;margin:0;font:15px system-ui,-apple-system,sans-serif}
header{padding:28px 32px;border-bottom:1px solid #39505b}h1{font-size:28px;margin:0 0 6px}.intro{color:#b8c5c9}
main{padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(345px,1fr));gap:16px}
.card{border:1px solid #38525d;border-radius:9px;overflow:hidden;background:#243541}
.title{padding:12px 16px;display:flex;align-items:center;gap:12px}.title strong{font-size:16px}
.title span{font-size:10px;letter-spacing:.08em;color:#cde6d7}.title .authored{color:#d0bde7}
.stage{height:295px;background:#769c76;display:flex;justify-content:center;align-items:center;overflow:auto}
.crop{position:relative;flex:none;overflow:hidden;image-rendering:pixelated}.crop img{position:absolute;left:0;top:0;max-width:none;image-rendering:pixelated}
.note{padding:12px 16px 4px;color:#e8e3ce}.meta{padding:0 16px 14px;color:#a8b8bc;font:12px ui-monospace,monospace}
footer{padding:24px 32px;color:#a8b8bc}code{color:#f5e7c4}
</style></head><body><header><h1>Nobby World · Pixel Art Masters</h1><div class="intro">Native Tiny Swords masters first; approved characters and biomes are secondary examples. Compare at 100% native zoom and in-game, not just in this gallery.</div></header>
<main>${cards}</main><footer>Manifest: <code>art/style-references.json</code>. Rules: <code>docs/ART_STYLE.md</code>. Image sources remain in the repository; no assets were duplicated.</footer></body></html>\n`)
console.log('Created '+path.relative(root,out))

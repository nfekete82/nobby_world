import fs from 'node:fs'
import {spawnSync} from 'node:child_process'
import {PNG} from 'pngjs'
const dir=process.env.NOBBY_ARTIFACT_DIR||'artifacts/shaman-run'
fs.mkdirSync(dir,{recursive:true})
const actors={shaman:'public/tiny-swords/biomes/shaman-natural-walk.png',knight:'public/tiny-swords/Units/Red Units/Warrior/Warrior_Run.png'}
for(const [id,file] of Object.entries(actors)){
 const src=PNG.sync.read(fs.readFileSync(file)),rows=src.height/192
 const contact=new PNG({width:6*288,height:rows*288})
 for(let row=0;row<rows;row++)for(let f=0;f<6;f++){
  const frame=new PNG({width:192,height:192})
  PNG.bitblt(src,frame,f*192,row*192,192,192,0,0)
  fs.writeFileSync(`${dir}/${id}-${row}-${f}.png`,PNG.sync.write(frame))
  // Exact 3x nearest magnification of the 96px actor region, no resampling.
  for(let y=0;y<288;y++)for(let x=0;x<288;x++){
   const sx=48+Math.floor(x/3),sy=48+Math.floor(y/3),i=(sy*192+sx)*4
   const d=((row*288+y)*contact.width+f*288+x)*4
   const bg=((Math.floor(x/24)+Math.floor(y/24))%2)?[66,74,83,255]:[54,62,71,255]
   contact.data.set(frame.data[i+3]?frame.data.subarray(i,i+4):bg,d)
  }
 }
 fs.writeFileSync(`${dir}/${id}-frames-3x.png`,PNG.sync.write(contact))
}
// GIF export is optional tooling; the HTML animations always work without it.
for(const [row,name] of [[0,'front'],[1,'rear']]){
 const gif=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','12',
  '-i',`${dir}/shaman-${row}-%d.png`,'-vf',
  'crop=96:96:48:48,scale=384:384:flags=neighbor,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none',`${dir}/${name}.gif`])
 if(gif.error?.code!=='ENOENT'&&gif.status!==0)throw Error(gif.stderr.toString())
}
fs.writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset="utf-8"><title>Shaman gait review</title>
<style>body{background:#364049;color:#fff;font:16px system-ui}img{image-rendering:pixelated;max-width:100%}.row{display:flex;gap:24px}.sprite{width:192px;height:192px;background-repeat:no-repeat;image-rendering:pixelated;animation:run .5s steps(6) infinite;zoom:2;background-color:#424a53}.rear{background-position-y:-192px}@keyframes run{to{background-position-x:-1152px}}button{padding:8px}</style>
<h1>Shaman: hand-painted six-phase run</h1><p>12 FPS, native 192px cells; frames 1–6 left to right. Row 1 front, row 2 rear. Fixed anchor [96,132].</p>
<button onclick="document.querySelectorAll('.sprite').forEach(s=>s.style.animationPlayState=s.style.animationPlayState==='paused'?'running':'paused')">Pause / resume</button>
<div class="row"><div><h2>Front</h2><div class="sprite" style="background-image:url(../../public/tiny-swords/biomes/shaman-natural-walk.png)"></div></div><div><h2>Rear</h2><div class="sprite rear" style="background-image:url(../../public/tiny-swords/biomes/shaman-natural-walk.png)"></div></div><div><h2>Native warrior</h2><div class="sprite" style="background-image:url(../../public/tiny-swords/Units/Red%20Units/Warrior/Warrior_Run.png)"></div></div></div>
<p>Contact R · support R · left passing · contact L · support L · right passing → contact R</p>
<img src="shaman-frames-3x.png"><h2>Native movement reference</h2><img src="knight-frames-3x.png">
<p>Persistent limb colours in the authored pixel source: turquoise trousers, brown leather, dark soles. Rear follows the same leg identities.</p>`)

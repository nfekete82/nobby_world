import fs from 'node:fs'
import {spawnSync} from 'node:child_process'
import {PNG} from 'pngjs'
const dir=process.env.NOBBY_ARTIFACT_DIR||'artifacts/shaman-native-monk'
fs.mkdirSync(dir,{recursive:true})
const actors={monk:'public/tiny-swords/Units/Blue Units/Monk/Run.png',shaman:'public/tiny-swords/biomes/shaman-natural-walk.png',knight:'public/tiny-swords/Units/Red Units/Warrior/Warrior_Run.png'}
for(const [id,file] of Object.entries(actors)){
 const src=PNG.sync.read(fs.readFileSync(file)),rows=src.height/192,frames=src.width/192
 const contact=new PNG({width:frames*288,height:rows*288})
 for(let row=0;row<rows;row++)for(let f=0;f<frames;f++){
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
<style>body{background:#364049;color:#fff;font:16px system-ui}img{image-rendering:pixelated;max-width:100%}.row{display:flex;gap:24px}.sprite{width:192px;height:192px;background-repeat:no-repeat;image-rendering:pixelated;animation:run calc(var(--frames)*1s/12) steps(var(--frames)) infinite;zoom:2;background-color:#424a53}.rear{background-position-y:-192px}@keyframes run{to{background-position-x:calc(var(--frames)*-192px)}}button{padding:8px}</style>
<h1>Shaman: native Monk-based run</h1><p>12 FPS, native 192px cells; original four run poses left to right. Row 1 front, row 2 rear. Fixed anchor [96,132].</p>
<button onclick="document.querySelectorAll('.sprite').forEach(s=>s.style.animationPlayState=s.style.animationPlayState==='paused'?'running':'paused')">Pause / resume</button>
<div class="row"><div><h2>Front</h2><div class="sprite" style="--frames:4;background-image:url(../../public/tiny-swords/biomes/shaman-natural-walk.png)"></div></div><div><h2>Rear</h2><div class="sprite rear" style="--frames:4;background-image:url(../../public/tiny-swords/biomes/shaman-natural-walk.png)"></div></div><div><h2>Original Monk</h2><div class="sprite" style="--frames:4;background-image:url(../../public/tiny-swords/Units/Blue%20Units/Monk/Run.png)"></div></div><div><h2>Native warrior</h2><div class="sprite" style="--frames:6;background-image:url(../../public/tiny-swords/Units/Red%20Units/Warrior/Warrior_Run.png)"></div></div></div>
<p>Original Monk phases: right contact · passing · left contact · passing → right contact</p>
<img src="shaman-frames-3x.png"><h2>Original Monk movement</h2><img src="monk-frames-3x.png"><h2>Warrior reference</h2><img src="knight-frames-3x.png">
<p>Native robe, legs, sleeves and gait; edited brown hair, beard, bun, sea-green costume and staff. Rear has a separate back-of-head drawing.</p>`)

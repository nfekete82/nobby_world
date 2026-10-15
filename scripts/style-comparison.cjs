const fs=require('node:fs')
const {execFileSync}=require('node:child_process')
const {PNG}=require('pngjs')
const {chromium}=require('playwright')
const art=JSON.parse(fs.readFileSync('src/art/registry.json'))
const old=JSON.parse(execFileSync('git',['show','eed21dad3e0cae0f6f20d134c6dc7aacf91aa18f:src/art/registry.json']))
const reference='eed21dad3e0cae0f6f20d134c6dc7aacf91aa18f'
function frame(id,before=false){
 const a=(before?old:art).assets[id],state=a.animations.stand
 const beforeImage=state.image.replace('tiny-swords/biomes/','tiny-swords/illustrated/')
 const p=PNG.sync.read(before?execFileSync('git',['show',reference+':public/'+beforeImage]):fs.readFileSync('public/'+state.image))
 const out=new PNG({width:a.frame[0],height:a.frame[1]});PNG.bitblt(p,out,0,0,out.width,out.height,0,0)
 return 'data:image/png;base64,'+PNG.sync.write(out).toString('base64')
}
;(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true})
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1600},deviceScaleFactor:1})
  const rows=[['Tannen','tree-oak','snow-fir'],['Gebäude','tower','desert-house'],['Begleiter','knight','skeleton'],['Dschungel','tree-small','jungle-tree'],['Wüstengegner','knight','desert-scorpion']]
  // Resolve the existing native warrior ID rather than assuming its name.
  const warrior=Object.keys(art.assets).find(id=>art.assets[id].animations.stand.image.includes('Warrior_Idle'))
  await page.setContent(`<style>body{margin:0;background:#223b40;color:#fff;font:16px system-ui}h1{font-size:24px;padding:20px;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr)}header{padding:15px;text-align:center;background:#15252f}.cell{height:266px;background:#80a96e;border:1px solid #63895c;position:relative;display:flex;justify-content:center;align-items:flex-end}.cell img{image-rendering:pixelated;max-width:none}.label{position:absolute;top:8px;left:12px;color:#18302e;font-weight:600;font-size:14px}</style><h1>Nobby World · direkter Vergleich bei nativer Pixelgröße</h1><div class="grid"><header>Original Tiny Swords · Stilreferenz</header><header>Bisherige Erweiterung</header><header>Überarbeitete Erweiterung</header>${rows.map(([label,native,id])=>{if(native==='knight')native=warrior;return [[native,false],[id,true],[id,false]].map(([asset,before])=>`<div class="cell"><span class="label">${label} · ${asset}</span><img src="${frame(asset,before)}"></div>`).join('')}).join('')}</div>`)
  await page.screenshot({path:'artifacts/expansion/style-comparison-v2.png',fullPage:true})
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})

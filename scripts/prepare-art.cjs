// Deterministic export only: crop, ground-align and nearest-neighbor downsample ImageGen PNGs.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/prepare-art.cjs
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8093');
 const specs=[['world-atlas.png','world.png',6,4,true],['nobby-source.png','nobby.png',6,4,true],['terrain-source.png','terrain.png',2,2,false]];
 if(fs.existsSync('assets/art/enemies-source.png'))specs.push(['enemies-source.png','enemies.png',6,6,true]);
 if(fs.existsSync('assets/art/effects-source.png'))specs.push(['effects-source.png','effects.png',4,4,true]);
 if(fs.existsSync('assets/art/cliffs-source.png'))specs.push(['cliffs-source.png','cliffs.png',2,1,false]);
 const report=[];
 for(const [source,output,cols,rows,align] of specs){
  const result=await page.evaluate(async({source,cols,rows,align})=>{
   const img=new Image();img.src='assets/art/'+source;await img.decode();
   const sourceCanvas=document.createElement('canvas');sourceCanvas.width=img.width;sourceCanvas.height=img.height;
   const sc=sourceCanvas.getContext('2d');sc.drawImage(img,0,0);
   const cw=img.width/cols,ch=img.height/rows;
   
   const out=document.createElement('canvas');out.width=cols*128;out.height=rows*128;
   const c=out.getContext('2d');c.imageSmoothingEnabled=false;const bounds=[];
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const rowCuts=source==='world-atlas.png'?[0,276,526,746,1024]:source==='nobby-source.png'?[0,280,532,784,1024]:source==='enemies-source.png'?[0,195,400,595,760,962,1254]:null;
    const sx=Math.round(col*cw),sy=rowCuts?rowCuts[row]:Math.round(row*ch);
    const sw=Math.round((col+1)*cw)-sx,sh=(rowCuts?rowCuts[row+1]:Math.round((row+1)*ch))-sy;
    const data=sc.getImageData(sx,sy,sw,sh).data;
    let x0=sw,y0=sh,x1=-1,y1=-1,zero=0;
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
     const a=data[(y*sw+x)*4+3];if(a===0)zero++;
     if(a>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    }
    if(align&&zero<sw*sh*.005)throw Error(source+': missing transparency in cell '+col+','+row);
    if(x1<0)throw Error('Empty cell '+source);
    bounds.push({col,row,x0,y0,x1,y1,transparent:zero/(sw*sh)});
    if(align){
     const w=x1-x0+1,h=y1-y0+1;
     // Shared source scale within an animation row; variation is retained.
     const scale=source==='nobby-source.png'?Math.min(104/210,112/w):Math.min(112/w,112/h);
     const dw=Math.round(w*scale),dh=Math.round(h*scale);
     c.drawImage(img,sx+x0,sy+y0,w,h,col*128+Math.round((128-dw)/2),row*128+116-dh,dw,dh);
    }else{
     // Mirror the interior into a 2x2 repeat: opposite edges become exact matches.
     const t=document.createElement('canvas');t.width=32;t.height=32;const tc=t.getContext('2d');tc.imageSmoothingEnabled=false;
     tc.drawImage(img,col*cw+cw*.25,row*ch+ch*.25,cw*.5,ch*.5,0,0,32,32);
     for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){c.save();c.translate(col*128+xx*64+(xx?64:0),row*128+yy*64+(yy?64:0));c.scale(xx?-1:1,yy?-1:1);c.drawImage(t,0,0,64,64);c.restore();}
    }
   }
   return {png:out.toDataURL('image/png').split(',')[1],bounds,width:out.width,height:out.height};
  },{source,cols,rows,align});
  fs.writeFileSync('assets/art/'+output,Buffer.from(result.png,'base64'));
  report.push({source,output,width:result.width,height:result.height,cells:result.bounds});
 }
 fs.writeFileSync('assets/art/manifest.json',JSON.stringify(report,null,2)+'\n');await browser.close();
 console.log('Exported '+specs.length+' atlases; alpha and grid checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});

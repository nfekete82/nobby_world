/** Every mutating browser scenario runs in a disposable complete project copy.
 * The user's running server and authored maps are never reused. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process')
module.exports=function fixtureRun(script){
 if(process.env.NOBBY_EDITOR_FIXTURE){if(fs.realpathSync(process.env.NOBBY_EDITOR_FIXTURE_ROOT||'/missing-fixture')!==fs.realpathSync(process.cwd())||!path.basename(process.cwd()).startsWith('nobby-editor-browser-'))throw Error('Mutating editor tests require a disposable fixture');return false}
 const source=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-browser-'))
 try{
  for(const name of fs.readdirSync(source)){
   if(['.git','node_modules','dist','.tools','artifacts','.env'].includes(name)||name.startsWith('.env.'))continue
   fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true,filter:p=>!p.includes('art/editor-history')&&!p.includes('art/map-backups')})
  }
  fs.symlinkSync(path.join(source,'node_modules'),path.join(root,'node_modules'),'dir')
  if(process.env.NOBBY_EDITOR_LARGE_MAP)fs.copyFileSync(process.env.NOBBY_EDITOR_LARGE_MAP,path.join(root,'src/tiled/simplemap.tmx'))
  const result=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,stdio:'inherit',env:{...process.env,NOBBY_EDITOR_FIXTURE:'1',NOBBY_EDITOR_FIXTURE_ROOT:root,NOBBY_TEST_PORT:process.env.NOBBY_TEST_PORT||'5197'}})
  if(fs.existsSync(path.join(root,'artifacts/editor-workshop')))fs.cpSync(path.join(root,'artifacts/editor-workshop'),path.join(source,'artifacts/editor-workshop'),{recursive:true})
  process.exitCode=result.status??1
 }finally{fs.rmSync(root,{recursive:true,force:true,maxRetries:20,retryDelay:100})}
 return true
}

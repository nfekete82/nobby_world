import path from 'node:path'
import {compileWorlds} from './world-data.mjs'
let input=''
for await(const part of process.stdin)input+=part
try{
 const job=JSON.parse(input)
 if(job.mode==='refresh')compileWorlds()
 else compileWorlds({writeOutput:false,prepareArt:false,overrides:{[path.resolve('src/tiled',job.id+'.tmx')]:job.updated}})
 process.stdout.write(JSON.stringify({ok:true}))
}catch(error){process.stderr.write(String(error));process.exitCode=1}

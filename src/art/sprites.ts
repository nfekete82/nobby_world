import registry from './registry.json'
import {animationFrameIndices,trimTransparentBoundsFor} from './animation-policy.mjs'

export const ART=registry
export type AssetId=keyof typeof registry.assets

/** Native-sized sheets; the only transforms are fixed foot translation and mirror. */
export function spritesheets(){
    return Object.entries(registry.assets).map(([id,asset])=>{
        const [width,height]=asset.frame,[footX,footY]=asset.foot,[boxW,boxH]=asset.hitbox
        // Keep a small set of geometrically stable standing poses while leaving
        // every walk, attack, cast, hit, death and summon frame intact.
        const textures=Object.fromEntries(Object.entries(asset.animations).map(([name,state])=>{
          const frames=animationFrameIndices(id,name,state.frames)
          return [name,{
            image:state.image,framesWidth:state.frames,framesHeight:(state as any).rows??1,
            animations:({direction}: {direction:string})=>[
                [...frames.map((frameX,index)=>({
                    time:index*60/state.fps,frameX,frameY:(state as any).rows===2&&direction==='up'?1:0,
                    scale:asset.directional&&direction==='left'?[-1,1]:[1,1]
                })),{time:frames.length*60/state.fps}]
            ]
          }]
        }))
        return {id,image:asset.animations.stand.image,framesWidth:asset.animations.stand.frames,
            framesHeight:(asset.animations.stand as any).rows??1,anchor:[footX/width,footY/height],x:boxW/2,y:boxH,
            trimTransparentBounds:trimTransparentBoundsFor(asset.kind,id),textures}
    })
}

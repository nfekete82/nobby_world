import registry from './registry.json'

export const ART=registry
export type AssetId=keyof typeof registry.assets

/** Native-sized sheets; the only transforms are fixed foot translation and mirror. */
export function spritesheets(){
    return Object.entries(registry.assets).map(([id,asset])=>{
        const [width,height]=asset.frame,[footX,footY]=asset.foot,[boxW,boxH]=asset.hitbox
        // Image-generated idle frames have uneven horizontal centers.
        // Keep only foot-aligned poses; all run/combat/cast frames remain intact.
        const stableIdle=id==='hero'?[1,3]:id==='female'?[3,5]:null
        const textures=Object.fromEntries(Object.entries(asset.animations).map(([name,state])=>{
          const frames=name==='stand'&&stableIdle?stableIdle:Array.from({length:state.frames},(_,i)=>i)
          return [name,{
            image:state.image,framesWidth:state.frames,framesHeight:1,
            animations:({direction}: {direction:string})=>[
                [...frames.map((frameX,index)=>({
                    time:index*60/(stableIdle&&name==='stand'?4:state.fps),frameX,frameY:0,
                    scale:asset.directional&&direction==='left'?[-1,1]:[1,1]
                })),{time:frames.length*60/(stableIdle&&name==='stand'?4:state.fps)}]
            ]
          }]
        }))
        return {id,image:asset.animations.stand.image,framesWidth:asset.animations.stand.frames,
            framesHeight:1,anchor:[footX/width,footY/height],x:boxW/2,y:boxH,
            trimTransparentBounds:true,textures}
    })
}

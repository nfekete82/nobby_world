import registry from './registry.json'

export const ART=registry
export type AssetId=keyof typeof registry.assets

/** Native-sized sheets; the only transforms are fixed foot translation and mirror. */
export function spritesheets(){
    return Object.entries(registry.assets).map(([id,asset])=>{
        const [width,height]=asset.frame,[footX,footY]=asset.foot,[boxW,boxH]=asset.hitbox
        const textures=Object.fromEntries(Object.entries(asset.animations).map(([name,state])=>[name,{
            image:state.image,framesWidth:state.frames,framesHeight:1,
            animations:({direction}: {direction:string})=>[
                [...Array.from({length:state.frames},(_,frameX)=>({
                    time:frameX*60/state.fps,frameX,frameY:0,
                    scale:asset.directional&&direction==='left'?[-1,1]:[1,1]
                })),{time:state.frames*60/state.fps}]
            ]
        }]))
        return {id,image:asset.animations.stand.image,framesWidth:asset.animations.stand.frames,
            framesHeight:1,anchor:[footX/width,footY/height],x:boxW/2,y:boxH,
            trimTransparentBounds:true,textures}
    })
}

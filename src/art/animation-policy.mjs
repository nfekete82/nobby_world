/**
 * Canonical frame policy for native-sized Pixel Frog / Nobby World sprite sheets.
 * Compiled sheets already align every actor to the same 192px cell and foot.
 * Do not undo that alignment by trimming each pose again at runtime.
 */
export const STABLE_IDLE_FRAMES=Object.freeze({
  // Deliberately calm, near-identical standing poses. The original frame counts
  // remain unchanged in the registry and sprite atlas for combat/save compatibility.
  hero:Object.freeze([1,3]),
  female:Object.freeze([3,5]),
  shaman:Object.freeze([0,4]),
  skeleton:Object.freeze([0,2])
})

export function animationFrameIndices(id,state,frameCount){
  if(!Number.isInteger(frameCount)||frameCount<1)throw Error('Invalid sprite frame count')
  const stable=state==='stand'?STABLE_IDLE_FRAMES[id]:null
  if(!stable)return Array.from({length:frameCount},(_,index)=>index)
  for(const frame of stable)if(!Number.isInteger(frame)||frame<0||frame>=frameCount)
    throw Error(`Invalid stable pose ${id}/${state}: ${frame}`)
  return [...stable]
}

/** Actor atlases have 192×192 transparent cells with fixed [96,132] feet.
 * Trimming would change their frame geometry, causing visual jitter between poses.
 * Keep historical automatic trimming for props/decoration only. */
export const trimTransparentBoundsFor=kind=>kind!=='actor'

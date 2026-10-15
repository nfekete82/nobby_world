// Native attack previews still describe the melee hit area; Nobby's body uses
// the registered casting sheet. Missing hurt/death sheets are never requested.
export const combatOptions = {
    combat:{targets:{canTarget:companionTargetPermission}},
    animations: {
        attack: 'attack', hurt: (entity:any)=>{
            const value=entity?.nobbyClass
            return (typeof value==='function'?value():value)==='shaman'?{animationName:'hit'}:null
        }, die: (entity:any)=>{
            const value=entity?.nobbyClass
            return (typeof value==='function'?value():value)==='shaman'?{animationName:'death'}:null
        }, castSkill: null,
        castSpell: null, guard: null, parry: null, stagger: null
    }
} as const
import { companionTargetPermission } from '../../combat/skeletons.mjs'

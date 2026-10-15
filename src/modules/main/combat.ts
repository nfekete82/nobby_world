// Native attack previews still describe the melee hit area; Nobby's body uses
// the registered casting sheet. Missing hurt/death sheets are never requested.
export const combatOptions = {
    animations: {
        attack: {graphic:'hero',animationName:'attack'}, hurt: null, die: null, castSkill: null,
        castSpell: null, guard: null, parry: null, stagger: null
    }
} as const

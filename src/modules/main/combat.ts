// The starter hero has stand/walk sheets. Keep the engine's attack preview and
// hit feedback, but do not ask it to play graphics that the starter lacks.
export const combatOptions = {
    animations: {
        attack: null, hurt: null, die: null, castSkill: null,
        castSpell: null, guard: null, parry: null, stagger: null
    }
} as const

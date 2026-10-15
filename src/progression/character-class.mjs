export const CHARACTER_CLASSES = Object.freeze({
 mage: { name: 'Magier', graphic: 'hero' },
 shaman: { name: 'Schamane', graphic: 'shaman' }
})
export const readProp = (entity, key) => typeof entity?.[key] === 'function' ? entity[key]() : entity?.[key]
export function writeProp(entity, key, value) {
 if (typeof entity?.[key]?.set === 'function') entity[key].set(value)
 else entity[key] = value
}
export function characterClass(player) { return readProp(player, 'nobbyClass') }
export function selectClass(player, choice) {
 if (characterClass(player) || typeof choice!=='string' || !Object.hasOwn(CHARACTER_CLASSES, choice)) return false
 writeProp(player, 'nobbyClass', choice)
 player.setGraphic(CHARACTER_CLASSES[choice].graphic)
 player.canMove = Number(player.hp)>0
 return true
}
/** Missing class in a legacy snapshot always means mage; never reset progression. */
export function restoreClass(player, snapshot) {
 const saved = snapshot?.nobbyClass
 const choice = typeof saved==='string'&&Object.hasOwn(CHARACTER_CLASSES, saved) ? saved : 'mage'
 writeProp(player, 'nobbyClass', choice)
 player.setGraphic(CHARACTER_CLASSES[choice].graphic)
 player.canMove = Number(player.hp)>0
 return choice
}

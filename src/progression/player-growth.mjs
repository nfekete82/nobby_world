// Authoritative player progression; RPG-JS still owns experience and level-ups.
export const POINTS_PER_LEVEL = 3;
export const STAT_FIELDS = Object.freeze({
  health: 'nobbyStatHealth',
  mana: 'nobbyStatMana',
  magic: 'nobbyStatMagic',
  defense: 'nobbyStatDefense'
});
export const STAT_BONUSES = Object.freeze({ health: 10, mana: 10, magic: 2, defense: 2 });

export function readProgress(player, key) {
  const property = player?.[key];
  const raw = typeof property === 'function' ? property() : property;
  return Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
}
export function writeProgress(player, key, value) {
  const property = player?.[key];
  if (typeof property === 'function' && typeof property.set === 'function') property.set(value);
  else player[key] = value;
}
export function grantLevelPoints(player, levels) {
  if (!Number.isSafeInteger(levels) || levels < 1 || levels > 99) return 0;
  const gained = levels * POINTS_PER_LEVEL;
  writeProgress(player, 'nobbyPoints', readProgress(player, 'nobbyPoints') + gained);
  return gained;
}
export function allocatePoint(player, stat) {
  if (typeof stat !== 'string' || !Object.hasOwn(STAT_FIELDS, stat)) return false;
  const unspent = readProgress(player, 'nobbyPoints');
  if (unspent < 1) return false;
  const key = STAT_FIELDS[stat], current = readProgress(player, key);
  if (current >= 999) return false;
  writeProgress(player, key, current + 1);
  writeProgress(player, 'nobbyPoints', unspent - 1);
  return true;
}
export function statBonuses(player) {
  return {
    maxHp: readProgress(player, STAT_FIELDS.health) * STAT_BONUSES.health,
    maxSp: readProgress(player, STAT_FIELDS.mana) * STAT_BONUSES.mana,
    magic: readProgress(player, STAT_FIELDS.magic) * STAT_BONUSES.magic,
    pdef: readProgress(player, STAT_FIELDS.defense) * STAT_BONUSES.defense
  };
}
// Matches RPG-JS 5 ParameterManager._expForLevel; use the live server curve.
export function expThreshold(level, curve) {
  if (!Number.isSafeInteger(level) || level < 1 || !curve) return 0;
  const { basis, extra, accelerationA, accelerationB } = curve;
  if (![basis, extra, accelerationA, accelerationB].every(Number.isFinite) || accelerationB <= 0) return 0;
  return Math.max(0, Math.round(
    basis * Math.pow(level - 1, 0.9 + accelerationA / 250) * level * (level + 1)
      / (6 + level * level / 50 / accelerationB) + (level - 1) * extra
  ));
}

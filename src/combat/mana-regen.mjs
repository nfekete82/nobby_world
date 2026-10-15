// Server-authoritative mana regeneration. A player must be stationary and
// alive; spells and other actions restart the short idle grace period.
export const IDLE_MANA_PER_SECOND = 5
export const IDLE_MANA_TICK_MS = 200
export const IDLE_MANA_GRACE_MS = 250
export const MAX_ELAPSED_MS = 1000

export function createManaClock(now=Date.now()) {
 return { lastAt:now, activeAt:now, x:null, y:null, map:null }
}

export function markManaActive(clock, now=Date.now()) {
 clock.activeAt=now
 clock.lastAt=now
}

/** Returns mana gained (zero while moving, acting, dead, or off-map). */
export function regenerateIdleMana(player, clock, maximum, now=Date.now()) {
 if (!clock || !Number.isFinite(now)) return 0
 if (now < clock.lastAt) { markManaActive(clock,now); return 0 }
 const map=player.getCurrentMap?.()
 const x=Number(player.x?.()), y=Number(player.y?.())
 const current=Number(player.sp)
 const hp=Number(player.hp)
 if (!map || !Number.isFinite(x) || !Number.isFinite(y) ||
     !Number.isFinite(maximum) || maximum<=0 ||
     !Number.isFinite(current) || !Number.isFinite(hp) || hp<=0) {
  clock.map=map??null;clock.x=Number.isFinite(x)?x:null
  clock.y=Number.isFinite(y)?y:null
  markManaActive(clock,now)
  return 0
 }
 // Server onMove is the primary signal, position sampling is a safeguard
 // for teleports and any motion path not emitting the movement hook.
 if (clock.map!==map || clock.x===null || clock.y===null ||
     Math.abs(x-clock.x)>.05 || Math.abs(y-clock.y)>.05) {
  clock.map=map;clock.x=x;clock.y=y
  markManaActive(clock,now)
  return 0
 }
 const start=Math.max(clock.lastAt,clock.activeAt+IDLE_MANA_GRACE_MS,now-MAX_ELAPSED_MS)
 const elapsed=Math.max(0,now-start)
 clock.lastAt=now
 if (!elapsed || current>=maximum) return 0
 const next=Math.min(maximum,current+IDLE_MANA_PER_SECOND*elapsed/1000)
 player.sp=next
 return next-current
}

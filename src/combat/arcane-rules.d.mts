export declare const ARCANE_ACTION:'nobby:arcane-bolt'
export declare const ARCANE_MANA:number
export declare const ARCANE_RANGE:number
export declare const ARCANE_COOLDOWN_MS:number
export declare const ARCANE_SPEED:number
export declare const ARCANE_STARTUP_MS:number
export interface Point {x:number;y:number}
export interface NavigationGrid {cell:number;cols:number;rows:number;bits:Uint8Array}
export declare function distance(a:Point,b:Point):number
export declare function clearShot(nav:NavigationGrid,from:Point,to:Point):boolean
export declare function canCast(input:{from:Point;to:Point;nav:NavigationGrid;mana:number;cooldownReady?:boolean}):'ok'|'mana'|'cooldown'|'range'|'blocked'|'target'
export declare function enemyAt<T extends Point&{hp:number}>(point:Point,candidates:T[]):T|null

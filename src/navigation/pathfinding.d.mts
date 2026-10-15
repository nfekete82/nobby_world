/** World-space coordinates use the top-left of the player's collision box. */
export interface Point { x: number; y: number }
export interface PackedNavigation {
  cell: number; cols: number; rows: number; blocked: string
}
export interface NavigationGrid {
  cell: 16; cols: number; rows: number; bits: Uint8Array
}
export declare function unpackNavigation(packed: PackedNavigation): NavigationGrid
export declare function isBlocked(grid: NavigationGrid, x: number, y: number): boolean
export declare function findRoute(grid: NavigationGrid, from: Point, target: Point): Point[]

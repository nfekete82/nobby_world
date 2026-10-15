import type { RpgClientEngine, RpgClientEngineHooks } from '@rpgjs/client'
import { updateHud } from '../../ui/hud'
import { updateClickMove } from '../../navigation/click-move'

// RPG-JS 5.0 keeps its Pixi stage private. Isolate that version-specific access
// here; the map and GUI continue to use the engine's own renderer and camera.
function findViewport(node: any): any {
    if (typeof node?.setZoom === 'function' && typeof node?.toWorld === 'function') return node
    for (const child of node?.children ?? []) {
        const viewport = findViewport(child)
        if (viewport) return viewport
    }
}

let lastMap: unknown, lastWidth = 0, lastHeight = 0, viewport: any

export const display: RpgClientEngineHooks = {
    onStep(engine: RpgClientEngine) {
        updateHud(engine)
        updateClickMove(engine)
        const map = engine.sceneMap.data()
        const screen = engine.renderer?.screen
        if (!map || !screen?.width || !screen.height) return
        if (map === lastMap && screen.width === lastWidth && screen.height === lastHeight && viewport) return
        viewport = findViewport((engine as any).canvasApp?.stage)
        if (!viewport?.worldWidth || !viewport.worldHeight) return
        // Cover the available window without changing the sprites' aspect ratio.
        // Small maps zoom in; the existing follow camera reveals cropped areas.
        const zoom = Math.max(1, Math.ceil(screen.width / viewport.worldWidth), Math.ceil(screen.height / viewport.worldHeight))
        viewport.setZoom(zoom, true)
        lastMap = map; lastWidth = screen.width; lastHeight = screen.height
    }
}

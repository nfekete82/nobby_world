import { RpgPlayer, type RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        player.changeMap('simplemap', {
            x: 300,
            y: 300
        })
        player.name = 'Nobby'
        player.setGraphic('hero')
    },
    onInput(player: RpgPlayer, { action }) {
        if (action == 'escape') {
            player.callMainMenu()
        }
    }
}

import { type EventDefinition, RpgPlayer } from '@rpgjs/server'

export function Npc(): EventDefinition {
    return {
        onInit() {
            this.setGraphic("female");
        },
        onAction(player: RpgPlayer) {
            player.showText('Willkommen, Nobby! Hier beginnt unsere neue Welt.')
        }
    }
}
const button = document.querySelector<HTMLButtonElement>('#fullscreen-toggle')!

if (!document.fullscreenEnabled) button.hidden = true

button.addEventListener('click', async () => {
    try {
        if (document.fullscreenElement) await document.exitFullscreen()
        else await document.documentElement.requestFullscreen()
    } catch {
        button.title = 'Vollbild ist in diesem Browserfenster nicht verfügbar'
    }
    button.blur()
})

document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Vollbild verlassen' : 'Vollbild einschalten'
    button.setAttribute('aria-label', label)
    button.title = label
})

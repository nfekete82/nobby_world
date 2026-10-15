/** Resolve public Tiny Swords UI assets under Vite's configured base path. */
const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
document.documentElement.style.setProperty('--nobby-skeleton-icon',`url("${base}tiny-swords/expansion/skeleton-stand.png")`)

document.documentElement.style.setProperty(
    '--nobby-paper-frame', `url("${base}tiny-swords/compiled/paper-panel.png")`
)
document.documentElement.style.setProperty(
    '--nobby-wood-frame', `url("${base}tiny-swords/compiled/wood-panel.png")`
)

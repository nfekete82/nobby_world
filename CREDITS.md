# Artwork and provenance

## Active Emerald Edition artwork

`assets/art/` contains artwork created for Nobby World using the built-in OpenAI
ImageGen tool and normalized into game-ready PNG atlases. The existing Nobby idle
strip supplied by the user served as his identity reference. The generated world
atlas served as the enemy reference. Art direction and production details are in
[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

The source generations, transparent exports and measured alpha bounds are kept
in the repository. No third-party commercial asset pack is needed by the active
renderer. Existing source characters retain their recognizable costume/roles.

## Retained legacy assets

- `assets/custom/`: existing user-supplied character, terrain and effect artwork;
  retained for compatibility and fallback rendering.
- `assets/woods.png`: previously supplied `pixel_16_woods v2 free.zip`; the original
  archive contained no license text. It is a retained fallback, not new artwork.
- Optional, ignored `assets/tiny-swords/`: Pixel Frog's Tiny Swords Free Pack,
  https://pixelfrog-assets.itch.io/tiny-swords. Not committed or fetched by the
  active renderer. The importer remains for users who already have the original
  pack; its original distribution restrictions still apply.

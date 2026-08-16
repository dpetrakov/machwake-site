# Fonts

Both families are self-hosted rather than loaded from a CDN: the page must
render identically offline, on a first visit, with no third-party request.

The `.woff2` files here are **latin subsets**. Outlines are untouched; only
unused glyphs and tables were dropped to cut transfer size. Nothing about the
letterforms has been redrawn, rescaled, or renamed.

| File | Family | Source | Licence |
|---|---|---|---|
| `anybody-var-latin.woff2` | Anybody (variable) | [Etcetera-Type-Co/Anybody](https://github.com/Etcetera-Type-Co/Anybody) | [OFL-1.1](./OFL-Anybody.txt) |
| `plex-sans-var-latin.woff2` | IBM Plex Sans (variable) | [IBM/plex](https://github.com/IBM/plex) | [OFL-1.1](./OFL-IBM-Plex-Sans.txt) |
| `plex-mono-400-latin.woff2` | IBM Plex Mono 400 | [IBM/plex](https://github.com/IBM/plex) | [OFL-1.1](./OFL-IBM-Plex-Mono.txt) |
| `plex-mono-600-latin.woff2` | IBM Plex Mono 600 | [IBM/plex](https://github.com/IBM/plex) | [OFL-1.1](./OFL-IBM-Plex-Mono.txt) |

The SIL Open Font License requires its text to be distributed with the fonts,
which is why the three licence files sit beside them here and are never
stripped from a deployment.

"Plex" is a Reserved Font Name under that licence. These files are subsets, so
they are kept under the original name and identified as IBM Plex throughout —
which is what the reservation is there to protect. They are not a new typeface
and must not be presented as one.

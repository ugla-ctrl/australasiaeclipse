# Australasia Eclipse 2028

A dedicated home for the **22 July 2028 total solar eclipse** across Australasia — an interactive path-of-totality map, chase planning, travel guides and community stories.

Single-page, self-contained static site (no build step). Open `index.html`, or serve the folder with any static host. Everything lives on one scrolling page (`#hub`, `#guides`, `#faq`, `#contact`); the old `hub.html` / `blog.html` / `faq.html` / `contact.html` remain as redirect stubs to those anchors.

## Sections
- **Hero + countdown** — an editorial total-eclipse corona and a live countdown to greatest eclipse.
- **The Path** — an interactive 2D map **and** draggable 3D globe. The path of totality is drawn traditionally: shaded umbra band, solid central line, dashed northern/southern limits, all labelled. Click any pin, or anywhere on the map, for exact local circumstances: totality duration, contact times (C1–C4), sun altitude, magnitude and obscuration. Includes a "watch the shadow cross" animation, a community poll, and **suggest-a-spot**.
- **Guides / Essays**, **FAQ**, **Contact**.

## The data
- **Viewing spots live in [`data/spots.json`](data/spots.json)** — the single editable source of truth. Every spot in it is *inside* the path of totality. Edit that file to add or remove pins.
- **Durations and times are computed in-browser** from the eclipse's orbital geometry (polynomial elements in `js/eclipse.js`, ΔT = 70 s) — not scraped or approximated from nearby cities. Regenerate path geometry with `node tools/genpath.mjs`. Figures agree with the authoritative published timings for this eclipse to within a few seconds.
- **Votes and user-suggested spots are saved in the visitor's browser** (`localStorage`). A shared, cross-visitor database/poll requires a backend (not yet wired). The contact form is likewise a static scaffold — set `FORM_ENDPOINT` in `index.html` before launch.

Basemap © OpenStreetMap contributors, © CARTO. Globe textures from three-globe (NASA Blue Marble / Earth at Night). Location photography via Wikimedia Commons (CC BY / CC BY-SA — see footer credits).

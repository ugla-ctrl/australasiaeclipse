# Australasia Eclipse 2028

A dedicated home for the **22 July 2028 total solar eclipse** across Australasia — chase planning, an interactive path-of-totality map, travel guides and community stories.

Self-contained static site (no build step). Open `index.html`, or serve the folder with any static host.

## What's inside
- **Home** — animated eclipse hero + live countdown to greatest eclipse.
- **EclipseSeeker Hub** — interactive 2D map **and** draggable 3D globe. Click anywhere for exact local circumstances: totality duration, contact times (C1–C4), sun altitude, magnitude and obscuration. Includes a "watch the shadow cross" animation and a community poll.
- **Blog** — three feature essays (The Eclipse Trilogy, The Future of Celestial Gatherings, The Opportunity in Totality).
- **FAQ** and **Contact**.

## How the eclipse data works
Totality durations and times are **computed in-browser** from the eclipse's polynomial Besselian elements — not scraped or approximated from nearby cities. See `js/eclipse.js`; regenerate the path geometry with `node tools/genpath.mjs` and re-verify with `node tools/verify.mjs`.

Eclipse predictions after Fred Espenak, [EclipseWise.com](https://www.eclipsewise.com). Basemap © OpenStreetMap contributors, © CARTO.

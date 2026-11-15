# Bioinformatics games

Static games and student materials, published at https://ryanlmelvin.github.io/bioinformatics-games/.

- `bridge-walker/`: genome assembly through overlap, de Bruijn, and paired de Bruijn graphs.
- `lockpick/`: the Lockpick game.
- `materials/`: public student downloads.

Run `node --test bridge-walker/tests/*.test.cjs` and `node scripts/build.mjs` to check and prepare `_site/`. Serve that folder with any static HTTP server. There are no package dependencies.

Push to `main` to test and publish through the GitHub Pages workflow. Verify the successful workflow and live page after publishing. To add a game or material, give it its own folder, add a link on the home page, and add its public files to `scripts/build.mjs`.

Instructor answer keys and local document-editing work are excluded from Git and from the published file list.

Bridge Walker keeps existing `bridgewalker:v4` browser progress. Level 11 unlocks level 12. For local QA, `?debug=1&level=12&seed=PAIRQA` opens the new level directly. This debug selection does not unlock levels in saved progress.

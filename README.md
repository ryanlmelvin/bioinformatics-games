# Bioinformatics games

Static games and student materials, published at https://ryanlmelvin.github.io/bioinformatics-games/.

- `bridge-walker/`: genome assembly through overlap, de Bruijn, and paired de Bruijn graphs.
- `lockpick/`: the Lockpick game.
- `materials/`: public student downloads. `genome-assembly-play-guide.docx` is the sheet students fill in by hand while they play Bridge Walker. It is a copy: the master is kept with the unit's other class materials outside this repository, so replace it from that master rather than editing it here.

Run `node --test bridge-walker/tests/*.test.cjs` and `node scripts/build.mjs` to check and prepare `_site/`. Serve that folder with any static HTTP server. There are no package dependencies.

Push to `main` to test and publish through the GitHub Pages workflow. Verify the successful workflow and live page after publishing. To add a game or material, give it its own folder, add a link on the home page, and add its public files to `scripts/build.mjs`.

Quizzes, answer keys and the rest of each unit's class materials are kept outside this repository. `.gitignore` and the explicit public-file list in `scripts/build.mjs` guard against publishing them by accident.

Bridge Walker keeps existing `bridgewalker:v4` browser progress. Level 11 unlocks level 12. The dedicated `/bridge-walker/level-12/` page and `?level=12` open fresh practice sessions with all twelve levels selectable, without reading or writing saved course progress. A puzzle code can be supplied with `&seed=PAIRQA`; `debug=1` additionally exposes the test handle. The build copies the same game to the dedicated page, so it works without a redirect or query string.

# Bioinformatics games

Static games and student materials, published at https://ryanlmelvin.github.io/bioinformatics-games/.

One game for each unit of the course, in teaching order:

- `motif-slots/`: finding motifs, from frequent words to Gibbs sampling.
- `bridge-walker/`: genome assembly through overlap, de Bruijn, and paired de Bruijn graphs.
- `toll-city/`: sequence alignment, from two decks of cards to global, local and overlap alignment.
- `hollow-mountain/`: evolutionary trees from distance matrices: additive phylogeny, UPGMA and neighbor joining.
- `paint-by-k/`: clustering: farthest-first traversal, the Lloyd algorithm and hierarchical clustering.
- `the-loom/`: read mapping with the suffix array and the Burrows–Wheeler transform.
- `cho-han-night/`: hidden Markov models: the forward and Viterbi algorithms, and profile HMMs.

Also here:

- `lockpick/`: a second genome assembly game, not tied to a unit.
- `materials/`: public student downloads. Each `<unit>-play-guide.docx` is the sheet students fill in by hand while they play that unit's game. It is a copy: the master is kept with the unit's other class materials outside this repository, so replace it from that master rather than editing it here.

Every game is one self-contained `index.html` (inline styles and artwork, an `engine` script with the puzzle generators and solvers, and a `ui` script), with its tests beside it in `tests/`. A puzzle code can be supplied with `?seed=`, `?level=N` opens a fresh practice session that never touches saved progress, `?bench=1` opens the game's workbench (the six newer games), and `?debug=1` exposes the test handle.

Run `node --test */tests/*.test.cjs` and `node scripts/build.mjs` to check and prepare `_site/`. Serve that folder with any static HTTP server. There are no package dependencies.

Push to `main` to test and publish through the GitHub Pages workflow. Verify the successful workflow and live page after publishing. To add a game or material, give it its own folder, add a link on the home page, and add its public files to `scripts/build.mjs`.

Quizzes, answer keys and the rest of each unit's class materials are kept outside this repository. `.gitignore` and the explicit public-file list in `scripts/build.mjs` guard against publishing them by accident.

Bridge Walker keeps existing `bridgewalker:v4` browser progress. Level 11 unlocks level 12. The dedicated `/bridge-walker/level-12/` page and `?level=12` open fresh practice sessions with all twelve levels selectable, without reading or writing saved course progress. A puzzle code can be supplied with `&seed=PAIRQA`; `debug=1` additionally exposes the test handle. The build copies the same game to the dedicated page, so it works without a redirect or query string.

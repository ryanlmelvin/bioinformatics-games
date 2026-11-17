# Bioinformatics Algorithms

Interactive games and general learning resources, published at [Bioinformatics Algorithms](https://ryanlmelvin.github.io/bioinformatics-games/).

The topic index follows a suggested learning path:

- `motif-slots/`: finding motifs, from frequent words to Gibbs sampling.
- `bridge-walker/`: genome assembly through overlap, de Bruijn, and paired de Bruijn graphs.
- `toll-city/`: sequence alignment, from two decks of cards to global, local and overlap alignment.
- `cho-han-night/`: hidden Markov models: the forward and Viterbi algorithms, and profile HMMs.
- `hollow-mountain/`: evolutionary trees from distance matrices: additive phylogeny, UPGMA and neighbor joining.
- `paint-by-k/`: clustering: farthest-first traversal, the Lloyd algorithm and hierarchical clustering.
- `the-loom/`: read mapping with the suffix array and the Burrows–Wheeler transform.

Also here:

- `lockpick/`: a second genome assembly game.
- `materials/`: 24 Word downloads for independent study, discussion groups and teaching. Each topic includes an exploration guide, discussion questions, and suggested coding and pen-and-paper tasks. Shared resources provide a learning guide, suggested investigations, and a presentation checklist. The original `*-play-guide.docx` URLs are retained for existing links.

The public handouts are adapted editions of the current teaching masters, which remain outside this repository. Course numbers, dates, grading, submission instructions, and enrollment-specific requirements are removed; exercises, figures, examples and problem links are retained. Group activities include enough instructions to use them independently. Do not replace public editions with raw classroom files.

To regenerate the handouts, install `python-docx` in an authoring environment and run:

```sh
python scripts/prepare_materials.py /path/to/GameFirstImplementation /path/to/bioinformatics_games
```

The script reads only the exploration, group-discussion and code-and-paper masters for the seven named topic folders. The three shared documents are maintained in the script. Check regenerated documents for course-specific language and render every page to inspect layout before publishing; source changes can require updating the adaptation rules.

The site reads as a playable textbook. `index.html` is the front page: a table of contents with a cover for every chapter, the reader's progress, and a glossary of the terms they have earned (both read from the browser's own storage). `book/` holds the shell every page shares: `chapters.js` (the contents: order, titles, hooks, level and term counts, each game's storage key, its celebration pieces and the sounds of its own controls), `book.css` and `book.js` (the chapter bar, the chapter cover shown before a first play, level and vocabulary styling, synthesised sound with a mute button, and the celebration when a level is completed), and `art/` (one hand-drawn SVG cover per game). The shell only watches the page; it never reads or changes a game's state, and a game still plays if the shell fails to load. Chapter hooks ask the question only, because the games name the algorithms. Nothing the shell adds has a face: decoration is kept to objects, materials, sound and motion, so that it does not pull attention from the task.

Every game is one `index.html` (inline styles and artwork, an `engine` script with the puzzle generators and solvers, and a `ui` script), with its tests beside it in `tests/`. A puzzle code can be supplied with `?seed=`, `?level=N` opens a fresh practice session that never touches saved progress, `?bench=1` opens the game's workbench (the six newer games), and `?debug=1` exposes the test handle.

Run `node --test */tests/*.test.cjs` and `node scripts/build.mjs` to check and prepare `_site/`. Serve that folder with any static HTTP server. The games and site build have no package dependencies; Python is only needed to regenerate the Word downloads.

Push to `main` to test and publish through the GitHub Pages workflow. Verify the successful workflow and live page after publishing. To add a game or material, add it to `book/chapters.js`, draw its cover in `book/art/`, link the shell from the game's `<head>` and end of `<body>` as the other games do, and add its public files to `scripts/build.mjs`. If a game's level or term count changes, update `book/chapters.js` to match.

Instructor keys, runs of show, assessment plans, quizzes and hand checks stay outside this repository. `.gitignore` and the explicit public-file list in `scripts/build.mjs` guard against publishing them by accident. The build never copies the source-materials directory or the repository wholesale.

Bridge Walker keeps existing `bridgewalker:v4` browser progress. Level 11 unlocks level 12. The dedicated `/bridge-walker/level-12/` page and `?level=12` open fresh practice sessions with all twelve levels selectable, without reading or writing saved progress. A puzzle code can be supplied with `&seed=PAIRQA`; `debug=1` additionally exposes the test handle. The build copies the same game to the dedicated page, so it works without a redirect or query string.

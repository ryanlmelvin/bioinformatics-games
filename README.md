# Bioinformatics Algorithms

Interactive games and general learning resources, published at [Bioinformatics Algorithms](https://bioinformatics.ryanlmelvin.com/).

By [Ryan L. Melvin](https://ryanlmelvin.com/). The source code, textbook, and original teaching materials are licensed under the [GNU General Public License, version 3 only](LICENSE) (`GPL-3.0-only`).

The topic index follows a suggested learning path:

- `motif-slots/`: finding motifs, from frequent words to Gibbs sampling.
- `bridge-walker/`: genome assembly through overlap, de Bruijn, and paired de Bruijn graphs.
- `toll-city/`: sequence alignment, from two decks of cards to global, local and overlap alignment.
- `cho-han-night/`: Loaded Dice uses a fair pair of dice and a loaded pair that totals seven on two-thirds of its rolls to explore hidden Markov models, the forward and Viterbi algorithms, and profile HMMs.
- `hollow-mountain/`: evolutionary trees from distance matrices: additive phylogeny, UPGMA and neighbor joining.
- `paint-by-k/`: clustering: farthest-first traversal, the Lloyd algorithm and hierarchical clustering.
- `the-loom/`: read mapping with the suffix array and the Burrows–Wheeler transform.
- `long-distance/`: Long Distance, transformers: attention from queries, keys and values, positional encoding, heads and layers, masked training and in silico mutagenesis, on the problem of predicting a gene's activity from a distant enhancer.

Also here:

- `lockpick/`: a second genome assembly game.
- `materials/`: 35 Word downloads for independent study, discussion groups and teaching. Each topic includes an exploration guide, discussion questions, coding and pen-and-paper tasks, and printable Pictionary cards with one card for each term in the game. Shared resources provide a learning guide, suggested investigations, and a presentation checklist. The original `*-play-guide.docx` URLs are retained for existing links.

The public handouts are adapted editions of the current teaching masters, which remain outside this repository. Course numbers, dates, grading, submission instructions, and enrollment-specific requirements are removed; exercises, figures, examples and problem links are retained. Group activities include enough instructions to use them independently. Do not replace public editions with raw classroom files.

Every textbook chapter and exploration guide includes optional **Suggested reading and problems** from Aditya Y. Bhargava's *Grokking Algorithms*, second edition (Manning, 2024). `book/readings.json` is the shared source for the chapter and appendix selections, verified second-edition exercise numbers and questions connecting them to the games. Section page ranges refer to printed book pages. Chapter 13 and Appendix B have no numbered exercises; their accompanying practice is labeled as original questions. The site build bundles this map into `book/chapters.js`; `scripts/prepare_materials.py` adds it to the Word guides without replacing their worksheets. The recommendations link to the publisher; the textbook PDF is not a public site asset. Preview `_site/` after building to see the readings.

Optional physical game activities link to the publisher or creator, or to a non-commercial reference. Keep these links in the discussion guides and in `ACTIVITY_SOURCES` in `scripts/prepare_materials.py` when updating the handouts.

To regenerate the handouts, install `python-docx` in an authoring environment and run:

```sh
python scripts/prepare_materials.py /path/to/GameFirstImplementation /path/to/bioinformatics_games
```

The script reads the exploration, discussion and code-and-paper masters for each chapter. Worksheet wording is maintained in `scripts/handout_copy.json`. If the teaching folder contains the printable deck, the script prepares a public edition using the definitions in `scripts/handout_cards.py`. Otherwise it updates the existing public deck when available. The three shared documents are maintained in `scripts/prepare_materials.py`. Check regenerated documents for course-specific language and render every page to inspect layout before publishing.

The site reads as a playable textbook. `index.html` is the front page: a table of contents with a cover for every chapter, the reader's progress, and a glossary of the terms they have earned (both read from the browser's own storage). `book/` holds the shell every page shares: `chapters.js` (the contents: order, titles, hooks, level and term counts, each game's storage key, its celebration pieces and the sounds of its own controls), `book.css` and `book.js` (the chapter bar, the chapter cover shown before a first play, level and vocabulary styling, synthesised sound with a mute button, and the celebration when a level is completed), and `art/` (one hand-drawn SVG cover per game). The shell only watches the page; it never reads or changes a game's state, and a game still plays if the shell fails to load. Chapter hooks state the problem only, because the games name the algorithms. Nothing the shell adds has a face: decoration is kept to objects, materials, sound and motion, so that it does not pull attention from the task.

Every game is one `index.html` (inline styles and artwork, an `engine` script with the puzzle generators and solvers, and a `ui` script), with its tests beside it in `tests/`. A new browser draws its puzzle code at random from the game's `CODES` list (50 per game); the progression tests play every level of every listed code and check that none needs a fallback puzzle, so re-run them after changing a generator and replace any code that fails. Students are not shown the code, apart from the field guide heading and the move log's file name. A puzzle code can still be supplied with `?seed=`, `?level=N` opens a fresh practice session that never touches saved progress, `?bench=1` opens the workbench in the seven chapters that have one, and `?debug=1` exposes the test handle. Generators try random candidates until one passes the level's checks. A generator that runs out of tries builds the puzzle for a key from its fallback pool (`POOLS` in each engine, `STRIP_POOL` in Lockpick) instead of failing; the engine tests generate every pool key and force the out-of-tries path with `TRIES.limit`. Measured over 10,000 codes on 2026-11-16, only Paint by K level 6 ever ran out (4 codes).

Every level of the eight topic games is open from the first visit, in any order. Only the vocabulary is earned: finishing a level awards its terms and marks its pip, and a final level names leftover terms only after every other level is finished. Progress is kept in the browser. Each game also offers a progress link, the page address plus `#save=1.<terms>.<levels>.<check>.<puzzle code>`, which a student copies as a backup; opening it adds its terms and finished levels to progress for the same puzzle code. If the browser holds progress for a different code, the player chooses which puzzle to keep. The game removes the link from the address after reading it. `<terms>` has one character per `VOCAB` entry and `<levels>` one per level, so add new terms and levels at the end or old links stop decoding. The check only catches damaged or hand-edited links; it does not stop a student passing a link to someone else.

Each save records its own link (`link` in the saved state), and the front page strings them into one book link, `#book=1/<game folder>:<link>/...`, under Saved progress. Opening or pasting a book link loads each named game in a hidden frame with its part, so the game itself checks and adds it; the front page never goes to a pasted address. `scripts/tests/progress-link.test.cjs` and `scripts/tests/book-app.test.cjs` check this in every game.

The book installs as an app. `manifest.webmanifest`, the icons in `book/` and `sw.js` make it installable and readable offline; `sw.js` asks the network first and falls back to its copy, and `scripts/build.mjs` writes the list of pages and a version into the published `sw.js`. `book/book.js` fills any `data-bk-app` element with the install option and a button that asks the browser for persistent storage (`navigator.storage.persist()`), and asks again by itself once the book is installed. Browsers decide that request themselves, and an app installed from Safari starts with empty storage, which is what the paste box on the front page is for.

Run `node --test */tests/*.test.cjs` and `node scripts/build.mjs` to check and prepare `_site/`. Serve that folder with any static HTTP server. The games and site build have no package dependencies; Python is only needed to regenerate the Word downloads.

Push to `main` to test and publish through the GitHub Pages workflow. Verify the successful workflow and live page after publishing. To add a game or material, add it to `book/chapters.js`, draw its cover in `book/art/`, link the shell from the game's `<head>` and end of `<body>` as the other games do, and add its public files to `scripts/build.mjs`. If a game's level or term count changes, update `book/chapters.js` to match.

Instructor keys, runs of show, assessment plans, quizzes and hand checks stay outside this repository. `.gitignore` and the explicit public-file list in `scripts/build.mjs` guard against publishing them by accident. The build never copies the source-materials directory or the repository wholesale.

Bridge Walker keeps existing `bridgewalker:v4` browser progress. The dedicated `/bridge-walker/level-12/` page and `?level=12` open fresh practice sessions with all twelve levels selectable, without reading or writing saved progress. A puzzle code can be supplied with `&seed=PAIRQA`; `debug=1` additionally exposes the test handle. The build copies the same game to the dedicated page, so it works without a redirect or query string.

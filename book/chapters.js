/* The book's table of contents. Hooks state the problem only: the games name the algorithms. */
window.BOOK={
  title:'Bioinformatics Algorithms',
  tagline:'A playable textbook',
  chapters:[
    {n:1,slug:'motifs',dir:'motif-slots',key:'motifslots:v1',topic:'Finding motifs',game:'Motif Slots',levels:11,terms:18,burst:'coins',sfx:[['.arrow','clack'],['.lever','chunk']],
     hue:'#b0324a',hook:'Look upstream of ten co-regulated genes for a short DNA pattern. Some copies differ by a few letters.'},
    {n:2,slug:'genome-assembly',dir:'bridge-walker',key:'bridgewalker:v4',topic:'Genome assembly',game:'Bridge Walker',levels:12,terms:21,burst:'leaves',sfx:[['.node','step'],['.card','flick']],
     hue:'#1f8a9c',hook:'Reconstruct a genome from short, overlapping reads.',
     side:{dir:'lockpick',key:'lockpick:v1',game:'Lockpick',burst:'keys',sfx:[['[data-k=A]','nA'],['[data-k=C]','nC'],['[data-k=G]','nG'],['[data-k=T]','nT']],keys:{a:'nA',c:'nC',g:'nG',t:'nT'},panel:'#msg',done:'.card:not(.gave)',hook:'Open every locker on a wall from one keypad in the fewest key presses.'}},
    {n:3,slug:'alignment',dir:'toll-city',key:'tollcity:v1',topic:'Sequence alignment',game:'Toll City',levels:11,terms:13,burst:'tickets',sfx:[['.stage svg','step']],
     hue:'#cf6a1c',hook:'Compare two related DNA or protein sequences. Where should you leave gaps to line up corresponding bases or amino acids?'},
    {n:4,slug:'hmm',dir:'cho-han-night',key:'chohan:v1',topic:'Hidden Markov models',game:'Loaded Dice',levels:11,terms:14,burst:'dice',sfx:[['.stage svg','clack']],
     hue:'#3d4fa8',hook:'A dealer switches between two pairs of dice out of sight. From the calls alone, work out which pair was in play each round.'},
    {n:5,slug:'evolutionary-trees',dir:'hollow-mountain',key:'hollowmountain:v1',topic:'Evolutionary trees',game:'Hollow Mountain',levels:11,terms:17,burst:'stars',sfx:[['.stage svg','step']],
     hue:'#6a4fa3',hook:'Reconstruct the tunnels inside a mountain from the distances between its entrances.'},
    {n:6,slug:'clustering',dir:'paint-by-k',key:'paintbyk:v1',topic:'Clustering',game:'Paint by k',levels:10,terms:14,burst:'drops',sfx:[['.stage svg','bloop']],
     hue:'#b8327a',hook:'Print a thousand-color picture with a few pots of ink. Which pixels should share a color?'},
    {n:7,slug:'burrows-wheeler',dir:'the-loom',key:'theloom:v1',topic:'Read mapping with the Burrows–Wheeler transform',short:'Read mapping',game:'The Loom',levels:11,terms:11,burst:'threads',sfx:[['.stage svg','pluck'],['.strip','pluck']],
     hue:'#a4472f',hook:'Find where a read occurs in a genome of three billion nucleotides without scanning the genome.'},
    {n:8,slug:'transformers',dir:'long-distance',key:'longdistance:v1',topic:'Transformers',game:'Long Distance',levels:10,terms:17,burst:'threads',sfx:[['.stage svg','pluck']],
     hue:'#1f6f54',hook:'Predict gene expression from DNA when regulatory sequences can lie thousands of base pairs from the gene.'}
  ],
  resources:[
    // [file suffix, link text, when to use it (shown beside the link on the chapter page)]
    ['play-guide','Exploration guide','As you play, connect each puzzle to the biology, define the terms in your own words and work through three questions by hand.'],
    ['discussion-questions','Discussion questions','After the game, try the activities and solve two problems with a partner or group.'],
    ['coding-and-paper-tasks','Coding and pen-and-paper tasks','Solve an example by hand, then run your code on the same input and compare the results.'],
    ['pictionary-cards','Pictionary cards','Print and cut out the cards. Draw the term on your card without using letters, numbers or symbols while the group guesses.']]
};

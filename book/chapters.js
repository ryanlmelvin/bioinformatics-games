/* The book's table of contents. Hooks state the problem only: the games name the algorithms. */
window.BOOK={
  title:'Bioinformatics Algorithms',
  tagline:'A playable textbook',
  chapters:[
    {n:1,slug:'motifs',dir:'motif-slots',key:'motifslots:v1',topic:'Finding motifs',game:'Motif Slots',levels:11,terms:18,burst:'coins',sfx:[['.arrow','clack'],['.lever','chunk']],
     hue:'#b0324a',hook:'Find a short sequence shared, with mismatches, by the upstream regions of ten co-regulated genes.'},
    {n:2,slug:'genome-assembly',dir:'bridge-walker',key:'bridgewalker:v4',topic:'Genome assembly',game:'Bridge Walker',levels:12,terms:21,burst:'leaves',sfx:[['.node','step'],['.card','flick']],
     hue:'#1f8a9c',hook:'Reconstruct a genome from short, overlapping reads.',
     side:{dir:'lockpick',key:'lockpick:v1',game:'Lockpick',burst:'keys',sfx:[['[data-k=A]','nA'],['[data-k=C]','nC'],['[data-k=G]','nG'],['[data-k=T]','nT']],keys:{a:'nA',c:'nC',g:'nG',t:'nT'},hook:'Open every locker on a wall from one keypad in the fewest key presses.'}},
    {n:3,slug:'alignment',dir:'toll-city',key:'tollcity:v1',topic:'Sequence alignment',game:'Toll City',levels:11,terms:13,burst:'tickets',sfx:[['.stage svg','step']],
     hue:'#cf6a1c',hook:'Line up two related sequences so that the letters they share fall in the same columns.'},
    {n:4,slug:'hmm',dir:'cho-han-night',key:'chohan:v1',topic:'Hidden Markov models',game:'Cho-Han Night',levels:11,terms:14,burst:'dice',sfx:[['.stage svg','clack']],
     hue:'#3d4fa8',hook:'A dealer switches between two cups of dice out of sight. From the calls alone, work out which cup was in play each round.'},
    {n:5,slug:'evolutionary-trees',dir:'hollow-mountain',key:'hollowmountain:v1',topic:'Evolutionary trees',game:'Hollow Mountain',levels:11,terms:17,burst:'stars',sfx:[['.stage svg','step']],
     hue:'#6a4fa3',hook:'Reconstruct the tunnels inside a mountain from the distances between its entrances.'},
    {n:6,slug:'clustering',dir:'paint-by-k',key:'paintbyk:v1',topic:'Clustering',game:'Paint by k',levels:10,terms:14,burst:'drops',sfx:[['.stage svg','bloop']],
     hue:'#b8327a',hook:'Print a picture of a thousand colours from a few pots of ink by deciding which pixels share a pot.'},
    {n:7,slug:'burrows-wheeler',dir:'the-loom',key:'theloom:v1',topic:'Read mapping with the Burrows–Wheeler transform',short:'Read mapping',game:'The Loom',levels:11,terms:11,burst:'threads',sfx:[['.stage svg','pluck'],['.strip','pluck']],
     hue:'#a4472f',hook:'Find where a read occurs in a genome of three billion letters without scanning the genome.'}
  ],
  resources:[['play-guide','Exploration guide'],['discussion-questions','Discussion questions'],['coding-and-paper-tasks','Coding and pen-and-paper tasks'],
    // a third entry is a sentence shown beside the link on the chapter page
    ['pictionary-cards','Pictionary cards','One card for each term in the game. Print them and cut them apart. One person draws a term without letters, numbers or symbols, and the group guesses it.']]
};

/* The book's table of contents. Hooks ask the question only: the games name the algorithms. */
window.BOOK={
  title:'Bioinformatics Algorithms',
  tagline:'A playable textbook',
  chapters:[
    {n:1,slug:'motifs',dir:'motif-slots',key:'motifslots:v1',topic:'Finding motifs',game:'Motif Slots',levels:11,terms:18,
     hue:'#b0324a',hook:'Ten genes switch on together. Somewhere upstream of each one sits the same short word, a little misspelled every time. Where is it?'},
    {n:2,slug:'genome-assembly',dir:'bridge-walker',key:'bridgewalker:v4',topic:'Genome assembly',game:'Bridge Walker',levels:12,terms:21,
     hue:'#1f8a9c',hook:'A genome leaves the sequencer as a heap of short, overlapping shreds. How do you put them back in order?',
     side:{dir:'lockpick',key:'lockpick:v1',game:'Lockpick',hook:'Side quest: one keypad, a wall of lockers, and no Enter key.'}},
    {n:3,slug:'alignment',dir:'toll-city',key:'tollcity:v1',topic:'Sequence alignment',game:'Toll City',levels:11,terms:13,
     hue:'#cf6a1c',hook:'Two sequences drifted apart, letter by letter. Which letters still belong opposite each other?'},
    {n:4,slug:'hmm',dir:'cho-han-night',key:'chohan:v1',topic:'Hidden Markov models',game:'Cho-Han Night',levels:11,terms:14,
     hue:'#3d4fa8',hook:'The dealer swaps cups under a cloth. You hear only the calls. Which cup was he using, round by round?'},
    {n:5,slug:'evolutionary-trees',dir:'hollow-mountain',key:'hollowmountain:v1',topic:'Evolutionary trees',game:'Hollow Mountain',levels:11,terms:17,
     hue:'#6a4fa3',hook:'You can measure the mountain only from outside, entrance to entrance. What do the tunnels inside look like?'},
    {n:6,slug:'clustering',dir:'paint-by-k',key:'paintbyk:v1',topic:'Clustering',game:'Paint by k',levels:10,terms:14,
     hue:'#b8327a',hook:'A picture of a thousand colours and a shop with only a few pots of ink. Which pixels share a pot?'},
    {n:7,slug:'burrows-wheeler',dir:'the-loom',key:'theloom:v1',topic:'Read mapping with the Burrows–Wheeler transform',short:'Read mapping',game:'The Loom',levels:11,terms:11,
     hue:'#a4472f',hook:'Three billion letters and a laptop’s memory. How do you find one read without reading the text?'}
  ],
  resources:[['play-guide','Exploration guide'],['discussion-questions','Discussion questions'],['coding-and-paper-tasks','Coding and pen-and-paper tasks']]
};

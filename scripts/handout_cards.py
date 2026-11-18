"""Prepare the public vocabulary card decks from the student print masters."""

from pathlib import Path
from tempfile import NamedTemporaryFile

from docx import Document
from docx.enum.table import WD_ROW_HEIGHT_RULE
from docx.shared import Twips

# The teaching master supplies the terms, order, unaffected definitions and cut grid.
# Keep public revisions keyed by term so a reordered deck retains its own layout.
DEFINITIONS = {
    'motifs': {
        'Motif': 'A recurring sequence pattern. In Motif Slots, related versions appear upstream of genes regulated together.',
        'Consensus string': 'A string made by choosing a most frequent letter in each column of a motif matrix. Ties can give several consensus strings.',
        'Greedy motif search': 'Try every starting window in the first string. In each later string, choose the window most probable under the profile built so far. Keep the set with the lowest score.',
    },
    'genome-assembly': {
        'Overlap graph': 'In the game, one node per read. A directed edge joins two reads when the last k−1 letters of the first match the first k−1 of the second.',
        'NP-complete': 'Decision problems whose proposed solutions can be checked in polynomial time and to which every problem in NP can be reduced in polynomial time.',
        'Degree': 'Count the edge ends at a node. A loop contributes two. In a directed graph, total degree is indegree plus outdegree.',
        "Euler's theorem": 'In a connected directed graph, an Eulerian cycle needs equal indegree and outdegree everywhere. An open Eulerian path needs one extra edge out at the start and one extra edge in at the end, with all other nodes balanced. These conditions suffice.',
        'de Bruijn graph': 'Each k-mer gives an edge from its first k−1 letters to its last k−1 letters. Identical node labels share one node. Repeated reads give repeated edges.',
    },
    'alignment': {
        'Alignment': 'Two sequences written in rows. Each column pairs two letters or a letter and a gap, shown as a dash.',
        'Indel': 'An insertion or deletion. In an alignment, a gap opposite one or more letters can represent an indel.',
        'Alignment graph': 'A grid with south, east and diagonal edges. A path from the top left to the bottom right represents an alignment of both complete strings.',
        'Manhattan Tourist Problem': 'Find the path with the highest total weight from the top left to the bottom right of a grid, moving only south or east.',
        'Backtracking': 'Recover a best path by starting at its endpoint and following the recorded choices backward.',
        'Global alignment': 'An alignment that spans both sequences from beginning to end. The goal is to maximize its score.',
    },
    'evolutionary-trees': {
        'Leaf': 'A node at the end of a branch. In an evolutionary tree, a leaf represents a sampled organism or sequence.',
        'Internal node': 'A node where branches meet. In a rooted evolutionary tree, a branching node represents a common ancestor of its descendants.',
        'Limb length': 'The length of the branch that connects a leaf to the rest of the tree.',
        'Molecular clock': 'The hypothesis that sequences change at a constant rate. Under a strict clock, leaves sampled at the same time are equally far from the root.',
        'UPGMA': 'Join the two closest clusters at half their distance above the leaves. Update distances by averaging over all pairs of members and repeat.',
        'Neighbors': 'Two leaves attached to the same internal node.',
        'Neighbor-joining matrix': 'A table that adjusts each pair’s distance using the row totals. Neighbor joining selects a pair with the smallest off-diagonal value.',
        'Nearest neighbor interchange': 'Swap a subtree on one side of an internal edge with one on the other side. The four subtrees keep their internal branches.',
    },
    'clustering': {
        'Clustering': 'Grouping items by a chosen measure of similarity.',
        'Cluster': 'A group of similar data points. In a center-based method, the group consists of the points assigned to the same center.',
        'Farthest-first traversal': 'Choose a data point as the first center. Each new center is the data point farthest from its nearest existing center.',
        'Lloyd algorithm': 'Assign each point to its nearest center. Move each nonempty cluster’s center to its mean. Repeat until the assignments stop changing.',
        'Diauxic shift': 'When glucose runs out, yeast switches from fermenting glucose to using ethanol for respiration.',
    },
    'burrows-wheeler': {
        'Last-to-first mapping': 'A map from a row in the last column to the row with the same occurrence of that symbol in the first column. Count occurrences from the top.',
        'Partial suffix array': 'Keep the rows whose suffix starts at a multiple of K. To locate a match, follow the last-to-first mapping to a saved row and add the number of steps to its start position.',
        'Seed': 'A piece of a pattern that is matched exactly first. With at most d mismatches, one of d\xa0+\xa01 pieces must match.',
    },
    'hmm': {
        'Hidden state': 'An unobserved state of the model. In the dice game it is the pair behind the screen in a given round.',
        'Hidden Markov model': 'A model that moves between hidden states with specified probabilities. Each emitting state has its own probabilities for the symbols it can produce.',
        'Profile HMM': 'A model of a sequence family built from a multiple alignment. Match and delete states represent retained columns. Insert states allow extra residues between or beyond them.',
        'Insert state': 'A state that emits extra residues before, between or after retained columns. It can repeat.',
    },
    'transformers': {
        'Key': 'A representation that a query is compared with to score a match. In the game, it is the pattern on a plate.',
    },
}


def prepare_cards(source, output):
    """Prepare one deck. A pre-existing public output can stand in for a missing master.

    Return False when neither deck exists, as in a worksheet-only source collection.
    """
    source, output = Path(source), Path(output)
    if not source.is_file():
        if not output.is_file():
            return False
        source = output

    slug = output.name.removesuffix('-pictionary-cards.docx')
    revisions = DEFINITIONS[slug]
    doc = Document(source)
    changed = False
    found = set()
    for table in doc.tables:
        for row in table.rows:
            # Three equal rows fit on each public sheet below its repeated header.
            if row.height != Twips(4650) or row.height_rule != WD_ROW_HEIGHT_RULE.EXACTLY:
                row.height = Twips(4650)
                row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
                changed = True
            for cell in row.cells:
                if not cell.text.strip():
                    continue
                _, term, definition = cell.paragraphs
                if term.text in revisions:
                    found.add(term.text)
                    if definition.text != revisions[term.text]:
                        # Card definitions use one text style. Preserve its font and spacing.
                        definition.runs[0].text = revisions[term.text]
                        for run in definition.runs[1:]:
                            run.text = ''
                        changed = True
    if missing := revisions.keys() - found:
        raise ValueError(f'{source.name} is missing cards for {slug}: {", ".join(sorted(missing))}')

    header = doc.sections[0].header.paragraphs[0]
    if slug == 'hmm':
        for run in header.runs:
            if 'Cho-Han Night' in run.text:
                run.text = run.text.replace('Cho-Han Night', 'Loaded Dice')
                changed = True

    properties = doc.core_properties
    for key, value in {
        'title': header.text.split(' (', 1)[0],
        'subject': 'Bioinformatics algorithms learning resources',
        'keywords': 'bioinformatics, algorithms',
        'author': '',
        'last_modified_by': '',
        'comments': '',
    }.items():
        if getattr(properties, key) != value:
            setattr(properties, key, value)
            changed = True

    if changed or source != output:
        # Finish writing and closing the new package before replacing an existing deck.
        with NamedTemporaryFile(dir=output.parent, suffix='.docx', delete=False) as temp:
            temp_path = Path(temp.name)
        try:
            doc.save(temp_path)
            temp_path.chmod((output if output.exists() else source).stat().st_mode & 0o777)
            temp_path.replace(output)
        finally:
            temp_path.unlink(missing_ok=True)
    return True

"""Adapt the current student masters for a general learning audience.

Usage: python prepare_materials.py /path/to/GameFirstImplementation /path/to/repo
Requires python-docx. Instructor documents are never copied into the output.
"""
from pathlib import Path
import argparse
import copy
import json
import re
from html import escape
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.text.run import Run
from docx.enum.style import WD_STYLE_TYPE

READINGS = json.loads((Path(__file__).resolve().parent.parent/'book/readings.json').read_text())

UNITS = [
 ('1_Motifs','motifs','Finding motifs','Motifs','Motif Slots','motif-slots'),
 ('2_GenomeAssembly','genome-assembly','Genome assembly','Genome assembly','Bridge Walker','bridge-walker'),
 ('3_Alignment','alignment','Sequence alignment','Sequence alignment','Toll City','toll-city'),
 ('7_HMM','hmm','Hidden Markov models','Hidden Markov models','Loaded Dice','cho-han-night'),
 ('4_EvolutionaryTrees','evolutionary-trees','Evolutionary trees','Evolutionary trees','Hollow Mountain','hollow-mountain'),
 ('5_Clustering','clustering','Clustering','Clustering','Paint by k','paint-by-k'),
 ('6_BurrowsWheeler','burrows-wheeler','Read mapping with the Burrows–Wheeler transform','Burrows Wheeler transform','The Loom','the-loom'),
 ('8_Transformers','transformers','Transformers','Transformers','Long Distance','long-distance'),
]
SOURCES = [
 ('1_BeforeClass1_PlayGuide.docx','play-guide','Exploration guide'),
 ('3_Class1_GroupSheet.docx','discussion-questions','Discussion questions'),
 ('4_Homework_CodeAndPaper.docx','coding-and-paper-tasks','Suggested coding and pen and paper tasks'),
]
BASE='https://bioinformatics.ryanlmelvin.com/'
# Prefer the publisher or creator, or a non-commercial reference for traditional
# games and discontinued puzzles. Keep sources inline with the optional activity.
ACTIVITY_SOURCES = {
    'motifs': [('Carolina Mutation: A DNA Dice Game',
        'https://www.carolina.com/dna-models-and-simulations/carolina-mutation%3A-a-dna-dice-game/441208.pr')],
    'genome-assembly': [
        ('Triazzle', 'https://www.dangilbert.com/triazzle.php'),
        ('Eternity II', 'https://en.wikipedia.org/wiki/Eternity_II_puzzle')],
    'alignment': [
        ('Ticket to Ride', 'https://www.daysofwonder.com/game/ticket-to-ride/'),
        ('rook', 'https://en.wikipedia.org/wiki/Rook_(chess)')],
    'hmm': [],
    'evolutionary-trees': [('Pandemic', 'https://www.zmangames.com/game/pandemic/')],
    'clustering': [('cards', 'https://en.wikipedia.org/wiki/Standard_52-card_deck')],
}


def link_activity_sources(doc, slug):
    for p in doc.paragraphs:
        if not p.text.startswith('Optional group activit'): continue
        for label, url in ACTIVITY_SOURCES.get(slug, []):
            if any(h.text == label and h.url == url for h in p.hyperlinks): continue
            run=next(r for r in p.runs if label in r.text)
            before, after=run.text.split(label, 1)
            linked=copy.deepcopy(run._r)
            tail=copy.deepcopy(run._r)
            run.text=before
            # Preserve the source run's font and size for both pieces.
            linked_run=Run(linked,p); linked_run.text=label
            linked_run.font.color.rgb=RGBColor.from_string('0563C1')
            linked_run.font.underline=True
            Run(tail,p).text=after
            hyperlink=OxmlElement('w:hyperlink')
            hyperlink.set(qn('r:id'),p.part.relate_to(url,RT.HYPERLINK,is_external=True))
            hyperlink.append(linked)
            run._r.addnext(hyperlink)
            hyperlink.addnext(tail)

def remove(p):
    p._element.getparent().remove(p._element)

def change(p,text):
    # Only rewrite administrative prose. Untouched exercises retain all runs,
    # especially the bold starting windows, embedded figures and hyperlinks.
    if p.text==text: return
    mixed_bold=any(r.bold for r in p.runs) and not all(r.bold for r in p.runs if r.text.strip())
    rpr=copy.deepcopy(p.runs[0]._r.rPr) if p.runs else None
    p.clear()
    r=p.add_run(text)
    if rpr is not None: r._r.insert(0,rpr)
    if mixed_bold: r.bold=False

def paragraphs(doc):
    yield from doc.paragraphs
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from cell.paragraphs


def suggested_readings(doc, slug=None):
    """Append the same optional reading map that the website build bundles.

    Keep the exploration worksheet and its answer space intact. Replacing only
    our final section makes this safe to run on an existing public edition.
    """
    heading='Suggested reading and problems'
    previous=next((p for p in doc.paragraphs if p.text==heading),None)
    if previous is not None:
        for element in list(previous._p.itersiblings()):
            if element.tag!=qn('w:sectPr'): element.getparent().remove(element)
        remove(previous)
    font='Optima' if slug else 'Arial'
    for name,size in [('Suggested Reading',12 if slug else 11),('Heading 1',14)]:
        style=doc.styles[name] if name in doc.styles else doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
        style.font.name=font;style.font.size=Pt(size);style.font.color.rgb=RGBColor(0,0,0)
        style.paragraph_format.space_after=Pt(8)
        style.paragraph_format.line_spacing=1.1
    h=doc.add_paragraph(heading,'Heading 1')
    h.paragraph_format.keep_with_next=True
    if slug: h.paragraph_format.page_break_before=True
    def paragraph(text): return doc.add_paragraph(text,'Suggested Reading')
    b=READINGS['book']
    p=paragraph('')
    hyperlink=OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'),p.part.relate_to(b['url'],RT.HYPERLINK,is_external=True))
    run=OxmlElement('w:r');hyperlink.append(run)
    linked=Run(run,p);linked.text=f"{b['title']}, {b['edition']}"
    linked.font.color.rgb=RGBColor.from_string('0563C1');linked.font.underline=True
    p._p.append(hyperlink)
    p.add_run(f" by {b['author']} (Manning, {b['year']}).")
    if slug:
        paragraph(READINGS['note'])
        entry=READINGS['chapters'][slug]
        for reading in entry['readings']:
            p=paragraph('')
            source=f"Appendix {reading['appendix']}" if 'appendix' in reading else f"Chapter {reading['chapter']}"
            label=f"{source}: {reading['title']}"
            if 'section' in reading: label+=f" - {reading['section']}"
            if 'pages' in reading: label+=f" (pp. {reading['pages']})"
            p.add_run(label+'. ').bold=True
            p.add_run(reading['focus'])
        p=paragraph('');p.add_run('Book exercises: ').bold=True;p.add_run(entry['exercises'])
        if entry.get('practice'):
            p=paragraph('');p.add_run('Connect to the game (original questions)').bold=True
            p.paragraph_format.keep_with_next=True
            for i,question in enumerate([entry['connection'],*entry['practice']],1):
                paragraph(f'{i}. {question}')
        else:
            p=paragraph('');p.add_run('Connect to the game: ').bold=True;p.add_run(entry['connection'])
    else:
        p.add_run(' Each exploration guide lists optional chapters, book exercises and a question connecting the reading to the game. Try the exercises before checking Appendix C.')


def finish(doc, output):
    # Keep original illustrations, numerical exercises, numbering, and pagination.
    for name in ['Title','Subtitle','Heading 1','Heading 2','Heading 3']:
        if name not in doc.styles: continue
        style=doc.styles[name]
        style.font.color.rgb=RGBColor(0,0,0)
        if style.element.pPr is not None:
            for border in style.element.pPr.findall(qn('w:pBdr')): border.getparent().remove(border)
    for p in doc.paragraphs:
        if p.style and p.style.name in ['Title','Subtitle','Heading 1','Heading 2','Heading 3']:
            for r in p.runs:
                r.font.color.rgb=RGBColor(0,0,0)
                r.font.underline=False
            if p._p.pPr is not None:
                for border in p._p.pPr.findall(qn('w:pBdr')): border.getparent().remove(border)
    for section in doc.sections:
        for header in [section.header,section.first_page_header,section.even_page_header]:
            for p in header.paragraphs: p.clear()
        for footer in [section.footer,section.first_page_footer,section.even_page_footer]:
            for p in footer.paragraphs:
                for r in p.runs:
                    text=re.sub(r'1 Play guide', 'Exploration guide',r.text)
                    text=re.sub(r'3 Group sheet', 'Discussion questions',text)
                    text=re.sub(r'4 Code and paper', 'Coding and paper tasks',text)
                    if text!=r.text: r.text=text
    doc.core_properties.title=doc.paragraphs[0].text
    doc.core_properties.subject='Bioinformatics algorithms learning resources'
    doc.core_properties.comments=''
    doc.core_properties.keywords='bioinformatics, algorithms'
    if re.search(r'INFO\s*403|INFO\s*602|python-docx',doc.core_properties.author,re.I):
        doc.core_properties.author=''
    for p in paragraphs(doc):
        assert not re.search(r'INFO\s*40[36]|INFO\s*602|class [12]|spring break|roster|\b2027\b|course points|course grade|instructor|randomly grade|turn it in',p.text,re.I), (output.name,p.text)
    doc.save(output)


def adapt(source, output, unit, kind, title):
    doc=Document(source)
    folder,slug,heading,topic,game,gamepath=unit
    ps=list(doc.paragraphs)
    change(ps[0],title); ps[0].style=doc.styles['Title']
    change(ps[1],topic)
    remove(ps[2])
    if kind=='play-guide':
        body=ps[4].text
        body=body[body.index('Play all'):].split('You must hand write')[0].strip()
        change(ps[4],f'The game is {game}, at {BASE}{gamepath}/. {body} Write your answers on this guide or on separate paper.')
        remove(ps[5])
        for p in ps:
            if p.text=='Pen and paper' and slug=='motifs': p.paragraph_format.page_break_before=True
        change(ps[6],'For each term, be able to point to an example in the game as well as give its definition.')
    elif kind=='discussion-questions':
        change(ps[4],ps[4].text.replace('One sheet per group. Pick someone to write.','Work with a partner or a group and write down your reasoning.'))
        if slug=='motifs':
            change(ps[6], 'Optional group activity: use nucleotide dice from Carolina Mutation: A DNA Dice Game to make ten DNA strings of length 10. Choose a secret 4-mer and overwrite a four-letter window in each string to hide it. Swap strings with another group and try to recover its secret. Repeat with fresh strings: hide an exact copy in only three or four strings, then a copy with at most one mismatch in three or four strings, then a copy with at most one mismatch in every string. Record each predicted 4-mer and its supporting windows before comparing with the group that encoded it.')
            change(ps[7], 'Compare two scoring rules: count windows within one mismatch of a candidate, or add the distance to its closest window in each sequence. In the final round, which rule was your group using? Why can counting matching windows become less useful when every embedded copy has a mismatch?')
        elif slug=='genome-assembly':
            change(ps[6],'Optional group activity: work on an edge-matching puzzle such as Triazzle or Eternity II. Keep the same puzzle while you compare local matches with complete solutions. Record a promising placement that later caused a conflict.')
        elif slug=='alignment':
            change(ps[6],'Optional group activities: compare a Ticket to Ride route map with the directed streets in Toll City. On a chessboard, take turns moving a rook right or down by any positive distance; the player who reaches the lower-right square wins. Use the questions below to connect each activity to the algorithm.')
        elif slug=='hmm':
            change(ps[6],re.sub(r'^Play a 40-minute loaded-dice investigation:.*?The dealer', 'Optional group activity: conduct a loaded-dice investigation. The dealer',ps[6].text))
        elif slug=='evolutionary-trees':
            change(ps[6],'Optional group activity: photograph the starting board of a game such as Pandemic, play, then photograph the final board. Exchange only final photographs and reconstruct possible earlier states before revealing the starting photographs.')
        elif slug=='transformers':
            change(ps[6],'Optional group activity: bean attention. '+ps[6].text)
        elif slug=='clustering':
            change(ps[6],'Optional group activity: choose cards with several visible attributes, such as number, color and suit. Sort the same cards into four groups twice, changing the features used for the second sort. Record both rules and compare the groupings.')
        for p in ps:
            if p.text=='Part 1: On the table': change(p,'Activities to discuss')
            elif p.text=='Part 2: Two problems to present': change(p,'Problems to discuss')
            elif p.text.startswith('Work on both problems. Both will be presented'):
                change(p,'Work both problems, then compare solutions with another group.')
            elif p.text.startswith('Finished both?'):
                remove(p)
            elif p.text.startswith('Your instructor’s discussion question'):
                text=re.sub(r'^Your instructor’s discussion question \d+: “','',p.text)
                text=text.replace('”','')
                change(p,text)
            elif p.text.startswith('This question comes from the Chapter 2 discussion questions:'):
                change(p,'Why must RandomizedMotifSearch eventually stop? Work through these three strings with k = 3, starting from the windows in bold, then make an argument for any strings.')
    else:
        remove(ps[4])
        change(ps[5],'Each challenge below has a pen-and-paper companion. Work the companion by hand, then run your code on the same input. The last challenge is an extension.')
        for p in ps[6:]:
            t=p.text
            if t.startswith('Optional warm-up.'):
                change(p,re.sub(r' (They are|It is) not required, and nobody presents (them|it)\.', '',t))
            elif t.startswith('Optional extension. BA5M'):
                change(p,'Another extension: BA5M Multiple Sequence Alignment aligns three strings using an LCS scoring rule.')
            elif t.startswith('We will discuss this example on'):
                change(p,re.sub(r'^We will discuss this example on [^.]+\. ','Consider this example. ',t))
            elif t.startswith('Course points are independent'):
                change(p,'BA10A and BA10B share the first pen-and-paper task.')
            elif t=='Hand companions': change(p,'Suggested pen and paper tasks')
            elif t.startswith('Rosalind has no problems on this topic.'):
                change(p,t.replace('written for this course','written for this book'))
            elif t.startswith('Each required problem has a hand companion:'):
                change(p,'Work each example by hand, then run your code on the same input and record the output. If the two disagree, either one of them is wrong or there is more than one correct answer.')
            elif t.startswith(('AI assistance with code is allowed','Any use of generative AI on the code is acceptable')):
                change(p,'Test your code on these examples and on inputs of your own, whether or not you wrote it yourself. You should be able to explain how it works.')
            elif t.startswith('Hand write the companions,'):
                remove(p)
            elif t.startswith('INFO 602.'):
                change(p,t.replace('INFO 602.', 'Extension',1))
            elif t.startswith('Course coding specification.'):
                change(p,t.replace('Course coding specification.','Coding task.',1))
            elif 'This is coverage only;' in t:
                change(p,t.replace('This is coverage only; the required Rosalind problems keep their stated linear penalties.','The linked Rosalind problems use linear penalties only.'))
        # Remove only the grading column; keep challenge statements and links intact.
        table=doc.tables[0]
        idx=next(i for i,c in enumerate(table.rows[0].cells) if c.text=='Points')
        removed_width=table.columns[idx].width
        for row in table.rows:
            row._tr.remove(row._tr.tc_lst[idx])
        table._tbl.tblGrid.remove(table._tbl.tblGrid.gridCol_lst[idx])
        if removed_width:
            table.columns[1].width+=removed_width
            for row in table.rows: row.cells[1].width=table.columns[1].width
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    if p.text=='INFO 602': change(p,'Extra')
                    elif p.text=='Course': change(p,'See extension')
    for p in paragraphs(doc):
        t=p.text
        if 'classmate' in t: change(p,t.replace('classmate','learner'))
        if '(page 1)' in p.text: change(p,p.text.replace('(page 1)','above'))
    if kind=='discussion-questions': link_activity_sources(doc,slug)
    if kind=='play-guide': suggested_readings(doc,slug)
    finish(doc,output)


def fresh(title):
    d=Document()
    sec=d.sections[0]
    sec.top_margin=sec.bottom_margin=Inches(.7)
    sec.left_margin=sec.right_margin=Inches(.8)
    sec.page_width=Inches(8.5); sec.page_height=Inches(11)
    normal=d.styles['Normal']; normal.font.name='Arial'; normal.font.size=Pt(11)
    normal.paragraph_format.space_after=Pt(7)
    normal.paragraph_format.line_spacing=1.1
    for name,size in [('Title',22),('Heading 1',14),('Heading 2',12)]:
        d.styles[name].font.name='Arial'; d.styles[name].font.size=Pt(size)
        d.styles[name].font.color.rgb=RGBColor(0,0,0)
    d.add_paragraph(title,'Title')
    return d


def shared(output):
    d=fresh('Learning bioinformatics algorithms')
    d.add_paragraph('These games and handouts cover eight topics in bioinformatics algorithms. They can be used for self-study, in a study group or in a course.')
    d.add_heading('A suggested path',1)
    for _,slug,heading,topic,game,gamepath in UNITS:
        d.add_paragraph(f'{heading}: {game}, {BASE}{gamepath}/',style='List Bullet')
    d.add_heading('Working through a topic',1)
    for text in [
      'Play the game and fill in its exploration guide. Define each term in your own words.',
      'Work the discussion questions, preferably with a group. Some of the optional activities need a partner or a board game.',
      'Code the suggested Rosalind problems, using their input and output formats. Each topic also lists easier warm-ups and a harder extension. The transformers topic states its own problems, because Rosalind has none.',
      'Do each pen-and-paper task before running your code on the same input. If the results differ, find out why. Some problems have more than one correct answer.',
      'Review the vocabulary with the Pictionary cards, which have one card for each term in the game. Print them and cut them apart. One person draws a term without letters, numbers or symbols, and the group guesses it. A wrong guess shows which terms the group confuses.',
      'Present one algorithm to someone else, following the presentation checklist.'
    ]: d.add_paragraph(text,style='List Bullet')
    d.add_heading('Investigations',1)
    d.add_paragraph('The suggested investigations describe four small experiments that reuse your code: mutation rate and motif recovery, gap penalties and alignment, initialization and Lloyd clustering, and input length, softmax base and attention.')
    suggested_readings(d)
    finish(d,output/'learning-guide.docx')
    d=fresh('Suggested algorithm investigations')
    d.add_paragraph('Choose one question and answer it with a small experiment, using code you wrote for the coding challenges.')
    for h,t in [('Motif recovery','How does mutation rate affect motif recovery?'),('Sequence alignment','How does a gap penalty affect an alignment?'),('Clustering','How does initialization affect Lloyd clustering?'),('Attention','How do the length of the input and the base of the softmax affect the attention weight on one matching site?')]:
        d.add_heading(h,1); d.add_paragraph(t)
    d.add_heading('The experiment',1)
    for text in [
      'State the question, and choose the input data and the parameter values you will compare.',
      'Say how you checked that the code is correct.',
      'Report the results and what you conclude from them. Give one limitation or one alternative explanation.',
      'Put the code and a short write-up in a notebook or repository, with enough detail for someone else to repeat the experiment.'
    ]:d.add_paragraph(text,style='List Bullet')
    d.add_heading('Questions to be ready for',1)
    for text in [
      'How does the algorithm work, and where is one of its steps in your code?',
      'Why did you design the experiment this way, and what does one of your results show?',
      'What is one limitation, and what evidence would be stronger?',
      'What will happen with a new input or a changed parameter? Predict, then run it.'
    ]:d.add_paragraph(text,style='List Bullet')
    finish(d,output/'suggested-investigations.docx')
    d=fresh('Presenting an algorithm')
    d.add_paragraph('Use this checklist when you present an algorithm to a partner or a group. Choose a small example that you can solve by hand.')
    for h,t in [
      ('Hand solution','Work the example by hand and justify each step. Show enough intermediate work for the audience to follow.'),
      ('Code explanation','Show where each step is in the code, and explain the data structures.'),
      ('An unfamiliar input','Take an input you have not seen. Predict the output, run the code, and explain any difference.'),
      ('Questions','Answer questions from the audience. If you are unsure, say what you would check.')
    ]:d.add_heading(h,1);d.add_paragraph(t)
    d.add_heading('A suggested format',1)
    d.add_paragraph('Allow about 15 minutes: four for the hand solution, four for the code, three to predict and run a new input, and four for questions.')
    d.add_paragraph('Notes, figures and sketches are fine. Finding and explaining a bug during the presentation counts in your favour. You should be able to explain the code whether or not you wrote it yourself.')
    d.add_heading('Feedback',1)
    d.add_paragraph('What was clear? Where was a step missing? What example or test would fill the gap?')
    finish(d,output/'presentation-checklist.docx')


# The home page is no longer generated here: index.html is the book's front page and draws its
# contents from book/chapters.js. Add a new topic there.


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('repository',type=Path)
    args=parser.parse_args()
    output=args.repository/'materials';output.mkdir(exist_ok=True)
    for unit in UNITS:
        for filename,kind,title in SOURCES:
            adapt(args.source/unit[0]/filename,output/f'{unit[1]}-{kind}.docx',unit,kind,title)
    shared(output)
    print('Prepared %d general learning documents.' % (3*len(UNITS)+3))

if __name__=='__main__': main()

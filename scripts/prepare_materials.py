"""Adapt the current student masters for a general learning audience.

Usage: python prepare_materials.py /path/to/GameFirstImplementation /path/to/repo
Requires python-docx. Instructor documents are never copied into the output.
"""
from pathlib import Path
import argparse
import copy
import re
from html import escape
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn

UNITS = [
 ('1_Motifs','motifs','Finding motifs','Motifs','Motif Slots','motif-slots'),
 ('2_GenomeAssembly','genome-assembly','Genome assembly','Genome assembly','Bridge Walker','bridge-walker'),
 ('3_Alignment','alignment','Sequence alignment','Sequence alignment','Toll City','toll-city'),
 ('7_HMM','hmm','Hidden Markov models','Hidden Markov models','Cho-Han Night','cho-han-night'),
 ('4_EvolutionaryTrees','evolutionary-trees','Evolutionary trees','Evolutionary trees','Hollow Mountain','hollow-mountain'),
 ('5_Clustering','clustering','Clustering','Clustering','Paint by k','paint-by-k'),
 ('6_BurrowsWheeler','burrows-wheeler','Read mapping with the Burrows–Wheeler transform','Burrows Wheeler transform','The Loom','the-loom'),
]
SOURCES = [
 ('1_BeforeClass1_PlayGuide.docx','play-guide','Exploration guide'),
 ('3_Class1_GroupSheet.docx','discussion-questions','Discussion questions'),
 ('4_Homework_CodeAndPaper.docx','coding-and-paper-tasks','Suggested coding and pen and paper tasks'),
]
BASE='https://ryanlmelvin.github.io/bioinformatics-games/'

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
        change(ps[4],f'Explore {game} at {BASE}{gamepath}/. {body} Write your reasoning on this guide or separate paper.')
        remove(ps[5])
        for p in ps:
            if p.text=='Pen and paper' and slug=='motifs': p.paragraph_format.page_break_before=True
        change(ps[6],'Connect each term to an example in the game, not only its definition. Describe what changes when the input changes.')
    elif kind=='discussion-questions':
        change(ps[4],ps[4].text.replace('One sheet per group. Pick someone to write.','Record your reasoning and compare approaches with a partner or group.'))
        if slug=='motifs':
            change(ps[6], 'Optional group activity: use nucleotide dice to make ten DNA strings of length 10. Choose a secret 4-mer and overwrite a four-letter window in each string to hide it. Swap strings with another group and try to recover its secret. Repeat with fresh strings: hide an exact copy in only three or four strings, then a copy with at most one mismatch in three or four strings, then a copy with at most one mismatch in every string. Record each predicted 4-mer and its supporting windows before comparing with the group that encoded it.')
            change(ps[7], 'Compare two scoring rules: count windows within one mismatch of a candidate, or add the distance to its closest window in each sequence. In the final round, which rule was your group using? Why can counting matching windows become less useful when every embedded copy has a mismatch?')
        elif slug=='genome-assembly':
            change(ps[6],'Optional group activity: work on an edge-matching puzzle such as Triazzle or Eternity II. Keep the same puzzle while you compare local matches with complete solutions. Record a promising placement that later caused a conflict.')
        elif slug=='alignment':
            change(ps[6],'Optional group activities: compare a Ticket to Ride route map with the directed streets in Toll City. On a chessboard, take turns moving a rook right or down by any positive distance; the player who reaches the lower-right square wins. Use the questions below to connect each activity to the algorithm.')
        elif slug=='hmm':
            change(ps[6],re.sub(r'^Play a 40-minute cho-han investigation:.*?The dealer', 'Optional group activity: conduct a cho-han investigation. The dealer',ps[6].text))
        elif slug=='evolutionary-trees':
            change(ps[6],'Optional group activity: photograph the starting board of a game such as Pandemic, play, then photograph the final board. Exchange only final photographs and reconstruct possible earlier states before revealing the starting photographs.')
        elif slug=='clustering':
            change(ps[6],'Optional group activity: choose cards with several visible attributes, such as number, color and suit. Sort the same cards into four groups twice, changing the features used for the second sort. Record both rules and compare the groupings.')
        for p in ps:
            if p.text=='Part 1: On the table': change(p,'Activities to discuss')
            elif p.text=='Part 2: Two problems to present': change(p,'Problems to discuss')
            elif p.text.startswith('Work on both problems. Both will be presented'):
                change(p,'Work through both problems. Explain your approach to someone else, compare solutions, and identify what you would add or change.')
            elif p.text.startswith('Finished both?'):
                change(p,'Next, try the suggested coding challenges and pen-and-paper tasks for this topic.')
            elif p.text.startswith('Your instructor’s discussion question'):
                text=re.sub(r'^Your instructor’s discussion question \d+: “','',p.text)
                text=text.replace('”','')
                change(p,text)
            elif p.text.startswith('This question comes from the Chapter 2 discussion questions:'):
                change(p,'Why must RandomizedMotifSearch eventually stop? Work through these three strings with k = 3, starting from the windows in bold, then make an argument for any strings.')
    else:
        remove(ps[4])
        change(ps[5],'Choose from the suggested challenges below. Each has a small pen-and-paper companion. Work through that example before testing the same input with your implementation; the final challenge offers an additional extension.')
        for p in ps[6:]:
            t=p.text
            if t.startswith('Want a warm-up first?'):
                change(p,re.sub(r' (They are|It is) not required, and nobody presents (them|it)\.', '',t))
            elif t.startswith('Optional extension. BA5M'):
                change(p,'Another extension: BA5M Multiple Sequence Alignment aligns three strings using an LCS scoring rule.')
            elif t.startswith('We will discuss this example on'):
                change(p,re.sub(r'^We will discuss this example on [^.]+\. ','Consider this example. ',t))
            elif t.startswith('Course points are independent'):
                change(p,'BA10A and BA10B share the first pen-and-paper task.')
            elif t=='Hand companions': change(p,'Suggested pen and paper tasks')
            elif t.startswith('Each required problem has a hand companion:'):
                change(p,'Each challenge has a small example to work by hand. Then run your code on the same input and record its output. If they disagree, investigate: one method may be wrong, or more than one answer may be valid.')
            elif t.startswith(('AI assistance with code is allowed','Any use of generative AI on the code is acceptable')):
                change(p,'Check any code you write or obtain with these examples and additional tests. Be able to explain the implementation and its limitations.')
            elif t.startswith('Hand write the companions,'):
                remove(p)
            elif t.startswith('INFO 602.'):
                change(p,t.replace('INFO 602.', 'Extension',1))
            elif t.startswith('Course coding specification.'):
                change(p,t.replace('Course coding specification.','Coding task.',1))
            elif 'This is coverage only;' in t:
                change(p,t.replace('This is coverage only; the required Rosalind problems keep their stated linear penalties.','This example extends the discussion; the linked Rosalind problems use their stated linear penalties.'))
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
    d.add_paragraph('Use the games to explore an algorithm, connect its actions to technical vocabulary, and test your understanding with small examples and code. These resources support independent study, discussion groups and teaching.')
    d.add_heading('A suggested path',1)
    for _,slug,heading,topic,game,gamepath in UNITS:
        d.add_paragraph(f'{heading}: {game} — {BASE}{gamepath}/',style='List Bullet')
    d.add_heading('Working through a topic',1)
    for text in [
      'Play the game and use its exploration guide to connect the game, the algorithm and the biological problem. Explain the terms in your own words.',
      'Use the discussion questions to compare approaches, construct counterexamples and justify why an algorithm works. Some optional activities need a partner or physical game materials.',
      'Choose suggested coding challenges from the linked Rosalind problem statements. Use their input and output formats. Warm-ups and extensions let you adjust the depth of study.',
      'Work the paired pen-and-paper tasks before testing your implementation. Explain discrepancies and check whether multiple answers are valid.',
      'Use the presentation checklist to explain a hand solution, connect it to code, predict an unfamiliar input and respond to questions.'
    ]: d.add_paragraph(text,style='List Bullet')
    d.add_heading('Continue with an investigation',1)
    d.add_paragraph('Reuse an implementation to explore mutation rate and motif recovery, gap penalties and alignment, or initialization and clustering. The suggested investigations give questions and a framework for a small reproducible experiment.')
    finish(d,output/'learning-guide.docx')
    d=fresh('Suggested algorithm investigations')
    d.add_paragraph('Choose one question and investigate it with a small experiment using code developed in the suggested challenges.')
    for h,t in [('Motif recovery','How does mutation rate affect motif recovery?'),('Sequence alignment','How does a gap penalty affect an alignment?'),('Clustering','How does initialization affect Lloyd clustering?')]:
        d.add_heading(h,1); d.add_paragraph(t)
    d.add_heading('Develop the experiment',1)
    for text in [
      'State a focused question and choose the input data and parameter values you will compare.',
      'Explain the checks used to establish that the code behaves as intended.',
      'Present results that support an interpretation, including a limitation or alternative explanation.',
      'Share runnable code and a brief analysis in a notebook or repository, with enough information to repeat the experiment.'
    ]:d.add_paragraph(text,style='List Bullet')
    d.add_heading('Discuss the results',1)
    for text in [
      'Explain the algorithm and connect one of its steps to the implementation.',
      'Justify the experiment and interpret a result.',
      'Identify a limitation and what would provide stronger evidence.',
      'Predict the consequence of an unfamiliar input or parameter change. Compare that prediction with a new run.'
    ]:d.add_paragraph(text,style='List Bullet')
    finish(d,output/'suggested-investigations.docx')
    d=fresh('Presenting an algorithm')
    d.add_paragraph('Use this checklist to explain an algorithm to a partner or group, or to assess your own understanding. Choose a small example you can solve by hand and connect each step to the code.')
    for h,t in [
      ('Hand solution','Explain and justify the steps on a small example. Show enough intermediate work for someone else to follow your reasoning.'),
      ('Code explanation','Connect the algorithm to the implementation and explain its data structures.'),
      ('An unfamiliar input','Predict the output before running the code. Explain the result or diagnose a discrepancy.'),
      ('Questions','Answer follow-up questions and reason through uncertainty. Identify what you would check next.')
    ]:d.add_heading(h,1);d.add_paragraph(t)
    d.add_heading('A suggested format',1)
    d.add_paragraph('Allow about 15 minutes: four for the hand solution, four for the code explanation, three to predict and run a new input, and four for questions. A shorter rehearsal can help identify gaps before a discussion.')
    d.add_paragraph('Use notes, code, figures and sketches as needed. Finding and explaining a bug can demonstrate understanding. Be able to explain and verify code regardless of how it was produced.')
    d.add_heading('Feedback',1)
    d.add_paragraph('What was clear? Where did the reasoning leave a gap? What example or test would help resolve it?')
    finish(d,output/'presentation-checklist.docx')


def homepage(repo):
    sections=[]
    for _,slug,heading,topic,game,gamepath in UNITS:
        games=f'<a href="{gamepath}/">Play {escape(game)}</a>'
        if slug=='genome-assembly':games+=' · <a href="lockpick/">Play Lockpick</a>'
        links=[('play-guide','Exploration guide'),('discussion-questions','Discussion questions'),('coding-and-paper-tasks','Suggested coding and pen-and-paper tasks')]
        items='\n'.join(f'<li><a href="materials/{slug}-{suffix}.docx">{label} (Word)</a></li>' for suffix,label in links)
        sections.append(f'<section aria-labelledby="{slug}">\n<h2 id="{slug}">{escape(heading)}</h2>\n<p>{games}</p>\n<ul>\n{items}\n</ul>\n</section>')
    html='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bioinformatics Algorithms</title>
<style>
:root{color-scheme:light dark;font:17px/1.6 system-ui,sans-serif;background:#f6f4ee;color:#1f2328}
body{max-width:900px;margin:0 auto;padding:24px 18px}
h1{font-size:1.5rem;margin:0 0 18px}h2{font-size:1.12rem;margin:0}
section{padding:16px 0;border-top:1px solid #a6a49c}
a{color:#a7390b;text-underline-offset:3px}p{margin:6px 0 0}
ul{margin:6px 0 0;padding-left:22px}
nav{margin-bottom:20px}nav ul{margin:0}
@media(prefers-color-scheme:dark){:root{background:#15181c;color:#e8e6e1}a{color:#ff9b5e}}
</style>
</head>
<body>
<main>
<h1>Bioinformatics Algorithms</h1>
<nav aria-label="General learning resources">
<ul>
<li><a href="materials/learning-guide.docx">Learning guide (Word)</a></li>
<li><a href="materials/suggested-investigations.docx">Suggested investigations (Word)</a></li>
<li><a href="materials/presentation-checklist.docx">Presenting an algorithm (Word)</a></li>
</ul>
</nav>
'''+ '\n'.join(sections)+ '\n</main>\n</body>\n</html>\n'
    (repo/'index.html').write_text(html)


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
    homepage(args.repository)
    print('Prepared 24 general learning documents and the topic index.')

if __name__=='__main__': main()

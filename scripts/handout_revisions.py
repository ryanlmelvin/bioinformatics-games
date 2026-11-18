"""Apply public worksheet wording to the formatted student masters."""

from copy import deepcopy
import json
from pathlib import Path
import re

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.shared import Pt, RGBColor
from docx.text.paragraph import Paragraph
from docx.text.run import Run


COPY = json.loads(Path(__file__).with_name('handout_copy.json').read_text(encoding='utf-8'))
GAME_URL = re.compile(r'https://bioinformatics\.ryanlmelvin\.com/(?:[a-z-]+/)?(?:\?bench=1)?(?![\w/?#%&=-])')


def _link_run(paragraph, run, label, url):
    """Link text inside a run and return the remaining unlinked text, if any."""
    before, after = run.text.split(label, 1)
    linked = Run(deepcopy(run._r), paragraph)
    linked.text = label
    linked.font.color.rgb = RGBColor.from_string('0563C1')
    linked.font.underline = True
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True))
    hyperlink.append(linked._r)
    run._r.addnext(hyperlink)
    run.text = before
    if after:
        tail = Run(deepcopy(run._r), paragraph)
        tail.text = after
        hyperlink.addnext(tail._r)
        return tail


def link_text(paragraph, label, url):
    if any(link.text == label and link.url == url for link in paragraph.hyperlinks):
        return
    run = next(run for run in paragraph.runs if label in run.text)
    _link_run(paragraph, run, label, url)


def link_game_urls(doc):
    """Make printed game addresses clickable, retaining the surrounding run style."""
    for element in doc.element.body.iter(qn('w:p')):
        paragraph = Paragraph(element, doc)
        # Direct runs exclude text already inside a hyperlink.
        for run in paragraph.runs:
            while run is not None and (match := GAME_URL.search(run.text)):
                url = match.group()
                run = _link_run(paragraph, run, url, url)


def revise_chapter(doc, stem):
    """Revise a chapter worksheet after its public names and URLs are in place.

    Copy entries are keyed by unique opening words from the relevant Word run.
    Editing runs preserves the masters' inline examples, emphasis and hyperlinks.
    """
    if stem not in COPY or stem == 'shared':
        return
    edits = COPY[stem]
    found = set()
    for element in doc.element.body.iter(qn('w:p')):
        paragraph = Paragraph(element, doc)
        original = paragraph.text
        if stem == 'genome-assembly-coding-and-paper-tasks' and original.startswith('The string CATGTCGATTCC'):
            # This rewritten question puts the example at the start of the sentence.
            first, *rest = paragraph.runs
            first.text = original
            for run in rest:
                element.remove(run._r)
        for run_element in element.iter(qn('w:r')):
            run = Run(run_element, paragraph)
            source = run.text
            key = next((key for key in edits if source.startswith(key)), None)
            if key is not None:
                run.text = edits[key]
                found.add(key)
            elif source in COPY['shared']:
                run.text = COPY['shared'][source]
            elif source.startswith('Extension ') and not source.startswith('Extension – '):
                run.text = 'Extension – ' + source[len('Extension '):]
        if stem == 'transformers-discussion-questions' and original.startswith('Level 7. A gene must light'):
            # The proof needs a third board. Give it the same styling as board Q.
            board, ending = paragraph.runs[-2:]
            ending.text = ', and R, '
            third_board = Run(deepcopy(board._r), paragraph)
            third_board.text = 'GTCA GATA ATCG AATC TATA'
            element.append(third_board._r)
            paragraph.add_run('. Which boards should light? For every single query that lights R, show that it also lights P or Q.')
    if edits.keys() - found:
        raise ValueError(f'Unmatched worksheet copy in {stem}: {sorted(edits.keys() - found)}')
    format_answer_space(doc, stem)
    doc.core_properties.title = doc.paragraphs[0].text
    link_game_urls(doc)


def format_answer_space(doc, stem):
    if stem in ('clustering-play-guide', 'evolutionary-trees-play-guide'):
        section = None
        for p in doc.paragraphs:
            if p.text == 'Define':
                section = 'define'
            elif p.text == 'Pen and paper':
                section = 'paper'
                p.paragraph_format.page_break_before = True
            elif p.text == 'Suggested reading and problems':
                break
            elif section and not p.text:
                p.paragraph_format.space_after = Pt(54 if section == 'define' else 90)
    elif stem == 'motifs-coding-and-paper-tasks':
        # Keep each program-output prompt on the same page as the paper exercise.
        paragraphs = doc.paragraphs
        for question, space in zip(paragraphs, paragraphs[1:]):
            if question.text.startswith('Multiply the three profile entries'):
                space.paragraph_format.space_after = Pt(82)
            elif question.text.startswith('Build the next profile and try'):
                space.paragraph_format.space_after = Pt(67)

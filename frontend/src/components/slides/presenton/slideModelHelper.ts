import { ProjectManifest, ConceptItem, VocabularyItem } from '../../../api';
import { SlideContent, SlideCard, SlideMetric } from './types';

export function normalizeSlideContent(rawSlide: any, slideIndex: number): SlideContent {
  const slideId = rawSlide.id || `slide-${slideIndex + 1}`;
  
  // Normalize cards
  const cards: SlideCard[] = Array.isArray(rawSlide.cards)
    ? rawSlide.cards.map((c: any, cIdx: number) => ({
        id: c.id || `card-${slideId}-${cIdx}-${Date.now().toString(36)}`,
        badge: c.badge || '',
        stat: c.stat || '',
        title: c.title || `Section ${cIdx + 1}`,
        body: c.body || '',
        citation: c.citation || '',
        icon: c.icon || '',
        bullets: Array.isArray(c.bullets) ? c.bullets : [],
      }))
    : [];

  // Normalize metrics if present
  const metrics: SlideMetric[] = Array.isArray(rawSlide.metrics)
    ? rawSlide.metrics.map((m: any, mIdx: number) => ({
        id: m.id || `metric-${slideId}-${mIdx}`,
        label: m.label || '',
        value: m.value || '',
        delta: m.delta || '',
      }))
    : [];

  return {
    ...rawSlide,
    id: slideId,
    slide_number: rawSlide.slide_number ?? slideIndex + 1,
    title: rawSlide.title || `Slide ${slideIndex + 1}`,
    subtitle: rawSlide.subtitle || '',
    badge: rawSlide.badge || '',
    postulate: rawSlide.postulate || '',
    standard: rawSlide.standard || '',
    archetype: rawSlide.archetype || 'card_grid_3',
    template_id: rawSlide.template_id || 'editorial',
    cards,
    bullets: Array.isArray(rawSlide.bullets) ? rawSlide.bullets : [],
    metrics,
    image: rawSlide.image || (rawSlide.image_url ? { url: rawSlide.image_url, caption: rawSlide.image_caption || '' } : undefined),
    speaker_notes: rawSlide.speaker_notes || '',
    est_delivery: rawSlide.est_delivery || '3m 00s',
  };
}

export function buildInitialSlidesFromProject(
  proj: ProjectManifest | null,
  passages: Record<string, string> = {}
): SlideContent[] {
  const subject = proj?.outline?.subject || 'Curriculum';
  const grade = proj?.outline?.grade_level || 'Grade 10';
  const title = proj?.outline?.title || proj?.name || 'Lesson Presentation';
  const summary = proj?.outline?.summary || 'Comprehensive instructional unit aligned with textbook grounding.';
  const concepts = proj?.outline?.concepts || [];
  const objectives = proj?.outline?.learning_objectives || [];
  const vocabulary = proj?.outline?.vocabulary || [];
  const passageEntries = Object.entries(passages || {});

  const slides: SlideContent[] = [];

  // Slide 1: Hero / Overview
  const conceptNames = concepts.slice(0, 3).map((c: ConceptItem) => c.concept).join(', ');
  slides.push({
    id: 'slide-1',
    slide_number: 1,
    title: title,
    subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · FOUNDATIONAL UNIT`,
    badge: 'UNIT OVERVIEW',
    postulate: 'PEDAGOGICAL FOUNDATION',
    standard: `${subject} Standard`,
    archetype: 'hero_stat',
    cards: [
      {
        id: 'card-1-0',
        badge: 'Curriculum Focus',
        stat: grade,
        title: `${subject} Scope`,
        body: summary.length > 150 ? summary.slice(0, 147) + '...' : summary,
      },
      {
        id: 'card-1-1',
        badge: 'Core Concepts',
        title: `${concepts.length || 3} Key Topics`,
        body: conceptNames ? `Key areas: ${conceptNames}.` : `Structured lesson module for direct classroom delivery.`,
      },
      {
        id: 'card-1-2',
        badge: 'Grounding',
        title: 'Textbook Verified',
        body: `Synthesized deterministically from verified textbook passages with rigorous grounding.`,
      },
    ],
    speaker_notes: `Welcome students to ${title}. Introduce the overarching chapter goal and connect it to foundational ${subject} concepts.`,
    est_delivery: '3m 30s',
  });

  // Slide 2: Learning Objectives
  if (objectives.length > 0) {
    slides.push({
      id: 'slide-2',
      slide_number: 2,
      title: 'Learning Objectives & Competencies',
      subtitle: `${subject.toUpperCase()} · PEDAGOGICAL TARGETS`,
      badge: 'OBJECTIVES',
      postulate: "BLOOM'S TAXONOMY ALIGNMENT",
      standard: `${subject} Standard`,
      archetype: 'card_grid_3',
      cards: objectives.slice(0, 3).map((obj: string, i: number) => ({
        id: `card-2-${i}`,
        badge: `Competency 0${i + 1}`,
        title: `Goal 0${i + 1}`,
        body: obj,
      })),
      speaker_notes: `Walk students through these Bloom's taxonomy objectives before diving into detailed mechanisms.`,
      est_delivery: '3m 45s',
    });
  }

  // Slide 3..N: Concepts
  if (concepts.length > 0) {
    concepts.slice(0, 4).forEach((c: ConceptItem, idx: number) => {
      const gRef = c.grounding?.passage_id || (passageEntries[idx] ? passageEntries[idx][0] : undefined);
      const quote = c.grounding?.quote || (gRef && passages[gRef] ? passages[gRef].slice(0, 120) : '');
      const sNum = slides.length + 1;
      slides.push({
        id: `slide-${sNum}`,
        slide_number: sNum,
        title: c.concept,
        subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · CONCEPT EXPLORATION`,
        badge: `CONCEPT 0${idx + 1}`,
        postulate: gRef ? `GROUNDED IN [${gRef}]` : 'CORE PRINCIPLE',
        standard: gRef ? `Passage [${gRef}]` : `${subject} Standard`,
        archetype: 'card_grid_3',
        cards: [
          {
            id: `card-${sNum}-0`,
            badge: 'Mechanism',
            title: 'Core Explanation',
            body: c.explanation || `Fundamental mechanism governing ${c.concept}.`,
            citation: gRef,
          },
          {
            id: `card-${sNum}-1`,
            badge: 'Application',
            title: 'Classroom Context',
            body: `Examine practical implications, scientific models, and analytical methods for ${c.concept}.`,
          },
          {
            id: `card-${sNum}-2`,
            badge: 'Grounding',
            title: 'Textbook Evidence',
            body: quote || `Verified understanding grounded in primary curriculum reference.`,
            citation: gRef,
          },
        ],
        speaker_notes: `Deep-dive discussion on ${c.concept}. Prompt students for real-world examples and clarify theoretical misconceptions.${gRef ? ` [Ref: ${gRef}]` : ''}`,
        est_delivery: '4m 15s',
      });
    });
  } else if (passageEntries.length > 0) {
    passageEntries.slice(0, 4).forEach(([pid, text]: [string, string], idx: number) => {
      const sNum = slides.length + 1;
      slides.push({
        id: `slide-${sNum}`,
        slide_number: sNum,
        title: `Core Concept 0${idx + 1}`,
        subtitle: `${subject.toUpperCase()} · SECTION GROUNDED IN ${pid}`,
        badge: `SECTION 0${idx + 1}`,
        postulate: 'PRIMARY SOURCE TEXT',
        standard: `Passage [${pid}]`,
        archetype: 'card_grid_3',
        cards: [
          {
            id: `card-${sNum}-0`,
            badge: 'Excerpt',
            title: `Source [${pid}]`,
            body: text.slice(0, 160),
            citation: pid,
          },
          {
            id: `card-${sNum}-1`,
            badge: 'Pedagogy',
            title: 'Key Mechanism',
            body: 'Critical concept extracted from primary chapter text for focused student review.',
          },
          {
            id: `card-${sNum}-2`,
            badge: 'Reflection',
            title: 'Discussion Anchor',
            body: 'Ask students how this principle applies to observable natural phenomena.',
          },
        ],
        speaker_notes: `Discuss ${pid}: ${text.slice(0, 120)}... [Ref: ${pid}]`,
        est_delivery: '3m 45s',
      });
    });
  } else if (vocabulary.length > 0) {
    const sNum = slides.length + 1;
    slides.push({
      id: `slide-${sNum}`,
      slide_number: sNum,
      title: 'Foundational Terminology',
      subtitle: `${subject.toUpperCase()} · SCIENTIFIC VOCABULARY`,
      badge: 'TERMS',
      postulate: 'CURRICULUM LEXICON',
      standard: `${subject} Standard`,
      archetype: 'card_grid_3',
      cards: vocabulary.slice(0, 3).map((v: VocabularyItem, i: number) => ({
        id: `card-${sNum}-${i}`,
        badge: `Term 0${i + 1}`,
        title: v.term,
        body: v.definition,
      })),
      speaker_notes: 'Reinforce essential terminology before moving on to quantitative problem solving.',
      est_delivery: '3m 30s',
    });
  }

  // Summary slide
  const sNum = slides.length + 1;
  slides.push({
    id: `slide-${sNum}`,
    slide_number: sNum,
    title: 'Summary & Classroom Checkpoint',
    subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · FORMATIVE ASSESSMENT`,
    badge: 'REVIEW',
    postulate: 'CORE TAKEAWAYS',
    standard: `${subject} Standard`,
    archetype: 'key_takeaways',
    cards: [
      {
        id: `card-${sNum}-0`,
        badge: 'Takeaway 1',
        title: 'Consolidated Principle',
        body: `Synthesize foundational principles of ${title} covered in this instructional unit.`,
      },
      {
        id: `card-${sNum}-1`,
        badge: 'Takeaway 2',
        title: 'Assessment Anchor',
        body: 'Validate student mastery through analytical reasoning and formative problem solving.',
      },
    ],
    speaker_notes: `Review primary takeaways and assign reflection questions based on ${title}.`,
    est_delivery: '2m 30s',
  });

  return slides;
}

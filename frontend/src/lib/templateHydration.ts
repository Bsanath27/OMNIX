/**
 * Hydrates Presenton Layout Object with slide text (headline, kicker, concept cards, detail items)
 * and resolves content images with graceful fallbacks.
 */
function findTitleNode(layout: any): any {
  let found: any = null;

  // Pass A: Exact primary title names
  function passA(node: any) {
    if (!node || found) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        passA(item);
        if (found) return;
      }
      return;
    }
    if (node.type === 'text') {
      const name = (node.name || '').toLowerCase();
      if (
        name === 'title' ||
        name === 'slide_title' ||
        name === 'cover_title' ||
        name === 'header_title' ||
        name === 'slide_heading' ||
        name === 'slide_headline'
      ) {
        found = node;
        return;
      }
    }
    if (node.child) passA(node.child);
    if (node.components) passA(node.components);
    if (node.elements) passA(node.elements);
    if (node.children) passA(node.children);
  }
  passA(layout);
  if (found) return found;

  // Pass B: Secondary title names
  function passB(node: any) {
    if (!node || found) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        passB(item);
        if (found) return;
      }
      return;
    }
    if (node.type === 'text') {
      const name = (node.name || '').toLowerCase();
      if (/^(main_title|primary_title|top_title|closing_title|large_title_text|main_title_text|main_headline|primary_headline|intro_headline|headline|headline_title|headline_text|main_heading|primary_heading|large_heading|centered_heading|section_title)$/i.test(name)) {
        found = node;
        return;
      }
    }
    if (node.child) passB(node.child);
    if (node.components) passB(node.components);
    if (node.elements) passB(node.elements);
    if (node.children) passB(node.children);
  }
  passB(layout);
  return found;
}

export function hydrateTemplateLayout(layout: any, slide: any): any {
  if (!layout) return layout;
  const l = JSON.parse(JSON.stringify(layout));
  const slideTitleNode = findTitleNode(l);

  let titleAssigned = false;
  let cardIdx = 0;
  let detailIdx = 0;

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.child) walk(node.child);
    if (node.components) walk(node.components);
    if (node.elements) walk(node.elements);
    if (node.children) walk(node.children);

    if (node.type === 'text') {
      const name = (node.name || '').toLowerCase();
      const isPrimaryTitle =
        name === 'title' ||
        name === 'slide_title' ||
        name === 'cover_title' ||
        name === 'header_title' ||
        name === 'slide_heading' ||
        name === 'slide_headline';

      // 1. True slide title matching
      if (node === slideTitleNode || (!titleAssigned && isPrimaryTitle)) {
        node.runs = [{ text: slide?.title || 'Slide Headline', font: node.font }];
        titleAssigned = true;
      } else if (!titleAssigned && !slideTitleNode && /^(main_title|primary_title|top_title|closing_title|large_title_text|main_title_text|main_headline|primary_headline|intro_headline|headline|headline_title|headline_text|main_heading|primary_heading|large_heading|centered_heading|section_title|topic|subject|lead|quote_statement)$/i.test(name) && !/card|entry|item|row|callout/i.test(name)) {
        node.runs = [{ text: slide?.title || 'Slide Headline', font: node.font }];
        titleAssigned = true;
      } else if (/subtitle|meta|category|kicker|date|author/i.test(name)) {
        node.runs = [{ text: slide?.subtitle || '', font: node.font }];
      } else if (/card_heading|entry_heading|item_title|card_title|callout_heading|row_title/i.test(name) || (titleAssigned && /^(title|heading)$/i.test(name))) {
        // 2. Card headings
        const card = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)];
        const text = card?.title || card?.kicker || slide?.bullets?.[cardIdx % (slide?.bullets?.length || 1)] || `Topic ${cardIdx + 1}`;
        if (text) node.runs = [{ text, font: node.font }];
      } else if (/body|desc|statement|intro|summary|paragraph/i.test(name)) {
        // 3. Card descriptions
        const card = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)];
        const text = card?.body || slide?.bullets?.[cardIdx % (slide?.bullets?.length || 1)] || '';
        node.runs = [{ text: text || ' ', font: node.font }];
        cardIdx++;
      } else if (/detail_value|metric_value|statistic|number|stat/i.test(name)) {
        // 4. Detail values & metrics: replace real estate placeholder copy
        const card = slide?.cards?.[detailIdx % (slide?.cards?.length || 1)];
        const bullet = slide?.bullets?.[detailIdx % (slide?.bullets?.length || 1)];
        const text = card?.stat || card?.body || card?.title || bullet || slide?.subtitle || slide?.title || 'Key Metric';
        if (text) node.runs = [{ text, font: node.font }];
        detailIdx++;
      } else if (/detail_label|metric_label/i.test(name)) {
        const card = slide?.cards?.[detailIdx % (slide?.cards?.length || 1)];
        const text = card?.badge || card?.title || `Topic ${detailIdx + 1}`;
        if (text) node.runs = [{ text, font: node.font }];
      } else if (/label|item|card|badge/i.test(name)) {
        const card = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)];
        const text = card?.title || card?.badge || '';
        if (text) node.runs = [{ text, font: node.font }];
      }

      // Safeguard: eliminate any lingering boilerplate copy from text runs
      if (node.runs && Array.isArray(node.runs)) {
        const fullText = node.runs.map((r: any) => (typeof r?.text === 'string' ? r.text : '')).join(' ');
        if (/LOCATION\s*&\s*CONNECTIVITY/i.test(fullText)) {
          node.runs = [{ text: slide?.title || 'Course Overview', font: node.font }];
        } else if (/Downtown Riverside District|Luxury Residential Apartments|ABC Capital Partners|128 Units|\$185 Million|Metro City|Sunrise Residences|Comprehensive introduction|Key residential market trends|Investment metrics|NPR \d+ Million|\d+ Million|Boston, Downtown Main Street/i.test(fullText)) {
          const card = slide?.cards?.[detailIdx % (slide?.cards?.length || 1)];
          const replacementText = card?.body || card?.title || slide?.bullets?.[detailIdx % (slide?.bullets?.length || 1)] || slide?.title || 'Key Module Concept';
          node.runs = [{ text: replacementText, font: node.font }];
          detailIdx++;
        }
      }
    } else if (node.type === 'image') {
      // 5. Image slot resolution (F5)
      const isDecorative = Boolean(node.decorative || node.isIcon || node.is_icon);
      const name = (node.name || '').toLowerCase();
      const currentData = typeof node.data === 'string' ? node.data : (node.data?.source || '');
      const isContentImage =
        /hero_image|featured_image|primary_image|secondary_image|gallery_image|mosaic_image|background_photo|background_image|image_slot|photo/i.test(name) ||
        currentData.includes('replaceable_template_image') ||
        (!isDecorative && currentData && !currentData.endsWith('.svg'));

      if (isContentImage && !isDecorative) {
        const cardImg = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)]?.image_url;
        const targetUrl = slide?.image_url || cardImg;
        if (targetUrl) {
          if (typeof node.data === 'object' && node.data !== null) {
            node.data.source = targetUrl;
          } else {
            node.data = targetUrl;
          }
        }
      }
    }
  }

  walk(l);
  return l;
}

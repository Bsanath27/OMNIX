#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { templateV2UiToHtmlFragment } from '../../../frontend/src/lib/presenton_renderer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

export function buildTemplateFontFaceCss(templateId, fonts) {
  if (!fonts) return '';
  let css = '<style>\n';
  for (const [fontFamily, fontUrl] of Object.entries(fonts)) {
    if (fontUrl.startsWith('http://') || fontUrl.startsWith('https://')) {
      css += `@import url('${fontUrl}');\n`;
    } else {
      const cleanUrl = fontUrl.startsWith('/') ? fontUrl : `/templates/${templateId}/${fontUrl}`;
      const format = cleanUrl.endsWith('.otf') ? 'opentype' : 'truetype';
      css += `@font-face {\n  font-family: '${fontFamily}';\n  src: url('${cleanUrl}') format('${format}');\n  font-display: swap;\n}\n`;
    }
  }
  css += '</style>\n';
  return css;
}

function findTitleNode(layout) {
  let found = null;

  // Pass A: Exact primary title names
  function passA(node) {
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
  function passB(node) {
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

export function hydrateTemplateLayout(layout, slide) {
  if (!layout) return layout;
  const l = JSON.parse(JSON.stringify(layout));
  const slideTitleNode = findTitleNode(l);

  let titleAssigned = false;
  let cardIdx = 0;
  let detailIdx = 0;
  
  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
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
        const fullText = node.runs.map(r => (typeof r?.text === 'string' ? r.text : '')).join(' ');
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

export function renderSlideHtml(templateId, layoutId, slide) {
  const tplPath = path.join(ROOT_DIR, 'backend/templates/catalog', templateId, 'template.json');
  if (!fs.existsSync(tplPath)) {
    throw new Error(`Template catalog not found: ${tplPath}`);
  }
  const template = JSON.parse(fs.readFileSync(tplPath, 'utf8'));
  let layout = template.layouts.find(l => l.id === layoutId);
  if (!layout) {
    const isFirst = (slide.slide_number === 1) || (slide.index === 0);
    layout = isFirst ? template.layouts[0] : (template.layouts[1] || template.layouts[0]);
  }
  
  const hydrated = hydrateTemplateLayout(layout, slide);
  const fontCss = buildTemplateFontFaceCss(templateId, template.fonts);
  let html = templateV2UiToHtmlFragment(hydrated, { width: 1280, height: 720 });
  if (html) {
    html = html.replace(/http:\/\/127\.0\.0\.1:5001\/static\/(?!images\/)/g, `/templates/${templateId}/static/`);
    html = html.replace(/\/templates\/[a-zA-Z0-9_-]+\/templates\/[a-zA-Z0-9_-]+\/static\//g, `/templates/${templateId}/static/`);
    html = html.replace(/(?<!\/templates\/[a-zA-Z0-9_-]+)\/static\/(?!images\/)/g, `/templates/${templateId}/static/`);
    html = fontCss + html;
  }
  return { html, layoutId: layout.id };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let inputStr = '';
  if (process.argv[2]) {
    inputStr = fs.readFileSync(process.argv[2], 'utf8');
  } else {
    inputStr = fs.readFileSync(0, 'utf8');
  }
  const req = JSON.parse(inputStr);
  const result = renderSlideHtml(req.template_id, req.layout_id, req.slide);
  process.stdout.write(JSON.stringify(result));
}

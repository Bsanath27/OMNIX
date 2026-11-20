#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { templateV2UiToHtml } from '../../../frontend/src/lib/presenton_renderer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

export function hydrateTemplateLayout(layout, slide) {
  const l = JSON.parse(JSON.stringify(layout));
  let cardIdx = 0;
  let titleAssigned = false;
  
  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.components) walk(node.components);
    if (node.elements) walk(node.elements);
    if (node.children) walk(node.children);
    
    if (node.type === 'text') {
      const name = (node.name || '').toLowerCase();
      if (!titleAssigned && /title|heading|headline|topic|main|subject|lead|quote_statement/i.test(name)) {
        node.runs = [{ text: slide.title || '', font: node.font }];
        titleAssigned = true;
      } else if (/subtitle|meta|category|kicker|date|author/i.test(name)) {
        node.runs = [{ text: slide.subtitle || '', font: node.font }];
      } else if (/body|desc|statement|intro|summary|paragraph/i.test(name)) {
        const text = slide.cards?.[cardIdx % (slide.cards?.length || 1)]?.body || slide.bullets?.[cardIdx % (slide.bullets?.length || 1)] || '';
        if (text) node.runs = [{ text, font: node.font }];
        cardIdx++;
      } else if (/label|item|card|badge/i.test(name)) {
        const text = slide.cards?.[cardIdx % (slide.cards?.length || 1)]?.title || '';
        if (text) node.runs = [{ text, font: node.font }];
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
  let html = templateV2UiToHtml(hydrated, { width: 1280, height: 720 });
  if (html) {
    html = html.replace(/http:\/\/127\.0\.0\.1:5001\/static\//g, `/templates/${templateId}/static/`);
    html = html.replace(/\/templates\/[a-zA-Z0-9_-]+\/templates\/[a-zA-Z0-9_-]+\/static\//g, `/templates/${templateId}/static/`);
    html = html.replace(/(?<!\/templates\/[a-zA-Z0-9_-]+)\/static\//g, `/templates/${templateId}/static/`);
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

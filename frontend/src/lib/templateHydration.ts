/**
 * Hydrates Presenton Layout Object with slide text (headline, kicker, concept cards)
 */
export function hydrateTemplateLayout(layout: any, slide: any): any {
  if (!layout) return layout;
  const l = JSON.parse(JSON.stringify(layout));
  let cardIdx = 0;
  let titleAssigned = false;

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.components) walk(node.components);
    if (node.elements) walk(node.elements);
    if (node.children) walk(node.children);

    if (node.type === 'text') {
      const name = (node.name || '').toLowerCase();
      if (!titleAssigned && /title|heading|headline|topic|main|subject|lead|quote_statement/i.test(name)) {
        node.runs = [{ text: slide?.title || 'Slide Headline', font: node.font }];
        titleAssigned = true;
      } else if (/subtitle|meta|category|kicker|date|author/i.test(name)) {
        node.runs = [{ text: slide?.subtitle || '', font: node.font }];
      } else if (/body|desc|statement|intro|summary|paragraph/i.test(name)) {
        const text = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)]?.body || slide?.bullets?.[cardIdx % (slide?.bullets?.length || 1)] || '';
        if (text) node.runs = [{ text, font: node.font }];
        cardIdx++;
      } else if (/label|item|card|badge/i.test(name)) {
        const text = slide?.cards?.[cardIdx % (slide?.cards?.length || 1)]?.title || '';
        if (text) node.runs = [{ text, font: node.font }];
      }
    }
  }

  walk(l);
  return l;
}

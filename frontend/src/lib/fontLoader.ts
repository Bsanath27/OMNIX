import { useEffect } from 'react';
import { ThemeProperties } from './presentonThemes';

/**
 * Dynamically loads Google Web Fonts for the given heading and body fonts.
 * Strips weight/style suffixes (e.g., 'DM Sans Bold' -> 'DM Sans') so Google Fonts API succeeds.
 */
export function loadGoogleFont(rawFamily: string) {
  if (!rawFamily || typeof document === 'undefined') return;
  if (['Inter', 'system-ui', 'sans-serif', 'serif', 'monospace'].includes(rawFamily)) return;

  const cleanFamily = rawFamily
    .replace(/\s+(Bold|Semi-Bold|SemiBold|Medium|Light|Regular|Black|ExtraBold|Extra-Bold|Italics|Italic|\d+)/gi, '')
    .trim();

  if (!cleanFamily) return;

  const fontId = `gfont-${cleanFamily.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  if (document.getElementById(fontId)) return;

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  const encoded = encodeURIComponent(cleanFamily);
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap`;
  document.head.appendChild(link);
}

/**
 * Injects @font-face rules for local template font files (.ttf/.otf) located in /templates/{templateId}/static/
 */
export function loadTemplateFonts(templateId: string) {
  if (!templateId || typeof document === 'undefined') return;
  const styleId = `tpl-fonts-${templateId.toLowerCase()}`;
  if (document.getElementById(styleId)) return;

  fetch(`/api/templates/catalog/${templateId.toLowerCase()}`)
    .then((r) => r.json())
    .then((data) => {
      const fonts = data?.template?.fonts || data?.fonts;
      if (!fonts || typeof fonts !== 'object') return;
      let css = '';
      for (const [fontFamily, fontUrl] of Object.entries(fonts as Record<string, string>)) {
        if (fontUrl.startsWith('http://') || fontUrl.startsWith('https://')) {
          css += `@import url('${fontUrl}');\n`;
        } else {
          const cleanUrl = fontUrl.startsWith('/') ? fontUrl : `/templates/${templateId.toLowerCase()}/${fontUrl}`;
          const format = cleanUrl.endsWith('.otf') ? 'opentype' : 'truetype';
          css += `@font-face {\n  font-family: '${fontFamily}';\n  src: url('${cleanUrl}') format('${format}');\n  font-display: swap;\n}\n`;
        }
      }
      if (css && !document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
      }
    })
    .catch((err) => console.warn(`Failed to load fonts for template '${templateId}':`, err));
}

/**
 * Hook to automatically inject and apply Google Fonts & local template fonts for the active Presenton theme
 */
export function useThemeFonts(theme: ThemeProperties | undefined, templateKey?: string) {
  useEffect(() => {
    if (templateKey) {
      loadTemplateFonts(templateKey);
    }
    if (!theme?.fonts) return;
    const { heading, body } = theme.fonts;
    if (heading) loadGoogleFont(heading);
    if (body) loadGoogleFont(body);
  }, [theme?.fonts?.heading, theme?.fonts?.body, templateKey]);
}

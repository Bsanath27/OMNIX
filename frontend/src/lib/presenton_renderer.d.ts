export const TEMPLATE_V2_HTML_WIDTH: number;
export const TEMPLATE_V2_HTML_HEIGHT: number;

export interface TemplateV2HtmlOptions {
  width?: number;
  height?: number;
  fonts?: Record<string, any>;
  background?: string;
}

export function hasTemplateV2RenderableUi(ui: unknown): boolean;
export function templateV2UiToHtml(ui: unknown, options?: TemplateV2HtmlOptions): string | null;
export function templateV2UiToHtmlFragment(ui: unknown, options?: TemplateV2HtmlOptions): string | null;

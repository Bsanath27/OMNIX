// utils/api.ts
function isAbsoluteHttpUrl(path) {
  return /^https?:\/\//i.test(path);
}
function withLeadingSlash(path) {
  return path.startsWith("/") ? path : `/${path}`;
}
function getConfiguredFastApiUrl() {
  if (typeof window !== "undefined" && window.env?.NEXT_PUBLIC_FAST_API) {
    return window.env.NEXT_PUBLIC_FAST_API;
  }
  if (process.env.NEXT_PUBLIC_FAST_API) {
    return process.env.NEXT_PUBLIC_FAST_API;
  }
  return null;
}
function getFastApiUrlFromQuery() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("fastapiUrl");
    if (!value) return null;
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}
function isElectronRuntime() {
  return typeof window !== "undefined" && !!window.electron;
}
function shouldUseDirectFastApiOriginInBrowser() {
  return isElectronRuntime() || !!getFastApiUrlFromQuery();
}
function resolveBackendPathForRuntime(path) {
  const normalizedPath = withLeadingSlash(path);
  if (typeof window !== "undefined" && !shouldUseDirectFastApiOriginInBrowser()) {
    return normalizedPath;
  }
  return `${getFastAPIUrl()}${normalizedPath}`;
}
function getFastAPIUrl() {
  const queryFastApiUrl = getFastApiUrlFromQuery();
  if (queryFastApiUrl) {
    return queryFastApiUrl;
  }
  if (typeof window !== "undefined") {
    if (isElectronRuntime()) {
      return getConfiguredFastApiUrl() || window.location.origin;
    }
    return window.location.origin;
  }
  return getConfiguredFastApiUrl() || "http://127.0.0.1:5001";
}
function hasBackendAssetPrefix(path) {
  return path.startsWith("/static/") || path.startsWith("/app_data/");
}
function getHttpOrigin(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}
function isLocalBackendOrigin(origin) {
  const localOrigins = /* @__PURE__ */ new Set();
  const configuredOrigin = getHttpOrigin(getConfiguredFastApiUrl());
  const queryOrigin = getHttpOrigin(getFastApiUrlFromQuery());
  const runtimeOrigin = getHttpOrigin(getFastAPIUrl());
  if (configuredOrigin) localOrigins.add(configuredOrigin);
  if (queryOrigin) localOrigins.add(queryOrigin);
  if (runtimeOrigin) localOrigins.add(runtimeOrigin);
  if (typeof window !== "undefined" && window.location?.origin) {
    localOrigins.add(window.location.origin);
  }
  return localOrigins.has(origin);
}
function toBackendServedPath(rawPath) {
  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.startsWith("/_next/static/") || normalized.startsWith("/vendor/fonts/")) {
    return normalized;
  }
  const appDataIdx = normalized.indexOf("/app_data/");
  if (appDataIdx !== -1) {
    return normalized.slice(appDataIdx);
  }
  const staticIdx = normalized.indexOf("/static/");
  if (staticIdx !== -1) {
    return normalized.slice(staticIdx);
  }
  const imagesIdx = normalized.lastIndexOf("/images/");
  if (imagesIdx !== -1) {
    return `/app_data${normalized.slice(imagesIdx)}`;
  }
  const uploadsIdx = normalized.lastIndexOf("/uploads/");
  if (uploadsIdx !== -1) {
    return `/app_data${normalized.slice(uploadsIdx)}`;
  }
  const fontsIdx = normalized.lastIndexOf("/fonts/");
  if (fontsIdx !== -1) {
    return `/app_data${normalized.slice(fontsIdx)}`;
  }
  return normalized;
}
function splitPathAndSuffix(value) {
  const hashIdx = value.indexOf("#");
  const queryIdx = value.indexOf("?");
  const firstSuffixIdx = hashIdx === -1 ? queryIdx : queryIdx === -1 ? hashIdx : Math.min(queryIdx, hashIdx);
  if (firstSuffixIdx === -1) {
    return { path: value, suffix: "" };
  }
  return {
    path: value.slice(0, firstSuffixIdx),
    suffix: value.slice(firstSuffixIdx)
  };
}
function resolveBackendAssetUrl(path) {
  if (!path) return "";
  const trimmedPath = path.trim();
  if (!trimmedPath) return "";
  if (trimmedPath.startsWith("data:") || trimmedPath.startsWith("blob:")) {
    return trimmedPath;
  }
  if (trimmedPath.startsWith("file:")) {
    try {
      const parsed = new URL(trimmedPath);
      const servedPath2 = toBackendServedPath(decodeURIComponent(parsed.pathname));
      if (hasBackendAssetPrefix(servedPath2)) {
        return resolveBackendPathForRuntime(servedPath2);
      }
      return trimmedPath;
    } catch {
      return trimmedPath;
    }
  }
  if (isAbsoluteHttpUrl(trimmedPath)) {
    try {
      const parsed = new URL(trimmedPath);
      if (!isLocalBackendOrigin(parsed.origin)) {
        return trimmedPath;
      }
      const servedPath2 = toBackendServedPath(parsed.pathname);
      if (hasBackendAssetPrefix(servedPath2)) {
        return resolveBackendPathForRuntime(
          `${servedPath2}${parsed.search}${parsed.hash}`
        );
      }
      return trimmedPath;
    } catch {
      return trimmedPath;
    }
  }
  const { path: pathPart, suffix } = splitPathAndSuffix(trimmedPath);
  const servedPath = toBackendServedPath(withLeadingSlash(pathPart));
  if (hasBackendAssetPrefix(servedPath)) {
    return resolveBackendPathForRuntime(`${servedPath}${suffix}`);
  }
  return trimmedPath;
}

// components/slide-editor/charts/chart-data.ts
function markdownToPlainChartText(value) {
  return value.replace(/\r\n?/g, "\n").split("\n").map(
    (line) => line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^\s{0,3}>\s?/, "").replace(/^\s*[-+*]\s+/, "")
  ).join("\n").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`([^`\n]+)`/g, "$1").replace(/~~([^~\n]+)~~/g, "$1").replace(/(^|[^\w])(\*\*|__)([^*\n_]+)\2(?=$|[^\w])/g, "$1$3").replace(/(^|[^\w])([*_])([^*\n_]+)\2(?=$|[^\w])/g, "$1$3").replace(/\\([\\`*_[\]{}()#+\-.!>])/g, "$1").replace(/[ \t]+$/gm, "").trim();
}

// components/slide-editor/text/text-runs.ts
function isLatexTextRun(run) {
  return Boolean(
    run && typeof run === "object" && run.type === "latex" && typeof run.latex === "string"
  );
}
function textRunContent(run) {
  return isLatexTextRun(run) ? run.latex : run.text;
}
function textRunsContent(runs) {
  return runs.map(textRunContent).join("");
}

// components/slide-editor/text/markdown-text.ts
function renderMarkdownTextRuns(runs) {
  const rendered = [];
  for (const run of runs) {
    if (isLatexTextRun(run)) {
      rendered.push(run);
      continue;
    }
    for (const parsed of parseMarkdownText(run.text)) {
      appendRun(rendered, parsed.text, mergeFont(run.font, parsed.style));
    }
  }
  return rendered.length ? rendered : [{ text: " " }];
}
function parseMarkdownText(text) {
  const parsed = [];
  let index = 0;
  while (index < text.length) {
    const strongDelimiter = readDelimiter(text, index, ["**", "__"]);
    if (strongDelimiter) {
      const close = text.indexOf(strongDelimiter, index + strongDelimiter.length);
      if (close > index + strongDelimiter.length) {
        parsed.push({
          text: text.slice(index + strongDelimiter.length, close),
          style: { bold: true }
        });
        index = close + strongDelimiter.length;
        continue;
      }
    }
    const emphasisDelimiter = readDelimiter(text, index, ["*", "_"]);
    if (emphasisDelimiter) {
      const close = text.indexOf(
        emphasisDelimiter,
        index + emphasisDelimiter.length
      );
      if (close > index + emphasisDelimiter.length) {
        parsed.push({
          text: text.slice(index + emphasisDelimiter.length, close),
          style: { italic: true }
        });
        index = close + emphasisDelimiter.length;
        continue;
      }
    }
    const next = nextDelimiterIndex(text, index + 1);
    parsed.push({
      text: text.slice(index, next === -1 ? text.length : next),
      style: {}
    });
    index = next === -1 ? text.length : next;
  }
  return parsed;
}
function readDelimiter(text, index, delimiters) {
  return delimiters.find((delimiter) => text.startsWith(delimiter, index));
}
function nextDelimiterIndex(text, from) {
  const indexes = ["**", "__", "*", "_"].map((delimiter) => text.indexOf(delimiter, from)).filter((candidate) => candidate !== -1);
  return indexes.length ? Math.min(...indexes) : -1;
}
function mergeFont(font2, style) {
  if (!style.bold && !style.italic) return font2;
  return {
    ...font2 ?? {},
    ...style.bold ? { bold: true } : {},
    ...style.italic ? { italic: true } : {}
  };
}
function appendRun(runs, text, font2) {
  if (!text) return;
  const previous = runs[runs.length - 1];
  if (previous && !isLatexTextRun(previous) && sameFont(previous.font, font2)) {
    previous.text += text;
    return;
  }
  runs.push(font2 ? { text, font: font2 } : { text });
}
function sameFont(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

// lib/math.ts
import katex from "katex";
var MAX_MATH_LATEX_LENGTH = 4e3;
function normalizeMathLatex(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_MATH_LATEX_LENGTH);
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}
function renderMathHtml(latex, options = {}) {
  const normalized = normalizeMathLatex(latex);
  if (!normalized) return "";
  return katex.renderToString(normalized, {
    displayMode: options.displayMode ?? true,
    output: options.output ?? "htmlAndMathml",
    strict: "warn",
    throwOnError: false,
    trust: false
  });
}

// components/slide-editor/text/template-v2-text.ts
var TEXT_AVERAGE_CHAR_EM = 0.5;
var DEFAULT_FONT = {
  family: "Arial",
  size: 18,
  color: "#111827",
  bold: false,
  italic: false,
  underline: false,
  lineHeight: 1.15,
  letterSpacing: 0,
  opacity: 1
};
var renderTextMeasureCanvas = null;
function withoutFontWrap(font2) {
  return Object.fromEntries(
    Object.entries(font2).filter(([key]) => key !== "wrap")
  );
}
function displayText(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/_(.*?)_/g, "$1");
}
function rawFont(element) {
  const font2 = asRecord(element.font) ?? {};
  return fontFromRecord(font2, DEFAULT_FONT);
}
function fontFromRecord(font2, fallback) {
  return {
    family: readString(font2?.family) ?? fallback.family,
    size: readNumber(font2?.size) ?? fallback.size,
    color: readString(font2?.color) ?? fallback.color,
    bold: readBoolean(font2?.bold) ?? fallback.bold,
    italic: readBoolean(font2?.italic) ?? fallback.italic,
    underline: readBoolean(font2?.underline) ?? (readString(font2?.text_decoration) === "underline" || readString(font2?.textDecoration) === "underline" ? true : fallback.underline),
    lineHeight: readNumber(font2?.line_height) ?? readNumber(font2?.lineHeight) ?? fallback.lineHeight,
    letterSpacing: readNumber(font2?.letter_spacing) ?? readNumber(font2?.letterSpacing) ?? fallback.letterSpacing,
    opacity: readNumber(font2?.opacity) ?? fallback.opacity
  };
}
function fontToSource(font2) {
  return {
    family: font2.family,
    size: font2.size,
    color: font2.color,
    bold: font2.bold,
    italic: font2.italic,
    underline: font2.underline,
    line_height: font2.lineHeight,
    letter_spacing: font2.letterSpacing,
    opacity: font2.opacity
  };
}
function normalizeRawTextMarkdownElement(element) {
  const originalSourceRuns = rawSourceTextRuns(element);
  const rawText = rawStoredTextContent(element);
  const hasSourceRuns = rawTextHasRuns(element);
  const reconciledSourceRuns = reconcileTextRunsWithStoredText(
    originalSourceRuns,
    rawText
  );
  const sourceRuns = reconciledSourceRuns;
  const renderedRuns = renderMarkdownTextRuns(sourceRuns);
  const renderedText = textRunsContent(renderedRuns);
  const sourceHasMarkdown = sourceRuns.some(
    (run) => !isLatexTextRun(run) && containsMarkdownSyntax(run.text)
  );
  const runsChanged = !sameTextRuns(originalSourceRuns, sourceRuns);
  const renderedRunsChanged = !sameTextRuns(sourceRuns, renderedRuns);
  const changed = runsChanged || renderedRunsChanged || sourceHasMarkdown || (!hasSourceRuns || containsMarkdownSyntax(rawText)) && rawText !== renderedText;
  return {
    element: changed ? setRawTextRunsContent(element, renderedRuns) : element,
    runs: renderedRuns,
    changed
  };
}
function rawTextContent(element) {
  const runs = readArray(element.runs);
  if (runs.length > 0) {
    const content = runs.map(rawRunRecordContent).join("");
    if (content) return content;
  }
  return rawStoredTextContent(element);
}
function rawStoredTextContent(element) {
  const text = readString(element.text);
  if (text != null) return text;
  return "";
}
function rawSourceTextRuns(element) {
  const fallbackFont = fontToSource(rawFont(element));
  const runs = readArray(element.runs).map((run) => rawRunRecordToTextRun(run, rawFont(element))).filter(Boolean);
  return runs.length > 0 ? runs : [{ text: rawTextContent(element) || " ", font: fallbackFont }];
}
function rawTextHasRuns(element) {
  return readArray(element.runs).some((run) => {
    const record = asRecord(run);
    return Boolean(rawRunRecordContent(record));
  });
}
function setRawTextRunsContent(element, runs) {
  const storageRuns = stripPlainTextListMarkersFromRuns(runs);
  const sourceRuns = readArray(element.runs);
  const nextRuns = (storageRuns.length > 0 ? storageRuns : [{ text: " " }]).map(
    (run, index) => {
      const sourceRun = asRecord(sourceRuns[index]) ?? {};
      if (isLatexTextRun(run)) {
        return {
          ...sourceRun,
          type: "latex",
          text: void 0,
          latex: run.latex,
          display_mode: run.display_mode ?? false,
          displayMode: void 0,
          font: rawInlineTextFontRecord(run.font, sourceRun.font)
        };
      }
      return {
        ...sourceRun,
        type: void 0,
        latex: void 0,
        display_mode: void 0,
        displayMode: void 0,
        text: run.text,
        font: rawInlineTextFontRecord(run.font, sourceRun.font)
      };
    }
  );
  return {
    ...element,
    text: textRunsContent(nextRuns),
    runs: nextRuns
  };
}
function rawInlineTextFontRecord(value, fallback) {
  const font2 = asRecord(value);
  if (!font2) return fallback;
  const fallbackFont = asRecord(fallback) ?? {};
  return {
    ...withoutFontWrap(fallbackFont),
    ...withoutFontWrap(font2),
    line_height: font2.line_height ?? font2.lineHeight,
    letter_spacing: font2.letter_spacing ?? font2.letterSpacing,
    opacity: font2.opacity
  };
}
function measureNoWrapTextWidth(text, font2) {
  const lines = text.split(/\r?\n/);
  return Math.max(1, ...lines.map((line) => measureRenderText(line, font2)));
}
function rawRunRecordToTextRun(value, fallback) {
  const record = asRecord(value);
  if (!record) return null;
  if (readString(record.type) === "latex") {
    const latex = normalizeMathLatex(record.latex);
    if (!latex) return null;
    return {
      type: "latex",
      latex,
      display_mode: readBoolean(record.display_mode ?? record.displayMode) ?? false,
      font: fontToSource(fontFromRecord(asRecord(record.font), fallback))
    };
  }
  const text = readString(record.text) ?? "";
  if (!text) return null;
  return {
    text,
    font: fontToSource(fontFromRecord(asRecord(record.font), fallback))
  };
}
function rawRunRecordContent(value) {
  const record = asRecord(value);
  if (!record) return "";
  return readString(record.type) === "latex" ? normalizeMathLatex(record.latex) : readString(record.text) ?? "";
}
function splitTextRunsOnNewlines(runs) {
  const lines = [[]];
  for (const run of runs) {
    if (isLatexTextRun(run)) {
      lines[lines.length - 1].push(cloneTextRun(run));
      continue;
    }
    const parts = (run.text || "").split(/\r?\n/);
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (!part) return;
      lines[lines.length - 1].push({
        ...run,
        text: part,
        font: run.font ? { ...run.font } : void 0
      });
    });
  }
  return lines;
}
function stripPlainTextListMarkersFromRuns(runs) {
  const lines = splitTextRunsOnNewlines(runs);
  const stripped = [];
  lines.forEach((line, index) => {
    const normalizedLine = stripTextListMarkerFromRuns(line);
    const lineFont = normalizedLine[0]?.font ?? line[0]?.font ?? stripped.at(-1)?.font;
    if (index > 0) appendTextRun(stripped, "\n", lineFont);
    normalizedLine.forEach((run) => {
      if (isLatexTextRun(run)) stripped.push(cloneTextRun(run));
      else appendTextRun(stripped, run.text, run.font);
    });
  });
  return stripped.length > 0 ? stripped : [{ text: " " }];
}
function stripTextListMarkerFromRuns(runs) {
  const marker = textRunsContent(runs).match(
    /^\s*(?:[-*•]\s+|\d+[.)]\s+)/u
  )?.[0];
  if (!marker) return runs;
  return removeTextRunPrefix(runs, marker.length);
}
function removeTextRunPrefix(runs, length) {
  let remaining = length;
  const stripped = [];
  for (const run of runs) {
    if (isLatexTextRun(run)) {
      stripped.push(cloneTextRun(run));
      continue;
    }
    if (remaining <= 0) {
      stripped.push(cloneTextRun(run));
      continue;
    }
    const text = run.text ?? "";
    if (text.length <= remaining) {
      remaining -= text.length;
      continue;
    }
    const consumed = remaining;
    remaining = 0;
    stripped.push({
      ...run,
      text: text.slice(consumed),
      font: run.font ? { ...run.font } : void 0
    });
  }
  return stripped;
}
function appendTextRun(runs, text, font2) {
  if (!text) return;
  const previous = runs[runs.length - 1];
  if (previous && !isLatexTextRun(previous) && JSON.stringify(previous.font ?? null) === JSON.stringify(font2 ?? null)) {
    previous.text += text;
    return;
  }
  runs.push(font2 ? { text, font: { ...font2 } } : { text });
}
function reconcileTextRunsWithStoredText(runs, storedText) {
  if (runs.some(isLatexTextRun)) return runs;
  if (!storedText || runs.length === 0) return runs;
  if (containsMarkdownSyntax(storedText)) return runs;
  if (textRunsContent(runs) === storedText) return runs;
  const reconciled = [];
  let cursor = 0;
  for (const run of runs) {
    if (isLatexTextRun(run)) continue;
    const runText = run.text ?? "";
    if (!runText) continue;
    const index = storedText.indexOf(runText, cursor);
    if (index < 0) return runs;
    const gap = storedText.slice(cursor, index);
    appendRunText(reconciled, gap, run.font);
    reconciled.push(cloneTextRun(run));
    cursor = index + runText.length;
  }
  appendRunText(
    reconciled,
    storedText.slice(cursor),
    runs[runs.length - 1]?.font
  );
  return textRunsContent(reconciled) === storedText ? reconciled : runs;
}
function appendRunText(runs, text, font2) {
  if (!text) return;
  const previous = runs[runs.length - 1];
  if (previous && !isLatexTextRun(previous)) {
    previous.text += text;
    return;
  }
  runs.push(font2 ? { text, font: { ...font2 } } : { text });
}
function cloneTextRun(run) {
  return {
    ...run,
    font: run.font ? { ...run.font } : void 0
  };
}
function containsMarkdownSyntax(text) {
  return /(\*\*|__|\*|_).+(\*\*|__|\*|_)/.test(text);
}
function sameTextRuns(left, right) {
  if (left.length !== right.length) return false;
  return left.every(
    (run, index) => {
      const other = right[index];
      if (!other) return false;
      return JSON.stringify(run) === JSON.stringify(other) || textRunContent(run) === textRunContent(other) && JSON.stringify(run.font ?? null) === JSON.stringify(other.font ?? null);
    }
  );
}
function richFontCss(font2) {
  const italic = font2.italic ? "italic " : "";
  const weight = font2.bold ? "700 " : "400 ";
  return `${italic}${weight}${font2.size}px ${quotedFontFamily(font2.family)}, Helvetica, sans-serif`;
}
function quotedFontFamily(family) {
  const name = (family || DEFAULT_FONT.family).trim() || DEFAULT_FONT.family;
  return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function measureRenderText(text, font2) {
  const fallbackWidth = text.length * font2.size * (font2.bold ? 0.58 : TEXT_AVERAGE_CHAR_EM);
  if (typeof document === "undefined") return fallbackWidth;
  renderTextMeasureCanvas ??= document.createElement("canvas");
  const context = renderTextMeasureCanvas.getContext("2d");
  if (!context) return fallbackWidth;
  context.font = richFontCss(font2);
  return context.measureText(text).width + (font2.letterSpacing ?? 0) * Math.max(0, text.length - 1);
}
function readArray(value) {
  return Array.isArray(value) ? value : [];
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function readString(value) {
  return typeof value === "string" ? value : null;
}
function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

// components/slide-editor/layout/wrappedFlexLayout.ts
function layoutWrappedFlexChildren({
  align,
  alignSelf,
  alignmentOffset: alignmentOffset2,
  availableCross,
  availableMain,
  childCrossSize: childCrossSize2,
  children,
  clampLayoutSize: clampLayoutSize2,
  crossGap,
  direction,
  elementBox,
  flexBasis: flexBasis2,
  isManualPositioned,
  justify,
  layoutNumber: layoutNumber2,
  mainGap,
  padding
}) {
  const isColumn = direction === "column";
  const lines = [];
  const manual = /* @__PURE__ */ new Map();
  children.forEach((child, index) => {
    if (isManualPositioned(child)) {
      manual.set(index, {
        child,
        index,
        box: elementBox(child),
        layoutManaged: false
      });
      return;
    }
    const basis = Math.max(0, flexBasis2(child, direction, availableCross));
    let line = lines.at(-1);
    if (!line) {
      line = [];
      lines.push(line);
    }
    const used = line.reduce((sum, entry) => sum + entry.basis, 0) + mainGap * line.length;
    if (line.length > 0 && used + basis > availableMain) {
      line = [];
      lines.push(line);
    }
    line.push({ basis, child, index });
  });
  if (lines.length === 0) {
    return children.map(
      (child, index) => manual.get(index) ?? {
        child,
        index,
        box: elementBox(child),
        layoutManaged: false
      }
    );
  }
  const naturalLineCrosses = lines.map(
    (line) => Math.max(
      1,
      ...line.map((entry) => {
        const itemAlignment = alignSelf(entry.child) ?? align;
        return childCrossSize2(
          entry.child,
          direction,
          availableCross,
          itemAlignment
        );
      })
    )
  );
  const crossGapTotal = crossGap * Math.max(0, lines.length - 1);
  const usedNaturalCross = naturalLineCrosses.reduce((sum, lineCross) => sum + lineCross, 0) + crossGapTotal;
  const extraCross = Math.max(0, availableCross - usedNaturalCross);
  const lineCrosses = naturalLineCrosses.map(
    (lineCross) => lineCross + extraCross / lines.length
  );
  const laidOut = /* @__PURE__ */ new Map();
  let crossCursor = 0;
  lines.forEach((line, lineNumber) => {
    const lineCross = lineCrosses[lineNumber] ?? 1;
    const gapTotal = mainGap * Math.max(0, line.length - 1);
    const free = availableMain - gapTotal - line.reduce((sum, entry) => sum + entry.basis, 0);
    let mainSizes = line.map((entry) => entry.basis);
    const grows = line.map(
      (entry) => layoutNumber2(entry.child, "grow") ?? (entry.basis > 0 ? 0 : 1)
    );
    const growTotal = grows.reduce((sum, grow) => sum + grow, 0);
    if (free > 0 && growTotal > 0) {
      mainSizes = mainSizes.map(
        (size, index) => size + free * grows[index] / growTotal
      );
    } else if (free > 0 && justify === "stretch") {
      mainSizes = mainSizes.map((size) => size + free / line.length);
    }
    const usedMain = mainSizes.reduce((sum, size) => sum + size, 0) + gapTotal;
    let mainCursor = alignmentOffset2(justify, availableMain, usedMain);
    line.forEach((entry, lineIndex) => {
      const main = clampLayoutSize2(
        mainSizes[lineIndex],
        entry.child,
        isColumn ? "height" : "width"
      );
      const itemAlignment = alignSelf(entry.child) ?? align;
      const cross = childCrossSize2(
        entry.child,
        direction,
        lineCross,
        itemAlignment
      );
      const crossOffset = alignmentOffset2(
        itemAlignment,
        lineCross,
        cross
      );
      const box = isColumn ? {
        x: padding.left + crossCursor + crossOffset,
        y: padding.top + mainCursor,
        width: cross,
        height: main
      } : {
        x: padding.left + mainCursor,
        y: padding.top + crossCursor + crossOffset,
        width: main,
        height: cross
      };
      laidOut.set(entry.index, {
        child: entry.child,
        index: entry.index,
        box,
        layoutManaged: true
      });
      mainCursor += main + mainGap;
    });
    crossCursor += lineCross + crossGap;
  });
  return children.map(
    (child, index) => manual.get(index) ?? laidOut.get(index) ?? {
      child,
      index,
      box: elementBox(child),
      layoutManaged: false
    }
  );
}

// components/slide-editor/layout/flowLayout.ts
var TEXT_AVERAGE_CHAR_EM2 = 0.5;
var DECORATIVE_LINE_LENGTH = 80;
var DECORATIVE_LINE_THICKNESS = 4;
function flowLayoutKind(element) {
  const type = readString2(element.type);
  if (type === "flex" || type === "list-view") return "flex";
  if (type === "grid" || type === "grid-view") return "grid";
  return null;
}
function layoutFlowChildren(parent, children, parentBox, deps) {
  const kind = flowLayoutKind(parent);
  if (kind === "grid") {
    return layoutGridChildren(parent, children, parentBox, deps);
  }
  if (kind === "flex") {
    return layoutFlexChildren(parent, children, parentBox, deps);
  }
  return children.map((child, index) => ({
    child,
    index,
    box: null,
    layoutManaged: false
  }));
}
function intrinsicFlowSize(parent, children, deps) {
  const kind = flowLayoutKind(parent);
  if (kind === "flex") {
    return intrinsicFlexSize(parent, children, deps);
  }
  if (kind === "grid") {
    return intrinsicGridSize(parent, children, deps);
  }
  return { width: 1, height: 1 };
}
function flexBasis(child, direction, crossSize, deps) {
  const dimension = direction === "row" ? "width" : "height";
  const explicit = layoutNumber(child, "basis") ?? readOptionalSize(child.size)?.[dimension];
  if (explicit != null && explicit > 0) {
    return clampLayoutSize(explicit, child, dimension);
  }
  if (isFramelessDecorativeShape(child)) {
    return DECORATIVE_LINE_THICKNESS;
  }
  if (readString2(child.type) === "text") {
    return clampLayoutSize(
      intrinsicTextMainSize(child, direction, crossSize),
      child,
      dimension
    );
  }
  const inferred = deps.elementSize(child);
  const size = direction === "row" ? inferred.width : inferred.height;
  return size > 1 ? clampLayoutSize(size, child, dimension) : 0;
}
function childCrossSize(child, direction, crossSize, alignItems, deps) {
  const dimension = direction === "row" ? "height" : "width";
  const alignSelf = readString2(child.layout?.align_self) ?? readString2(child.layout?.alignSelf);
  if (isFramelessDecorativeShape(child)) {
    return clampLayoutSize(
      Math.min(crossSize, DECORATIVE_LINE_LENGTH),
      child,
      dimension
    );
  }
  if (alignItems === "stretch" && alignSelf == null) {
    return crossSize;
  }
  const explicit = readOptionalSize(child.size)?.[dimension];
  const inferred = deps.elementSize(child, {
    width: direction === "row" ? 1 : crossSize,
    height: direction === "row" ? crossSize : 1
  })[dimension];
  return clampLayoutSize(explicit ?? inferred ?? crossSize, child, dimension, crossSize);
}
function placeGridChildren(children, columns, declaredRows) {
  const occupied = /* @__PURE__ */ new Set();
  const placements = [];
  let rowLimit = Math.max(1, declaredRows ?? Math.ceil(children.length / columns));
  children.forEach((child) => {
    const columnSpan = Math.min(
      columns,
      Math.max(1, Math.floor(layoutNumber(child, "columnSpan", "column_span") ?? 1))
    );
    const rowSpan = Math.max(
      1,
      Math.floor(layoutNumber(child, "rowSpan", "row_span") ?? 1)
    );
    let placedRow = 0;
    let placedCol = 0;
    while (true) {
      let placed = false;
      for (let row = 0; row < rowLimit && !placed; row += 1) {
        for (let col = 0; col <= columns - columnSpan; col += 1) {
          if (gridAreaOpen(occupied, row, col, rowSpan, columnSpan)) {
            placed = true;
            placedRow = row;
            placedCol = col;
            break;
          }
        }
      }
      if (placed) break;
      rowLimit += 1;
    }
    markGridArea(occupied, placedRow, placedCol, rowSpan, columnSpan);
    placements.push({
      col: placedCol,
      row: placedRow,
      columnSpan,
      rowSpan
    });
  });
  return placements;
}
function layoutFlexChildren(parent, children, parentBox, deps) {
  if (children.length === 0) return [];
  const padding = readPadding(parent.padding);
  const direction = readString2(parent.direction) === "row" ? "row" : "column";
  const isColumn = direction === "column";
  const mainGap = (isColumn ? readNumber2(parent.row_gap) ?? readNumber2(parent.rowGap) : readNumber2(parent.column_gap) ?? readNumber2(parent.columnGap)) ?? readNumber2(parent.gap) ?? 0;
  const align = readString2(parent.align_items) ?? readString2(parent.alignItems) ?? "stretch";
  const justify = readString2(parent.justify_content) ?? readString2(parent.justifyContent) ?? "flex-start";
  const availableW = Math.max(1, parentBox.width - padding.left - padding.right);
  const availableH = Math.max(1, parentBox.height - padding.top - padding.bottom);
  const availableMain = isColumn ? availableH : availableW;
  const availableCross = isColumn ? availableW : availableH;
  if (parent.wrap === true) {
    const crossGap = (isColumn ? readNumber2(parent.column_gap) ?? readNumber2(parent.columnGap) : readNumber2(parent.row_gap) ?? readNumber2(parent.rowGap)) ?? readNumber2(parent.gap) ?? 0;
    return layoutWrappedFlexChildren({
      align,
      alignSelf: (child) => readString2(child.layout?.align_self) ?? readString2(child.layout?.alignSelf),
      alignmentOffset,
      availableCross,
      availableMain,
      childCrossSize: (child, childDirection, crossSize, alignment) => childCrossSize(child, childDirection, crossSize, alignment, deps),
      children,
      clampLayoutSize,
      crossGap,
      direction,
      elementBox: deps.elementBox,
      flexBasis: (child, childDirection, crossSize) => flexBasis(child, childDirection, crossSize, deps),
      isManualPositioned: deps.isManualPositioned,
      justify,
      layoutNumber,
      mainGap,
      padding
    });
  }
  const bases = children.map(
    (child) => deps.isManualPositioned(child) ? isColumn ? deps.elementBox(child).height : deps.elementBox(child).width : flexBasis(child, direction, availableCross, deps)
  );
  const gapTotal = mainGap * Math.max(0, children.length - 1);
  const freeBeforeFlex = Math.max(1, availableMain - gapTotal) - bases.reduce((sum, size) => sum + Math.max(0, size), 0);
  let mainSizes = bases.map((basis) => Math.max(0, basis));
  const grows = children.map(
    (child, index) => deps.isManualPositioned(child) ? 0 : layoutNumber(child, "grow") ?? (bases[index] > 0 ? 0 : 1)
  );
  const growTotal = grows.reduce((sum, grow) => sum + grow, 0);
  if (freeBeforeFlex > 0 && growTotal > 0) {
    mainSizes = mainSizes.map(
      (size, index) => size + freeBeforeFlex * grows[index] / growTotal
    );
  } else if (freeBeforeFlex > 0 && justify === "stretch") {
    const flexibleCount = Math.max(
      1,
      children.filter((child) => !deps.isManualPositioned(child)).length
    );
    mainSizes = mainSizes.map(
      (size, index) => deps.isManualPositioned(children[index]) ? size : size + freeBeforeFlex / flexibleCount
    );
  }
  const usedMain = mainSizes.reduce((sum, size) => sum + size, 0) + mainGap * Math.max(0, children.length - 1);
  let cursor = alignmentOffset(justify, availableMain, usedMain);
  return children.map((child, index) => {
    const raw = deps.elementBox(child);
    if (deps.isManualPositioned(child)) {
      cursor += (isColumn ? raw.height : raw.width) + mainGap;
      return { child, index, box: raw, layoutManaged: false };
    }
    const main = clampLayoutSize(mainSizes[index], child, isColumn ? "height" : "width");
    const cross = childCrossSize(child, direction, availableCross, align, deps);
    const alignSelf = readString2(child.layout?.align_self) ?? readString2(child.layout?.alignSelf);
    const crossOffset = alignmentOffset(alignSelf ?? align, availableCross, cross);
    const box = isColumn ? {
      x: padding.left + crossOffset,
      y: padding.top + cursor,
      width: cross,
      height: main
    } : {
      x: padding.left + cursor,
      y: padding.top + crossOffset,
      width: main,
      height: cross
    };
    cursor += main + mainGap;
    return { child, index, box, layoutManaged: true };
  });
}
function layoutGridChildren(parent, children, parentBox, deps) {
  const padding = readPadding(parent.padding);
  const gap = readNumber2(parent.gap) ?? 0;
  const columnGap = readNumber2(parent.column_gap) ?? readNumber2(parent.columnGap) ?? gap;
  const rowGap = readNumber2(parent.row_gap) ?? readNumber2(parent.rowGap) ?? gap;
  const explicitColumns = readArray2(parent.columns);
  const explicitRows = readArray2(parent.rows);
  const columnCount = readNumber2(parent.columns) ?? (explicitColumns.length > 0 ? explicitColumns.length : 1);
  const safeColumns = Math.max(1, Math.floor(columnCount));
  const declaredRows = readNumber2(parent.rows) ?? (explicitRows.length > 0 ? explicitRows.length : null);
  const placements = placeGridChildren(children, safeColumns, declaredRows);
  const rowCount = Math.max(
    declaredRows ?? 1,
    ...placements.map((placement) => placement.row + placement.rowSpan)
  );
  const rowSizingCount = Math.max(1, Math.floor(declaredRows ?? rowCount));
  const availableW = Math.max(1, parentBox.width - padding.left - padding.right);
  const availableH = Math.max(1, parentBox.height - padding.top - padding.bottom);
  const cellW = Math.max(1, (availableW - columnGap * (safeColumns - 1)) / safeColumns);
  const cellH = Math.max(
    1,
    (availableH - rowGap * Math.max(0, rowSizingCount - 1)) / rowSizingCount
  );
  return children.map((child, index) => {
    const raw = deps.elementBox(child);
    if (deps.isManualPositioned(child)) {
      return { child, index, box: raw, layoutManaged: false };
    }
    const placement = placements[index];
    const area = {
      x: padding.left + placement.col * (cellW + columnGap),
      y: padding.top + placement.row * (cellH + rowGap),
      width: cellW * placement.columnSpan + columnGap * (placement.columnSpan - 1),
      height: cellH * placement.rowSpan + rowGap * (placement.rowSpan - 1)
    };
    const justify = readString2(child.layout?.align_self) ?? readString2(child.layout?.alignSelf) ?? readString2(parent.justify_items) ?? readString2(parent.justifyItems) ?? "stretch";
    const align = readString2(child.layout?.align_self) ?? readString2(child.layout?.alignSelf) ?? readString2(parent.align_items) ?? readString2(parent.alignItems) ?? "stretch";
    const width = justify === "stretch" ? area.width : clampLayoutSize(raw.width, child, "width", area.width);
    const height = align === "stretch" ? area.height : clampLayoutSize(raw.height, child, "height", area.height);
    return {
      child,
      index,
      box: {
        x: area.x + alignmentOffset(justify, area.width, width),
        y: area.y + alignmentOffset(align, area.height, height),
        width,
        height
      },
      layoutManaged: true
    };
  });
}
function intrinsicFlexSize(parent, children, deps) {
  const padding = readPadding(parent.padding);
  if (children.length === 0) {
    return {
      width: Math.max(1, padding.left + padding.right),
      height: Math.max(1, padding.top + padding.bottom)
    };
  }
  const direction = readString2(parent.direction) === "row" ? "row" : "column";
  const isColumn = direction === "column";
  const mainGap = (isColumn ? readNumber2(parent.row_gap) ?? readNumber2(parent.rowGap) : readNumber2(parent.column_gap) ?? readNumber2(parent.columnGap)) ?? readNumber2(parent.gap) ?? 0;
  let main = 0;
  let cross = 0;
  children.forEach((child) => {
    const size = intrinsicFlowChildSize(child, deps);
    main += isColumn ? size.height : size.width;
    cross = Math.max(cross, isColumn ? size.width : size.height);
  });
  main += mainGap * Math.max(0, children.length - 1);
  return {
    width: Math.max(1, padding.left + padding.right + (isColumn ? cross : main)),
    height: Math.max(1, padding.top + padding.bottom + (isColumn ? main : cross))
  };
}
function intrinsicGridSize(parent, children, deps) {
  const padding = readPadding(parent.padding);
  if (children.length === 0) {
    return {
      width: Math.max(1, padding.left + padding.right),
      height: Math.max(1, padding.top + padding.bottom)
    };
  }
  const gap = readNumber2(parent.gap) ?? 0;
  const columnGap = readNumber2(parent.column_gap) ?? readNumber2(parent.columnGap) ?? gap;
  const rowGap = readNumber2(parent.row_gap) ?? readNumber2(parent.rowGap) ?? gap;
  const explicitColumns = readArray2(parent.columns);
  const explicitRows = readArray2(parent.rows);
  const columnCount = readNumber2(parent.columns) ?? (explicitColumns.length > 0 ? explicitColumns.length : 1);
  const columns = Math.max(1, Math.floor(columnCount));
  const declaredRows = readNumber2(parent.rows) ?? (explicitRows.length > 0 ? explicitRows.length : null);
  const placements = placeGridChildren(children, columns, declaredRows);
  const rows = Math.max(
    declaredRows ?? 1,
    ...placements.map((placement) => placement.row + placement.rowSpan)
  );
  const columnWidths = Array.from({ length: columns }, () => 1);
  const rowHeights = Array.from({ length: rows }, () => 1);
  children.forEach((child, index) => {
    const placement = placements[index];
    if (!placement) return;
    const size = intrinsicFlowChildSize(child, deps);
    const widthShare = (size.width - columnGap * Math.max(0, placement.columnSpan - 1)) / placement.columnSpan;
    const heightShare = (size.height - rowGap * Math.max(0, placement.rowSpan - 1)) / placement.rowSpan;
    for (let column = placement.col; column < placement.col + placement.columnSpan; column += 1) {
      columnWidths[column] = Math.max(columnWidths[column], widthShare);
    }
    for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
      rowHeights[row] = Math.max(rowHeights[row], heightShare);
    }
  });
  return {
    width: Math.max(
      1,
      padding.left + padding.right + columnWidths.reduce((sum, width) => sum + Math.max(1, width), 0) + columnGap * Math.max(0, columns - 1)
    ),
    height: Math.max(
      1,
      padding.top + padding.bottom + rowHeights.reduce((sum, height) => sum + Math.max(1, height), 0) + rowGap * Math.max(0, rows - 1)
    )
  };
}
function intrinsicFlowChildSize(child, deps) {
  const box = deps.isManualPositioned(child) ? deps.elementBox(child) : null;
  if (box) {
    return {
      width: Math.max(1, box.width),
      height: Math.max(1, box.height)
    };
  }
  return deps.elementSize(child);
}
function intrinsicTextMainSize(child, direction, crossSize) {
  const font2 = rawFont(child);
  const text = displayText(rawTextContent(child));
  if (direction === "row") {
    return Math.max(1, estimateTextWidth(text, font2));
  }
  const explicitWidth = readOptionalSize(child.size)?.width;
  const width = Math.max(1, explicitWidth ?? crossSize);
  return Math.max(1, estimateTextHeight(text, font2, width));
}
function estimateTextWidth(text, font2) {
  return Math.max(font2.size, measureNoWrapTextWidth(text, font2));
}
function estimateTextHeight(text, font2, width) {
  const lineHeight = font2.size * font2.lineHeight;
  const averageCharWidth = Math.max(1, font2.size * TEXT_AVERAGE_CHAR_EM2);
  const charsPerLine = Math.max(1, Math.floor(width / averageCharWidth));
  const lines = text.split(/\r?\n/).reduce((count, line) => {
    return count + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
  return Math.max(lineHeight, lines * lineHeight);
}
function gridAreaOpen(occupied, row, col, rowSpan, columnSpan) {
  for (let r = row; r < row + rowSpan; r += 1) {
    for (let c = col; c < col + columnSpan; c += 1) {
      if (occupied.has(`${r}:${c}`)) return false;
    }
  }
  return true;
}
function markGridArea(occupied, row, col, rowSpan, columnSpan) {
  for (let r = row; r < row + rowSpan; r += 1) {
    for (let c = col; c < col + columnSpan; c += 1) {
      occupied.add(`${r}:${c}`);
    }
  }
}
function isFramelessDecorativeShape(child) {
  if (readOptionalSize(child.size) || asRecord2(child.position)) return false;
  if (readString2(child.type) !== "vector") return false;
  if (readString2(child.shape) === "ellipse") return false;
  const points = readArray2(child.points);
  return points.length === 2 && child.closed !== true;
}
function clampLayoutSize(size, child, dimension, fallback = 1) {
  const value = Number.isFinite(size) && size > 0 ? size : fallback;
  const min = dimension === "width" ? layoutNumber(child, "minWidth", "min_width") : layoutNumber(child, "minHeight", "min_height");
  const max = dimension === "width" ? layoutNumber(child, "maxWidth", "max_width") : layoutNumber(child, "maxHeight", "max_height");
  return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? 1, value));
}
function layoutNumber(child, ...keys) {
  const layout = asRecord2(child.layout);
  for (const key of keys) {
    const value = readNumber2(layout?.[key]);
    if (value != null) return value;
  }
  return null;
}
function alignmentOffset(alignment, available, used) {
  const free = Math.max(0, available - used);
  if (alignment === "center") return free / 2;
  if (alignment === "right" || alignment === "bottom" || alignment === "end" || alignment === "flex-end") {
    return free;
  }
  return 0;
}
function readOptionalSize(value) {
  const record = asRecord2(value);
  const width = readNumber2(record?.width);
  const height = readNumber2(record?.height);
  if (width == null || height == null) return null;
  return {
    width: Math.max(1, width),
    height: Math.max(1, height)
  };
}
function readPadding(value) {
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }
  const record = asRecord2(value);
  const x = readNumber2(record?.x) ?? readNumber2(record?.horizontal);
  const y = readNumber2(record?.y) ?? readNumber2(record?.vertical);
  return {
    top: readNumber2(record?.top) ?? y ?? 0,
    right: readNumber2(record?.right) ?? x ?? 0,
    bottom: readNumber2(record?.bottom) ?? y ?? 0,
    left: readNumber2(record?.left) ?? x ?? 0
  };
}
function readArray2(value) {
  return Array.isArray(value) ? value : [];
}
function asRecord2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function readString2(value) {
  return typeof value === "string" ? value : null;
}
function readNumber2(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// lib/svg-color.ts
var SVG_UPDATE_ROUTE = "/api/update-svg";
var UNSAFE_SVG_VALUE_CHARS = /["'<>`{};\r\n]/;
var HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
var BARE_HEX_COLOR_PATTERN = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
var CSS_COLOR_FUNCTION_PATTERN = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|var|calc)\(.+\)$/i;
var SVG_KEYWORD_PATTERN = /^[a-z-]+$/i;
var SVG_NUMBERISH_PATTERN = /^-?(?:\d+\.?\d*|\d*\.?\d+)(?:%|px|em|rem|pt|pc|cm|mm|in)?$/i;
var VALID_STROKE_LINECAP_VALUES = /* @__PURE__ */ new Set([
  "butt",
  "round",
  "square",
  "inherit"
]);
var VALID_STROKE_LINEJOIN_VALUES = /* @__PURE__ */ new Set([
  "miter",
  "miter-clip",
  "round",
  "bevel",
  "arcs",
  "inherit"
]);
var SVG_UPDATE_QUERY_KEYS = [
  "color",
  "stroke",
  "fill",
  "strokeWidth",
  "opacity",
  "strokeOpacity",
  "fillOpacity",
  "strokeLinecap",
  "strokeLinejoin"
];
var getMergedInput = (incomingValue, existingValue) => {
  if (incomingValue === void 0) {
    return existingValue;
  }
  return incomingValue;
};
var normalizeSvgSourceForTransport = (rawSource, baseUrl) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(rawSource)) {
    return rawSource;
  }
  try {
    return new URL(rawSource, baseUrl).toString();
  } catch {
    return rawSource;
  }
};
var readSvgUpdateParams = (rawSource, baseUrl) => {
  try {
    const parsedUrl = new URL(rawSource, baseUrl);
    if (parsedUrl.pathname !== SVG_UPDATE_ROUTE) {
      return {};
    }
    const output = {};
    for (const key of SVG_UPDATE_QUERY_KEYS) {
      const value = parsedUrl.searchParams.get(key);
      if (value) {
        output[key] = value;
      }
    }
    return output;
  } catch {
    return {};
  }
};
var normalizeSvgColor = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_SVG_VALUE_CHARS.test(trimmed)) {
    return null;
  }
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (BARE_HEX_COLOR_PATTERN.test(trimmed)) {
    return `#${trimmed}`;
  }
  if (CSS_COLOR_FUNCTION_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (SVG_KEYWORD_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return null;
};
var normalizeSvgNumberish = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_SVG_VALUE_CHARS.test(trimmed)) {
    return null;
  }
  return SVG_NUMBERISH_PATTERN.test(trimmed) ? trimmed : null;
};
var normalizeStrokeLinecap = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_STROKE_LINECAP_VALUES.has(normalized) ? normalized : null;
};
var normalizeStrokeLinejoin = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_STROKE_LINEJOIN_VALUES.has(normalized) ? normalized : null;
};
var unwrapSvgUpdateUrl = (rawSource, baseUrl) => {
  let currentSource = rawSource.trim();
  if (!currentSource) {
    return null;
  }
  for (let depth = 0; depth < 5; depth += 1) {
    try {
      const parsedUrl = new URL(currentSource, baseUrl);
      if (parsedUrl.pathname !== SVG_UPDATE_ROUTE) {
        return currentSource;
      }
      const nestedSource = parsedUrl.searchParams.get("url");
      if (!nestedSource) {
        return null;
      }
      currentSource = nestedSource.trim();
      if (!currentSource) {
        return null;
      }
    } catch {
      return currentSource;
    }
  }
  return null;
};
var buildSvgUpdateUrl = (rawSource, baseUrl, options) => {
  const source = unwrapSvgUpdateUrl(rawSource, baseUrl);
  if (!source) {
    return null;
  }
  const transportSource = normalizeSvgSourceForTransport(source, baseUrl);
  const existingParams = readSvgUpdateParams(rawSource, baseUrl);
  const mergedInputs = {
    color: getMergedInput(options.color, existingParams.color),
    stroke: getMergedInput(options.stroke, existingParams.stroke),
    fill: getMergedInput(options.fill, existingParams.fill),
    strokeWidth: getMergedInput(
      options.strokeWidth,
      existingParams.strokeWidth
    ),
    opacity: getMergedInput(options.opacity, existingParams.opacity),
    strokeOpacity: getMergedInput(
      options.strokeOpacity,
      existingParams.strokeOpacity
    ),
    fillOpacity: getMergedInput(
      options.fillOpacity,
      existingParams.fillOpacity
    ),
    strokeLinecap: getMergedInput(
      options.strokeLinecap,
      existingParams.strokeLinecap
    ),
    strokeLinejoin: getMergedInput(
      options.strokeLinejoin,
      existingParams.strokeLinejoin
    )
  };
  const normalizedParams = {
    color: normalizeSvgColor(mergedInputs.color),
    stroke: normalizeSvgColor(mergedInputs.stroke),
    fill: normalizeSvgColor(mergedInputs.fill),
    strokeWidth: normalizeSvgNumberish(mergedInputs.strokeWidth),
    opacity: normalizeSvgNumberish(mergedInputs.opacity),
    strokeOpacity: normalizeSvgNumberish(mergedInputs.strokeOpacity),
    fillOpacity: normalizeSvgNumberish(mergedInputs.fillOpacity),
    strokeLinecap: normalizeStrokeLinecap(mergedInputs.strokeLinecap),
    strokeLinejoin: normalizeStrokeLinejoin(mergedInputs.strokeLinejoin)
  };
  const searchParams = new URLSearchParams();
  searchParams.set("url", transportSource);
  let hasTransforms = false;
  for (const key of SVG_UPDATE_QUERY_KEYS) {
    const value = normalizedParams[key];
    if (value) {
      searchParams.set(key, value);
      hasTransforms = true;
    }
  }
  return hasTransforms || options.forceRoute ? `${SVG_UPDATE_ROUTE}?${searchParams.toString()}` : transportSource;
};

// components/slide-editor/infographics/infographic-icons.ts
var INFOGRAPHIC_EXAMPLE_ICON_URLS = {
  discover: "/static/icons/bold/binoculars-bold.svg",
  define: "/static/icons/bold/target-bold.svg",
  plan: "/static/icons/bold/wrench-bold.svg",
  execute: "/static/icons/bold/megaphone-bold.svg",
  measure: "/static/icons/bold/chart-line-up-bold.svg"
};
var DEFAULT_ICON_URLS = Object.values(INFOGRAPHIC_EXAMPLE_ICON_URLS);

// components/slide-editor/infographics/infographic-editing.ts
function readInfographicRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function normalizeInfographicIcon(value, legacyColor) {
  const record = readInfographicRecord(value);
  const url = typeof value === "string" ? value.trim() : typeof record?.url === "string" ? record.url.trim() : "";
  if (!url) return null;
  const color = typeof record?.color === "string" && record.color.trim() ? record.color : typeof legacyColor === "string" && legacyColor.trim() ? legacyColor : "FFFFFF";
  return { url, color };
}

// lib/chart-browser.ts
var CHART_BROWSER_SCRIPT_URL = "/vendor/chart-4.5.1.umd.min.js";
var CHART_DATALABELS_SCRIPT_URL = "/vendor/chartjs-plugin-datalabels-2.2.0.min.js";

// components/slide-editor/text/local-fonts.ts
var font = (family, category, directory, file, italicFile) => ({
  family,
  sourceUrl: `/vendor/fonts/${category}/${directory}/${file}`,
  ...italicFile ? {
    italicSourceUrl: `/vendor/fonts/${category}/${directory}/${italicFile}`
  } : {}
});
var staticFont = (family, category, directory, files) => {
  const faces = files.map((fileName) => ({
    sourceUrl: `/vendor/fonts/${category}/${directory}/${fileName}`,
    style: /italic/i.test(fileName) ? "italic" : "normal",
    weight: fontWeightFromFileName(fileName)
  }));
  const normalFace = faces.find(
    (face) => face.style === "normal" && face.weight === 400
  ) ?? faces.find((face) => face.style === "normal") ?? faces[0];
  const italicFace = faces.find(
    (face) => face.style === "italic" && face.weight === 400
  );
  return {
    family,
    sourceUrl: normalFace.sourceUrl,
    ...italicFace ? { italicSourceUrl: italicFace.sourceUrl } : {},
    faces
  };
};
function fontWeightFromFileName(fileName) {
  if (/black/i.test(fileName)) return 900;
  if (/extra[-_ ]?bold/i.test(fileName)) return 800;
  if (/semi[-_ ]?bold/i.test(fileName)) return 600;
  if (/bold/i.test(fileName)) return 700;
  if (/medium/i.test(fileName)) return 500;
  if (/extra[-_ ]?light/i.test(fileName)) return 200;
  if (/light/i.test(fileName)) return 300;
  if (/thin/i.test(fileName)) return 100;
  return 400;
}
var LOCAL_FONT_OPTIONS = [
  font("Abril Fatface", "display", "abrilfatface", "AbrilFatface-Regular.ttf"),
  font("Anton", "display", "anton", "Anton-Regular.ttf"),
  font("Archivo Black", "display", "archivoblack", "ArchivoBlack-Regular.ttf"),
  font("Bebas Neue", "display", "bebasneue", "BebasNeue-Regular.ttf"),
  font("Black Ops One", "display", "blackopsone", "BlackOpsOne-Regular.ttf"),
  font("Bungee", "display", "bungee", "Bungee-Regular.ttf"),
  font("Cinzel", "display", "cinzel", "Cinzel[wght].ttf"),
  font("Fugaz One", "display", "fugazone", "FugazOne-Regular.ttf"),
  font("League Spartan", "display", "leaguespartan", "LeagueSpartan[wght].ttf"),
  font("Lilita One", "display", "lilitaone", "LilitaOne-Regular.ttf"),
  font("Oswald", "display", "oswald", "Oswald[wght].ttf"),
  font("Righteous", "display", "righteous", "Righteous-Regular.ttf"),
  font("Russo One", "display", "russoone", "RussoOne-Regular.ttf"),
  font("Staatliches", "display", "staatliches", "Staatliches-Regular.ttf"),
  font("Unbounded", "display", "unbounded", "Unbounded[wght].ttf"),
  font("Architects Daughter", "handwritten", "architectsdaughter", "ArchitectsDaughter-Regular.ttf"),
  font("Caveat", "handwritten", "caveat", "Caveat[wght].ttf"),
  font("Coming Soon", "handwritten", "comingsoon", "ComingSoon-Regular.ttf"),
  font("Gloria Hallelujah", "handwritten", "gloriahallelujah", "GloriaHallelujah.ttf"),
  font("Indie Flower", "handwritten", "indieflower", "IndieFlower-Regular.ttf"),
  staticFont("Kalam", "handwritten", "kalam", ["Kalam-Light.ttf", "Kalam-Regular.ttf", "Kalam-Bold.ttf"]),
  font("Nanum Pen Script", "handwritten", "nanumpenscript", "NanumPenScript-Regular.ttf"),
  font("Patrick Hand", "handwritten", "patrickhand", "PatrickHand-Regular.ttf"),
  font("Schoolbell", "handwritten", "schoolbell", "Schoolbell-Regular.ttf"),
  font("Shadows Into Light", "handwritten", "shadowsintolight", "ShadowsIntoLight.ttf"),
  staticFont("Anonymous Pro", "monospace", "anonymouspro", ["AnonymousPro-Regular.ttf", "AnonymousPro-Italic.ttf", "AnonymousPro-Bold.ttf", "AnonymousPro-BoldItalic.ttf"]),
  font("Cutive Mono", "monospace", "cutivemono", "CutiveMono-Regular.ttf"),
  staticFont("DM Mono", "monospace", "dmmono", ["DMMono-Light.ttf", "DMMono-LightItalic.ttf", "DMMono-Regular.ttf", "DMMono-Italic.ttf", "DMMono-Medium.ttf", "DMMono-MediumItalic.ttf"]),
  font("Fira Code", "monospace", "firacode", "FiraCode[wght].ttf"),
  staticFont("Fira Mono", "monospace", "firamono", ["FiraMono-Regular.ttf", "FiraMono-Medium.ttf", "FiraMono-Bold.ttf"]),
  staticFont("IBM Plex Mono", "monospace", "ibmplexmono", ["IBMPlexMono-Thin.ttf", "IBMPlexMono-ThinItalic.ttf", "IBMPlexMono-ExtraLight.ttf", "IBMPlexMono-ExtraLightItalic.ttf", "IBMPlexMono-Light.ttf", "IBMPlexMono-LightItalic.ttf", "IBMPlexMono-Regular.ttf", "IBMPlexMono-Italic.ttf", "IBMPlexMono-Medium.ttf", "IBMPlexMono-MediumItalic.ttf", "IBMPlexMono-SemiBold.ttf", "IBMPlexMono-SemiBoldItalic.ttf", "IBMPlexMono-Bold.ttf", "IBMPlexMono-BoldItalic.ttf"]),
  font("Inconsolata", "monospace", "inconsolata", "Inconsolata[wdth,wght].ttf"),
  font("JetBrains Mono", "monospace", "jetbrainsmono", "JetBrainsMono[wght].ttf", "JetBrainsMono-Italic[wght].ttf"),
  font("Noto Sans Mono", "monospace", "notosansmono", "NotoSansMono[wdth,wght].ttf"),
  font("PT Mono", "monospace", "ptmono", "PTM55FT.ttf"),
  font("Red Hat Mono", "monospace", "redhatmono", "RedHatMono[wght].ttf", "RedHatMono-Italic[wght].ttf"),
  font("Roboto Mono", "monospace", "robotomono", "RobotoMono[wght].ttf", "RobotoMono-Italic[wght].ttf"),
  font("Source Code Pro", "monospace", "sourcecodepro", "SourceCodePro[wght].ttf", "SourceCodePro-Italic[wght].ttf"),
  staticFont("Space Mono", "monospace", "spacemono", ["SpaceMono-Regular.ttf", "SpaceMono-Italic.ttf", "SpaceMono-Bold.ttf", "SpaceMono-BoldItalic.ttf"]),
  staticFont("Ubuntu Mono", "monospace", "ubuntumono", ["UbuntuMono-Regular.ttf", "UbuntuMono-Italic.ttf", "UbuntuMono-Bold.ttf", "UbuntuMono-BoldItalic.ttf"]),
  font("DM Sans", "sans_serif", "dmsans", "DMSans[opsz,wght].ttf", "DMSans-Italic[opsz,wght].ttf"),
  font("Inter", "sans_serif", "inter", "Inter[opsz,wght].ttf", "Inter-Italic[opsz,wght].ttf"),
  staticFont("Lato", "sans_serif", "lato", ["Lato-Thin.ttf", "Lato-ThinItalic.ttf", "Lato-ExtraLight.ttf", "Lato-ExtraLightItalic.ttf", "Lato-Light.ttf", "Lato-LightItalic.ttf", "Lato-Regular.ttf", "Lato-Italic.ttf", "Lato-Medium.ttf", "Lato-MediumItalic.ttf", "Lato-SemiBold.ttf", "Lato-SemiBoldItalic.ttf", "Lato-Bold.ttf", "Lato-BoldItalic.ttf", "Lato-ExtraBold.ttf", "Lato-ExtraBoldItalic.ttf", "Lato-Black.ttf", "Lato-BlackItalic.ttf"]),
  font("Manrope", "sans_serif", "manrope", "Manrope[wght].ttf"),
  font("Montserrat", "sans_serif", "montserrat", "Montserrat[wght].ttf", "Montserrat-Italic[wght].ttf"),
  font("Mulish", "sans_serif", "mulish", "Mulish[wght].ttf", "Mulish-Italic[wght].ttf"),
  font("Nunito Sans", "sans_serif", "nunitosans", "NunitoSans[YTLC,opsz,wdth,wght].ttf", "NunitoSans-Italic[YTLC,opsz,wdth,wght].ttf"),
  font("Open Sans", "sans_serif", "opensans", "OpenSans[wdth,wght].ttf", "OpenSans-Italic[wdth,wght].ttf"),
  font("Outfit", "sans_serif", "outfit", "Outfit[wght].ttf"),
  font("Plus Jakarta Sans", "sans_serif", "plusjakartasans", "PlusJakartaSans[wght].ttf", "PlusJakartaSans-Italic[wght].ttf"),
  staticFont("Poppins", "sans_serif", "poppins", ["Poppins-Thin.ttf", "Poppins-ThinItalic.ttf", "Poppins-ExtraLight.ttf", "Poppins-ExtraLightItalic.ttf", "Poppins-Light.ttf", "Poppins-LightItalic.ttf", "Poppins-Regular.ttf", "Poppins-Italic.ttf", "Poppins-Medium.ttf", "Poppins-MediumItalic.ttf", "Poppins-SemiBold.ttf", "Poppins-SemiBoldItalic.ttf", "Poppins-Bold.ttf", "Poppins-BoldItalic.ttf", "Poppins-ExtraBold.ttf", "Poppins-ExtraBoldItalic.ttf", "Poppins-Black.ttf", "Poppins-BlackItalic.ttf"]),
  font("Roboto", "sans_serif", "roboto", "Roboto[wdth,wght].ttf", "Roboto-Italic[wdth,wght].ttf"),
  font("Rubik", "sans_serif", "rubik", "Rubik[wght].ttf", "Rubik-Italic[wght].ttf"),
  font("Source Sans 3", "sans_serif", "sourcesans3", "SourceSans3[wght].ttf", "SourceSans3-Italic[wght].ttf"),
  font("Work Sans", "sans_serif", "worksans", "WorkSans[wght].ttf", "WorkSans-Italic[wght].ttf"),
  font("Alex Brush", "script", "alexbrush", "AlexBrush-Regular.ttf"),
  font("Allura", "script", "allura", "Allura-Regular.ttf"),
  font("Dancing Script", "script", "dancingscript", "DancingScript[wght].ttf"),
  font("Great Vibes", "script", "greatvibes", "GreatVibes-Regular.ttf"),
  font("Italianno", "script", "italianno", "Italianno-Regular.ttf"),
  font("Parisienne", "script", "parisienne", "Parisienne-Regular.ttf"),
  font("Pinyon Script", "script", "pinyonscript", "PinyonScript-Regular.ttf"),
  font("Sacramento", "script", "sacramento", "Sacramento-Regular.ttf"),
  staticFont("Tangerine", "script", "tangerine", ["Tangerine-Regular.ttf", "Tangerine-Bold.ttf"]),
  font("Yellowtail", "script", "yellowtail", "Yellowtail-Regular.ttf"),
  staticFont("Cardo", "serif", "cardo", ["Cardo-Regular.ttf", "Cardo-Italic.ttf", "Cardo-Bold.ttf"]),
  font("Cormorant Garamond", "serif", "cormorantgaramond", "CormorantGaramond[wght].ttf", "CormorantGaramond-Italic[wght].ttf"),
  font("Crimson Pro", "serif", "crimsonpro", "CrimsonPro[wght].ttf", "CrimsonPro-Italic[wght].ttf"),
  staticFont("DM Serif Display", "serif", "dmserifdisplay", ["DMSerifDisplay-Regular.ttf", "DMSerifDisplay-Italic.ttf"]),
  font("EB Garamond", "serif", "ebgaramond", "EBGaramond[wght].ttf", "EBGaramond-Italic[wght].ttf"),
  font("Fraunces", "serif", "fraunces", "Fraunces[SOFT,WONK,opsz,wght].ttf", "Fraunces-Italic[SOFT,WONK,opsz,wght].ttf"),
  font("Libre Baskerville", "serif", "librebaskerville", "LibreBaskerville[wght].ttf", "LibreBaskerville-Italic[wght].ttf"),
  font("Lora", "serif", "lora", "Lora[wght].ttf", "Lora-Italic[wght].ttf"),
  font("Merriweather", "serif", "merriweather", "Merriweather[opsz,wdth,wght].ttf", "Merriweather-Italic[opsz,wdth,wght].ttf"),
  font("Newsreader", "serif", "newsreader", "Newsreader[opsz,wght].ttf", "Newsreader-Italic[opsz,wght].ttf"),
  font("Noto Serif", "serif", "notoserif", "NotoSerif[wdth,wght].ttf", "NotoSerif-Italic[wdth,wght].ttf"),
  font("Playfair Display", "serif", "playfairdisplay", "PlayfairDisplay[wght].ttf", "PlayfairDisplay-Italic[wght].ttf"),
  font("Source Serif 4", "serif", "sourceserif4", "SourceSerif4[opsz,wght].ttf", "SourceSerif4-Italic[opsz,wght].ttf"),
  staticFont("Spectral", "serif", "spectral", ["Spectral-ExtraLight.ttf", "Spectral-ExtraLightItalic.ttf", "Spectral-Light.ttf", "Spectral-LightItalic.ttf", "Spectral-Regular.ttf", "Spectral-Italic.ttf", "Spectral-Medium.ttf", "Spectral-MediumItalic.ttf", "Spectral-SemiBold.ttf", "Spectral-SemiBoldItalic.ttf", "Spectral-Bold.ttf", "Spectral-BoldItalic.ttf", "Spectral-ExtraBold.ttf", "Spectral-ExtraBoldItalic.ttf"]),
  font("Vollkorn", "serif", "vollkorn", "Vollkorn[wght].ttf", "Vollkorn-Italic[wght].ttf"),
  font("Aleo", "slab_serif", "aleo", "Aleo[wght].ttf", "Aleo-Italic[wght].ttf"),
  font("Alfa Slab One", "slab_serif", "alfaslabone", "AlfaSlabOne-Regular.ttf"),
  staticFont("Arvo", "slab_serif", "arvo", ["Arvo-Regular.ttf", "Arvo-Italic.ttf", "Arvo-Bold.ttf", "Arvo-BoldItalic.ttf"]),
  font("Bevan", "slab_serif", "bevan", "Bevan-Regular.ttf", "Bevan-Italic.ttf"),
  font("BioRhyme", "slab_serif", "biorhyme", "BioRhyme[wdth,wght].ttf"),
  font("Bitter", "slab_serif", "bitter", "Bitter[wght].ttf", "Bitter-Italic[wght].ttf"),
  font("Bree Serif", "slab_serif", "breeserif", "BreeSerif-Regular.ttf"),
  font("Crete Round", "slab_serif", "creteround", "CreteRound-Regular.ttf", "CreteRound-Italic.ttf"),
  font("Patua One", "slab_serif", "patuaone", "PatuaOne-Regular.ttf"),
  font("Roboto Slab", "slab_serif", "robotoslab", "RobotoSlab[wght].ttf"),
  font("Rokkitt", "slab_serif", "rokkitt", "Rokkitt[wght].ttf", "Rokkitt-Italic[wght].ttf"),
  font("Slabo 27px", "slab_serif", "slabo27px", "Slabo27px-Regular.ttf"),
  font("Suez One", "slab_serif", "suezone", "SuezOne-Regular.ttf"),
  font("Ultra", "slab_serif", "ultra", "Ultra-Regular.ttf"),
  staticFont("Zilla Slab", "slab_serif", "zillaslab", ["ZillaSlab-Light.ttf", "ZillaSlab-LightItalic.ttf", "ZillaSlab-Regular.ttf", "ZillaSlab-Italic.ttf", "ZillaSlab-Medium.ttf", "ZillaSlab-MediumItalic.ttf", "ZillaSlab-SemiBold.ttf", "ZillaSlab-SemiBoldItalic.ttf", "ZillaSlab-Bold.ttf", "ZillaSlab-BoldItalic.ttf"])
];
var APPLICATION_FONT_OPTIONS = [
  {
    family: "Syne",
    sourceUrl: "/vendor/fonts/sans_serif/syne/Syne[wght].ttf"
  }
];
var SYSTEM_FONT_FAMILY_KEYS = new Set(
  [
    "arial",
    "helvetica",
    "times",
    "times new roman",
    "georgia",
    "courier",
    "courier new",
    "verdana",
    "tahoma",
    "trebuchet ms",
    "impact",
    "comic sans ms",
    "system-ui",
    "sans-serif",
    "serif",
    "monospace"
  ].map(fontFamilyKey)
);
var LOCAL_FONT_BY_FAMILY = new Map(
  [...LOCAL_FONT_OPTIONS, ...APPLICATION_FONT_OPTIONS].map((option) => [
    fontFamilyKey(option.family),
    option
  ])
);
LOCAL_FONT_BY_FAMILY.set("inter variable", LOCAL_FONT_BY_FAMILY.get("inter"));
function localFontOptionForFamily(family) {
  return LOCAL_FONT_BY_FAMILY.get(fontFamilyKey(family)) ?? null;
}
function localFontOptionsFromUnknown(value) {
  const fontOptions = /* @__PURE__ */ new Map();
  const addFontOption = (option, preferSource = false) => {
    const key = fontFamilyKey(option.family);
    if (!key || !preferSource && fontOptions.has(key)) return;
    fontOptions.set(key, option);
  };
  const addSourceFont = (family, sourceUrl, weight, style) => {
    if (typeof family !== "string" || typeof sourceUrl !== "string") return;
    const normalizedFamily = normalizeFontFamily(family);
    const normalizedSourceUrl = sourceUrl.trim();
    if (!normalizedFamily || !isFontAssetUrl(normalizedSourceUrl)) return;
    const catalogOption = localFontOptionForFamily(normalizedFamily);
    if (catalogOption && normalizedSourceUrl.startsWith("/vendor/fonts/")) {
      addFontOption(catalogOption, true);
      return;
    }
    const inferredWeight = readFontWeight(weight) ?? fontWeightFromSource(normalizedFamily, normalizedSourceUrl);
    const inferredStyle = readFontStyle(style) ?? (/italic/i.test(`${normalizedFamily} ${normalizedSourceUrl}`) ? "italic" : "normal");
    addFontOption(
      {
        family: normalizedFamily,
        sourceUrl: normalizedSourceUrl,
        faces: [
          {
            sourceUrl: normalizedSourceUrl,
            style: inferredStyle,
            weight: inferredWeight
          }
        ],
        aliases: fontFamilyAliases(normalizedFamily)
      },
      true
    );
  };
  const addFamily = (family) => {
    if (typeof family !== "string") return;
    family.split(",").forEach((candidate) => {
      const normalizedCandidate = candidate.trim().replace(/\s*!important\s*$/i, "").replace(/^(['"])(.*)\1$/, "$2").trim();
      if (!normalizedCandidate) return;
      const option = localFontOptionForFamily(normalizedCandidate);
      if (option) addFontOption(option);
    });
  };
  const visit = (entry, fallbackFamily) => {
    if (typeof entry === "string") {
      if (fallbackFamily && addableFontMapKey(fallbackFamily)) {
        addSourceFont(fallbackFamily, entry);
      }
      if (isFontFamilyField(fallbackFamily)) addFamily(entry);
      else addFamily(fallbackFamily);
      for (const match of entry.matchAll(
        /font-family\s*:\s*([^;{}]+)/gi
      )) {
        addFamily(match[1]?.trim());
      }
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach((item) => visit(item, fallbackFamily));
      return;
    }
    if (!entry || typeof entry !== "object") return;
    const record = entry;
    const declaredFamily = record.family ?? record.name ?? record.font_name ?? record.fontFamily ?? record.font_family ?? record["font-family"];
    const declaredSource = record.url ?? record.src ?? record.href ?? record.source ?? record.data;
    addSourceFont(
      declaredFamily ?? (addableFontMapKey(fallbackFamily) ? fallbackFamily : void 0),
      declaredSource,
      record.weight ?? record.fontWeight ?? record.font_weight,
      record.style ?? record.fontStyle ?? record.font_style
    );
    addFamily(declaredFamily);
    Object.entries(record).forEach(([key, nested]) => {
      if ([
        "family",
        "name",
        "font_name",
        "fontFamily",
        "font_family",
        "font-family"
      ].includes(key)) {
        return;
      }
      if (!["css", "font_css", "fonts", "url", "src", "href", "source"].includes(key)) {
        addFamily(key);
      }
      visit(nested, key);
    });
  };
  visit(value);
  return Array.from(fontOptions.values());
}
function addableFontMapKey(field) {
  if (!field) return false;
  return ![
    "css",
    "font_css",
    "fonts",
    "url",
    "src",
    "href",
    "source",
    "data"
  ].includes(field.toLowerCase());
}
function isFontAssetUrl(value) {
  return /^data:font\//i.test(value) || /\.(?:eot|otf|ttf|woff2?)(?:[?#].*)?$/i.test(value);
}
function normalizeFontFamily(value) {
  return value.trim().replace(/\s*!important\s*$/i, "").replace(/^(['"])(.*)\1$/, "$2").trim();
}
function fontWeightFromSource(family, sourceUrl) {
  if (/\[[^\]]*wght[^\]]*\]/i.test(sourceUrl)) return "100 900";
  return fontWeightFromFileName(`${family} ${sourceUrl}`);
}
function readFontWeight(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1e3, Math.max(1, Math.round(value)));
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (/^\d{1,4}(?:\s+\d{1,4})?$/.test(normalized)) return normalized;
  return null;
}
function readFontStyle(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "italic" || normalized === "oblique" ? "italic" : normalized === "normal" ? "normal" : null;
}
function fontFamilyAliases(family) {
  const alias = family.replace(
    /\s+(?:thin|extra[-_ ]?light|light|regular|medium|semi[-_ ]?bold|bold|extra[-_ ]?bold|black)(?:\s+italic)?$/i,
    ""
  ).replace(/\s+italic$/i, "").trim();
  return alias && fontFamilyKey(alias) !== fontFamilyKey(family) ? [alias] : [];
}
function isFontFamilyField(field) {
  if (!field) return false;
  return ["family", "fontfamily", "fontname"].includes(
    field.replace(/[-_\s]/g, "").toLowerCase()
  );
}
function renderLocalFontFaceCss(fontOption) {
  const families = Array.from(
    /* @__PURE__ */ new Set([fontOption.family, ...fontOption.aliases ?? []])
  );
  if (fontOption.faces?.length) {
    return families.flatMap(
      (family) => fontOption.faces.map(
        (face) => `@font-face{font-family:"${escapeCssString(family)}";src:${fontSource(face.sourceUrl)};font-style:${face.style};font-weight:${face.weight};font-display:swap}`
      )
    ).join("");
  }
  return families.map((family) => {
    const escapedFamily = escapeCssString(family);
    const normalFace = `@font-face{font-family:"${escapedFamily}";src:${fontSource(fontOption.sourceUrl)};font-style:normal;font-weight:100 900;font-display:swap}`;
    const italicFace = fontOption.italicSourceUrl ? `@font-face{font-family:"${escapedFamily}";src:${fontSource(fontOption.italicSourceUrl)};font-style:italic;font-weight:100 900;font-display:swap}` : "";
    return `${normalFace}${italicFace}`;
  }).join("");
}
function fontSource(sourceUrl) {
  const assetPath = sourceUrl.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  const format = assetPath.endsWith(".woff2") ? "woff2" : assetPath.endsWith(".woff") ? "woff" : assetPath.endsWith(".otf") ? "opentype" : assetPath.endsWith(".eot") ? "embedded-opentype" : "truetype";
  return `url("${escapeCssString(sourceUrl)}") format("${format}")`;
}
function fontFamilyKey(family) {
  return family.trim().toLowerCase();
}
function escapeCssString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// lib/template-v2-json-to-html.ts
var DATA_LABEL_POSITIONS = /* @__PURE__ */ new Set(["base", "mid", "top", "outside"]);
var ELEMENT_TYPES = /* @__PURE__ */ new Set([
  "text",
  "container",
  "image",
  "text-list",
  "table",
  "vector",
  "svg",
  "chart",
  "infographic",
  "flex",
  "grid",
  "group",
  "list-view",
  "grid-view"
]);
var DEFAULT_CHART_COLORS = [
  "#7F22FE",
  "#155DFC",
  "#F59E0B",
  "#12B76A",
  "#EF4444",
  "#06B6D4",
  "#8B5CF6",
  "#64748B"
];
var CHART_FONT_FAMILY = "Manrope, Arial, sans-serif";
var TEMPLATE_V2_MATH_CSS = `
.presenton-math{line-height:normal;overflow:visible}
.presenton-math>.katex{color:inherit;font:inherit;line-height:inherit;white-space:nowrap}
.presenton-math>.katex>math{color:inherit;font-size:1em;margin:0;overflow:visible}
`;
var TEMPLATE_V2_HTML_WIDTH = 1280;
var TEMPLATE_V2_HTML_HEIGHT = 720;
function templateV2UiToHtml(ui, options = {}) {
  const payload = templateV2RenderPayload(ui, options);
  if (!payload) return null;
  return jsonToHtml(
    payload.items,
    payload.width,
    payload.height,
    payload.fonts,
    payload.background
  );
}
function templateV2UiToHtmlFragment(ui, options = {}) {
  const payload = templateV2RenderPayload(ui, options);
  if (!payload) return null;
  return jsonToHtmlFragment(
    payload.items,
    payload.width,
    payload.height,
    payload.fonts,
    payload.background
  );
}
function templateV2RenderPayload(ui, options) {
  const record = readRecord(ui);
  const rootElements = readArray3(record.elements);
  const components = readArray3(record.components);
  const items = [...rootElements, ...components].map(
    (item) => readRecord(normalizeTemplateV2AssetUrls(item))
  );
  if (items.length === 0) {
    return null;
  }
  const width = options.width ?? TEMPLATE_V2_HTML_WIDTH;
  const height = options.height ?? TEMPLATE_V2_HTML_HEIGHT;
  const background = normalizeCssColor(readString3(record.background) ?? "#FFFFFF");
  return {
    items,
    width,
    height,
    fonts: options.fonts,
    background
  };
}
function hasTemplateV2RenderableUi(ui) {
  const record = readRecord(ui);
  return readArray3(record.components).length > 0 || readArray3(record.elements).length > 0;
}
function normalizeTemplateV2AssetUrls(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeTemplateV2AssetUrls);
  }
  const record = readRecord(value);
  if (!Object.keys(record).length) return value;
  const normalized = Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      normalizeTemplateV2AssetUrls(child)
    ])
  );
  if (readString3(normalized.type) === "image") {
    const source = readString3(normalized.data);
    if (source) {
      normalized.data = resolveBackendAssetUrl(source);
    }
  }
  return normalized;
}
function jsonToHtml(items, width, height, fonts = {}, background = "#FFFFFF") {
  const records = items.map(readRecord);
  const chartScripts = records.some(hasChartItem) ? renderChartScripts() : "";
  const fontAssetTags = renderFontAssetTags(fonts);
  const bg = escapeCssColor(background);
  const slideRoot = renderSlideRoot(records, width, height, bg);
  return `<!doctype html>
<html><head><meta charset="utf-8">${fontAssetTags}<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${bg}}
body{font-family:Arial,Helvetica,sans-serif}
*,*::before,*::after{box-sizing:border-box}
${TEMPLATE_V2_MATH_CSS}
</style></head><body>${slideRoot}${chartScripts}</body></html>`;
}
function jsonToHtmlFragment(items, width, height, fonts = {}, background = "#FFFFFF") {
  const records = items.map(readRecord);
  const bg = escapeCssColor(background);
  return `${renderFontAssetTags(fonts)}<style>${TEMPLATE_V2_MATH_CSS}</style>${renderSlideRoot(
    records,
    width,
    height,
    bg
  )}`;
}
function renderSlideRoot(records, width, height, background) {
  const content = records.map((item) => renderItem(item, "absolute")).join("");
  return `<div class="relative overflow-hidden" data-template-v2-html-slide="true" style="box-sizing:border-box;position:relative;width:${cssNumber(
    width
  )}px;height:${cssNumber(
    height
  )}px;overflow:hidden;background:${background};font-family:Arial,Helvetica,sans-serif">${content}</div>`;
}
function renderFontAssetTags(fonts) {
  const css = localFontOptionsFromUnknown(fonts).map(renderLocalFontFaceCss).join("");
  return css ? `<style>${escapeStyleText(css)}</style>` : "";
}
function renderItem(item, mode) {
  if (isComponent(item)) {
    const { size, ...component } = item;
    void size;
    return renderGroup(
      { ...component, type: "group", children: item.elements },
      mode
    );
  }
  switch (readString3(item.type)) {
    case "vector":
      return renderPolygon(item, mode);
    case "svg":
      return renderSvg(item, mode);
    case "image":
      return renderImage(item, mode);
    case "text":
      return renderText(item, mode);
    case "text-list":
      return renderTextList(item, mode);
    case "table":
      return renderTable(item, mode);
    case "container":
      return renderContainer(item, mode);
    case "flex":
    case "list-view":
      return renderFlex(item, mode);
    case "grid":
    case "grid-view":
      return renderGrid(item, mode);
    case "group":
      return renderGroup(item, mode);
    case "chart":
      return renderChart(item, mode);
    case "infographic":
      return renderInfographic(item, mode);
    default:
      if (Array.isArray(item.children)) return renderGroup(item, mode);
      if (readRecordOrNull(item.child)) return renderContainer(item, mode);
      return "";
  }
}
function isWatermarkItem(node) {
  if (!node) return false;
  const name = (readString3(node.name) || "").toLowerCase();
  const font = readRecord(node.font);
  const fontSize = readNumber3(font.size) ?? 0;
  if (/card_number|agenda_index|column_number|card_marker|item_number|step_number|step_index|watermark|index_letter|metric_index/i.test(name)) {
    return true;
  }
  if (fontSize >= 70 && fontSize <= 140 && /number|index|marker|letter|digit/i.test(name)) {
    return true;
  }
  return false;
}
function renderImage(item, mode) {
  const source = readString3(item.data);
  if (!source) return "";
  const color = normalizeChartColor(readString3(item.color));
  const clipPath = clipPathStyle(item);
  if (color && readBoolean2(item.isIcon ?? item.is_icon)) {
    const maskUrl = cssUrl(source);
    const maskSize = imageMaskSize(item.fit);
    return `<div style="${frameStyle(item, mode)}${boxStyle(
      item
    )}color:${escapeCssColor(
      color
    )};background:currentColor;-webkit-mask:${maskUrl} center/${maskSize} no-repeat;mask:${maskUrl} center/${maskSize} no-repeat;${clipPath}"></div>`;
  }
  const fit = imageFit(item.fit);
  const focusStyle = imageFocusStyle(item);
  const cropTransformStyle = imageCropTransformStyle(item);
  const onErrorAttr = `onerror="this.onerror=null;this.style.display='none';"`;
  if (cropTransformStyle) {
    return `<div style="${frameStyle(item, mode)}${boxStyle(
      item
    )}${clipPath}overflow:hidden;"><img alt="" src="${escapeAttribute(
      source
    )}" ${onErrorAttr} style="display:block;max-width:none;max-height:none;height:100%;width:100%;object-fit:${fit};${focusStyle}${cropTransformStyle}"></div>`;
  }
  if (clipPath) {
    return `<div style="${frameStyle(item, mode)}${boxStyle(
      item
    )}${clipPath}overflow:hidden;"><img alt="" src="${escapeAttribute(
      source
    )}" ${onErrorAttr} style="display:block;max-width:none;max-height:none;height:100%;width:100%;object-fit:${fit};${focusStyle}"></div>`;
  }
  return `<img alt="" src="${escapeAttribute(source)}" ${onErrorAttr} style="${frameStyle(
    item,
    mode
  )}${boxStyle(
    item
  )}display:block;max-width:none;max-height:none;object-fit:${fit};${focusStyle}${clipPath}">`;
}
function renderText(item, mode) {
  const font2 = readRecord(item.font);
  const alignment = readRecord(item.alignment);
  const horizontal = readString3(alignment.horizontal);
  const vertical = readString3(alignment.vertical);
  const runs = normalizedRunsForHtml(item, font2);
  const runHtml = runs.map((run) => {
    const runFont = { ...font2, ...readRecord(run.font) };
    return renderTextRunHtml(run, runFont);
  }).join("");
  const watermark = isWatermarkItem(item);
  const watermarkStyle = watermark ? "overflow:visible;padding:4px 6px;" : "";
  return `<div style="${frameStyle(item, mode)}${transformStyle(item)}${fontStyle(font2, {
    includeLineHeight: false,
    includeTextDecoration: false
  })}${textShadowStyle(item)}display:flex;align-items:${verticalAlign(
    vertical
  )};justify-content:${horizontalAlign(horizontal)};${lineHeightStyle(
    font2,
    1.1
  )}${textOverflowStyle()}${watermarkStyle}text-align:${textAlign(horizontal)};"><span style="display:block;width:100%">${runHtml}</span></div>`;
}
function renderTextList(item, mode) {
  const marker = readString3(item.marker);
  const tag = marker === "number" ? "ol" : "ul";
  const font2 = readRecord(item.font);
  const itemGap = Math.max(0, readNumber3(item.gap) ?? 0);
  const rawMarkerGap = readNumber3(item.marker_gap ?? item.markerGap);
  const markerGap = rawMarkerGap == null ? null : Math.max(0, rawMarkerGap);
  const usesCustomMarkers = marker !== "none" && markerGap != null;
  const entries = readArray3(item.items).map((entry, index) => {
    const runs = normalizedListRunsForHtml(entry, font2);
    const html = runs.map(
      (run) => renderTextRunHtml(run, { ...font2, ...readRecord(run.font) })
    ).join("");
    const gapStyle = index > 0 && itemGap > 0 ? `margin-top:${cssNumber(itemGap)}px;` : "";
    if (usesCustomMarkers) {
      const markerText = marker === "number" ? `${index + 1}.` : "\u2022";
      return `<li style="${gapStyle}display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:${cssNumber(
        markerGap
      )}px;${textOverflowStyle()}"><span aria-hidden="true">${markerText}</span><span>${html}</span></li>`;
    }
    return `<li style="${gapStyle}${textOverflowStyle()}">${html}</li>`;
  }).join("");
  const hidesNativeMarkers = marker === "none" || usesCustomMarkers;
  const listStyle = `margin:0;padding-left:${hidesNativeMarkers ? 0 : 24}px;${hidesNativeMarkers ? "list-style-type:none;" : ""}`;
  return `<div style="${frameStyle(item, mode)}${transformStyle(item)}${fontStyle(
    font2,
    { includeTextDecoration: false }
  )}${textOverflowStyle()}"><${tag} style="${listStyle}">${entries}</${tag}></div>`;
}
function renderTable(item, mode) {
  const rows = tableRows(item);
  if (!rows.length) {
    return `<div style="${frameStyle(
      item,
      mode
    )}${transformStyle(item)}overflow:hidden"></div>`;
  }
  const rowCount = Math.max(1, rows.length);
  const colCount = Math.max(1, ...rows.map((row) => row.length));
  const tableFont = tableBaseFont(item);
  const cells = rows.flatMap(
    (row, rowIndex) => Array.from({ length: colCount }, (_, colIndex) => {
      const cell = row[colIndex] ?? {};
      const isHeader = rowIndex === 0;
      return `<div style="${tableCellStyle(
        cell,
        isHeader,
        tableFont
      )}">${cellText(cell, tableFont, isHeader)}</div>`;
    })
  ).join("");
  return `<div style="${frameStyle(
    item,
    mode
  )}${transformStyle(item)}display:grid;grid-template-columns:repeat(${colCount},minmax(0,1fr));grid-template-rows:repeat(${rowCount},minmax(0,1fr));overflow:hidden">${cells}</div>`;
}
function renderContainer(item, mode) {
  const child = readRecordOrNull(item.child);
  const alignment = readRecord(item.alignment);
  const style = `${frameStyle(item, mode)}${boxStyle(item)}${paddingStyle(
    readRecord(item.padding)
  )}display:flex;align-items:${verticalAlign(
    readString3(alignment.vertical)
  )};justify-content:${horizontalAlign(
    readString3(alignment.horizontal)
  )};${containerOverflowStyle(item, child)}`;
  return `<div style="${style}">${child ? renderItem(child, readRecordOrNull(child.position) ? "absolute" : "flow") : ""}</div>`;
}
function containerOverflowStyle(item, child) {
  if (isWatermarkItem(item) || isWatermarkItem(child)) {
    return "overflow:visible";
  }
  const overflow = readString3(item.overflow);
  if (overflow === "hidden" || overflow === "visible") {
    return `overflow:${overflow}`;
  }
  if (readBoolean2(item.clip)) return "overflow:hidden";
  if (!child || readString3(child.type) !== "image") return "overflow:visible";
  const childHasClipPath = Boolean(readString3(child.clip_path ?? child.clipPath));
  const hasPositionedChild = Boolean(readRecordOrNull(child.position));
  if (!hasPositionedChild) return "overflow:visible";
  if (childHasClipPath) return "overflow:hidden";
  const containerBox = readBox(item);
  const childBox = readBox(child);
  if (containerBox.width == null || containerBox.height == null) {
    return "overflow:visible";
  }
  const epsilon = 0.01;
  const childOverflows = childBox.x < -epsilon || childBox.y < -epsilon || childBox.width != null && childBox.x + childBox.width > containerBox.width + epsilon || childBox.height != null && childBox.y + childBox.height > containerBox.height + epsilon;
  return childOverflows ? "overflow:hidden" : "overflow:visible";
}
function renderFlex(item, mode) {
  const direction = readString3(item.direction) === "row" ? "row" : "column";
  const gap = readNumber3(item.gap) ?? 0;
  const rowGap = readNumber3(item.rowGap ?? item.row_gap) ?? gap;
  const columnGap = readNumber3(item.columnGap ?? item.column_gap) ?? gap;
  const childrenList = readLayoutChildren(item);
  const laidOutChildren = layoutFlowChildren(
    item,
    childrenList.map(readRecord),
    completeHtmlElementBox(item),
    htmlFlowLayoutDeps
  );
  const children = laidOutChildren.map(
    ({ child, box, layoutManaged }) => renderItem(
      layoutManaged && box ? {
        ...child,
        size: {
          ...readRecord(child.size),
          width: box.width,
          height: box.height
        }
      } : child,
      "flow"
    )
  ).join("");
  const style = `${flexFrameStyle(
    item,
    mode,
    childrenList,
    direction,
    readBoolean2(item.wrap),
    columnGap,
    rowGap
  )}${boxStyle(item)}${paddingStyle(
    readRecord(item.padding)
  )}display:flex;flex-direction:${direction};flex-wrap:${readBoolean2(item.wrap) ? "wrap" : "nowrap"};align-items:${cssAlignment(
    readString3(item.alignItems ?? item.align_items),
    "stretch"
  )};justify-content:${cssAlignment(
    readString3(item.justifyContent ?? item.justify_content),
    "flex-start"
  )};gap:${cssNumber(gap)}px;column-gap:${cssNumber(columnGap)}px;row-gap:${cssNumber(rowGap)}px;overflow:visible`;
  return `<div style="${style}">${children}</div>`;
}
var htmlFlowLayoutDeps = {
  elementBox: completeHtmlElementBox,
  elementSize: htmlElementSize,
  isManualPositioned: (element) => element.__presenton_manual_position === true
};
function completeHtmlElementBox(item) {
  const box = readBox(item);
  const fallback = htmlElementSize(item);
  return {
    x: box.x,
    y: box.y,
    width: box.width ?? fallback.width,
    height: box.height ?? fallback.height
  };
}
function htmlElementSize(item, fallback) {
  const box = readBox(item);
  if (box.width != null && box.height != null) {
    return { width: box.width, height: box.height };
  }
  const type = readString3(item.type);
  if (type === "group") {
    return childrenBounds(readArray3(item.children).map(readRecord));
  }
  if (type === "container") {
    const padding = readRecord(item.padding);
    const child = readRecordOrNull(item.child);
    const childSize = child ? htmlElementSize(child, fallback) : fallback;
    if (childSize) {
      return {
        width: childSize.width + (readNumber3(padding.left) ?? 0) + (readNumber3(padding.right) ?? 0),
        height: childSize.height + (readNumber3(padding.top) ?? 0) + (readNumber3(padding.bottom) ?? 0)
      };
    }
  }
  if (type === "text") {
    if (fallback) return fallback;
    const font2 = rawFont(item);
    const text = displayText(rawTextContent(item));
    const longestLine = text.split(/\r?\n/).reduce((longest, line) => Math.max(longest, line.length), 0);
    const width = Math.max(
      font2.size,
      longestLine * font2.size * (font2.bold ? 0.56 : 0.5)
    );
    const averageCharacterWidth = Math.max(1, font2.size * 0.5);
    const charactersPerLine = Math.max(
      1,
      Math.floor(width / averageCharacterWidth)
    );
    const lines = text.split(/\r?\n/).reduce(
      (count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)),
      0
    );
    return {
      width,
      height: Math.max(
        font2.size * font2.lineHeight,
        lines * font2.size * font2.lineHeight
      )
    };
  }
  if (type === "flex" || type === "grid" || type === "list-view" || type === "grid-view") {
    return fallback ?? intrinsicFlowSize(
      item,
      readLayoutChildren(item).map(readRecord),
      htmlFlowLayoutDeps
    );
  }
  return fallback ?? { width: box.width ?? 1, height: box.height ?? 1 };
}
function flexFrameStyle(item, mode, children, direction, wrap, columnGap, rowGap) {
  const box = readBox(item);
  const expanded = flexExpandedSize(item, box, children, direction, wrap, columnGap, rowGap);
  let style = frameStyleFromBox(box, mode);
  if (expanded.width != null && (box.width == null || expanded.width > box.width)) {
    style += `width:${cssNumber(expanded.width)}px;`;
  }
  if (expanded.height != null && (box.height == null || expanded.height > box.height)) {
    style += `height:${cssNumber(expanded.height)}px;`;
  }
  return style;
}
function flexExpandedSize(item, box, children, direction, wrap, columnGap, rowGap) {
  const records = children.map(readRecord);
  if (!records.length) return {};
  const padding = readRecord(item.padding);
  const paddingX = (readNumber3(padding.left) ?? 0) + (readNumber3(padding.right) ?? 0);
  const paddingY = (readNumber3(padding.top) ?? 0) + (readNumber3(padding.bottom) ?? 0);
  const sizes = records.map(flowChildSize);
  if (!wrap) {
    if (direction === "row") {
      return {
        width: paddingX + sizes.reduce((sum, size) => sum + size.width, 0) + columnGap * Math.max(0, sizes.length - 1)
      };
    }
    return {
      height: paddingY + sizes.reduce((sum, size) => sum + size.height, 0) + rowGap * Math.max(0, sizes.length - 1)
    };
  }
  const mainLimit = direction === "row" ? box.width == null ? null : Math.max(1, box.width - paddingX) : box.height == null ? null : Math.max(1, box.height - paddingY);
  if (mainLimit == null) return {};
  const lines = [];
  const mainGap = direction === "row" ? columnGap : rowGap;
  const crossGap = direction === "row" ? rowGap : columnGap;
  sizes.forEach((size) => {
    const childMain = direction === "row" ? size.width : size.height;
    const childCross = direction === "row" ? size.height : size.width;
    let line = lines.at(-1);
    if (!line || line.main > 0 && line.main + mainGap + childMain > mainLimit) {
      line = { cross: 0, main: 0 };
      lines.push(line);
    }
    line.main += (line.main > 0 ? mainGap : 0) + childMain;
    line.cross = Math.max(line.cross, childCross);
  });
  const requiredCross = lines.reduce((sum, line) => sum + line.cross, 0) + crossGap * Math.max(0, lines.length - 1);
  return direction === "row" ? { height: paddingY + requiredCross } : { width: paddingX + requiredCross };
}
function flowChildSize(child) {
  const fallback = Array.isArray(child.children) ? childrenBounds(readArray3(child.children).map(readRecord)) : void 0;
  const box = readBox(child, fallback);
  return {
    width: box.width ?? 1,
    height: box.height ?? 1
  };
}
function renderGrid(item, mode) {
  const columns = Math.max(1, Math.floor(readNumber3(item.columns) ?? 1));
  const gap = readNumber3(item.gap) ?? 0;
  const rowGap = readNumber3(item.rowGap ?? item.row_gap) ?? gap;
  const columnGap = readNumber3(item.columnGap ?? item.column_gap) ?? gap;
  const childrenList = readLayoutChildren(item);
  const renderedRows = Math.max(1, Math.ceil(childrenList.length / columns));
  const declaredRows = readNumber3(item.rows);
  const rows = declaredRows == null ? null : Math.max(1, Math.floor(declaredRows));
  const size = readRecord(item.size);
  const explicitHeight = readNumber3(size.height);
  const explicitWidth = readNumber3(size.width);
  const children = childrenList.map((child) => renderItem(readRecord(child), "flow")).join("");
  const rowTemplate = gridRowTemplate(rows, renderedRows, explicitHeight, rowGap);
  const columnTemplate = gridColumnTemplate(columns, explicitWidth, columnGap);
  const style = `${frameStyle(item, mode)}${boxStyle(item)}${paddingStyle(
    readRecord(item.padding)
  )}display:grid;grid-template-columns:${columnTemplate};${rowTemplate}align-items:${cssAlignment(
    readString3(item.alignItems ?? item.align_items),
    "stretch"
  )};justify-items:${cssAlignment(
    readString3(item.justifyItems ?? item.justify_items),
    "stretch"
  )};column-gap:${cssNumber(columnGap)}px;row-gap:${cssNumber(rowGap)}px;overflow:visible`;
  return `<div style="${style}">${children}</div>`;
}
function gridColumnTemplate(columns, explicitWidth, columnGap) {
  if (explicitWidth == null) return `repeat(${columns},minmax(0,1fr))`;
  const columnWidth = Math.max(1, (explicitWidth - columnGap * (columns - 1)) / columns);
  return `repeat(${columns},${cssNumber(columnWidth)}px)`;
}
function gridRowTemplate(rows, renderedRows, explicitHeight, rowGap) {
  if (!rows) return "";
  if (explicitHeight == null) {
    return `grid-template-rows:repeat(${Math.max(rows, renderedRows)},minmax(0,1fr));`;
  }
  const rowHeight = Math.max(1, (explicitHeight - rowGap * (rows - 1)) / rows);
  return `grid-template-rows:repeat(${Math.max(rows, renderedRows)},${cssNumber(rowHeight)}px);`;
}
function readLayoutChildren(item) {
  const children = readArray3(item.children);
  if (children.length) return children;
  const elements = readArray3(item.elements);
  if (elements.length) return elements;
  const child = readRecordOrNull(item.item);
  const count = Math.max(0, Math.floor(readNumber3(item.count) ?? 0));
  return child && count ? Array.from({ length: count }, () => child) : [];
}
function renderGroup(item, mode) {
  const children = readArray3(item.children).map(readRecord);
  if (!children.length) {
    return `<div style="${frameStyle(item, mode)}${boxStyle(item)}overflow:visible"></div>`;
  }

  // 1. Dynamic flex spacing for card headings and card descriptions to prevent visual overlap when headings wrap
  const headingIdx = children.findIndex((c) => {
    const name = (readString3(c.name) || "").toLowerCase();
    return /card_heading|entry_heading|item_title/i.test(name) || (name === "heading" && readString3(c.type) === "text");
  });
  const descIdx = children.findIndex((c) => {
    const name = (readString3(c.name) || "").toLowerCase();
    return /card_description|card_desc|entry_summary|description|body|summary/i.test(name);
  });

  let flexPairHtml = "";
  const skipIndices = new Set();

  if (headingIdx !== -1 && descIdx !== -1 && headingIdx !== descIdx) {
    const hChild = children[headingIdx];
    const dChild = children[descIdx];
    const hBox = readBox(hChild);
    const dBox = readBox(dChild);

    if (dBox.y >= hBox.y && Math.abs(hBox.x - dBox.x) < 80) {
      skipIndices.add(headingIdx);
      skipIndices.add(descIdx);

      const flexX = Math.min(hBox.x, dBox.x);
      const flexY = hBox.y;
      const flexW = Math.max(hBox.width || 0, dBox.width || 0, 100);
      const flexGap = Math.max(8, Math.min(20, dBox.y - (hBox.y + (hBox.height || 26))));
      const flexStyle = `box-sizing:border-box;position:absolute;left:${cssNumber(flexX)}px;top:${cssNumber(flexY)}px;width:${cssNumber(flexW)}px;display:flex;flex-direction:column;gap:${cssNumber(flexGap)}px;overflow:visible;`;

      const headingHtml = renderItem({
        ...hChild,
        size: { ...readRecord(hChild.size), width: flexW }
      }, "flow");
      const descHtml = renderItem({
        ...dChild,
        size: { ...readRecord(dChild.size), width: flexW }
      }, "flow");

      flexPairHtml = `<div style="${flexStyle}">${headingHtml}${descHtml}</div>`;
    }
  }

  // 2. Dynamic offsets for list/metadata items lacking explicit coordinates to prevent stacking at (0, 0)
  let cumulativeY = 0;
  let seenZeroCoord = false;

  const otherContent = children.map((child, index) => {
    if (skipIndices.has(index)) return "";

    const cBox = readBox(child);
    const isBg = cBox.x === 0 && cBox.y === 0 && (
      child.type === "image" ||
      child.type === "vector" ||
      /background|backdrop|surface|overlay|panel_surface/i.test(readString3(child.name) || "")
    );

    let effectiveChild = child;
    if (!isBg && cBox.x === 0 && cBox.y === 0 && !child.__presenton_manual_position) {
      if (seenZeroCoord) {
        effectiveChild = {
          ...child,
          position: { x: 0, y: cumulativeY, manual: true }
        };
        cumulativeY += (cBox.height || 36) + 12;
      } else {
        seenZeroCoord = true;
        cumulativeY = (cBox.height || 36) + 12;
      }
    } else if (!isBg && cBox.y > 0) {
      cumulativeY = Math.max(cumulativeY, cBox.y + (cBox.height || 36) + 12);
    }

    return renderItem(effectiveChild, "absolute");
  }).join("");

  return `<div style="${frameStyle(item, mode, childrenBounds(children))}${boxStyle(
    item
  )}overflow:visible">${otherContent}${flexPairHtml}</div>`;
}
function renderPolygon(item, mode) {
  if (readString3(item.type) === "vector" && vectorShape(item) === "ellipse") {
    return renderEllipseVector(item, mode);
  }
  const points = polygonPoints(item);
  if (points.length < 2) return "";
  const box = polygonBox(item, points);
  const closed = polygonClosed(item, points);
  const stroke = readRecord(item.stroke);
  const fill = readRecord(item.fill);
  const fillColor = closed ? colorWithOpacity(readString3(fill.color) ?? "", readNumber3(fill.opacity)) : "";
  const strokeWidth = Math.max(0, readNumber3(stroke.width) ?? 1);
  const strokeColor = colorWithOpacity(
    readString3(stroke.color) ?? (!closed ? "#000000" : ""),
    readNumber3(stroke.opacity)
  );
  if (!fillColor && !(strokeColor && strokeWidth > 0)) return "";
  const pointString = points.map((point) => `${cssNumber(point.x - box.x)},${cssNumber(point.y - box.y)}`).join(" ");
  const dash = readArray3(stroke.dash).map(readNumber3).filter((value) => value != null).join(" ");
  const lineCap = readString3(stroke.line_cap ?? stroke.lineCap);
  const lineJoin = readString3(stroke.line_join ?? stroke.lineJoin);
  const strokeAttributes = `${dash ? ` stroke-dasharray="${dash}"` : ""}${lineCap ? ` stroke-linecap="${escapeAttribute(lineCap)}"` : ""}${lineJoin ? ` stroke-linejoin="${escapeAttribute(lineJoin)}"` : ""}`;
  const startMarkerValue = item.start_marker ?? stroke.start_marker;
  const endMarkerValue = item.end_marker ?? stroke.end_marker;
  const startMarker = !closed ? vectorMarker(startMarkerValue) : null;
  const endMarker = !closed ? vectorMarker(endMarkerValue) : null;
  const markerPrefix = `vector-marker-${vectorMarkerHash(
    `${pointString}|${strokeColor}|${strokeWidth}|${startMarker}|${endMarker}|${JSON.stringify(startMarkerValue)}|${JSON.stringify(endMarkerValue)}`
  )}`;
  const startMarkerId = `${markerPrefix}-start`;
  const endMarkerId = `${markerPrefix}-end`;
  const markerDefs = strokeColor && strokeWidth > 0 ? [
    startMarker ? vectorMarkerDefinition(
      startMarkerId,
      startMarker,
      strokeColor,
      strokeWidth,
      startMarkerValue
    ) : "",
    endMarker ? vectorMarkerDefinition(
      endMarkerId,
      endMarker,
      strokeColor,
      strokeWidth,
      endMarkerValue
    ) : ""
  ].join("") : "";
  const markerAttributes = strokeColor && strokeWidth > 0 ? `${startMarker ? ` marker-start="url(#${startMarkerId})"` : ""}${endMarker ? ` marker-end="url(#${endMarkerId})"` : ""}` : "";
  const shape = closed ? `<polygon points="${escapeAttribute(pointString)}"${fillColor ? ` fill="${escapeAttribute(fillColor)}"` : ` fill="none"`}${strokeColor && strokeWidth > 0 ? ` stroke="${escapeAttribute(strokeColor)}" stroke-width="${cssNumber(strokeWidth)}"` : ""}${strokeAttributes}/>` : `<polyline points="${escapeAttribute(pointString)}" fill="none"${strokeColor && strokeWidth > 0 ? ` stroke="${escapeAttribute(strokeColor)}" stroke-width="${cssNumber(strokeWidth)}"` : ""}${strokeAttributes}${markerAttributes}/>`;
  return `<div style="${frameStyleFromBox(box, mode)}${transformStyle(
    item
  )}overflow:visible"><svg width="100%" height="100%" viewBox="0 0 ${cssNumber(
    box.width ?? 1
  )} ${cssNumber(
    box.height ?? 1
  )}" preserveAspectRatio="none" style="display:block;overflow:visible">${markerDefs ? `<defs>${markerDefs}</defs>` : ""}${shape}</svg></div>`;
}
function vectorMarker(value) {
  const record = readRecord(value);
  const marker = readString3(record.type) ?? readString3(value);
  if (marker === "oval") return "circle";
  if (marker === "open") return "arrow";
  return marker === "arrow" || marker === "stealth" || marker === "triangle" || marker === "circle" || marker === "square" || marker === "diamond" ? marker : null;
}
function vectorMarkerHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function vectorMarkerDefinition(id, marker, color, strokeWidth, markerSettings) {
  const markerRecord = readRecord(markerSettings);
  const defaultSize = Math.max(11, Math.min(28, 8 + strokeWidth * 2.5));
  const markerLength = vectorMarkerDimension(
    markerRecord.length,
    strokeWidth,
    defaultSize
  );
  const markerWidth = vectorMarkerDimension(
    markerRecord.width,
    strokeWidth,
    defaultSize
  );
  const escapedColor = escapeAttribute(color);
  const content = marker === "arrow" ? `<path d="M1 -5 L11 0 L1 5" fill="none" stroke="${escapedColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` : marker === "stealth" ? `<path d="M11 0 L1 -5 L4.5 0 L1 5 Z" fill="${escapedColor}" stroke="${escapedColor}" stroke-width="1"/>` : marker === "triangle" ? `<path d="M11 0 L1 -5 L1 5 Z" fill="${escapedColor}" stroke="${escapedColor}" stroke-width="1"/>` : marker === "circle" ? `<circle cx="6" cy="0" r="4" fill="${escapedColor}" stroke="${escapedColor}" stroke-width="1"/>` : marker === "square" ? `<rect x="2" y="-4" width="8" height="8" fill="${escapedColor}" stroke="${escapedColor}" stroke-width="1"/>` : `<path d="M11 0 L6 -5 L1 0 L6 5 Z" fill="${escapedColor}" stroke="${escapedColor}" stroke-width="1"/>`;
  const refX = marker === "circle" || marker === "square" || marker === "diamond" ? 6 : 11;
  return `<marker id="${id}" viewBox="0 -6 12 12" refX="${refX}" refY="0" markerWidth="${cssNumber(markerLength)}" markerHeight="${cssNumber(markerWidth)}" markerUnits="userSpaceOnUse" orient="auto-start-reverse" overflow="visible">${content}</marker>`;
}
function vectorMarkerDimension(value, strokeWidth, fallback) {
  const size = readString3(value);
  const scale = size === "lg" ? 5 : size === "med" ? 3 : size === "sm" ? 2 : null;
  return scale == null ? fallback : Math.max(strokeWidth, strokeWidth * scale);
}
function renderEllipseVector(item, mode) {
  const points = polygonSourcePoints(item);
  if (points.length < 2) return "";
  const box = polygonBox(item, points);
  const stroke = readRecord(item.stroke);
  const fill = readRecord(item.fill);
  const fillColor = colorWithOpacity(
    readString3(fill.color) ?? "",
    readNumber3(fill.opacity)
  );
  const strokeWidth = Math.max(0, readNumber3(stroke.width) ?? 1);
  const strokeColor = colorWithOpacity(
    readString3(stroke.color) ?? "",
    readNumber3(stroke.opacity)
  );
  if (!fillColor && !(strokeColor && strokeWidth > 0)) return "";
  const dash = readArray3(stroke.dash).map(readNumber3).filter((value) => value != null).join(" ");
  const lineCap = readString3(stroke.line_cap ?? stroke.lineCap);
  const lineJoin = readString3(stroke.line_join ?? stroke.lineJoin);
  const strokeAttributes = `${dash ? ` stroke-dasharray="${dash}"` : ""}${lineCap ? ` stroke-linecap="${escapeAttribute(lineCap)}"` : ""}${lineJoin ? ` stroke-linejoin="${escapeAttribute(lineJoin)}"` : ""}`;
  const width = box.width ?? 1;
  const height = box.height ?? 1;
  const shape = `<ellipse cx="${cssNumber(width / 2)}" cy="${cssNumber(
    height / 2
  )}" rx="${cssNumber(width / 2)}" ry="${cssNumber(height / 2)}"${fillColor ? ` fill="${escapeAttribute(fillColor)}"` : ` fill="none"`}${strokeColor && strokeWidth > 0 ? ` stroke="${escapeAttribute(strokeColor)}" stroke-width="${cssNumber(strokeWidth)}"` : ""}${strokeAttributes}/>`;
  return `<div style="${frameStyleFromBox(box, mode)}${transformStyle(
    item
  )}overflow:visible"><svg width="100%" height="100%" viewBox="0 0 ${cssNumber(
    width
  )} ${cssNumber(
    height
  )}" preserveAspectRatio="none" style="display:block;overflow:visible">${shape}</svg></div>`;
}
function renderSvg(item, mode) {
  const svg = readStringValue(item.svg);
  if (!svg) return "";
  return `<div style="${frameStyle(item, mode)}${transformStyle(
    item
  )}overflow:hidden">${svg}</div>`;
}
function renderChart(item, mode) {
  const box = readBox(item);
  const width = Math.max(1, box.width ?? 1);
  const height = Math.max(1, box.height ?? 1);
  const config = chartConfig(item, height);
  return `<div style="${frameStyle(item, mode)}${transformStyle(
    item
  )}overflow:hidden"><canvas data-presenton-chart="true" data-chart-config="${escapeAttribute(
    JSON.stringify(config)
  )}" width="${cssNumber(Math.round(width))}" height="${cssNumber(
    Math.round(height)
  )}" style="display:block;width:100%;height:100%"></canvas></div>`;
}
var FIXED_INFOGRAPHIC_RENDERERS = {
  gantt: { designSize: { width: 720, height: 300 }, renderer: renderGanttInfographic },
  timeline: { designSize: { width: 720, height: 260 }, renderer: renderTimelineInfographic },
  roadmap: { designSize: { width: 720, height: 252 }, renderer: renderRoadmapInfographic },
  milestone_timeline: {
    designSize: { width: 720, height: 260 },
    renderer: renderMilestoneTimelineInfographic
  },
  staircase: { designSize: { width: 720, height: 340 }, renderer: renderStaircaseInfographic },
  supply_chain: { designSize: { width: 720, height: 300 }, renderer: renderSupplyChainInfographic },
  stair_step_blocks: {
    designSize: { width: 720, height: 350 },
    renderer: renderStairStepBlocksInfographic
  },
  maturity_model: {
    designSize: { width: 720, height: 390 },
    renderer: renderMaturityModelInfographic
  },
  pillar_framework: {
    designSize: { width: 720, height: 380 },
    renderer: renderPillarFrameworkInfographic
  },
  transformation_hub: {
    designSize: { width: 720, height: 300 },
    renderer: renderTransformationHubInfographic
  },
  diagonal_circles: {
    designSize: { width: 720, height: 430 },
    renderer: renderDiagonalCirclesInfographic
  },
  risk_matrix: { designSize: { width: 720, height: 370 }, renderer: renderRiskMatrixInfographic },
  chevron_process: {
    designSize: { width: 720, height: 360 },
    renderer: renderChevronProcessInfographic
  },
  radial_cycle: { designSize: { width: 560, height: 520 }, renderer: renderRadialCycleInfographic },
  conversion_funnel: {
    designSize: { width: 720, height: 320 },
    renderer: renderConversionFunnelInfographic
  },
  vertical_funnel: {
    designSize: { width: 720, height: 480 },
    renderer: renderVerticalFunnelInfographic
  },
  pyramid: { designSize: { width: 720, height: 400 }, renderer: renderPyramidInfographic },
  segmented_wheel: {
    designSize: { width: 720, height: 460 },
    renderer: renderSegmentedWheelInfographic
  },
  customer_journey: {
    designSize: { width: 720, height: 420 },
    renderer: renderCustomerJourneyInfographic
  },
  before_after: { designSize: { width: 720, height: 460 }, renderer: renderBeforeAfterInfographic },
  impact_effort_matrix: {
    designSize: { width: 720, height: 420 },
    renderer: renderImpactEffortInfographic
  },
  comparison_matrix: {
    designSize: { width: 720, height: 340 },
    renderer: renderComparisonMatrixInfographic
  },
  mind_map: { designSize: { width: 720, height: 380 }, renderer: renderMindMapInfographic }
};
function renderScaledInfographic(item, mode, designSize, renderer) {
  const box = readBox(item, designSize);
  const width = box.width ?? designSize.width;
  const height = box.height ?? designSize.height;
  const scale = Math.min(
    width / designSize.width,
    height / designSize.height
  );
  const renderedWidth = designSize.width * scale;
  const renderedHeight = designSize.height * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  const normalizedItem = {
    ...item,
    position: {
      ...readRecord(item.position),
      x: 0,
      y: 0
    },
    size: {
      ...readRecord(item.size),
      width: designSize.width,
      height: designSize.height
    },
    rotation: 0,
    flip_h: false,
    flipH: false,
    flip_v: false,
    flipV: false
  };
  return `<div style="${frameStyleFromBox(box, mode)}${transformStyle(
    item
  )}overflow:hidden"><div data-presenton-infographic-surface="true" style="position:absolute;left:${cssNumber(
    offsetX
  )}px;top:${cssNumber(offsetY)}px;width:${cssNumber(
    designSize.width
  )}px;height:${cssNumber(
    designSize.height
  )}px;transform:scale(${cssNumber(
    scale
  )});transform-origin:0 0">${renderer(normalizedItem, "absolute")}</div></div>`;
}
function renderInfographic(item, mode) {
  const data = readRecord(item.data);
  const kind = infographicKindFromValue(
    readString3(data.type ?? item.infographicType ?? item.infographic_type)
  );
  if (kind === "gauge") return renderGaugeInfographic(item, mode);
  if (kind === "org_chart" || kind === "decision_tree") {
    return renderScaledInfographic(
      item,
      mode,
      { width: 720, height: 360 },
      (normalizedItem, normalizedMode) => renderHierarchyInfographic(normalizedItem, normalizedMode, kind)
    );
  }
  const fixedRenderer = FIXED_INFOGRAPHIC_RENDERERS[kind];
  if (fixedRenderer)
    return renderScaledInfographic(
      item,
      mode,
      fixedRenderer.designSize,
      fixedRenderer.renderer
    );
  return renderProgressBarInfographic(item, mode);
}
function renderProgressBarInfographic(item, mode) {
  const metrics = infographicMetrics(item);
  const highlightColor = infographicHighlightColor(item);
  const baseColor = infographicBaseColor(item);
  const fallbackSize = { width: 180, height: 40 };
  const box = readBox(item, fallbackSize);
  const showLabel = (box.height ?? fallbackSize.height) >= 28;
  const textColor = infographicTextColor(item, highlightColor);
  const label = showLabel ? `<div style="color:${escapeCssColor(textColor)};font-size:${cssNumber(
    Math.max(
      10,
      Math.min(16, Math.round((box.height ?? fallbackSize.height) * 0.3))
    )
  )}px;font-weight:700;line-height:1;text-align:right">${escapeHtml(
    metrics.label
  )}</div>` : "";
  return `<div style="${frameStyle(item, mode, fallbackSize)}${transformStyle(
    item
  )}display:flex;flex-direction:column;gap:6px;justify-content:center;overflow:hidden"><div style="position:relative;width:100%;height:${cssNumber(
    Math.max(
      6,
      Math.min(18, Math.round((box.height ?? fallbackSize.height) * 0.35))
    )
  )}px;border-radius:999px;background:${escapeCssColor(
    baseColor
  )};overflow:hidden"><div style="height:100%;width:${cssNumber(
    metrics.ratio * 100
  )}%;border-radius:inherit;background:${escapeCssColor(highlightColor)}"></div></div>${label}</div>`;
}
function renderGaugeInfographic(item, mode) {
  const metrics = infographicMetrics(item);
  const highlightColor = infographicHighlightColor(item);
  const baseColor = infographicBaseColor(item);
  const fallbackSize = { width: 160, height: 96 };
  const progressPath = metrics.ratio > 0 ? `<path d="${escapeAttribute(
    describeGaugeArc(60, 60, 48, metrics.ratio)
  )}" fill="none" stroke="${escapeAttribute(
    escapeCssColor(highlightColor)
  )}" stroke-width="12" stroke-linecap="round"/>` : "";
  return `<div style="${frameStyle(item, mode, fallbackSize)}${transformStyle(
    item
  )}overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 120 72" preserveAspectRatio="xMidYMid meet" style="display:block"><path d="M 12 60 A 48 48 0 0 1 108 60" fill="none" stroke="${escapeAttribute(
    escapeCssColor(baseColor)
  )}" stroke-width="12" stroke-linecap="round"/>${progressPath}</svg></div>`;
}
function renderGanttInfographic(item, mode) {
  const data = infographicData(item);
  const columns = readArray3(data.columns).map(readRecord);
  const rows = readArray3(data.rows).map(readRecord);
  const safeColumns = columns.length > 0 ? columns : [{ label: "Phase" }];
  const safeRows = rows.length > 0 ? rows : [{ label: "Workstream", items: [] }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const textColor = infographicTextColor(item, dark ? "#F3F4F6" : "#111111");
  const gridColor = dark ? "rgba(217,222,232,.78)" : "#D1D5DB";
  const header = safeColumns.map(
    (column) => `<div style="display:flex;align-items:center;justify-content:center;padding:4px;font-size:13px;color:${textColor}">${escapeHtml(
      readString3(column.label) ?? "Phase"
    )}</div>`
  ).join("");
  const body = safeRows.map((row, rowIndex) => {
    const tasks = readArray3(row.items).map(readRecord).map((task, taskIndex) => {
      const start = readRecord(task.start);
      const end = readRecord(task.end);
      const startUnits = clamp(
        (readNumber3(start.column) ?? 0) + (readNumber3(start.offset) ?? 0),
        0,
        safeColumns.length
      );
      const endUnits = clamp(
        (readNumber3(end.column) ?? startUnits) + (readNumber3(end.offset) ?? 0),
        startUnits + 0.05,
        safeColumns.length
      );
      return `<div style="position:absolute;left:${cssNumber(
        startUnits / safeColumns.length * 100
      )}%;width:${cssNumber(
        (endUnits - startUnits) / safeColumns.length * 100
      )}%;top:14%;bottom:14%;border:1px solid ${gridColor};background:${escapeCssColor(
        colors[(rowIndex + taskIndex) % colors.length]
      )}"></div>`;
    }).join("");
    const grid = safeColumns.map(
      (_, index) => `<div style="position:absolute;left:${cssNumber(
        index / safeColumns.length * 100
      )}%;top:0;bottom:0;border-left:1px solid ${gridColor}"></div>`
    ).join("");
    return `<div style="display:grid;grid-template-columns:22% 78%;min-height:0;${infographicItemTransformStyle(row)}"><div style="display:flex;align-items:center;padding-right:10px;font-size:12px;color:${textColor}">${escapeHtml(
      readString3(row.label) ?? `Workstream ${rowIndex + 1}`
    )}</div><div style="position:relative;border-right:1px solid ${gridColor}">${grid}${tasks}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 300 })}${transformStyle(
    item
  )}box-sizing:border-box;overflow:hidden;${dark ? "padding:6.5% 7% 2%;" : ""}font-family:Arial,Helvetica,sans-serif"><div style="display:grid;height:12%;grid-template-columns:22% repeat(${safeColumns.length},1fr)"><div style="display:flex;align-items:center;font-size:13px;font-weight:700;color:${textColor}">Process</div>${header}</div><div style="display:grid;height:88%;grid-template-rows:repeat(${safeRows.length},minmax(0,1fr))">${body}</div></div>`;
}
function renderTimelineInfographic(item, mode) {
  const data = infographicData(item);
  const items = readArray3(data.items).map(readRecord);
  const safeItems = items.length > 0 ? items : [{ heading: "Milestone" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const mutedColor = customTextColor ?? (dark ? "#E1E4EA" : "#222222");
  const cards = safeItems.map(
    (entry, index) => `<div style="position:relative;display:flex;min-width:0;flex:1;flex-direction:column;align-items:center;text-align:center;${infographicItemTransformStyle(entry)}">${index < safeItems.length - 1 ? `<div style="position:absolute;left:calc(50% + 47px);right:calc(-50% + 47px);top:112px;height:3px;background:${escapeCssColor(colors[(index + 1) % colors.length])}"></div>` : ""}<div style="height:54px;display:flex;align-items:flex-end;padding-bottom:8px;font-size:15px;font-weight:700;color:${textColor}">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</div><div style="z-index:1;display:grid;width:90px;height:90px;box-sizing:border-box;place-items:center;border:3px solid ${escapeCssColor(colors[index % colors.length])};border-radius:999px"><div style="display:grid;width:72px;height:72px;place-items:center;border-radius:999px;background:${escapeCssColor(colors[index % colors.length])};color:#fff">${infographicIconImage(entry.icon, entry.color)}</div></div><div style="padding:12px 6px 0;font-size:15px;font-weight:700;color:${textColor}">${escapeHtml(readString3(entry.heading) ?? `Step ${index + 1}`)}</div><div style="padding:5px 8px 0;font-size:10px;line-height:1.25;color:${mutedColor}">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`
  ).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 260 })}${transformStyle(
    item
  )}box-sizing:border-box;display:flex;align-items:center;overflow:hidden;${dark ? "padding:4% 5%;" : "padding:0 2%;"}font-family:Arial,Helvetica,sans-serif"><div style="position:relative;display:flex;width:100%;align-items:flex-start">${cards}</div></div>`;
}
function renderRoadmapInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "Destination" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const roadStartRatio = (-33 - 51.84) / 616.32;
  const roadEndRatio = (720 + 33 - 51.84) / 616.32;
  const roadPath = Array.from({ length: 49 }, (_, index) => {
    const ratio = roadStartRatio + index / 48 * (roadEndRatio - roadStartRatio);
    const x = 51.84 + ratio * 616.32;
    const y = roadmapHtmlRoadRatio(ratio) * 252;
    return `${index === 0 ? "M" : "L"} ${cssNumber(x)} ${cssNumber(y)}`;
  }).join(" ");
  const content = safeEntries.map((entry, index) => {
    const ratio = safeEntries.length === 1 ? 0.5 : index / (safeEntries.length - 1);
    const x = 7.2 + ratio * 85.6;
    const roadY = roadmapHtmlRoadRatio(ratio) * 100;
    const labelY = roadmapHtmlLabelRatio(ratio) * 100;
    const color = colors[index % colors.length];
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${cssNumber(x)}%;top:calc(${cssNumber(roadY)}% - 31px);width:24px;height:32px;transform:translateX(-50%)"><div style="position:absolute;left:5px;top:15px;width:14px;height:14px;transform:rotate(45deg);background:${escapeCssColor(color)}"></div><div style="position:absolute;left:1px;top:0;width:22px;height:22px;border:1px solid #D1D5DB;border-radius:999px;background:${escapeCssColor(color)};z-index:1"><div style="position:absolute;left:5px;top:5px;width:10px;height:10px;border-radius:999px;background:linear-gradient(to bottom,#FFFFFF 0 50%,#D6D6D6 51% 100%)"></div></div></div></div><div style="position:absolute;left:${cssNumber(x)}%;top:${cssNumber(labelY)}%;width:${cssNumber(Math.min(20, 98 / safeEntries.length))}%;transform:translateX(-50%);text-align:center"><div style="font-size:14px;font-weight:700;color:${customTextColor ?? escapeCssColor(color)}">${escapeHtml(readString3(entry.heading) ?? `Stop ${index + 1}`)}</div><div style="padding-top:4px;font-size:10px;line-height:1.2;color:${textColor}">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 252 })}${transformStyle(
    item
  )}position:relative;overflow:hidden;font-family:Arial,Helvetica,sans-serif"><svg width="100%" height="100%" viewBox="0 0 720 252" preserveAspectRatio="none" style="position:absolute;inset:0;display:block"><path d="${roadPath}" fill="none" stroke="#D1D1D1" stroke-width="33" stroke-linecap="butt" stroke-linejoin="round"/><path d="${roadPath}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="11 9" stroke-linecap="butt" stroke-linejoin="round"/></svg>${content}</div>`;
}
function renderMilestoneTimelineInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 9);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "2025" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const content = safeEntries.map((entry, index) => {
    const x = 5.5 + (index + 0.5) / safeEntries.length * 89;
    const above = index % 2 === 1;
    const color = colors[index % colors.length];
    const bubbleText = blackOrWhiteTextColor(color);
    const bubbleTop = above ? 5 : 68;
    const labelTop = above ? 40 : 56;
    const triangleTop = above ? 24 : -5;
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${cssNumber(x)}%;top:50%;width:24px;height:24px;transform:translate(-50%,-50%);border:1px solid #E5E7EB;border-radius:999px;background:${escapeCssColor(color)}"></div><div style="position:absolute;left:${cssNumber(x)}%;top:${cssNumber(labelTop)}%;width:${cssNumber(Math.min(14, 90 / safeEntries.length))}%;transform:translateX(-50%);text-align:center;font-size:15px;font-weight:700;color:${customTextColor ?? escapeCssColor(color)}">${escapeHtml(readString3(entry.heading) ?? `Milestone ${index + 1}`)}</div><div style="position:absolute;left:${cssNumber(x)}%;top:${cssNumber(bubbleTop)}%;width:${cssNumber(Math.min(18, 130 / safeEntries.length))}%;min-width:84px;min-height:62px;box-sizing:border-box;transform:translateX(-50%);border:1px solid #E5E7EB;border-radius:15px;background:${escapeCssColor(color)};padding:10px 8px;text-align:center;font-size:10px;line-height:1.2;color:${bubbleText}">${escapeHtml(readString3(entry.description) ?? "")}<span style="position:absolute;left:50%;top:${cssNumber(triangleTop)}px;width:14px;height:14px;transform:translateX(-50%) rotate(45deg);background:${escapeCssColor(color)};${above ? "top:auto;bottom:-7px" : ""}"></span></div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 260 })}${transformStyle(
    item
  )}position:relative;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:${textColor}"><div style="position:absolute;left:0;right:0;top:50%;height:5px;transform:translateY(-50%);background:#E5E7EB"></div>${content}</div>`;
}
function renderStaircaseInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 7);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "Step" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const sidePadding = 28.8;
  const itemWidth = 662.4 / safeEntries.length;
  const drop = safeEntries.length > 1 ? 170 / (safeEntries.length - 1) : 0;
  const contentInset = itemWidth * 0.14;
  const staircasePoints = [`M ${cssNumber(sidePadding)} 102`];
  safeEntries.forEach((_, index) => {
    const x = sidePadding + index * itemWidth;
    const y = 102 + index * drop;
    const horizontal = x + itemWidth * 0.88;
    const nextX = index < safeEntries.length - 1 ? sidePadding + (index + 1) * itemWidth : Math.min(713, x + itemWidth * 1.02);
    const nextY = index < safeEntries.length - 1 ? y + drop : y + drop * 0.58;
    staircasePoints.push(`H ${cssNumber(horizontal)} L ${cssNumber(nextX)} ${cssNumber(nextY)}`);
  });
  const gradientId = `staircase-gradient-${safeEntries.length}-${colors.map((color) => color.replace(/[^a-zA-Z0-9]/g, "")).join("-")}`;
  const gradientStops = safeEntries.map((_, index) => {
    const offset = safeEntries.length === 1 ? 0 : index / (safeEntries.length - 1);
    return `<stop offset="${cssNumber(offset * 100)}%" stop-color="${escapeAttribute(escapeCssColor(colors[index % colors.length]))}"/>`;
  }).join("");
  const content = safeEntries.map((entry, index) => {
    const x = sidePadding + index * itemWidth;
    const y = 102 + index * drop;
    const color = colors[index % colors.length];
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${cssNumber(x + contentInset)}px;top:${cssNumber(y - 53)}px;display:grid;width:24px;height:24px;place-items:center;border-radius:999px;background:${escapeCssColor(color)}">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${cssNumber(x + contentInset)}px;top:${cssNumber(y - 21)}px;width:${cssNumber(itemWidth * 0.92)}px;font-size:13px;font-weight:700;color:${customTextColor ?? escapeCssColor(color)}">${escapeHtml(readString3(entry.heading) ?? `Step ${index + 1}`)}</div><div style="position:absolute;left:${cssNumber(x + contentInset + 1)}px;top:${cssNumber(y + 10)}px;width:${cssNumber(itemWidth * 0.88)}px;font-size:9.5px;line-height:1.2;color:${textColor}">${escapeHtml(readString3(entry.description) ?? "")}</div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 340 })}${transformStyle(
    item
  )}position:relative;overflow:hidden;font-family:Arial,Helvetica,sans-serif"><svg width="100%" height="100%" viewBox="0 0 720 340" preserveAspectRatio="none" style="position:absolute;inset:0;display:block"><defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${gradientStops}</linearGradient></defs><path d="${staircasePoints.join(" ")}" fill="none" stroke="url(#${gradientId})" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/></svg>${content}</div>`;
}
function renderSupplyChainInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 7), safe = entries.length ? entries : [{ heading: "Sourcing" }];
  const colors = infographicPalette(item), bg = infographicBaseColor(item), dark = isDarkInfographicColor(bg), text = infographicTextColor(item, dark ? "#F0F1F4" : "#111111");
  const lineColor = dark ? "#E0E0E0" : "#D2D2D2";
  const pad = safe.length > 1 ? 720 * 0.13 : 720 * 0.5, gap = safe.length > 1 ? (720 - pad * 2) / (safe.length - 1) : 0, cy = 300 * 0.49, rx = safe.length > 1 ? gap * 0.5 : Math.min(720, 300) * 0.16, ry = Math.min(rx, 300 * 0.22), radius = Math.min(rx, ry) * 0.78, k = 0.55228475;
  const wavePath = safe.map((_, index) => {
    const x = pad + index * gap, direction = index % 2 === 0 ? -1 : 1, peakY = cy + direction * ry, left = x - rx, right = x + rx, first = `${left} ${cy} C ${left} ${cy + direction * ry * k} ${x - rx * k} ${peakY} ${x} ${peakY}`, second = `C ${x + rx * k} ${peakY} ${right} ${cy + direction * ry * k} ${right} ${cy}`;
    return `${index === 0 ? "M" : "L"} ${first} ${second}`;
  }).join(" ");
  const nodes = safe.map((entry, index) => {
    const x = pad + index * gap, top = index % 2 === 1, color = colors[index % colors.length], diameter = radius * 2, titleY = top ? cy - radius - 68 : cy + radius + 31;
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${x - radius}px;top:${cy - radius}px;width:${diameter}px;height:${diameter}px;box-sizing:border-box;border:1.5px solid ${lineColor};border-radius:50%;display:grid;place-items:center;background:${escapeCssColor(color)}">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${x - 55}px;top:${titleY}px;width:110px;text-align:center;color:${escapeCssColor(text)};font:700 11px Arial">${escapeHtml(readString3(entry.heading) ?? "Stage")}</div><div style="position:absolute;left:${x - 55}px;top:${titleY + 16}px;width:110px;text-align:center;white-space:pre-line;color:${escapeCssColor(text)};font:11px/1.15 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div><div style="position:absolute;left:${x - 30}px;top:${top ? cy - radius - 24 : cy + radius + 4}px;width:60px;text-align:center;color:${escapeCssColor(color)};font:700 19px Arial">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 300 })}${transformStyle(item)}position:relative;overflow:hidden;font-family:Arial"><svg viewBox="0 0 720 300" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;inset:0"><path d="${wavePath}" fill="none" stroke="${lineColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>${nodes}</div>`;
}
function renderStairStepBlocksInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 7), safe = entries.length ? entries : [{ heading: "Foundation" }], colors = infographicPalette(item), bg = infographicBaseColor(item), dark = isDarkInfographicColor(bg), text = infographicTextColor(item, dark ? "#F0F1F4" : "#111111");
  const w = 560 / safe.length;
  const blockHeight = 102;
  const topPadding = 8;
  const firstBlockTop = safe.length > 4 ? 190 : 144;
  const rise = safe.length > 1 ? Math.min(48, (firstBlockTop - topPadding) / (safe.length - 1)) : 0;
  const content = safe.map((entry, index) => {
    const x = 80 + index * w, y = firstBlockTop - index * rise, color = colors[index % colors.length], nodeText = blackOrWhiteTextColor(color);
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${cssNumber(x)}px;top:${cssNumber(y)}px;width:${cssNumber(w + 1)}px;height:${blockHeight}px;background:${escapeCssColor(color)};box-sizing:border-box;${dark ? "border:1px solid #d6d6d6;" : ""}"><div style="padding:8px;color:${escapeCssColor(nodeText)};font:700 20px Arial">${escapeHtml(readString3(entry.label) ?? `Step ${String(index + 1).padStart(2, "0")}`)}</div><div style="position:absolute;left:9px;bottom:34px;width:22px;height:22px;display:grid;place-items:center">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:9px;bottom:6px;color:${escapeCssColor(nodeText)};font:700 10px Arial">${escapeHtml(readString3(entry.heading) ?? "Step")}</div></div><div style="position:absolute;left:${cssNumber(x + 9)}px;top:${cssNumber(y + blockHeight + 7)}px;width:${cssNumber(w - 14)}px;color:${escapeCssColor(text)};font:11px/1.16 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 350 })}${transformStyle(item)}position:relative;overflow:hidden">${content}</div>`;
}
function renderMaturityModelInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 7), safe = entries.length ? entries : [{ heading: "Initial" }], colors = infographicPalette(item);
  const content = safe.map((entry, index) => {
    const reverse = safe.length - 1 - index, w = 446, x = 22 + index * 65, y = 31 + reverse * 65, color = colors[index % colors.length], nodeText = blackOrWhiteTextColor(color);
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:56px;background:${escapeCssColor(color)};color:${escapeCssColor(nodeText)}"><div style="position:absolute;left:16px;top:0;width:24%;height:100%;display:flex;align-items:center;font:700 16px Arial">${escapeHtml(readString3(entry.heading) ?? "Level")}</div><div style="position:absolute;left:29%;top:12px;height:32px;border-left:1px solid ${escapeCssColor(nodeText)}"></div><div style="position:absolute;left:36%;top:7px;width:49%;height:42px;display:flex;align-items:center;font:12px/1.15 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div><div style="position:absolute;right:9px;top:13px;width:30px;height:30px;display:grid;place-items:center">${infographicIconImage(entry.icon, entry.color)}</div></div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 390 })}${transformStyle(item)}position:relative;overflow:hidden">${content}</div>`;
}
function renderPillarFrameworkInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 7), safe = entries.length ? entries : [{ heading: "Customer" }], colors = infographicPalette(item);
  const gap = 7, w = (680 - gap * (safe.length - 1)) / safe.length;
  const roofColor = withHash(readString3(data.card_color)) ?? "#D6D6D6", roofTextColor = withHash(readString3(data.background_text_color)) ?? withHash(readString3(item.text_color)) ?? "#4D73BE";
  const content = safe.map((entry, index) => {
    const x = 20 + index * (w + gap), color = colors[index % colors.length], nodeText = blackOrWhiteTextColor(color);
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${x}px;top:131px;width:${w}px;height:34px;display:grid;place-items:center;background:${escapeCssColor(color)};color:${escapeCssColor(nodeText)};font:700 14px Arial">${escapeHtml(readString3(entry.heading) ?? "Pillar")}</div><div style="position:absolute;left:${x}px;top:175px;width:${w}px;height:134px;background:${escapeCssColor(color)};color:${escapeCssColor(nodeText)};text-align:center"><div style="height:55px;display:grid;place-items:center">${infographicIconImage(entry.icon, entry.color)}</div><div style="padding:2px 8px;font:12px/1.18 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div></div><div style="position:absolute;left:${x}px;top:320px;width:${w}px;height:36px;display:grid;place-items:center;background:${escapeCssColor(color)};color:${escapeCssColor(nodeText)};font:11px Arial">${escapeHtml(readString3(entry.focus) ?? "")}</div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 380 })}${transformStyle(item)}position:relative;overflow:hidden;font-family:Arial"><svg viewBox="0 0 720 380" style="position:absolute;inset:0;width:100%;height:100%"><path d="M20 125 L375 6 L710 125 Z" fill="${escapeAttribute(escapeCssColor(roofColor))}"/></svg><div style="position:absolute;left:190px;top:82px;width:360px;text-align:center;color:${escapeCssColor(roofTextColor)};font:700 18px Arial">${escapeHtml(readString3(data.title) ?? "Growth & Transformation Framework")}</div>${content}</div>`;
}
function renderTransformationHubInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 8), safe = entries.length ? entries : [{ heading: "Strategy" }, { heading: "Process" }], colors = infographicPalette(item), bg = infographicBaseColor(item), dark = isDarkInfographicColor(bg);
  const centerColor = withHash(readString3(data.card_color)) ?? "#D6D6D6", centerTextColor = withHash(readString3(data.background_text_color)) ?? withHash(readString3(item.text_color)) ?? "#111111";
  const leftCount = Math.ceil(safe.length / 2), lineColor = dark ? "#e0e0e0" : "#d2d2d2", lines = [];
  const boxes = safe.map((entry, index) => {
    const left = index < leftCount, rank = left ? index : index - leftCount, count = left ? leftCount : safe.length - leftCount, centerY = 52.5 + rank * (195 / Math.max(1, count - 1)), x = left ? 11 : 511, y = centerY - 27, elbow = left ? 297 : 423, tip = left ? 191 : 511, base = left ? 198 : 504, color = colors[index % colors.length], nodeText = blackOrWhiteTextColor(color), offset = infographicItemOffsetValue(entry);
    lines.push(`<path d="M360 150 H${elbow} V${centerY + offset.y} H${base + offset.x}" fill="none" stroke="${lineColor}" stroke-width="1.5"/><polygon points="${left ? `${tip + offset.x},${centerY + offset.y} ${base + offset.x},${centerY - 4 + offset.y} ${base + offset.x},${centerY + 4 + offset.y}` : `${tip + offset.x},${centerY + offset.y} ${base + offset.x},${centerY - 4 + offset.y} ${base + offset.x},${centerY + 4 + offset.y}`}" fill="${lineColor}"/>`);
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${x}px;top:${y}px;width:180px;height:54px;box-sizing:border-box;border:1px solid ${lineColor};display:grid;place-items:center;background:${escapeCssColor(color)};color:${escapeCssColor(nodeText)};font:700 15px Arial">${escapeHtml(readString3(entry.heading) ?? "Capability")}</div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 300 })}${transformStyle(item)}position:relative;overflow:hidden"><svg viewBox="0 0 720 300" style="position:absolute;inset:0;width:100%;height:100%">${lines.join("")}</svg>${boxes}<div style="position:absolute;left:280.5px;top:70.5px;width:159px;height:159px;border-radius:50%;display:grid;place-items:center;background:${escapeCssColor(centerColor)};color:${escapeCssColor(centerTextColor)};text-align:center;font:700 20px/1.15 Arial;white-space:pre-line">${escapeHtml(readString3(data.center_label) ?? "Business Transformation")}</div></div>`;
}
function renderDiagonalCirclesInfographic(item, mode) {
  const data = infographicData(item), entries = readArray3(data.items).map(readRecord).slice(0, 7), safe = entries.length ? entries : [{ heading: "Strategy" }], colors = infographicPalette(item), bg = infographicBaseColor(item), dark = isDarkInfographicColor(bg), text = infographicTextColor(item, dark ? "#f0f1f4" : "#111111");
  const lineColor = dark ? "#e0e0e0" : "#d2d2d2", r = 58.05, arrowSize = 6.02, textW = 147.6;
  const layout = safe.map((entry, index) => {
    const x = 154.8 + index * 90, y = 301 - index * 50.74, color = colors[index % colors.length], calloutLeft = index % 2 === 1, anchorX = x + (calloutLeft ? -r * 0.64 : r * 0.3), anchorY = y + (calloutLeft ? -r * 0.77 : r * 0.954), elbowY = y + (calloutLeft ? -r * 1.28 : r * 1.22), direction = calloutLeft ? -1 : 1, arrowTipX = anchorX + direction * r * 0.82, arrowBaseX = arrowTipX - direction * arrowSize, textX = calloutLeft ? Math.max(7.2, arrowTipX - arrowSize - 12.96 - textW) : Math.min(565.2, arrowTipX + arrowSize + 12.96);
    return { anchorX, anchorY, arrowBaseX, arrowTipX, calloutLeft, color, elbowY, entry, index, textX, x, y };
  });
  const circles = layout.map(({ color, x, y }) => `<div style="position:absolute;left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${escapeCssColor(color)};opacity:.88"></div>`).join("");
  const connectors = layout.map(({ anchorX, anchorY, arrowBaseX, arrowTipX, elbowY }) => `<path d="M${anchorX} ${anchorY} V${elbowY} H${arrowBaseX}" fill="none" stroke="${lineColor}" stroke-width="1.5"/><polygon points="${arrowTipX},${elbowY} ${arrowBaseX},${elbowY - arrowSize * 0.65} ${arrowBaseX},${elbowY + arrowSize * 0.65}" fill="${lineColor}"/><circle cx="${anchorX}" cy="${anchorY}" r="3" fill="${lineColor}"/>`).join("");
  const annotations = layout.map(({ calloutLeft, color, elbowY, entry, index, textX, x, y }) => {
    const nodeText = blackOrWhiteTextColor(color), numberLeft = calloutLeft ? x - r * 0.82 : x - r * 0.05, numberTop = calloutLeft ? y - r * 0.78 : y + r * 0.51, iconLeft = x + r * 0.62 - r * 0.34, iconTop = y - r * 0.34 - r * 0.34;
    return `<div style="position:absolute;left:${numberLeft}px;top:${numberTop}px;width:${r * 0.7}px;height:${r * 0.35}px;text-align:center;color:${escapeCssColor(nodeText)};font:700 19px Arial">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</div><div style="position:absolute;left:${iconLeft}px;top:${iconTop}px;width:${r * 0.68}px;height:${r * 0.68}px;display:grid;place-items:center">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${textX}px;top:${elbowY - 11.18}px;width:${textW}px;text-align:${calloutLeft ? "right" : "left"};color:${escapeCssColor(text)}"><div style="height:21.5px;color:${escapeCssColor(color)};font:700 12px Arial">${escapeHtml(readString3(entry.heading) ?? "Pillar")}</div><div style="padding-top:8px;font:11px/1.15 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 430 })}${transformStyle(item)}position:relative;overflow:hidden">${circles}<svg viewBox="0 0 720 430" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">${connectors}</svg>${annotations}</div>`;
}
function renderRiskMatrixInfographic(item, mode) {
  const data = infographicData(item), raw = readArray3(data.items).map(readRecord).slice(0, 4), defaults = [{ heading: "Identify" }, { heading: "Prioritize" }, { heading: "Assess" }, { heading: "Respond" }], safe = defaults.map((fallback, index) => raw[index] ?? fallback), colors = infographicPalette(item), bg = infographicBaseColor(item), dark = isDarkInfographicColor(bg), text = infographicTextColor(item, dark ? "#f0f1f4" : "#111111");
  const q = 159, cx = 360, cy = 185, pos = [[194.5, 19.5], [366.5, 19.5], [194.5, 191.5], [366.5, 191.5]], sideMargin = 10.8, arrowGap = 13, arrowLength = 28.8, textGap = 13, arrowHalf = 20.35, arrows = [];
  const content = safe.map((entry, index) => {
    const [x, y] = pos[index], left = index % 2 === 0, color = colors[index % colors.length], mid = y + q / 2, blockEdge = left ? x : x + q, arrowBase = blockEdge + (left ? -arrowGap : arrowGap), arrowTip = arrowBase + (left ? -arrowLength : arrowLength), tx = left ? sideMargin : arrowTip + textGap, textWidth = left ? Math.max(86.4, arrowTip - textGap - sideMargin) : Math.max(86.4, 720 - sideMargin - tx);
    arrows.push(`<polygon points="${arrowTip},${mid} ${arrowBase},${mid - arrowHalf} ${arrowBase},${mid + arrowHalf}" fill="${escapeCssColor(color)}"/>`);
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${q}px;height:${q}px;border-radius:16px;display:grid;place-items:center;background:${escapeCssColor(color)}">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${tx}px;top:${y + q * 0.27}px;width:${textWidth}px;text-align:${left ? "right" : "left"};color:${escapeCssColor(text)}"><div style="height:${q * 0.11}px;color:${escapeCssColor(color)};font:700 12px Arial">${escapeHtml(readString3(entry.heading) ?? "Activity")}</div><div style="padding-top:${q * 0.01}px;font:11px/1.1 Arial">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  const label = (readString3(data.center_label) ?? "RISK").padEnd(4, " ").slice(0, 4);
  return `<div style="${frameStyle(item, mode, { width: 720, height: 370 })}${transformStyle(item)}position:relative;overflow:hidden"><svg viewBox="0 0 720 370" style="position:absolute;inset:0;width:100%;height:100%">${arrows.join("")}</svg>${content}<div style="position:absolute;left:${cx - q * 0.375}px;top:${cy - q * 0.375}px;width:${q * 0.75}px;height:${q * 0.75}px;border-radius:16px;background:rgba(255,255,255,.34);display:grid;grid-template-columns:1fr 1fr;color:#fff;font:700 24px Arial;text-align:center;align-items:center">${label.split("").map((letter) => `<span>${escapeHtml(letter)}</span>`).join("")}</div></div>`;
}
function renderChevronProcessInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "Stage" }];
  const colors = infographicPalette(item);
  const baseColor = infographicBaseColor(item);
  const dark = isDarkInfographicColor(baseColor);
  const customTextColor = withHash(readString3(item.text_color));
  const bodyColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const sidePadding = 25.2;
  const contentWidth = 597.6;
  const itemStep = contentWidth / (safeEntries.length + 0.34);
  const shapes = safeEntries.map((entry, index) => {
    const x = sidePadding + index * itemStep;
    const shapeWidth = itemStep * 1.34;
    const color = colors[index % colors.length];
    const nodeTextColor = blackOrWhiteTextColor(color);
    const anchorX = x + shapeWidth * 0.565;
    const above = index % 2 === 1;
    const dotY = above ? 27 : 328;
    const labelX = anchorX + 8.64;
    const labelWidth = Math.max(
      72,
      Math.min(itemStep * 1.45, 720 - labelX - 18)
    );
    const labelY = above ? 22 : 284;
    const labelColor = customTextColor ?? (dark ? bodyColor : color);
    const points = [
      x,
      115.2,
      x + shapeWidth * 0.68,
      115.2,
      x + shapeWidth,
      180,
      x + shapeWidth * 0.68,
      244.8,
      x + shapeWidth * 0.04,
      244.8,
      x + shapeWidth * 0.38,
      180
    ].map(cssNumber).join(" ");
    const lineStart = above ? 164 : 187;
    return `<polygon points="${points}" fill="${escapeAttribute(escapeCssColor(color))}"/><text x="${cssNumber(anchorX)}" y="188" text-anchor="middle" fill="${escapeAttribute(escapeCssColor(nodeTextColor))}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</text><line x1="${cssNumber(anchorX)}" y1="${lineStart}" x2="${cssNumber(anchorX)}" y2="${dotY}" stroke="#D1D1D1" stroke-width="1.5"/><circle cx="${cssNumber(anchorX)}" cy="${dotY}" r="4" fill="${escapeAttribute(escapeCssColor(color))}"/><foreignObject x="${cssNumber(labelX)}" y="${cssNumber(labelY)}" width="${cssNumber(labelWidth)}" height="70"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;color:${escapeCssColor(bodyColor)}"><div style="font-size:13px;font-weight:700;line-height:1.15;color:${escapeCssColor(labelColor)}">${escapeHtml(readString3(entry.heading) ?? `Stage ${index + 1}`)}</div><div style="padding-top:6px;font-size:10px;line-height:1.2">${escapeHtml(readString3(entry.description) ?? "")}</div></div></foreignObject>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 360 })}${transformStyle(
    item
  )}overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 360" preserveAspectRatio="none" style="display:block">${shapes}</svg></div>`;
}
function renderRadialCycleInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "Stage" }];
  const colors = infographicPalette(item);
  const centerX = 280;
  const centerY = 260;
  const orbitX = 176.4;
  const orbitY = 163.8;
  const nodeRadius = safeEntries.length >= 6 ? 60 : 72;
  const startAngle = 270 - 360 / safeEntries.length;
  const centerImage = readString3(data.center_image);
  const centerImageSettings = readRecord(data.center_image_settings);
  const centerImageFit = readString3(centerImageSettings.fit) === "contain" ? "contain" : "cover";
  const centerImageFocusX = clamp(readNumber3(centerImageSettings.focus_x) ?? 50, 0, 100);
  const centerImageFocusY = clamp(readNumber3(centerImageSettings.focus_y) ?? 50, 0, 100);
  const centerImageScale = clamp(readNumber3(centerImageSettings.crop_scale) ?? 1, 0.1, 6);
  const centerImageFlipX = readBoolean2(centerImageSettings.flip_h) === true ? -1 : 1;
  const centerImageFlipY = readBoolean2(centerImageSettings.flip_v) === true ? -1 : 1;
  const centerImageOpacity = clamp(readNumber3(centerImageSettings.opacity) ?? 1, 0, 1);
  const centerImageRadius = clamp(
    (Array.isArray(centerImageSettings.border_radius) ? readNumber3(centerImageSettings.border_radius[0]) : readNumber3(centerImageSettings.border_radius)) ?? 999,
    0,
    999
  );
  const center = centerImage ? `<div style="position:absolute;left:50%;top:50%;width:156px;height:156px;transform:translate(-50%,-50%);border-radius:${cssNumber(centerImageRadius)}px;overflow:hidden"><img alt="" src="${escapeAttribute(centerImage)}" style="display:block;width:100%;height:100%;transform:scale(${cssNumber(centerImageScale * centerImageFlipX)},${cssNumber(centerImageScale * centerImageFlipY)});object-fit:${centerImageFit};object-position:${cssNumber(centerImageFocusX)}% ${cssNumber(centerImageFocusY)}%;opacity:${cssNumber(centerImageOpacity)}"></div>` : `<div style="position:absolute;left:50%;top:50%;width:156px;height:156px;transform:translate(-50%,-50%);border:1px solid #D1D5DB;border-radius:999px;background:#EEF1F5"></div>`;
  const nodes = safeEntries.map((entry, index) => {
    const angle = (startAngle + index * (360 / safeEntries.length)) * Math.PI / 180;
    const x = centerX + Math.cos(angle) * orbitX;
    const y = centerY + Math.sin(angle) * orbitY;
    const color = colors[index % colors.length];
    const nodeTextColor = blackOrWhiteTextColor(color);
    return infographicHtmlItem(entry, `<div style="position:absolute;left:${cssNumber(x)}px;top:${cssNumber(y)}px;width:${cssNumber(nodeRadius * 2)}px;height:${cssNumber(nodeRadius * 2)}px;box-sizing:border-box;transform:translate(-50%,-50%);border:1.5px solid #D1D1D1;border-radius:999px;background:${escapeCssColor(color)};color:${escapeCssColor(nodeTextColor)};font-family:Arial,Helvetica,sans-serif;text-align:center"><div style="position:absolute;left:50%;top:10%;display:grid;width:${cssNumber(nodeRadius * 0.5)}px;height:${cssNumber(nodeRadius * 0.5)}px;transform:translateX(-50%);place-items:center;border-radius:999px;background:#FFFFFF;color:#111111;font-size:${cssNumber(Math.max(11, nodeRadius * 0.21))}px;font-weight:700">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</div><div style="position:absolute;left:9%;right:9%;top:46%;font-size:${cssNumber(Math.max(10, nodeRadius * 0.16))}px;font-weight:700;line-height:1.1">${escapeHtml(readString3(entry.heading) ?? `Stage ${index + 1}`)}</div><div style="position:absolute;left:9%;right:9%;top:62%;font-size:${cssNumber(Math.max(8, nodeRadius * 0.125))}px;line-height:1.15">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`);
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 560, height: 520 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 560 520" preserveAspectRatio="none" style="position:absolute;inset:0;display:block"><ellipse cx="280" cy="260" rx="176.4" ry="163.8" fill="none" stroke="#D1D1D1" stroke-width="2" stroke-dasharray="7 7"/></svg>${center}${nodes}</div>`;
}
function renderConversionFunnelInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ value: 50, heading: "Stage" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const textColor = infographicTextColor(item, dark ? "#F0F1F4" : "#111111");
  const columnWidth = 720 / safeEntries.length;
  const fills = safeEntries.map((_, index) => {
    const x0 = index * columnWidth;
    const x1 = (index + 1) * columnWidth;
    const curve = Array.from({ length: 11 }, (__, pointIndex) => {
      const x = x1 - pointIndex / 10 * columnWidth;
      return `${cssNumber(x)},${cssNumber(funnelHtmlBoundaryRatio(x / 720) * 320)}`;
    });
    const points = [`${cssNumber(x0)},0`, `${cssNumber(x1 + 0.5)},0`, ...curve, `${cssNumber(x0)},${cssNumber(funnelHtmlBoundaryRatio(x0 / 720) * 320)}`].join(" ");
    return `<polygon points="${points}" fill="${escapeAttribute(escapeCssColor(colors[index % colors.length]))}"/>`;
  }).join("");
  const curvePath = Array.from({ length: 41 }, (_, index) => {
    const x = index / 40 * 720;
    const y = funnelHtmlBoundaryRatio(x / 720) * 320;
    return `${index === 0 ? "M" : "L"} ${cssNumber(x)} ${cssNumber(y)}`;
  }).join(" ");
  const separators = safeEntries.slice(1).map((_, index) => {
    const x = (index + 1) * columnWidth;
    return `<line x1="${cssNumber(x)}" y1="0" x2="${cssNumber(x)}" y2="320" stroke="#D1D1D1" stroke-width="1.5"/>`;
  }).join("");
  const labels = safeEntries.map((entry, index) => {
    const x = index * columnWidth + columnWidth * 0.13;
    const value = clamp(readNumber3(entry.value) ?? 0, 0, 100);
    return `<div style="position:absolute;left:${cssNumber(x)}px;top:68%;width:${cssNumber(columnWidth * 0.78)}px;color:${escapeCssColor(textColor)};font-family:Arial,Helvetica,sans-serif"><div style="font-size:19px;font-weight:700">${Math.round(value)}%</div><div style="padding-top:7px;font-size:12px;font-weight:700">${escapeHtml(readString3(entry.heading) ?? `Stage ${index + 1}`)}</div><div style="padding-top:12px;font-size:11px;line-height:1.2">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 320 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 320" preserveAspectRatio="none" style="position:absolute;inset:0;display:block">${fills}<path d="${curvePath}" fill="none" stroke="${escapeAttribute(escapeCssColor(colors[(safeEntries.length + 1) % colors.length]))}" stroke-width="6" stroke-linejoin="round"/>${separators}<rect x=".75" y=".75" width="718.5" height="318.5" fill="none" stroke="#D1D1D1" stroke-width="1.5"/></svg>${labels}</div>`;
}
function renderVerticalFunnelInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ value: 50, heading: "Stage" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const textColor = infographicTextColor(item, dark ? "#F0F1F4" : "#111111");
  const top = 38;
  const bottom = 38;
  const funnelCenterX = 360;
  const maxFunnelWidth = 300;
  const stageHeight = (480 - top - bottom) / safeEntries.length;
  const valueAt = (index) => clamp(readNumber3(safeEntries[index]?.value) ?? 0, 0, 100);
  const widthAt = (value) => Math.max(4, value / 100 * maxFunnelWidth);
  const guides = safeEntries.map((_, index) => {
    const y = top + index * stageHeight;
    return `<line x1="140" y1="${cssNumber(y)}" x2="615" y2="${cssNumber(y)}" stroke="#D1D5DB" stroke-width="1"/>`;
  }).join("");
  const fills = safeEntries.map((_, index) => {
    const y0 = top + index * stageHeight;
    const y1 = y0 + stageHeight;
    const topWidth = widthAt(valueAt(index));
    const bottomWidth = widthAt(valueAt(Math.min(index + 1, safeEntries.length - 1)));
    const points = [
      `${cssNumber(funnelCenterX - topWidth / 2)},${cssNumber(y0)}`,
      `${cssNumber(funnelCenterX + topWidth / 2)},${cssNumber(y0)}`,
      `${cssNumber(funnelCenterX + bottomWidth / 2)},${cssNumber(y1)}`,
      `${cssNumber(funnelCenterX - bottomWidth / 2)},${cssNumber(y1)}`
    ].join(" ");
    return `<polygon points="${points}" fill="${escapeAttribute(escapeCssColor(colors[index % colors.length]))}"/>`;
  }).join("");
  const labels = safeEntries.map((entry, index) => {
    const y = top + index * stageHeight;
    const value = valueAt(index);
    return `<div style="position:absolute;left:18px;top:${cssNumber(y - 12)}px;width:185px;color:${escapeCssColor(textColor)};font-family:Arial,Helvetica,sans-serif"><div style="font-size:15px;font-weight:700;line-height:1.1">${escapeHtml(readString3(entry.heading) ?? `Stage ${index + 1}`)}</div><div style="padding-top:5px;font-size:10px;line-height:1.15">${escapeHtml(readString3(entry.description) ?? "")}</div></div><div style="position:absolute;left:628px;top:${cssNumber(y - 12)}px;width:74px;color:${escapeCssColor(textColor)};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.1">${cssNumber(value)}%</div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 480 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 480" preserveAspectRatio="none" style="position:absolute;inset:0;display:block">${guides}${fills}</svg>${labels}</div>`;
}
function renderPyramidInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 4);
  const safeEntries = entries.length >= 3 ? entries : [{ heading: "Foundation" }, { heading: "Efficiency" }, { heading: "Innovation" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const outsideTextColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const apexX = 360;
  const apexY = 20;
  const bottomY = 376;
  const baseLeft = 180;
  const baseRight = 540;
  const firstCut = 140;
  const secondCut = 272;
  const leftAt = (y) => apexX - (y - apexY) / (bottomY - apexY) * (apexX - baseLeft);
  const rightAt = (y) => apexX + (y - apexY) / (bottomY - apexY) * (baseRight - apexX);
  const shapes = [
    { entry: safeEntries[0], points: [apexX, apexY, rightAt(firstCut), firstCut, leftAt(firstCut), firstCut], x: apexX, y: (apexY + firstCut * 2) / 3, placement: "right-top" },
    { entry: safeEntries[1], points: [leftAt(firstCut), firstCut, rightAt(firstCut), firstCut, rightAt(secondCut), secondCut, leftAt(secondCut), secondCut], x: apexX, y: (firstCut + secondCut) / 2, placement: "left-middle" },
    ...safeEntries.length >= 4 ? [
      { entry: safeEntries[2], points: [leftAt(secondCut), secondCut, apexX, secondCut, apexX, bottomY, baseLeft, bottomY], x: (leftAt(secondCut) + apexX + baseLeft) / 3, y: (secondCut + bottomY) / 2, placement: "left-bottom" },
      { entry: safeEntries[3], points: [apexX, secondCut, rightAt(secondCut), secondCut, baseRight, bottomY, apexX, bottomY], x: (rightAt(secondCut) + apexX + baseRight) / 3, y: (secondCut + bottomY) / 2, placement: "right-bottom" }
    ] : [
      { entry: safeEntries[2], points: [leftAt(secondCut), secondCut, rightAt(secondCut), secondCut, baseRight, bottomY, baseLeft, bottomY], x: apexX, y: (secondCut + bottomY) / 2, placement: "right-bottom" }
    ]
  ];
  const polygons = shapes.map((shape, index) => `<polygon points="${shape.points.map(cssNumber).join(" ")}" fill="${escapeAttribute(escapeCssColor(colors[index % colors.length]))}"/>`).join("");
  const content = shapes.map((shape, index) => {
    const color = colors[index % colors.length];
    const insideTextColor = blackOrWhiteTextColor(color);
    const layout = pyramidHtmlCalloutLayout(shape.placement);
    const lineX = Math.min(layout.lineStart, layout.lineEnd);
    return `<div style="position:absolute;left:${cssNumber(shape.x - 24)}px;top:${cssNumber(shape.y - 21)}px;display:grid;width:48px;height:48px;place-items:center">${infographicIconImage(shape.entry.icon, shape.entry.color)}</div><div style="position:absolute;left:${cssNumber(shape.x - 64.8)}px;top:${cssNumber(shape.y + 22)}px;width:129.6px;text-align:center;color:${escapeCssColor(insideTextColor)};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700">${escapeHtml(readString3(shape.entry.heading) ?? `Level ${index + 1}`)}</div><div style="position:absolute;left:${cssNumber(lineX)}px;top:${cssNumber(layout.lineY)}px;width:${cssNumber(Math.abs(layout.lineEnd - layout.lineStart))}px;border-top:1.25px solid #D1D1D1"></div><div style="position:absolute;left:${cssNumber(layout.textX)}px;top:${cssNumber(layout.lineY - 6)}px;width:${cssNumber(layout.textWidth)}px;color:${escapeCssColor(outsideTextColor)};font-family:Arial,Helvetica,sans-serif;text-align:${layout.align}"><div style="font-size:13px;font-weight:700;line-height:1.15">${escapeHtml(readString3(shape.entry.heading) ?? `Level ${index + 1}`)}</div><div style="padding-top:7px;font-size:10.5px;line-height:1.2">${escapeHtml(readString3(shape.entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 400 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 400" preserveAspectRatio="none" style="position:absolute;inset:0;display:block">${polygons}</svg>${content}</div>`;
}
function renderSegmentedWheelInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 6);
  const safeEntries = entries.length >= 3 ? entries : [{ heading: "Foundation" }, { heading: "Efficiency" }, { heading: "Growth" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const outsideTextColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const centerX = 360;
  const centerY = 218.5;
  const outerRadius = Math.min(720 * 0.235, 460 * 0.33);
  const innerRadius = outerRadius * 0.29;
  const angleStep = 360 / safeEntries.length;
  const gapAngle = Math.min(5, angleStep * 0.08);
  const labelWidth = 147.6;
  const shapes = safeEntries.map((entry, index) => {
    const middleAngle = -90 + (index + 0.5) * angleStep;
    const startAngle = middleAngle - angleStep / 2 + gapAngle / 2;
    const endAngle = middleAngle + angleStep / 2 - gapAngle / 2;
    const color = colors[index % colors.length];
    const anchor = infographicPolarPoint(centerX, centerY, outerRadius + 2, middleAngle);
    const elbow = infographicPolarPoint(centerX, centerY, outerRadius + 460 * 0.055, middleAngle);
    const horizontalBias = Math.cos(middleAngle * Math.PI / 180);
    const direction = Math.abs(horizontalBias) <= 0.08 ? safeEntries.length === 3 ? 1 : -1 : horizontalBias > 0 ? 1 : -1;
    const endX = elbow.x + direction * 720 * 0.032;
    const connectorColor = dark ? "#E5E7EB" : color;
    return `<path d="${annularSectorHtmlPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, Math.max(5, outerRadius * 0.035))}" fill="${escapeAttribute(escapeCssColor(color))}"/><polyline points="${cssNumber(anchor.x)},${cssNumber(anchor.y)} ${cssNumber(elbow.x)},${cssNumber(elbow.y)} ${cssNumber(endX)},${cssNumber(elbow.y)}" fill="none" stroke="${escapeAttribute(escapeCssColor(connectorColor))}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${cssNumber(endX)}" cy="${cssNumber(elbow.y)}" r="4" fill="${escapeAttribute(escapeCssColor(connectorColor))}"/>`;
  }).join("");
  const content = safeEntries.map((entry, index) => {
    const middleAngle = -90 + (index + 0.5) * angleStep;
    const color = colors[index % colors.length];
    const iconPoint = infographicPolarPoint(centerX, centerY, (innerRadius + outerRadius) * 0.54, middleAngle);
    const elbow = infographicPolarPoint(centerX, centerY, outerRadius + 460 * 0.055, middleAngle);
    const horizontalBias = Math.cos(middleAngle * Math.PI / 180);
    const direction = Math.abs(horizontalBias) <= 0.08 ? safeEntries.length === 3 ? 1 : -1 : horizontalBias > 0 ? 1 : -1;
    const endX = elbow.x + direction * 720 * 0.032;
    const textX = direction > 0 ? endX + 10.08 : endX - 10.08 - labelWidth;
    const align = direction > 0 ? "left" : "right";
    const headingColor = customTextColor ?? (dark ? outsideTextColor : color);
    return `<div style="position:absolute;left:${cssNumber(iconPoint.x - 24)}px;top:${cssNumber(iconPoint.y - 24)}px;display:grid;width:48px;height:48px;place-items:center">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${cssNumber(textX)}px;top:${cssNumber(elbow.y - 7)}px;width:${labelWidth}px;text-align:${align};font-family:Arial,Helvetica,sans-serif;color:${escapeCssColor(outsideTextColor)}"><div style="font-size:14px;font-weight:700;line-height:1.15;color:${escapeCssColor(headingColor)}">${escapeHtml(readString3(entry.heading) ?? `Segment ${index + 1}`)}</div><div style="padding-top:8px;font-size:11px;line-height:1.18">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 460 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 460" preserveAspectRatio="none" style="position:absolute;inset:0;display:block">${shapes}</svg>${content}</div>`;
}
function renderCustomerJourneyInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 6);
  const safeEntries = entries.length >= 4 ? entries : [{}, { heading: "Awareness" }, { heading: "Consideration" }, { heading: "Experience" }];
  const startEntry = safeEntries[0];
  const stages = safeEntries.slice(1);
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const start = { x: 57.6, y: 268.8 };
  const nodeRadius = Math.min(720 * 0.063, 420 * 0.11);
  const topY = 126;
  const bottomY = 277.2;
  const stageStartX = 208.8;
  const stageEndX = 604.8;
  const stagePoints = stages.map((_, index) => ({
    x: stages.length === 1 ? (stageStartX + stageEndX) / 2 : stageStartX + index / (stages.length - 1) * (stageEndX - stageStartX),
    y: index % 2 === 0 ? topY : bottomY
  }));
  const lastPoint = stagePoints.at(-1) ?? start;
  const pathData = roundedOrthogonalHtmlPath([start, ...stagePoints, { x: 691.2, y: lastPoint.y }], Math.max(10, 720 * 0.018));
  const pathColor = dark ? "#E2E2E2" : "#D1D1D1";
  const startColor = normalizeChartColor(readString3(data.start_color)) ?? (colors.length >= 12 ? colors.at(-2) : null) ?? "#D6D6D6";
  const startContent = `<div style="position:absolute;left:${cssNumber(start.x - nodeRadius * 1.08)}px;top:${cssNumber(start.y - nodeRadius * 1.08)}px;display:grid;width:${cssNumber(nodeRadius * 2.16)}px;height:${cssNumber(nodeRadius * 2.16)}px;place-items:center;border-radius:999px;background:${escapeCssColor(startColor)}">${infographicIconImage(startEntry.icon, startEntry.color)}</div>`;
  const stageContent = stages.map((entry, index) => {
    const point = stagePoints[index];
    const color = colors[index % colors.length];
    const above = index % 2 === 1;
    const textWidth = 122.4;
    const headingY = above ? point.y - nodeRadius - 84 : point.y + nodeRadius + 10.5;
    const headingColor = customTextColor ?? (dark ? textColor : color);
    return `<div style="position:absolute;left:${cssNumber(point.x - nodeRadius)}px;top:${cssNumber(point.y - nodeRadius)}px;display:grid;width:${cssNumber(nodeRadius * 2)}px;height:${cssNumber(nodeRadius * 2)}px;place-items:center;border-radius:999px;background:${escapeCssColor(color)}">${infographicIconImage(entry.icon, entry.color)}</div><div style="position:absolute;left:${cssNumber(point.x - textWidth / 2)}px;top:${cssNumber(headingY)}px;width:${textWidth}px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:${escapeCssColor(textColor)}"><div style="font-size:14px;font-weight:700;line-height:1.15;color:${escapeCssColor(headingColor)}">${escapeHtml(readString3(entry.heading) ?? `Stage ${index + 1}`)}</div><div style="padding-top:7px;font-size:11px;line-height:1.15">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 420 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 720 420" preserveAspectRatio="none" style="position:absolute;inset:0;display:block"><path d="${pathData}" fill="none" stroke="${escapeAttribute(escapeCssColor(pathColor))}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>${startContent}${stageContent}</div>`;
}
function renderBeforeAfterInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 10);
  const evenEntries = entries.slice(0, entries.length - entries.length % 2);
  const safeEntries = evenEntries.length >= 2 ? evenEntries : [{ heading: "Before" }, { heading: "After" }];
  const pairCount = safeEntries.length / 2;
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const lineTop = 82.8;
  const lineBottom = 432.4;
  const nodeRadius = Math.min(720 * 0.043, 460 * 0.075);
  const rowTop = 142.6;
  const rowBottom = 372.6;
  const rowY = (index) => pairCount === 1 ? (rowTop + rowBottom) / 2 : rowTop + index / (pairCount - 1) * (rowBottom - rowTop);
  const pillFill = dark ? "#FFFFFF" : colors[Math.min(3, colors.length - 1)];
  const pillText = dark ? colors[Math.min(3, colors.length - 1)] : "#F0F1F4";
  const dividers = Array.from({ length: Math.max(0, pairCount - 1) }, (_, index) => `<div style="position:absolute;left:352px;top:${cssNumber((rowY(index) + rowY(index + 1)) / 2 - 8)}px;width:16px;height:16px;border-radius:999px;background:#D1D1D1"></div>`).join("");
  const rows = Array.from({ length: pairCount }, (_, index) => {
    const beforeEntry = safeEntries[index * 2];
    const afterEntry = safeEntries[index * 2 + 1];
    const y = rowY(index);
    const beforeColor = colors[index % colors.length];
    const afterColor = colors[(index + pairCount) % colors.length];
    const beforeHeadingColor = customTextColor ?? (dark ? textColor : beforeColor);
    const afterHeadingColor = customTextColor ?? (dark ? textColor : afterColor);
    return `<div style="position:absolute;left:${cssNumber(280.8 - nodeRadius)}px;top:${cssNumber(y - nodeRadius)}px;display:grid;width:${cssNumber(nodeRadius * 2)}px;height:${cssNumber(nodeRadius * 2)}px;place-items:center;border-radius:999px;background:${escapeCssColor(beforeColor)}">${infographicIconImage(beforeEntry.icon, beforeEntry.color)}</div><div style="position:absolute;left:32.4px;top:${cssNumber(y - 16)}px;width:194.4px;font-family:Arial,Helvetica,sans-serif;color:${escapeCssColor(textColor)}"><div style="font-size:14px;font-weight:700;color:${escapeCssColor(beforeHeadingColor)}">${escapeHtml(readString3(beforeEntry.heading) ?? `Before ${index + 1}`)}</div><div style="padding-top:8px;font-size:11px;line-height:1.15">${escapeHtml(readString3(beforeEntry.description) ?? "")}</div></div><div style="position:absolute;left:${cssNumber(439.2 - nodeRadius)}px;top:${cssNumber(y - nodeRadius)}px;display:grid;width:${cssNumber(nodeRadius * 2)}px;height:${cssNumber(nodeRadius * 2)}px;place-items:center;border-radius:999px;background:${escapeCssColor(afterColor)}">${infographicIconImage(afterEntry.icon, afterEntry.color)}</div><div style="position:absolute;left:493.2px;top:${cssNumber(y - 16)}px;width:194.4px;text-align:right;font-family:Arial,Helvetica,sans-serif;color:${escapeCssColor(textColor)}"><div style="font-size:14px;font-weight:700;color:${escapeCssColor(afterHeadingColor)}">${escapeHtml(readString3(afterEntry.heading) ?? `After ${index + 1}`)}</div><div style="padding-top:8px;font-size:11px;line-height:1.15">${escapeHtml(readString3(afterEntry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 460 })}${transformStyle(
    item
  )}position:relative;overflow:hidden"><div style="position:absolute;left:32.4px;top:18.4px;display:grid;width:100.8px;height:32.2px;place-items:center;border-radius:999px;background:${escapeCssColor(pillFill)};color:${escapeCssColor(pillText)};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700">${escapeHtml(readString3(data.before_label) ?? "Before")}</div><div style="position:absolute;left:586.8px;top:18.4px;display:grid;width:100.8px;height:32.2px;place-items:center;border-radius:999px;background:${escapeCssColor(pillFill)};color:${escapeCssColor(pillText)};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700">${escapeHtml(readString3(data.after_label) ?? "After")}</div><div style="position:absolute;left:359.25px;top:${lineTop}px;width:1.5px;height:${cssNumber(lineBottom - lineTop)}px;background:#D1D1D1"></div><div style="position:absolute;left:356px;top:${cssNumber(lineTop - 4)}px;width:8px;height:8px;border-radius:999px;background:#D1D1D1"></div><div style="position:absolute;left:356px;top:${cssNumber(lineBottom - 4)}px;width:8px;height:8px;border-radius:999px;background:#D1D1D1"></div>${dividers}${rows}</div>`;
}
function infographicPolarPoint(centerX, centerY, radius, angleDegrees) {
  const angle = angleDegrees * Math.PI / 180;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}
function annularSectorHtmlPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, cornerRadius) {
  const span = endAngle - startAngle;
  const outerOffset = Math.min(cornerRadius / outerRadius * (180 / Math.PI), span * 0.18);
  const innerOffset = Math.min(cornerRadius / innerRadius * (180 / Math.PI), span * 0.18);
  const outerStart = infographicPolarPoint(centerX, centerY, outerRadius, startAngle + outerOffset);
  const outerEnd = infographicPolarPoint(centerX, centerY, outerRadius, endAngle - outerOffset);
  const outerCornerEnd = infographicPolarPoint(centerX, centerY, outerRadius, endAngle);
  const outerInsetEnd = infographicPolarPoint(centerX, centerY, outerRadius - cornerRadius, endAngle);
  const innerOutEnd = infographicPolarPoint(centerX, centerY, innerRadius + cornerRadius, endAngle);
  const innerCornerEnd = infographicPolarPoint(centerX, centerY, innerRadius, endAngle);
  const innerEnd = infographicPolarPoint(centerX, centerY, innerRadius, endAngle - innerOffset);
  const innerStart = infographicPolarPoint(centerX, centerY, innerRadius, startAngle + innerOffset);
  const innerCornerStart = infographicPolarPoint(centerX, centerY, innerRadius, startAngle);
  const innerOutStart = infographicPolarPoint(centerX, centerY, innerRadius + cornerRadius, startAngle);
  const outerInsetStart = infographicPolarPoint(centerX, centerY, outerRadius - cornerRadius, startAngle);
  const outerCornerStart = infographicPolarPoint(centerX, centerY, outerRadius, startAngle);
  const largeArc = span > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `Q ${outerCornerEnd.x} ${outerCornerEnd.y} ${outerInsetEnd.x} ${outerInsetEnd.y}`,
    `L ${innerOutEnd.x} ${innerOutEnd.y}`,
    `Q ${innerCornerEnd.x} ${innerCornerEnd.y} ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    `Q ${innerCornerStart.x} ${innerCornerStart.y} ${innerOutStart.x} ${innerOutStart.y}`,
    `L ${outerInsetStart.x} ${outerInsetStart.y}`,
    `Q ${outerCornerStart.x} ${outerCornerStart.y} ${outerStart.x} ${outerStart.y}`,
    "Z"
  ].join(" ");
}
function roundedOrthogonalHtmlPath(points, radius) {
  const first = points[0];
  if (!first) return "";
  const commands = [`M ${first.x} ${first.y}`];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (Math.abs(current.y - previous.y) < 0.01) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }
    const middleX = (previous.x + current.x) / 2;
    const horizontalDirection = Math.sign(current.x - previous.x) || 1;
    const verticalDirection = Math.sign(current.y - previous.y) || 1;
    const safeRadius = Math.min(radius, Math.abs(current.x - previous.x) / 4, Math.abs(current.y - previous.y) / 2);
    commands.push(
      `L ${middleX - horizontalDirection * safeRadius} ${previous.y}`,
      `Q ${middleX} ${previous.y} ${middleX} ${previous.y + verticalDirection * safeRadius}`,
      `L ${middleX} ${current.y - verticalDirection * safeRadius}`,
      `Q ${middleX} ${current.y} ${middleX + horizontalDirection * safeRadius} ${current.y}`,
      `L ${current.x} ${current.y}`
    );
  }
  return commands.join(" ");
}
function funnelHtmlBoundaryRatio(value) {
  const normalized = (1 - Math.exp(-2.3 * clamp(value, 0, 1))) / (1 - Math.exp(-2.3));
  return 0.62 - normalized * 0.52;
}
function pyramidHtmlCalloutLayout(placement) {
  const left = placement.startsWith("left");
  const lineY = placement === "right-top" ? 42 : placement === "left-middle" ? 154 : 284;
  const edgeProgress = (lineY - 20) / (376 - 20);
  const edgeX = left ? 360 - edgeProgress * 180 : 360 + edgeProgress * 180;
  const lineEnd = edgeX + (left ? -72 : 72);
  const textWidth = 129.6;
  return {
    lineStart: edgeX,
    lineEnd,
    lineY,
    textX: left ? edgeX - 90 - textWidth : edgeX + 90,
    textWidth,
    align: left ? "right" : "left"
  };
}
var ROADMAP_HTML_CURVE_X = [-0.12, 0, 0.2, 0.4, 0.6, 0.8, 1, 1.12];
var ROADMAP_HTML_CURVE_Y = [0.4, 0.34, 0.2, 0.47, 0.3, 0.38, 0.61, 0.49];
var ROADMAP_HTML_LABEL_X = [0, 0.2, 0.4, 0.6, 0.8, 1];
var ROADMAP_HTML_LABEL_Y = [0.52, 0.31, 0.57, 0.46, 0.58, 0.73];
function roadmapHtmlRoadRatio(t) {
  return infographicCatmullRomAt(t, ROADMAP_HTML_CURVE_X, ROADMAP_HTML_CURVE_Y);
}
function roadmapHtmlLabelRatio(t) {
  return infographicCatmullRomAt(t, ROADMAP_HTML_LABEL_X, ROADMAP_HTML_LABEL_Y);
}
function infographicCatmullRomAt(t, positions, values) {
  const last = positions.length - 1;
  let segment = Math.max(0, last - 1);
  for (let index = 0; index < last; index += 1) {
    if (t <= positions[index + 1]) {
      segment = index;
      break;
    }
  }
  const start = positions[segment];
  const end = positions[segment + 1];
  const u = end === start ? 0 : Math.max(0, Math.min(1, (t - start) / (end - start)));
  const p0 = values[Math.max(0, segment - 1)];
  const p1 = values[segment];
  const p2 = values[segment + 1];
  const p3 = values[Math.min(last, segment + 2)];
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
function renderImpactEffortInfographic(item, mode) {
  const data = infographicData(item);
  const entries = readArray3(data.items).map(readRecord).slice(0, 4);
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const textColor = withHash(readString3(item.text_color)) ?? (dark ? "#F3F4F6" : "#111111");
  const defaults = ["Quick Wins", "Strategic Priorities", "Deprioritize", "Fill-ins"];
  const calloutWidth = 147.6;
  const calloutGap = 14.4;
  const positions = [
    { outerX: 189, outerY: 40, circleX: 264, circleY: 122, side: -1, horizontal: "top", vertical: "left" },
    { outerX: 402, outerY: 40, circleX: 441, circleY: 122, side: 1, horizontal: "top", vertical: "right" },
    { outerX: 402, outerY: 276, circleX: 441, circleY: 319, side: 1, horizontal: "bottom", vertical: "right" },
    { outerX: 189, outerY: 276, circleX: 264, circleY: 319, side: -1, horizontal: "bottom", vertical: "left" }
  ];
  const callouts = entries.map((entry, index) => {
    const position = positions[index];
    const left = position.side < 0;
    const color = colors[index % colors.length];
    const calloutTop = index < 2 ? position.circleY - 40 : position.circleY - 4;
    const calloutLeft = left ? position.outerX - calloutGap - calloutWidth : position.outerX + 113 + calloutGap;
    return `<div style="position:absolute;left:${calloutLeft}px;top:${calloutTop}px;width:${calloutWidth}px;text-align:${left ? "right" : "left"};color:${escapeCssColor(textColor)}"><div style="font-size:14px;font-weight:700;color:${escapeCssColor(color)}">${escapeHtml(readString3(entry.heading) ?? defaults[index])}</div><div style="padding-top:7px;font-size:12px;line-height:1.2">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  const corners = positions.map((position, index) => {
    const entry = entries[index] ?? {};
    const color = colors[index % colors.length];
    const nodeTextColor = blackOrWhiteTextColor(color);
    const blockWidth = 113;
    const blockHeight = 125;
    const thickness = 42;
    const horizontalY = position.horizontal === "top" ? position.outerY : position.outerY + blockHeight - thickness;
    const verticalX = position.vertical === "left" ? position.outerX : position.outerX + blockWidth - thickness;
    return `<rect x="${position.outerX}" y="${horizontalY}" width="${blockWidth}" height="${thickness}" fill="${escapeCssColor(color)}"/><rect x="${verticalX}" y="${position.outerY}" width="${thickness}" height="${blockHeight}" fill="${escapeCssColor(color)}"/><circle cx="${position.circleX}" cy="${position.circleY}" r="20" fill="${escapeCssColor(color)}"/><text x="${position.circleX}" y="${position.circleY + 7}" text-anchor="middle" fill="${escapeAttribute(escapeCssColor(nodeTextColor))}" font-size="17" font-weight="700">${escapeHtml(readString3(entry.label) ?? String(index + 1).padStart(2, "0"))}</text>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 420 })}${transformStyle(item)}overflow:hidden;font-family:Arial,Helvetica,sans-serif"><svg viewBox="0 0 720 420" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;inset:0"><line x1="190" y1="220" x2="516" y2="220" stroke="#d1d1d1" stroke-width="2"/><line x1="353" y1="40" x2="353" y2="401" stroke="#d1d1d1" stroke-width="2"/><path d="M 190 220 l 12 -7 v 14 z M 516 220 l -12 -7 v 14 z M 353 40 l -7 12 h 14 z M 353 401 l -7 -12 h 14 z" fill="#d1d1d1"/><circle cx="353" cy="220" r="13" fill="#d1d1d1"/>${corners}</svg>${callouts}<div style="position:absolute;left:367px;top:225px;color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.x_axis_label) ?? "Impact")}</div><div style="position:absolute;left:323px;top:196px;transform:rotate(-90deg);color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.y_axis_label) ?? "Effort")}</div><div style="position:absolute;left:148px;top:212px;width:34px;text-align:right;color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.low_label) ?? "Low")}</div><div style="position:absolute;left:524px;top:212px;color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.high_label) ?? "High")}</div><div style="position:absolute;left:333px;top:15px;width:40px;text-align:center;color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.high_label) ?? "High")}</div><div style="position:absolute;left:333px;top:403px;width:40px;text-align:center;color:${escapeCssColor(textColor)};font-size:12px">${escapeHtml(readString3(data.low_label) ?? "Low")}</div></div>`;
}
function renderComparisonMatrixInfographic(item, mode) {
  const data = infographicData(item);
  const criteria = readArray3(data.criteria).map((value) => readString3(value) ?? "");
  const safeCriteria = criteria.length > 0 ? criteria : ["Criterion"];
  const entries = readArray3(data.items).map(readRecord).slice(0, 6);
  const colors = infographicPalette(item);
  const cardColor = withHash(readString3(data.card_color)) ?? "#E4E4E7";
  const backgroundTextColor = withHash(readString3(data.background_text_color)) ?? "#111111";
  const criteriaRows = safeCriteria.map((criterion) => `<div style="display:grid;place-items:center;border-top:1px solid #d1d5db;font-size:12px">${escapeHtml(criterion)}</div>`).join("");
  const columns = entries.map((entry, index) => {
    const values = readArray3(entry.values).map((value) => readString3(value) ?? "");
    const color = colors[index % colors.length];
    const columnTextColor = blackOrWhiteTextColor(color);
    return `<div style="position:relative;display:grid;grid-template-rows:110px repeat(${safeCriteria.length},1fr);background:${escapeCssColor(color)};color:${escapeCssColor(columnTextColor)}"><div style="display:grid;place-items:center;padding:20px 8px 8px;text-align:center;font-size:14px;font-weight:700"><span style="position:absolute;top:-24px;display:grid;width:54px;height:54px;place-items:center;border-radius:50%;background:${escapeCssColor(cardColor)};border:3px solid ${escapeCssColor(color)}">${infographicIconImage(entry.icon, entry.color, backgroundTextColor)}</span>${escapeHtml(readString3(entry.heading) ?? `Option ${index + 1}`)}</div>${safeCriteria.map((_, valueIndex) => `<div style="display:grid;place-items:center;border-top:1px solid rgba(255,255,255,.35);font-size:12px">${escapeHtml(values[valueIndex] ?? "")}</div>`).join("")}</div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 340 })}${transformStyle(item)}overflow:hidden;padding:54px 22px 28px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif"><div style="display:grid;height:258px;grid-template-columns:130px repeat(${Math.max(1, entries.length)},1fr);gap:4px"><div style="display:grid;grid-template-rows:110px repeat(${safeCriteria.length},1fr);background:${escapeCssColor(cardColor)};color:${escapeCssColor(backgroundTextColor)}"><div style="display:grid;place-items:center;font-size:14px;font-weight:700">Criteria</div>${criteriaRows}</div>${columns}</div></div>`;
}
function renderHierarchyInfographic(item, mode, kind) {
  const data = infographicData(item);
  const rawEntries = readArray3(data.items).map(readRecord).slice(0, 18);
  const entries = rawEntries.length > 0 ? rawEntries : [{
    id: "root",
    parent_id: null,
    heading: kind === "org_chart" ? "Leader" : "Decision"
  }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const ids = entries.map((entry, index) => readString3(entry.id) ?? `node-${index}`);
  const byId = new Map(ids.map((id, index) => [id, index]));
  const depths = entries.map(() => 0);
  entries.forEach((entry, index) => {
    let parent = readString3(entry.parent_id);
    const seen = /* @__PURE__ */ new Set([index]);
    while (parent && byId.has(parent) && !seen.has(byId.get(parent))) {
      const parentIndex = byId.get(parent);
      seen.add(parentIndex);
      depths[index] += 1;
      parent = readString3(entries[parentIndex].parent_id);
    }
  });
  const maxDepth = Math.max(0, ...depths);
  const maxLevelCount = depths.reduce((counts, depth) => {
    counts[depth] = (counts[depth] ?? 0) + 1;
    return counts;
  }, []).reduce((maximum, count) => Math.max(maximum, count), 1);
  const children = entries.map(() => []);
  entries.forEach((entry, index) => {
    const parentIndex = byId.get(readString3(entry.parent_id) ?? "");
    if (parentIndex != null && parentIndex !== index) children[parentIndex].push(index);
  });
  const positions = entries.map((_, index) => {
    const sameLevel = entries.map((_2, itemIndex) => itemIndex).filter((itemIndex) => depths[itemIndex] === depths[index]);
    const order = sameLevel.indexOf(index);
    return {
      x: (order + 1) / (sameLevel.length + 1) * 720,
      y: 44 + depths[index] / Math.max(1, maxDepth) * 272
    };
  });
  if (kind === "decision_tree") {
    const rootIndex = entries.findIndex((entry) => !byId.has(readString3(entry.parent_id) ?? ""));
    const root = rootIndex >= 0 ? rootIndex : 0;
    positions[root] = { x: 360, y: 180 };
    const anchors = [[202, 97], [202, 263], [518, 97], [518, 263]];
    children[root].slice(0, anchors.length).forEach((childIndex, childOrder) => {
      const [x, y] = anchors[childOrder];
      positions[childIndex] = { x, y };
      const leaves = children[childIndex];
      leaves.forEach((leafIndex, leafOrder) => {
        positions[leafIndex] = {
          x: x < 360 ? 58 : 662,
          y: y + (leafOrder - (leaves.length - 1) / 2) * 62
        };
      });
    });
  }
  const orgChartBoxWidth = 720 * Math.min(0.19, 0.76 / Math.max(2, maxLevelCount));
  const orgChartBoxHeight = 360 * 0.14;
  const connectors = entries.map((entry, index) => {
    const parentIndex = byId.get(readString3(entry.parent_id) ?? "");
    if (parentIndex == null) return "";
    const parent = positions[parentIndex];
    const current = positions[index];
    if (kind === "decision_tree") {
      return `<line x1="${parent.x}" y1="${parent.y}" x2="${current.x}" y2="${current.y}"/>`;
    }
    const middleY = (parent.y + current.y) / 2;
    return `<path d="M ${parent.x} ${parent.y + orgChartBoxHeight / 2} V ${middleY} H ${current.x} V ${current.y - orgChartBoxHeight / 2}"/>`;
  }).join("");
  const nodes = entries.map((entry, index) => {
    const { x, y } = positions[index];
    const color = colors[Math.min(depths[index], colors.length - 1)];
    const nodeTextColor = blackOrWhiteTextColor(color);
    const radius = depths[index] === 0 ? 58 : depths[index] === 1 ? 44 : 28;
    return kind === "decision_tree" ? `<div style="position:absolute;left:${x - radius}px;top:${y - radius}px;display:grid;width:${radius * 2}px;height:${radius * 2}px;place-items:center;border-radius:50%;background:${escapeCssColor(color)};color:${escapeCssColor(nodeTextColor)};text-align:center;font-size:${depths[index] === 2 ? 9 : 11}px;font-weight:${depths[index] === 2 ? 400 : 700};padding:8px;box-sizing:border-box">${escapeHtml(readString3(entry.heading) ?? "")}</div>` : `<div style="position:absolute;left:${x - orgChartBoxWidth / 2}px;top:${y - orgChartBoxHeight / 2}px;width:${orgChartBoxWidth}px;height:${orgChartBoxHeight}px;background:${escapeCssColor(color)};color:${escapeCssColor(nodeTextColor)};text-align:center;padding:7px 8px;box-sizing:border-box"><div style="font-size:14px;font-weight:700">${escapeHtml(readString3(entry.heading) ?? "")}</div><div style="padding-top:3px;font-size:12px">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 360 })}${transformStyle(item)}overflow:hidden;font-family:Arial,Helvetica,sans-serif"><svg viewBox="0 0 720 360" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;inset:0;fill:none;stroke:${dark ? "#e4e4e7" : "#d1d1d1"};stroke-width:2">${connectors}</svg>${nodes}</div>`;
}
function renderMindMapInfographic(item, mode) {
  const data = infographicData(item);
  const topLevel = readArray3(data.items).map(readRecord);
  const nested = readArray3(topLevel[0]?.items).map(readRecord);
  const entries = (topLevel.length === 1 && nested.length > 0 ? nested : topLevel).slice(0, 8);
  const safeEntries = entries.length > 0 ? entries : [{ heading: "Core idea" }];
  const colors = infographicPalette(item);
  const background = infographicBaseColor(item);
  const dark = isDarkInfographicColor(background);
  const customTextColor = withHash(readString3(item.text_color));
  const textColor = customTextColor ?? (dark ? "#F0F1F4" : "#111111");
  const mutedColor = customTextColor ?? (dark ? "#E1E4EA" : "#222222");
  const layout = mindMapHtmlLayout(safeEntries.length, 720, 380);
  const content = safeEntries.map((entry, index) => {
    const position = layout.positions[index];
    const textBox = mindMapHtmlTextBox(position, layout.radius, 720, 380);
    const headingAlignment = textBox.verticalAlign === "middle" ? "center" : "flex-end";
    return `<div style="position:absolute;left:${cssNumber(position.x - layout.radius)}px;top:${cssNumber(position.y - layout.radius)}px;display:grid;width:${cssNumber(layout.radius * 2)}px;height:${cssNumber(layout.radius * 2)}px;place-items:center;border-radius:999px;overflow:hidden"><span style="position:absolute;inset:0;border-radius:inherit;background:${escapeCssColor(colors[index % colors.length])};opacity:.88"></span>${infographicIconImage(entry.icon, entry.color, void 0, 21)}</div><div style="position:absolute;left:${cssNumber(textBox.x)}px;top:${cssNumber(textBox.y)}px;width:${cssNumber(textBox.width)}px;text-align:center;color:${escapeCssColor(textColor)}"><div style="display:flex;align-items:${headingAlignment};justify-content:center;height:${cssNumber(textBox.headingHeight)}px;overflow:hidden;font-size:17px;font-weight:700;line-height:1.1">${escapeHtml(readString3(entry.heading) ?? `Idea ${index + 1}`)}</div><div style="height:${cssNumber(textBox.descriptionHeight)}px;overflow:hidden;font-size:12px;line-height:1.2;color:${escapeCssColor(mutedColor)}">${escapeHtml(readString3(entry.description) ?? "")}</div></div>`;
  }).join("");
  return `<div style="${frameStyle(item, mode, { width: 720, height: 380 })}${transformStyle(
    item
  )}overflow:hidden;font-family:Arial,Helvetica,sans-serif"><div style="position:absolute;inset:0">${content}</div></div>`;
}
function infographicIconImage(icon, legacyColor, overrideColor, sizePercent = 48) {
  const normalized = normalizeInfographicIcon(icon, legacyColor);
  if (!normalized) return "";
  const source = buildSvgUpdateUrl(normalized.url, "http://localhost", {
    color: withHash(readString3(overrideColor)) ?? withHash(normalized.color) ?? "#FFFFFF"
  }) ?? normalized.url;
  return `<img alt="" src="${escapeAttribute(source)}" style="position:relative;display:block;width:${cssNumber(sizePercent)}%;height:${cssNumber(sizePercent)}%;object-fit:contain">`;
}
function infographicTextColor(item, fallback) {
  return withHash(readString3(item.text_color)) ?? fallback;
}
function infographicItemOffsetValue(item) {
  const offset = readRecord(item.__presenton_offset);
  return {
    x: readNumber3(offset.x) ?? 0,
    y: readNumber3(offset.y) ?? 0
  };
}
function infographicHtmlItem(item, content) {
  const offset = infographicItemOffsetValue(item);
  if (offset.x === 0 && offset.y === 0) return content;
  return `<div data-presenton-infographic-item="true" style="position:absolute;inset:0;transform:translate(${cssNumber(
    offset.x
  )}px,${cssNumber(offset.y)}px)">${content}</div>`;
}
function infographicItemTransformStyle(item) {
  const offset = infographicItemOffsetValue(item);
  return offset.x === 0 && offset.y === 0 ? "" : `transform:translate(${cssNumber(offset.x)}px,${cssNumber(offset.y)}px);`;
}
function mindMapHtmlLayout(count, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(28, Math.min(width * 0.105, height * (count >= 5 ? 0.19 : 0.22)));
  if (count === 1) return { radius, positions: [{ x: centerX, y: centerY - radius * 0.25 }] };
  if (count === 2) return { radius, positions: [{ x: centerX - radius * 0.78, y: centerY }, { x: centerX + radius * 0.78, y: centerY }] };
  if (count === 3) return { radius, positions: [{ x: centerX - radius * 0.78, y: centerY - radius * 0.58 }, { x: centerX, y: centerY + radius * 0.72 }, { x: centerX + radius * 0.78, y: centerY - radius * 0.58 }] };
  if (count === 4) return { radius, positions: [{ x: centerX - radius * 0.78, y: centerY - radius * 0.7 }, { x: centerX - radius * 0.78, y: centerY + radius * 0.7 }, { x: centerX + radius * 0.78, y: centerY - radius * 0.7 }, { x: centerX + radius * 0.78, y: centerY + radius * 0.7 }] };
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;
  const step = radius * 1.45;
  const column = (columnCount, x) => Array.from({ length: columnCount }, (_, index) => ({ x, y: centerY - step * (columnCount - 1) / 2 + index * step }));
  return { radius, positions: [...column(leftCount, centerX - radius * 0.78), ...column(rightCount, centerX + radius * 0.78)] };
}
function mindMapHtmlTextBox(position, radius, width, height) {
  const headingHeight = Math.max(22, height * 0.075);
  const descriptionHeight = Math.max(30, height * 0.12);
  const textWidth = Math.max(100, Math.min(width * 0.27, position.x - radius - 16));
  const isBottomCenter = position.y + radius > height * 0.82 && Math.abs(position.x - width / 2) < radius * 0.5;
  if (isBottomCenter) return { x: width / 2 - textWidth / 2, y: Math.min(height - headingHeight - descriptionHeight, position.y + radius + 10), width: textWidth, headingHeight, descriptionHeight, verticalAlign: "middle" };
  const isLeft = position.x < width / 2;
  return { x: isLeft ? 0 : width - textWidth, y: clamp(position.y - (headingHeight + descriptionHeight) / 2, 0, height - headingHeight - descriptionHeight), width: textWidth, headingHeight, descriptionHeight, verticalAlign: "bottom" };
}
function chartConfig(item, height) {
  const chartKind = chartKindFromValue(readString3(item.chartType ?? item.chart_type));
  const data = normalizeChartData(item, chartKind);
  const primaryColor = safeChartColor(readString3(item.color), DEFAULT_CHART_COLORS[0]);
  const colors = data.colors.length > 0 ? data.colors : [primaryColor];
  const axisColor = safeChartColor(
    readString3(item.axisColor ?? item.axis_color),
    "#98A2B3"
  );
  const gridColor = safeChartColor(
    readString3(item.gridColor ?? item.grid_color),
    axisColor
  );
  const textColor = safeChartColor(
    readString3(item.textColor ?? item.text_color ?? item.labelColor ?? item.label_color),
    "#475467"
  );
  const titleColor = safeChartColor(readString3(item.titleColor ?? item.title_color), "#344054");
  const legendColor = safeChartColor(
    readString3(item.legendColor ?? item.legend_color),
    textColor
  );
  const title = markdownToPlainChartText(readString3(item.title) ?? "");
  const fontSize = clamp(height * 0.033, 9, 18);
  const titleFontSize = clamp(height * 0.044, 11, 26);
  const valueFontSize = clamp(height * 0.029, 8, 15);
  const autoShowLegend = isPieLikeChart(chartKind) || data.series.length > 1 || Boolean(data.series[0]?.name && data.series[0].name !== "Series 1");
  const showLegend = readOptionalBoolean(
    item.legend ?? item.showLegend,
    autoShowLegend
  );
  const legendPosition = chartLegendPosition(
    item.legend_position ?? item.legendPosition
  );
  const dataLabelPosition = readDataLabelPosition(
    Object.prototype.hasOwnProperty.call(item, "data_labels") ? item.data_labels : item.dataLabels
  );
  const dataLabels = dataLabelPosition != null;
  const xAxisGrid = readOptionalBoolean(
    item.x_axis_grid ?? item.xAxisGrid ?? item.grid,
    true
  );
  const yAxisGrid = readOptionalBoolean(
    item.y_axis_grid ?? item.yAxisGrid ?? item.grid,
    true
  );
  const xAxis = readOptionalBoolean(item.x_axis ?? item.xAxis, true);
  const yAxis = readOptionalBoolean(item.y_axis ?? item.yAxis, true);
  const xAxisTitle = markdownToPlainChartText(
    readString3(
      Object.prototype.hasOwnProperty.call(item, "x_axis_title") ? item.x_axis_title : item.xAxisTitle
    ) ?? ""
  );
  const yAxisTitle = markdownToPlainChartText(
    readString3(
      Object.prototype.hasOwnProperty.call(item, "y_axis_title") ? item.y_axis_title : item.yAxisTitle
    ) ?? ""
  );
  const config = {
    type: chartJsType(chartKind),
    data: {
      labels: data.categories,
      datasets: chartDatasets(chartKind, { ...data, colors })
    },
    options: {
      color: textColor,
      font: {
        family: CHART_FONT_FAMILY
      },
      indexAxis: isHorizontalChart(chartKind) ? "y" : "x",
      layout: {
        padding: isPieLikeChart(chartKind) ? { top: 16, right: 20, bottom: 12, left: 20 } : { top: 12, right: 22, bottom: 8, left: 12 }
      },
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      plugins: {
        legend: {
          display: showLegend,
          position: legendPosition,
          labels: {
            boxWidth: Math.max(8, fontSize * 0.8),
            boxHeight: Math.max(8, fontSize * 0.8),
            color: legendColor,
            font: { family: CHART_FONT_FAMILY, size: fontSize, weight: 600 },
            padding: Math.max(8, fontSize),
            usePointStyle: true
          }
        },
        title: {
          display: Boolean(title),
          text: title.split(/\r?\n/).filter(Boolean),
          color: titleColor,
          font: {
            family: CHART_FONT_FAMILY,
            size: titleFontSize,
            weight: "700"
          },
          padding: {
            bottom: Math.max(16, titleFontSize * 0.8),
            top: 0
          }
        },
        tooltip: { enabled: false },
        datalabels: {
          align: chartDataLabelAlign(dataLabelPosition ?? "top"),
          anchor: chartDataLabelAnchor(dataLabelPosition ?? "top"),
          clamp: true,
          clip: false,
          color: textColor,
          display: dataLabels,
          font: {
            family: CHART_FONT_FAMILY,
            size: valueFontSize,
            weight: 600
          },
          offset: dataLabelPosition === "outside" ? 6 : 2,
          presentonOutsideColor: textColor,
          presentonPosition: dataLabelPosition ?? "top"
        }
      }
    }
  };
  if (chartKind === "donut") {
    readRecord(config.options).cutout = "58%";
  } else if (chartKind === "pie") {
    readRecord(config.options).cutout = "0%";
  } else {
    readRecord(config.options).scales = chartScales({
      axisColor,
      chartKind,
      fontSize,
      gridColor,
      xAxis,
      xAxisGrid,
      xAxisTitle,
      yAxis,
      yAxisGrid,
      yAxisTitle
    });
  }
  return config;
}
function chartLegendPosition(value) {
  const position = readString3(value);
  return position === "left" || position === "right" || position === "top" || position === "bottom" ? position : "bottom";
}
function chartDatasets(chartKind, data) {
  if (chartKind === "pie" || chartKind === "donut") {
    const series = data.series[0];
    if (!series) return [];
    return [
      {
        label: series.name,
        data: series.values.map((value) => Math.max(0, value)),
        backgroundColor: series.values.map(
          (_, index) => data.colors[index % data.colors.length] ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]
        ),
        borderColor: "#FFFFFF",
        borderWidth: 1,
        hoverOffset: 0
      }
    ];
  }
  if (chartKind === "polar_area") {
    const series = data.series.length ? data.series : [emptyChartSeries()];
    return series.map((seriesItem) => {
      const colors = data.series.length === 1 ? categoryColors(seriesItem, data.colors) : seriesItem.values.map(() => seriesColor(seriesItem, data));
      return {
        label: seriesItem.name,
        data: seriesItem.values,
        backgroundColor: colors.map((color) => withAlpha(color, 0.78)),
        borderColor: colors,
        borderWidth: 1
      };
    });
  }
  if (chartKind === "scatter" || chartKind === "bubble") {
    return data.series.map((seriesItem) => {
      const colors = data.series.length === 1 ? categoryColors(seriesItem, data.colors) : [seriesColor(seriesItem, data)];
      return {
        label: seriesItem.name,
        data: chartKind === "bubble" ? seriesItem.points.map((point) => ({ ...point, r: point.r ?? 6 })) : seriesItem.points.map(({ x, y }) => ({ x, y })),
        backgroundColor: colors.map((color) => withAlpha(color, 0.78)),
        borderColor: colors,
        borderWidth: 2,
        pointRadius: chartKind === "scatter" ? 4 : void 0,
        pointHoverRadius: 4
      };
    });
  }
  const lineLike = chartKind === "line" || chartKind === "area";
  return data.series.map((series, index) => {
    const color = seriesColor(series, data, index);
    const perCategoryColors = data.series.length === 1 && data.colors.length ? categoryColors(series, data.colors) : null;
    const barChart = isBarChart(chartKind);
    const stackedBarChart = isStackedChart(chartKind);
    const dataset = {
      label: series.name,
      data: series.values,
      backgroundColor: chartKind === "area" ? withAlpha(color, 0.24) : lineLike ? color : perCategoryColors ?? color,
      borderColor: color,
      borderWidth: lineLike ? 3 : 0,
      borderRadius: barChart && stackedBarChart ? 7 : void 0,
      borderSkipped: barChart ? stackedBarChart ? "start" : false : void 0,
      fill: chartKind === "area",
      maxBarThickness: 62,
      presentonBarRadius: barChart && !stackedBarChart ? { horizontal: isHorizontalChart(chartKind), radius: 7 } : void 0,
      pointBackgroundColor: perCategoryColors ?? color,
      pointBorderColor: "#FFFFFF",
      pointBorderWidth: lineLike ? 1.5 : 0,
      pointRadius: lineLike ? 3.5 : 0,
      tension: lineLike ? 0.35 : 0
    };
    return dataset;
  });
}
function normalizeChartData(item, chartKind) {
  const points = readArray3(item.data).map(readRecord).map((point, index) => {
    const value = chartValue(point);
    return {
      label: readString3(point.label) ?? `Value ${index + 1}`,
      value,
      point: chartPoint(point, index),
      color: normalizeChartColor(readString3(point.color))
    };
  }).filter(
    (point) => Boolean(point)
  );
  const series = readArray3(item.series).map(readRecord).map((series2, index) => {
    const rawValues = readArray3(series2.values ?? series2.data);
    const values = rawValues.map(chartValue);
    return {
      name: readString3(series2.name) ?? `Series ${index + 1}`,
      points: rawValues.map(
        (value, valueIndex) => chartPoint(value, valueIndex)
      ),
      values
    };
  }).filter((series2) => series2.values.length);
  if (!series.length && points.length) {
    series.push({
      name: readString3(item.title) ?? "Series 1",
      points: points.map((point) => point.point),
      values: points.map((point) => point.value)
    });
  }
  if (!series.length) {
    series.push(emptyChartSeries());
  }
  if (isPieLikeChart(chartKind) && series.length > 1) {
    series.splice(1);
  }
  const maxLength = Math.min(
    24,
    Math.max(1, ...series.map((item2) => item2.values.length), points.length)
  );
  const categoryValues = readArray3(item.categories);
  const categories = normalizeCategories(
    categoryValues.length ? categoryValues : points.map((point) => point.label),
    maxLength
  );
  const colors = readColorArray(item.colors);
  const legacySeriesColors = colors.length ? [] : readColorArray(item.seriesColors ?? item.series_colors);
  const pointColors = points.map((point) => point.color).filter((color) => Boolean(color));
  return {
    categories,
    colors: colors.length > 0 ? colors : legacySeriesColors.length > 0 ? legacySeriesColors : pointColors.length > 0 ? pointColors : [normalizeChartColor(readString3(item.color)) ?? DEFAULT_CHART_COLORS[0]],
    series: series.map((item2) => ({
      ...item2,
      values: padValues(item2.values, categories.length),
      points: padPoints(item2.points, categories.length, item2.values)
    }))
  };
}
function normalizeCategories(values, length) {
  return Array.from({ length }, (_, index) => {
    const value = values[index];
    return readStringValue(value) || `Value ${index + 1}`;
  });
}
function padValues(values, length) {
  return Array.from({ length }, (_, index) => values[index] ?? 0);
}
function padPoints(points, length, fallbackValues) {
  return Array.from({ length }, (_, index) => {
    const point = points[index];
    if (point) return point;
    return { x: index + 1, y: fallbackValues[index] ?? 0 };
  });
}
function readColorArray(value) {
  return readArray3(value).map((item) => normalizeChartColor(readString3(item))).filter((color) => Boolean(color));
}
function normalizeChartColor(value) {
  if (!value) return null;
  return safeChartColor(value, DEFAULT_CHART_COLORS[0]);
}
function normalizeChartKindValue(value) {
  if (!value) return "";
  return value.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}
function chartKindFromValue(value) {
  const normalized = normalizeChartKindValue(value);
  if (normalized === "bubble") return "bubble";
  if (normalized === "horizontal_bar" || normalized === "bar_horizontal") {
    return "horizontal_bar";
  }
  if (normalized === "horizontal_stacked_bar" || normalized === "stacked_horizontal_bar") {
    return "horizontal_stacked_bar";
  }
  if (normalized === "stacked_bar" || normalized === "bar_stacked" || normalized === "stacked" || normalized === "stacked_column") {
    return "stacked_bar";
  }
  if (normalized === "line") return "line";
  if (normalized === "area") return "area";
  if (normalized === "pie") return "pie";
  if (normalized === "donut" || normalized === "doughnut") return "donut";
  if (normalized === "polar" || normalized === "polar_area") return "polar_area";
  if (normalized === "radar") return "radar";
  if (normalized === "scatter") return "scatter";
  return "bar";
}
function chartJsType(chartKind) {
  if (chartKind === "donut") return "doughnut";
  if (chartKind === "area") return "line";
  if (chartKind === "polar_area") return "polarArea";
  if (chartKind === "horizontal_bar" || chartKind === "stacked_bar" || chartKind === "horizontal_stacked_bar") {
    return "bar";
  }
  return chartKind;
}
function isPieLikeChart(chartKind) {
  return chartKind === "pie" || chartKind === "donut";
}
function isBarChart(chartKind) {
  return chartKind === "bar" || chartKind === "horizontal_bar" || chartKind === "stacked_bar" || chartKind === "horizontal_stacked_bar";
}
function isHorizontalChart(chartKind) {
  return chartKind === "horizontal_bar" || chartKind === "horizontal_stacked_bar";
}
function isStackedChart(chartKind) {
  return chartKind === "stacked_bar" || chartKind === "horizontal_stacked_bar";
}
function chartScales({
  axisColor,
  chartKind,
  fontSize,
  gridColor,
  xAxis,
  xAxisGrid,
  xAxisTitle,
  yAxis,
  yAxisGrid,
  yAxisTitle
}) {
  if (isPieLikeChart(chartKind) || chartKind === "polar_area") return void 0;
  if (chartKind === "radar") {
    return {
      r: {
        angleLines: {
          color: withAlpha(gridColor, xAxisGrid ? 0.35 : 0),
          display: xAxisGrid
        },
        beginAtZero: true,
        grid: {
          color: withAlpha(gridColor, yAxisGrid ? 0.35 : 0),
          display: yAxisGrid
        },
        pointLabels: {
          color: axisColor,
          display: xAxis,
          font: { family: CHART_FONT_FAMILY, size: fontSize, weight: 600 }
        },
        ticks: {
          backdropColor: "transparent",
          color: axisColor,
          display: yAxis,
          font: {
            family: CHART_FONT_FAMILY,
            size: Math.max(8, fontSize - 1)
          },
          presentonFormat: true
        }
      }
    };
  }
  const horizontal = isHorizontalChart(chartKind);
  const stacked = isStackedChart(chartKind);
  const showCategoryGrid = horizontal ? xAxisGrid : yAxisGrid;
  const showLinearGrid = horizontal ? yAxisGrid : xAxisGrid;
  const showCategoryAxis = horizontal ? yAxis : xAxis;
  const showLinearAxis = horizontal ? xAxis : yAxis;
  const categoryAxis = {
    display: showCategoryAxis || showCategoryGrid,
    border: { color: axisColor, display: showCategoryAxis },
    grid: {
      color: withAlpha(gridColor, showCategoryGrid ? 0.25 : 0),
      display: showCategoryGrid,
      drawTicks: showCategoryAxis
    },
    stacked,
    ticks: {
      color: axisColor,
      display: showCategoryAxis,
      font: { family: CHART_FONT_FAMILY, size: fontSize, weight: 600 },
      maxRotation: 0,
      autoSkip: true
    },
    title: {
      color: axisColor,
      display: showCategoryAxis && Boolean(horizontal ? yAxisTitle : xAxisTitle),
      font: { family: CHART_FONT_FAMILY, size: fontSize, weight: 700 },
      text: horizontal ? yAxisTitle : xAxisTitle
    },
    type: "category"
  };
  const linearAxis = {
    beginAtZero: true,
    display: showLinearAxis || showLinearGrid,
    border: { color: axisColor, display: showLinearAxis },
    grace: "8%",
    grid: {
      color: withAlpha(gridColor, showLinearGrid ? 0.35 : 0),
      display: showLinearGrid,
      drawTicks: showLinearAxis
    },
    stacked,
    ticks: {
      color: axisColor,
      display: showLinearAxis,
      font: {
        family: CHART_FONT_FAMILY,
        size: Math.max(8, fontSize - 2),
        weight: 600
      },
      presentonFormat: true
    },
    title: {
      color: axisColor,
      display: showLinearAxis && Boolean(horizontal ? xAxisTitle : yAxisTitle),
      font: { family: CHART_FONT_FAMILY, size: fontSize, weight: 700 },
      text: horizontal ? xAxisTitle : yAxisTitle
    },
    type: "linear"
  };
  if (chartKind === "scatter" || chartKind === "bubble") {
    return {
      x: {
        ...linearAxis,
        display: xAxis || yAxisGrid,
        border: { ...linearAxis.border, display: xAxis },
        grid: {
          color: withAlpha(gridColor, yAxisGrid ? 0.35 : 0),
          display: yAxisGrid,
          drawTicks: xAxis
        },
        ticks: { ...linearAxis.ticks, display: xAxis },
        title: {
          ...linearAxis.title,
          display: xAxis && Boolean(xAxisTitle),
          text: xAxisTitle
        }
      },
      y: {
        ...linearAxis,
        display: yAxis || xAxisGrid,
        border: { ...linearAxis.border, display: yAxis },
        grid: {
          color: withAlpha(gridColor, xAxisGrid ? 0.35 : 0),
          display: xAxisGrid,
          drawTicks: yAxis
        },
        ticks: { ...linearAxis.ticks, display: yAxis },
        title: {
          ...linearAxis.title,
          display: yAxis && Boolean(yAxisTitle),
          text: yAxisTitle
        }
      }
    };
  }
  return horizontal ? { x: linearAxis, y: categoryAxis } : { x: categoryAxis, y: linearAxis };
}
function chartValue(value) {
  const direct = readNumber3(value);
  if (direct != null) return direct;
  const record = readRecord(value);
  return readNumber3(record.value) ?? readNumber3(record.y) ?? readNumber3(record.data) ?? 0;
}
function chartPoint(value, index) {
  const record = readRecord(value);
  const radius = readNumber3(record.r ?? record.radius);
  return {
    x: readNumber3(record.x) ?? index + 1,
    y: chartValue(value),
    ...radius != null ? { r: radius } : {}
  };
}
function emptyChartSeries() {
  return {
    name: "Series 1",
    points: [{ x: 1, y: 0 }],
    values: [0]
  };
}
function seriesColor(series, data, index = data.series.indexOf(series)) {
  return data.colors[index % data.colors.length] ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
}
function categoryColors(series, colors) {
  return series.values.map(
    (_, index) => colors[index % colors.length] ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]
  );
}
function safeChartColor(value, fallback = DEFAULT_CHART_COLORS[0]) {
  const color = withHash(value) ?? fallback;
  if (/^#[0-9A-Fa-f]{3}$/.test(color) || /^#[0-9A-Fa-f]{6}$/.test(color) || /^rgba?\(/i.test(color)) {
    return color;
  }
  return fallback;
}
function withHash(value) {
  if (!value) return null;
  const color = value.trim();
  if (!color) return null;
  return color.startsWith("#") || /^rgba?\(/i.test(color) ? color : `#${color}`;
}
function withAlpha(color, alpha) {
  const normalized = safeChartColor(color);
  const hex = normalized.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  if (!hex) {
    const rgb = normalized.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const channels = rgb[1].split(",").slice(0, 3).map((part) => part.trim());
      return `rgba(${channels.join(", ")}, ${alpha})`;
    }
    return normalized;
  }
  const raw = hex[1].length === 3 ? hex[1].split("").map((char) => char + char).join("") : hex[1];
  const int = Number.parseInt(raw, 16);
  return `rgba(${int >> 16 & 255}, ${int >> 8 & 255}, ${int & 255}, ${alpha})`;
}
function infographicKindFromValue(value) {
  return value === "gauge" || value === "gantt" || value === "timeline" || value === "roadmap" || value === "milestone_timeline" || value === "staircase" || value === "supply_chain" || value === "stair_step_blocks" || value === "maturity_model" || value === "pillar_framework" || value === "transformation_hub" || value === "diagonal_circles" || value === "risk_matrix" || value === "chevron_process" || value === "radial_cycle" || value === "conversion_funnel" || value === "vertical_funnel" || value === "pyramid" || value === "segmented_wheel" || value === "customer_journey" || value === "before_after" || value === "impact_effort_matrix" || value === "comparison_matrix" || value === "org_chart" || value === "decision_tree" || value === "mind_map" ? value : "progress_bar";
}
function infographicData(item) {
  const data = readRecord(item.data);
  return Object.keys(data).length ? data : item;
}
function infographicMetrics(item) {
  const data = infographicData(item);
  const rawMin = readNumber3(data.min_value ?? data.minValue) ?? 0;
  const rawMax = readNumber3(data.max_value ?? data.maxValue) ?? 100;
  const min = Math.min(rawMin, rawMax);
  const max = Math.max(rawMin, rawMax);
  const value = clamp(readNumber3(data.value) ?? min, min, max);
  const ratio = max === min ? 0 : (value - min) / (max - min);
  return {
    ratio,
    label: formatInfographicNumber(value)
  };
}
function infographicHighlightColor(item) {
  const colors = readArray3(item.colors);
  const fill = readRecord(item.fill);
  return normalizeChartColor(readString3(colors[1])) ?? normalizeChartColor(
    readString3(
      item.highlightColor ?? item.highlight_color ?? item.color ?? fill.color
    )
  ) ?? DEFAULT_CHART_COLORS[0];
}
function infographicBaseColor(item) {
  const colors = readArray3(item.colors);
  return normalizeChartColor(readString3(colors[0])) ?? normalizeChartColor(readString3(item.baseColor ?? item.base_color)) ?? "#E5E7EB";
}
function infographicPalette(item) {
  const colors = readArray3(item.colors).slice(1).map((color) => normalizeChartColor(readString3(color))).filter((color) => Boolean(color));
  return colors.length > 0 ? colors : ["#2563EB", "#7C3AED", "#0EA5E9", "#10B981"];
}
function isDarkInfographicColor(color) {
  const hex = color.replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1e3 < 150;
}
function describeGaugeArc(centerX, centerY, radius, ratio) {
  const start = gaugePoint(centerX, centerY, radius, 180);
  const end = gaugePoint(
    centerX,
    centerY,
    radius,
    180 + clamp(ratio, 0, 1) * 180
  );
  return `M ${cssNumber(start.x)} ${cssNumber(start.y)} A ${cssNumber(
    radius
  )} ${cssNumber(radius)} 0 0 1 ${cssNumber(end.x)} ${cssNumber(end.y)}`;
}
function gaugePoint(centerX, centerY, radius, angleDegrees) {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  };
}
function formatInfographicNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function readOptionalBoolean(value, fallback) {
  return value == null ? fallback : readBoolean2(value);
}
function readDataLabelPosition(value) {
  if (value === true) return "top";
  if (value === false || value == null) return null;
  const text = readString3(value);
  return text && DATA_LABEL_POSITIONS.has(text) ? text : null;
}
function chartDataLabelAnchor(position) {
  if (position === "base") return "start";
  if (position === "mid") return "center";
  return "end";
}
function chartDataLabelAlign(position) {
  if (position === "base") return "end";
  if (position === "top") return "start";
  if (position === "outside") return "end";
  return "center";
}
function hasChartItem(item) {
  if (isComponent(item)) {
    return readArray3(item.elements).map(readRecord).some(hasChartItem);
  }
  if (readString3(item.type) === "chart") return true;
  if (Array.isArray(item.children)) {
    return readArray3(item.children).map(readRecord).some(hasChartItem);
  }
  if (Array.isArray(item.elements)) {
    return readArray3(item.elements).map(readRecord).some(hasChartItem);
  }
  const child = readRecordOrNull(item.child);
  if (child) return hasChartItem(child);
  const itemChild = readRecordOrNull(item.item);
  return itemChild ? hasChartItem(itemChild) : false;
}
function renderChartScripts() {
  return `<script src="${escapeAttribute(CHART_BROWSER_SCRIPT_URL)}"></script><script src="${escapeAttribute(
    CHART_DATALABELS_SCRIPT_URL
  )}"></script><script>${escapeScriptText(
    chartRendererScript()
  )}</script>`;
}
function chartRendererScript() {
  return `
(function(){
var state=window.__PRESENTON_JSON_CHARTS__={status:"pending"};
function finish(status,message){state.status=status;if(message)state.message=message}
function readNumber(value){var parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function chartValue(raw){if(typeof raw==="number")return raw;if(raw&&typeof raw==="object"){var value=raw.y!=null?raw.y:raw.value!=null?raw.value:raw.data;var numeric=readNumber(value);return numeric==null?0:numeric}var parsed=readNumber(raw);return parsed==null?0:parsed}
var compactNumberSuffixes=["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
function formatScaledCompactNumber(value){var abs=Math.abs(value);var decimals=abs>=100?0:abs>=10?1:2;return Number(value.toFixed(decimals)).toString()}
function formatValue(value){if(!Number.isFinite(value))return "";var abs=Math.abs(value);if(abs<1000)return abs%1===0?String(value):String(Math.round(value*10)/10).replace(/\\.0$/,"");var suffixIndex=Math.floor(Math.log10(abs)/3);if(suffixIndex>=compactNumberSuffixes.length)return value.toExponential(2).replace(/\\.?0+e/,"e");var scaled=value/Math.pow(1000,suffixIndex);var formatted=formatScaledCompactNumber(scaled);if(Math.abs(Number(formatted))>=1000&&suffixIndex<compactNumberSuffixes.length-1){suffixIndex+=1;scaled=value/Math.pow(1000,suffixIndex);formatted=formatScaledCompactNumber(scaled)}return formatted+compactNumberSuffixes[suffixIndex]}
function formatAxisTick(value){var numeric=Number(value);return Number.isFinite(numeric)?formatValue(numeric):String(value)}
function hydrateScales(scales){if(!scales)return;Object.keys(scales).forEach(function(key){var scale=scales[key];if(!scale)return;if(scale.ticks&&scale.ticks.presentonFormat){scale.ticks.callback=formatAxisTick;delete scale.ticks.presentonFormat}if(scale.r&&scale.r.ticks&&scale.r.ticks.presentonFormat){scale.r.ticks.callback=formatAxisTick;delete scale.r.ticks.presentonFormat}})}
function barBorderRadius(rawValue,horizontal,radius){var value=chartValue(rawValue);if(horizontal){return value<0?{bottomLeft:radius,bottomRight:0,topLeft:radius,topRight:0}:{bottomLeft:0,bottomRight:radius,topLeft:0,topRight:radius}}return value<0?{bottomLeft:radius,bottomRight:radius,topLeft:0,topRight:0}:{bottomLeft:0,bottomRight:0,topLeft:radius,topRight:radius}}
function hydrateBarBorderRadii(config){var datasets=config&&config.data&&Array.isArray(config.data.datasets)?config.data.datasets:[];datasets.forEach(function(dataset){var options=dataset&&dataset.presentonBarRadius;if(!options)return;var radius=readNumber(options.radius);dataset.borderRadius=function(context){return barBorderRadius(context&&context.raw,!!options.horizontal,radius==null?7:radius)};delete dataset.presentonBarRadius})}
function datasetBackgroundColor(dataset,index){var background=dataset&&dataset.backgroundColor;var color=Array.isArray(background)?background[index]:background;return typeof color==="string"?color:null}
function clamp(value,min,max){return Math.min(Math.max(value,min),max)}
function parseColor(color){if(!color)return null;var hex=String(color).match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);if(hex){var raw=hex[1].length===3?hex[1].split("").map(function(ch){return ch+ch}).join(""):hex[1];var value=Number.parseInt(raw,16);return[(value>>16)&255,(value>>8)&255,value&255,1]}var rgb=String(color).match(/^rgba?\\(([^)]+)\\)$/i);if(!rgb)return null;var channels=rgb[1].split(",").map(function(part){return Number(part.trim())});if(channels.length<3||channels.slice(0,3).some(Number.isNaN))return null;return[clamp(channels[0],0,255),clamp(channels[1],0,255),clamp(channels[2],0,255),clamp(Number.isFinite(channels[3])?channels[3]:1,0,1)]}
function relativeLuminance(channels){var mapped=channels.map(function(channel){var normalized=channel/255;return normalized<=0.04045?normalized/12.92:Math.pow((normalized+0.055)/1.055,2.4)});return mapped[0]*0.2126+mapped[1]*0.7152+mapped[2]*0.0722}
function contrastRatio(first,second){var lighter=Math.max(first,second);var darker=Math.min(first,second);return(lighter+0.05)/(darker+0.05)}
function contrastTextColor(backgroundColor,fallback){var background=parseColor(backgroundColor);if(!background)return fallback;var composite=[background[0],background[1],background[2]].map(function(channel){return channel*background[3]+255*(1-background[3])});var luminance=relativeLuminance(composite);var dark=[16,24,40];var light=[255,255,255];return contrastRatio(luminance,relativeLuminance(light))>=contrastRatio(luminance,relativeLuminance(dark))?"#FFFFFF":"#101828"}
function hydrateDataLabels(config){var plugins=config&&config.options&&config.options.plugins;var options=plugins&&plugins.datalabels;if(!options)return;var position=options.presentonPosition==="base"||options.presentonPosition==="mid"||options.presentonPosition==="outside"||options.presentonPosition==="top"?options.presentonPosition:"top";var outsideColor=options.presentonOutsideColor||options.color||"#475467";options.formatter=function(value){return formatValue(chartValue(value))};options.color=function(context){if(position==="outside")return outsideColor;var meta=context.chart.getDatasetMeta(context.datasetIndex);var type=String(meta&&meta.type||"");if(type!=="bar"&&type!=="pie"&&type!=="doughnut"&&type!=="polarArea")return outsideColor;return contrastTextColor(datasetBackgroundColor(context.dataset,context.dataIndex),outsideColor)};delete options.presentonOutsideColor;delete options.presentonPosition}
function render(){if(!window.Chart){finish("error","Chart.js failed to load");return}if(!window.ChartDataLabels){finish("error","Chart.js datalabels plugin failed to load");return}try{var Chart=window.Chart;Chart.register(window.ChartDataLabels);document.querySelectorAll("canvas[data-presenton-chart]").forEach(function(canvas){var configText=canvas.getAttribute("data-chart-config");if(!configText)return;var config=JSON.parse(configText);config.options=config.options||{};config.options.animation=false;config.options.responsive=false;config.options.maintainAspectRatio=false;hydrateScales(config.options.scales);hydrateBarBorderRadii(config);hydrateDataLabels(config);var existing=typeof Chart.getChart==="function"?Chart.getChart(canvas):null;if(existing)existing.destroy();var chart=new Chart(canvas,config);if(typeof chart.update==="function")chart.update("none")});requestAnimationFrame(function(){finish("ready")})}catch(error){finish("error",error&&error.message?error.message:String(error))}}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",render,{once:true})}else{render()}
})();
`;
}
function frameStyle(item, mode, fallbackSize) {
  const box = readBox(item, fallbackSize);
  return frameStyleFromBox(box, mode);
}
function frameStyleFromBox(box, mode) {
  let style = `box-sizing:border-box;min-height:0;min-width:0;position:${mode === "absolute" ? "absolute" : "relative"};`;
  if (mode === "flow") style += "flex-shrink:0;";
  if (mode === "absolute") {
    style += `left:${cssNumber(box.x)}px;top:${cssNumber(box.y)}px;`;
  }
  if (box.width != null) style += `width:${cssNumber(box.width)}px;`;
  if (box.height != null) {
    if (mode === "flow") {
      style += `min-height:${cssNumber(box.height)}px;height:auto;`;
    } else {
      style += `height:${cssNumber(box.height)}px;`;
    }
  }
  return style;
}
function readBox(item, fallbackSize) {
  const position = readRecord(item.position);
  const size = readRecord(item.size);
  const type = readString3(item.type);
  if (type === "vector") {
    return polygonBox(
      item,
      vectorShape(item) === "ellipse" ? polygonSourcePoints(item) : polygonPoints(item)
    );
  }
  return {
    x: readNumber3(position.x) ?? 0,
    y: readNumber3(position.y) ?? 0,
    width: readNumber3(size.width) ?? fallbackSize?.width,
    height: readNumber3(size.height) ?? fallbackSize?.height
  };
}
function childrenBounds(children) {
  return children.reduce(
    (bounds, child) => {
      const box = readBox(child);
      return {
        width: Math.max(bounds.width, box.x + (box.width ?? 1)),
        height: Math.max(bounds.height, box.y + (box.height ?? 1))
      };
    },
    { width: 1, height: 1 }
  );
}
function polygonSourcePoints(item) {
  return readArray3(item.points).map(readRecord).map((point) => {
    const x = readNumber3(point.x);
    const y = readNumber3(point.y);
    return x != null && y != null ? { x, y } : null;
  }).filter((point) => point != null);
}
function vectorShape(item) {
  return readString3(item.shape) === "ellipse" ? "ellipse" : "polygon";
}
function polygonPoints(item) {
  const points = polygonSourcePoints(item);
  if (readString3(item.type) === "vector" && vectorShape(item) === "ellipse") {
    return points;
  }
  const closed = polygonClosed(item, points);
  const rounded = closed ? roundedPolygonPoints(points, cornerRadii(item, points.length)) : points;
  const curve = curveSettings(item);
  if (!curve) return rounded;
  return sampleSmoothCurve(rounded, closed, curve.tension, curve.segments);
}
function cornerRadii(item, pointCount) {
  return readArray3(item.corner_radii ?? item.cornerRadii).map(readNumber3).filter((value) => value != null).slice(0, pointCount).map((value) => Math.max(0, value));
}
function pointAt(points, index) {
  return points[(index % points.length + points.length) % points.length];
}
function lerpPoint(start, end, t) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };
}
function roundedPolygonPoints(points, radii, segments = 8) {
  if (points.length < 3 || radii.length === 0) return points;
  const rounded = [];
  points.forEach((point, index) => {
    const radius = radii[index] ?? 0;
    const previous = pointAt(points, index - 1);
    const next = pointAt(points, index + 1);
    const prevDistance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const nextDistance = Math.hypot(point.x - next.x, point.y - next.y);
    const safeRadius = Math.min(radius, prevDistance / 2, nextDistance / 2);
    if (safeRadius <= 0) {
      rounded.push(point);
      return;
    }
    const from = lerpPoint(point, previous, safeRadius / prevDistance);
    const to = lerpPoint(point, next, safeRadius / nextDistance);
    rounded.push(from);
    for (let step = 1; step < segments; step += 1) {
      const t = step / segments;
      rounded.push({
        x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * point.x + t * t * to.x,
        y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * point.y + t * t * to.y
      });
    }
    rounded.push(to);
  });
  return rounded;
}
function curveSettings(item) {
  const curve = readRecordOrNull(item.curve);
  if (!curve) return null;
  const rawType = readString3(curve.type)?.trim().toLowerCase();
  if (rawType !== "smooth") return null;
  return {
    type: "smooth",
    tension: clamp(readNumber3(curve.tension) ?? 0.4, 0, 1),
    segments: Math.max(1, Math.min(96, Math.round(readNumber3(curve.segments) ?? 16)))
  };
}
function hermitePoint(start, end, startTangent, endTangent, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    x: h00 * start.x + h10 * startTangent.x + h01 * end.x + h11 * endTangent.x,
    y: h00 * start.y + h10 * startTangent.y + h01 * end.y + h11 * endTangent.y
  };
}
function sampleSmoothCurve(points, closed, tension, segments) {
  if (points.length < 3 || tension <= 0) return points;
  const sampled = [];
  const segmentCount = closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const p0 = closed ? pointAt(points, index - 1) : points[Math.max(0, index - 1)];
    const p1 = pointAt(points, index);
    const p2 = pointAt(points, index + 1);
    const p3 = closed ? pointAt(points, index + 2) : points[Math.min(points.length - 1, index + 2)];
    if (index === 0) sampled.push(p1);
    const tangentScale = tension * 0.5;
    const startTangent = {
      x: (p2.x - p0.x) * tangentScale,
      y: (p2.y - p0.y) * tangentScale
    };
    const endTangent = {
      x: (p3.x - p1.x) * tangentScale,
      y: (p3.y - p1.y) * tangentScale
    };
    for (let step = 1; step <= segments; step += 1) {
      sampled.push(
        hermitePoint(p1, p2, startTangent, endTangent, step / segments)
      );
    }
  }
  return sampled;
}
function polygonClosed(item, points) {
  if (readString3(item.type) === "vector" && vectorShape(item) === "ellipse") {
    return true;
  }
  const value = item.closed;
  if (value === false || value === "false" || value === "0") return false;
  if (value === true || value === "true" || value === "1") return true;
  return points.length > 2;
}
function polygonBox(item, points) {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const stroke = readRecord(item.stroke);
  const strokeWidth = Math.max(1, readNumber3(stroke.width) ?? 1);
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, strokeWidth, 1),
    height: Math.max(maxY - minY, strokeWidth, 1)
  };
}
function boxStyle(item) {
  const fill = readRecord(item.fill);
  const stroke = readRecord(item.stroke);
  const shadow = readRecord(item.shadow);
  const radius = readRecord(item.borderRadius ?? item.border_radius);
  let style = transformStyle(item);
  const fillColor = readString3(fill.color);
  if (fillColor) {
    style += `background-color:${escapeCssColor(
      colorWithOpacity(fillColor, readNumber3(fill.opacity))
    )};`;
  }
  const strokeColor = readString3(stroke.color);
  const strokeWidth = readNumber3(stroke.width);
  if (strokeColor || strokeWidth != null) {
    style += `border:${cssNumber(strokeWidth ?? 1)}px solid ${escapeCssColor(
      colorWithOpacity(strokeColor ?? "transparent", readNumber3(stroke.opacity))
    )};`;
  }
  const borderRadius = borderRadiusStyle(radius);
  if (borderRadius) style += `border-radius:${borderRadius};`;
  const shadowValue = shadowCssValue(shadow);
  if (shadowValue) style += `box-shadow:${shadowValue};`;
  const opacity = readNumber3(item.opacity);
  if (opacity != null) style += `opacity:${cssNumber(opacity)};`;
  return style;
}
function textShadowStyle(item) {
  const shadowValue = shadowCssValue(readRecord(item.shadow));
  return shadowValue ? `text-shadow:${shadowValue};` : "";
}
function shadowCssValue(shadow) {
  const shadowOpacity = Object.keys(shadow).length ? readNumber3(shadow.opacity) ?? 1 : 0;
  if (shadowOpacity <= 0) return "";
  return `${cssNumber(readNumber3(shadow.offsetX ?? shadow.offset_x) ?? 0)}px ${cssNumber(
    readNumber3(shadow.offsetY ?? shadow.offset_y) ?? 0
  )}px ${cssNumber(readNumber3(shadow.blur) ?? 0)}px ${escapeCssColor(
    colorWithOpacity(readString3(shadow.color) ?? "#000000", shadowOpacity)
  )}`;
}
function transformStyle(item) {
  const rotation = readNumber3(item.rotation);
  const flipH = readBoolean2(item.flip_h ?? item.flipH);
  const flipV = readBoolean2(item.flip_v ?? item.flipV);
  if (!rotation && !flipH && !flipV) return "";
  const transforms = [];
  if (rotation) transforms.push(`rotate(${cssNumber(rotation)}deg)`);
  if (flipH) transforms.push("scaleX(-1)");
  if (flipV) transforms.push("scaleY(-1)");
  return `transform:${transforms.join(" ")};transform-origin:center;`;
}
function fontStyle(fontValue, options = {}) {
  const font2 = readRecord(fontValue);
  let style = `color:${escapeCssColor(
    colorWithOpacity(readString3(font2.color) ?? "#111827", readNumber3(font2.opacity))
  )};`;
  const family = readString3(font2.family);
  const size = readNumber3(font2.size);
  if (family) style += `font-family:${escapeCssFont(family)};`;
  if (size != null) style += `font-size:${cssNumber(size)}px;`;
  if (hasOwn(font2, "italic")) {
    style += readBoolean2(font2.italic) ? "font-style:italic;" : "font-style:normal;";
  }
  if (hasOwn(font2, "bold")) {
    style += readBoolean2(font2.bold) ? "font-weight:700;" : "font-weight:400;";
  }
  if (options.includeLineHeight !== false) style += lineHeightStyle(font2);
  const letterSpacing = readNumber3(font2.letterSpacing ?? font2.letter_spacing);
  if (letterSpacing != null) style += `letter-spacing:${cssNumber(letterSpacing)}px;`;
  if (options.includeTextDecoration !== false) {
    style += textDecorationStyle(font2);
  }
  return style;
}
function textDecorationStyle(font2) {
  if (hasOwn(font2, "underline")) {
    return readBoolean2(font2.underline) ? "text-decoration:underline;" : "text-decoration:none;";
  }
  const decorations = [font2.text_decoration, font2.textDecoration].map((value) => readString3(value)?.toLowerCase()).filter(Boolean);
  if (decorations.includes("underline")) return "text-decoration:underline;";
  if (decorations.includes("none")) return "text-decoration:none;";
  return "";
}
function lineHeightStyle(font2, fallback) {
  const lineHeight = readNumber3(font2.lineHeight ?? font2.line_height) ?? fallback;
  if (lineHeight == null) return "";
  return `line-height:${cssNumber(lineHeight)};`;
}
function tableRows(item) {
  const columns = readArray3(item.columns);
  const bodyRows = readArray3(item.rows).map(readArray3);
  return (columns.length ? [columns, ...bodyRows] : bodyRows).filter(
    (row) => Array.isArray(row)
  );
}
function tableBaseFont(item) {
  return {
    family: "Arial",
    size: 18,
    color: "#111827",
    line_height: 1.15,
    wrap: "word",
    ...readRecord(item.font)
  };
}
function tableCellStyle(cellValue, header, tableFont) {
  const cell = readRecord(cellValue);
  const cellFont = tableCellFont(cellValue, tableFont);
  const alignment = readString3(cell.alignment) ?? readString3(readRecord(cell.alignment).horizontal) ?? readString3(readRecord(readRecord(cell.text).alignment).horizontal);
  const fill = readRecord(cell.color ?? cell.fill);
  const stroke = readRecord(cell.stroke);
  const borders = readRecordOrNull(cell.borders);
  const fillColor = readString3(fill.color);
  const background = fillColor ? colorWithOpacity(fillColor, readNumber3(fill.opacity)) : "transparent";
  const forceHeaderBold = header && !tableCellHasExplicitBold(cellValue);
  const borderStyle = borders ? tableCellBordersStyle(borders) : `border:${cssNumber(
    readNumber3(stroke.width) ?? 1
  )}px solid ${escapeCssColor(
    colorWithOpacity(readString3(stroke.color) ?? "#D1D5DB", readNumber3(stroke.opacity))
  )};`;
  let style = `${fontStyle(cellFont, {
    includeTextDecoration: false
  })}display:flex;align-items:center;justify-content:${horizontalAlign(
    alignment
  )};${borderStyle}min-height:0;min-width:0;overflow:hidden;padding:4px 6px;text-align:${textAlign(
    alignment
  )};vertical-align:middle;white-space:pre-wrap;word-break:break-word;`;
  if (forceHeaderBold && !readBoolean2(cellFont.bold)) style += "font-weight:700;";
  style += `background:${escapeCssColor(background)};`;
  return style;
}
function tableCellBordersStyle(borders) {
  return ["top", "right", "bottom", "left"].map((side) => {
    const stroke = readRecord(borders[side]);
    const width = Math.max(0, readNumber3(stroke.width) ?? 0);
    const color = colorWithOpacity(
      readString3(stroke.color) ?? "transparent",
      readNumber3(stroke.opacity)
    );
    const style = readArray3(stroke.dash).length > 0 ? "dashed" : "solid";
    return `border-${side}:${cssNumber(width)}px ${style} ${escapeCssColor(color)};`;
  }).join("");
}
function textOverflowStyle() {
  return "overflow:visible;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;";
}
function tableCellFont(cellValue, tableFont) {
  if (typeof cellValue === "string" || typeof cellValue === "number") {
    return tableFont;
  }
  const cell = readRecord(cellValue);
  const firstRun = readRecord(readArray3(cell.runs)[0]);
  const text = readRecord(cell.text);
  return {
    ...tableFont,
    ...readRecord(cell.font),
    ...Object.keys(firstRun).length ? readRecord(firstRun.font) : {},
    ...Object.keys(text).length ? readRecord(text.font) : {}
  };
}
function tableCellHasExplicitBold(cellValue) {
  if (typeof cellValue === "string" || typeof cellValue === "number") {
    return false;
  }
  const cell = readRecord(cellValue);
  const firstRun = readRecord(readArray3(cell.runs)[0]);
  const text = readRecord(cell.text);
  return Object.prototype.hasOwnProperty.call(readRecord(cell.font), "bold") || Object.prototype.hasOwnProperty.call(readRecord(firstRun.font), "bold") || Object.prototype.hasOwnProperty.call(readRecord(text.font), "bold");
}
function cellText(cellValue, tableFont, header) {
  if (typeof cellValue === "string" || typeof cellValue === "number") {
    return escapeHtml(readStringValue(cellValue));
  }
  const cell = readRecord(cellValue);
  const fill = readRecord(cell.color ?? cell.fill);
  const fillColor = readString3(fill.color) ? colorWithOpacity(readString3(fill.color) ?? "", readNumber3(fill.opacity)) : null;
  const forceHeaderBold = header && !tableCellHasExplicitBold(cellValue);
  const headerFontPatch = forceHeaderBold ? { bold: true } : {};
  const directRuns = readArray3(cell.runs).map(readRecord);
  if (directRuns.length) {
    const runs = normalizeRunsForHtml(
      directRuns,
      Object.prototype.hasOwnProperty.call(cell, "text") ? cell.text : joinedRunText(directRuns),
      cell.font
    );
    return runs.map((run) => {
      const runFont = readableTableFont(
        {
          ...tableFont,
          ...readRecord(cell.font),
          ...readRecord(run.font),
          ...headerFontPatch
        },
        fillColor,
        header
      );
      return renderTextRunHtml(run, runFont);
    }).join("");
  }
  const text = cell.text;
  if (typeof text === "string") {
    return `<span style="${fontStyle(
      readableTableFont(
        { ...tableFont, ...readRecord(cell.font), ...headerFontPatch },
        fillColor,
        header
      )
    )}">${escapeHtml(text)}</span>`;
  }
  const textRecord = readRecord(text);
  const textRuns = normalizedRunsForHtml(textRecord, textRecord.font);
  if (textRuns.length) {
    return textRuns.map((run) => {
      const runFont = readableTableFont(
        {
          ...tableFont,
          ...readRecord(cell.font),
          ...readRecord(textRecord.font),
          ...readRecord(run.font),
          ...headerFontPatch
        },
        fillColor,
        header
      );
      return renderTextRunHtml(run, runFont);
    }).join("");
  }
  return `<span style="${fontStyle(
    readableTableFont(
      { ...tableFont, ...readRecord(cell.font), ...headerFontPatch },
      fillColor,
      header
    )
  )}">${escapeHtml(readStringValue(textRecord.text))}</span>`;
}
function readableTableFont(font2, fillColor, header) {
  if (header) return font2;
  return {
    ...font2,
    color: readableTableTextColor(readString3(font2.color), fillColor)
  };
}
function readableTableTextColor(color, fill) {
  const textColor = normalizeReadableColor(color) ?? "#111827";
  const textLuminance = colorLuminance(textColor);
  const fillLuminance = colorLuminance(fill);
  if (textLuminance == null || fillLuminance == null) return textColor;
  const lighter = Math.max(textLuminance, fillLuminance);
  const darker = Math.min(textLuminance, fillLuminance);
  const contrast = (lighter + 0.05) / (darker + 0.05);
  if (contrast >= 3) return textColor;
  return fillLuminance > 0.5 ? "#111827" : "#FFFFFF";
}
function blackOrWhiteTextColor(fill) {
  const fillLuminance = colorLuminance(fill);
  if (fillLuminance == null) return "#000000";
  const blackContrast = (fillLuminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (fillLuminance + 0.05);
  return whiteContrast >= blackContrast ? "#FFFFFF" : "#000000";
}
function colorLuminance(color) {
  const rgb = parseRgbColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function parseRgbColor(color) {
  const value = normalizeReadableColor(color);
  if (!value) return null;
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return [
      Number.parseInt(hex[0] + hex[0], 16),
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16)
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16)
    ];
  }
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i
  );
  if (!rgb) return null;
  return [
    clamp(Number(rgb[1]), 0, 255),
    clamp(Number(rgb[2]), 0, 255),
    clamp(Number(rgb[3]), 0, 255)
  ];
}
function normalizeReadableColor(color) {
  if (!color) return null;
  const value = color.trim();
  if (!value) return null;
  return value.startsWith("#") || value.startsWith("rgb") ? value : `#${value}`;
}
function readRuns(item) {
  const runs = readArray3(item.runs).map(readRecord);
  return runs.length ? runs : [{ text: readStringValue(item.text) }];
}
function normalizedRunsForHtml(item, fallbackFont) {
  const runs = readRuns(item);
  return normalizeRunsForHtml(
    runs,
    Object.prototype.hasOwnProperty.call(item, "text") ? item.text : joinedRunText(runs),
    item.font ?? fallbackFont
  );
}
function normalizedListRunsForHtml(value, fallbackFont) {
  const runs = readListRuns(value);
  const record = readRecord(value);
  return normalizeRunsForHtml(
    runs,
    Object.prototype.hasOwnProperty.call(record, "text") ? record.text : joinedRunText(runs),
    record.font ?? fallbackFont
  );
}
function normalizeRunsForHtml(runs, text, fallbackFont) {
  const normalized = normalizeRawTextMarkdownElement({
    type: "text",
    font: fallbackFont,
    text: readStringValue(text),
    runs
  }).runs;
  return normalized.map(
    (run) => isLatexTextRun(run) ? {
      type: "latex",
      latex: run.latex,
      display_mode: run.display_mode ?? false,
      font: run.font
    } : { text: run.text, font: run.font }
  );
}
function joinedRunText(runs) {
  return runs.map(
    (run) => readString3(run.type) === "latex" ? normalizeMathLatex(run.latex) : readStringValue(run.text)
  ).join("");
}
function renderTextRunHtml(run, font2) {
  if (readString3(run.type) !== "latex") {
    return `<span style="${fontStyle(font2)}">${escapeHtml(
      readStringValue(run.text)
    )}</span>`;
  }
  const latex = normalizeMathLatex(run.latex);
  if (!latex) return "";
  const displayMode = readBoolean2(run.display_mode ?? run.displayMode) ?? false;
  const display = displayMode ? "block" : "inline-block";
  return `<span class="presenton-math" data-presenton-math="true" data-screenshot="true" data-screenshot-include-children="true" aria-label="${escapeAttribute(
    `Mathematical expression: ${latex}`
  )}" style="${fontStyle(
    font2,
    { includeLineHeight: false }
  )}display:${display};vertical-align:middle;max-width:100%;line-height:normal;overflow:visible;">${renderMathHtml(
    latex,
    { displayMode, output: "mathml" }
  )}</span>`;
}
function readListRuns(value) {
  if (Array.isArray(value)) return value.map(readRecord);
  const record = readRecord(value);
  const runs = readArray3(record.runs).map(readRecord);
  if (runs.length) return runs;
  if (Object.prototype.hasOwnProperty.call(record, "text")) {
    return [{ text: readStringValue(record.text), font: record.font }];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [{ text: readStringValue(value) }];
  }
  return [];
}
function isComponent(item) {
  const type = readString3(item.type);
  return Array.isArray(item.elements) && (!type || !ELEMENT_TYPES.has(type));
}
function readRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function readRecordOrNull(value) {
  const record = readRecord(value);
  return Object.keys(record).length ? record : null;
}
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function readArray3(value) {
  return Array.isArray(value) ? value : [];
}
function readString3(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function readStringValue(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
function readNumber3(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function readBoolean2(value) {
  return value === true || value === "true" || value === "1";
}
function paddingStyle(padding) {
  return `padding:${cssNumber(readNumber3(padding.top) ?? 0)}px ${cssNumber(
    readNumber3(padding.right) ?? 0
  )}px ${cssNumber(readNumber3(padding.bottom) ?? 0)}px ${cssNumber(
    readNumber3(padding.left) ?? 0
  )}px;`;
}
function borderRadiusStyle(radius) {
  const tl = readNumber3(radius.tl) ?? 0;
  const tr = readNumber3(radius.tr) ?? tl;
  const br = readNumber3(radius.br) ?? tl;
  const bl = readNumber3(radius.bl) ?? tl;
  return tl || tr || br || bl ? `${cssNumber(tl)}px ${cssNumber(tr)}px ${cssNumber(br)}px ${cssNumber(bl)}px` : "";
}
function imageFit(value) {
  return value === "cover" || value === "fill" ? value : "contain";
}
function imageMaskSize(value) {
  const fit = imageFit(value);
  return fit === "fill" ? "100% 100%" : fit;
}
function imageCropScale(item) {
  const value = readNumber3(item.crop_scale ?? item.cropScale);
  if (value == null) return 1;
  return clamp(value, 1, 6);
}
function imageCropTransformStyle(item) {
  const cropScale = imageCropScale(item);
  if (cropScale <= 1) return "";
  return `transform:scale(${cssNumber(cropScale)});transform-origin:${imageFocusValue(item) ?? "center"};`;
}
function imageFocusStyle(item) {
  const focus = imageFocusValue(item);
  return focus ? `object-position:${focus};` : "";
}
function imageFocusValue(item) {
  const focus = readArray3(item.focus);
  const rawX = item.focus_x ?? item.focusX ?? focus[0];
  const rawY = item.focus_y ?? item.focusY ?? focus[1];
  if (rawX == null && rawY == null) return null;
  const focusX = clamp(readNumber3(rawX) ?? 50, 0, 100);
  const focusY = clamp(readNumber3(rawY) ?? 50, 0, 100);
  return `${cssNumber(focusX)}% ${cssNumber(focusY)}%`;
}
function clipPathStyle(item) {
  const value = normalizeCssClipPath(
    readString3(item.clippath ?? item.clipPath ?? item.clip_path)
  );
  return value ? `clip-path:${value};-webkit-clip-path:${value};` : "";
}
function normalizeCssClipPath(value) {
  if (!value) return null;
  let normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.toLowerCase() === "none") return null;
  const doubleQuotedPath = normalized.match(/^path\("([^"]*)"\)$/i);
  if (doubleQuotedPath) {
    normalized = `path('${doubleQuotedPath[1]}')`;
  }
  if (/[";{}<>\\]/.test(normalized)) return null;
  if (!/^[a-zA-Z0-9\s.,%()+\-_' ]+$/.test(normalized)) return null;
  const functionName = normalized.match(/^([a-z-]+)\(/i)?.[1]?.toLowerCase();
  if (!functionName || !["path", "polygon", "circle", "ellipse", "inset"].includes(functionName) || !normalized.endsWith(")")) {
    return null;
  }
  if (functionName === "path" && !/^path\('[^']*'\)$/i.test(normalized)) {
    return null;
  }
  return normalized;
}
function horizontalAlign(value) {
  return value === "center" ? "center" : value === "right" ? "flex-end" : "flex-start";
}
function verticalAlign(value) {
  return value === "middle" || value === "center" ? "center" : value === "bottom" ? "flex-end" : "flex-start";
}
function textAlign(value) {
  return value === "center" || value === "right" || value === "justify" ? value : "left";
}
function cssAlignment(value, fallback) {
  return value === "flex-start" || value === "flex-end" || value === "center" || value === "stretch" ? value : fallback;
}
function normalizeCssColor(color) {
  const normalized = color.trim();
  const hex = normalized.match(/^#?([0-9a-fA-F]{6})$/)?.[1];
  return hex ? `#${hex}` : normalized;
}
function colorWithOpacity(color, opacity) {
  const normalized = normalizeCssColor(color);
  if (opacity == null || opacity >= 1 || normalized === "transparent") return normalized;
  const hex = normalized.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return normalized;
  const value = Number.parseInt(hex, 16);
  return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${Math.max(
    0,
    opacity
  )})`;
}
function cssNumber(value) {
  return Number.isFinite(value) ? String(value) : "0";
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttribute(value) {
  return escapeHtml(value);
}
function escapeScriptText(value) {
  return value.replaceAll("</script", "<\\/script").replaceAll("<!--", "<\\!--");
}
function escapeStyleText(value) {
  return value.replaceAll("</style", "<\\/style");
}
function escapeCssColor(value) {
  return /^[#(),.%\s\w-]+$/.test(value) ? value : "transparent";
}
function escapeCssFont(value) {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}
function cssUrl(value) {
  return `url('${escapeCssUrl(value)}')`;
}
function escapeCssUrl(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("'", "\\'").replaceAll("\n", "").replaceAll("\r", "");
}
export {
  TEMPLATE_V2_HTML_HEIGHT,
  TEMPLATE_V2_HTML_WIDTH,
  hasTemplateV2RenderableUi,
  templateV2UiToHtml,
  templateV2UiToHtmlFragment
};

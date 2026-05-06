/**
 * Shared "Session input/output tokens" rendering block.
 *
 * Extracted from format.ts, toast-format-grouped.ts, and
 * quota-command-format.ts to eliminate verbatim duplication.
 */

import type { SessionTokensData } from "./entries.js";
import { formatTokenCount, padLeft, padRight, shortenModelName } from "./format-utils.js";

export const WIDE_SESSION_TOKEN_LINE_WIDTH = 45;
export const SESSION_TOKEN_SECTION_HEADING = "Session input/output tokens";
export type SessionTokenSectionModel = {
  heading: string;
  lines: string[];
};

function hasCachedInput(model: SessionTokensData["models"][number]): boolean {
  return (model.cachedInput ?? 0) > 0;
}

function hasAnyCachedInput(sessionTokens: SessionTokensData): boolean {
  return (
    (sessionTokens.totalCachedInput ?? 0) > 0 || sessionTokens.models.some((model) => hasCachedInput(model))
  );
}

function normalizeMaxWidth(maxWidth?: number): number | undefined {
  if (typeof maxWidth !== "number" || !Number.isFinite(maxWidth)) return undefined;
  return Math.max(1, Math.trunc(maxWidth));
}

function clampRenderedLine(line: string, maxWidth?: number): string {
  const width = normalizeMaxWidth(maxWidth);
  return width === undefined ? line : line.slice(0, width);
}

function buildWideSessionTokenSectionModel(sessionTokens: SessionTokensData): SessionTokenSectionModel {
  const lines: string[] = [];
  const showCached = hasAnyCachedInput(sessionTokens);
  for (const model of sessionTokens.models) {
    const shortName = shortenModelName(model.modelID, 20);
    const inStr = formatTokenCount(model.input);
    const cachedStr = formatTokenCount(model.cachedInput ?? 0);
    const totalInStr = formatTokenCount(model.totalInput ?? model.input + (model.cachedInput ?? 0));
    const outStr = formatTokenCount(model.output);
    if (showCached) {
      lines.push(
        `  ${padRight(shortName, 20)}  ${padLeft(inStr, 6)} new  ${padLeft(cachedStr, 6)} cache  ${padLeft(totalInStr, 6)} in  ${padLeft(outStr, 6)} out`,
      );
    } else {
      lines.push(`  ${padRight(shortName, 20)}  ${padLeft(inStr, 6)} in  ${padLeft(outStr, 6)} out`);
    }
  }

  return {
    heading: SESSION_TOKEN_SECTION_HEADING,
    lines,
  };
}

function buildCompactSessionTokenSectionModel(
  sessionTokens: SessionTokensData,
  maxWidth: number,
): SessionTokenSectionModel {
  const width = Math.max(1, Math.trunc(maxWidth));
  const lines: string[] = [];
  const showCached = hasAnyCachedInput(sessionTokens);

  for (const model of sessionTokens.models) {
    const modelIndent = width > 2 ? "  " : "";
    const modelLineWidth = Math.max(1, width - modelIndent.length);
    const detailIndent = width > 4 ? "    " : width > 2 ? "  " : "";
    const inStr = formatTokenCount(model.input);
    const cachedStr = formatTokenCount(model.cachedInput ?? 0);
    const totalInStr = formatTokenCount(model.totalInput ?? model.input + (model.cachedInput ?? 0));
    const outStr = formatTokenCount(model.output);
    const compactCounts = showCached
      ? `${inStr} new  ${cachedStr} cache  ${totalInStr} in  ${outStr} out`
      : `${inStr} in  ${outStr} out`;

    lines.push(`${modelIndent}${shortenModelName(model.modelID, modelLineWidth)}`.slice(0, width));

    if (detailIndent.length + compactCounts.length <= width) {
      lines.push(`${detailIndent}${compactCounts}`.slice(0, width));
      continue;
    }

    if (showCached) {
      lines.push(`${detailIndent}${inStr} new`.slice(0, width));
      lines.push(`${detailIndent}${cachedStr} cache`.slice(0, width));
      lines.push(`${detailIndent}${totalInStr} in`.slice(0, width));
      lines.push(`${detailIndent}${outStr} out`.slice(0, width));
    } else {
      lines.push(`${detailIndent}${inStr} in`.slice(0, width));
      lines.push(`${detailIndent}${outStr} out`.slice(0, width));
    }
  }

  return {
    heading: SESSION_TOKEN_SECTION_HEADING.slice(0, width),
    lines,
  };
}

function buildSidebarSessionTokenSummaryModel(
  sessionTokens: SessionTokensData,
  options?: { maxWidth?: number },
): SessionTokenSectionModel {
  const totalCached = sessionTokens.totalCachedInput ?? 0;
  const totalCombined = sessionTokens.totalCombinedInput ?? sessionTokens.totalInput + totalCached;
  const summaryLine = totalCached > 0
    ? `  ${formatTokenCount(sessionTokens.totalInput)} new  ${formatTokenCount(totalCached)} cache  ${formatTokenCount(totalCombined)} in  ${formatTokenCount(sessionTokens.totalOutput)} out`
    : `  ${formatTokenCount(sessionTokens.totalInput)} in  ${formatTokenCount(sessionTokens.totalOutput)} out`;
  return {
    heading: clampRenderedLine(SESSION_TOKEN_SECTION_HEADING, options?.maxWidth),
    lines: [clampRenderedLine(summaryLine, options?.maxWidth)],
  };
}

export function buildSessionTokenSectionModel(
  sessionTokens?: SessionTokensData,
  options?: { maxWidth?: number; variant?: "detailed" | "sidebar_summary" },
): SessionTokenSectionModel | null {
  if (!sessionTokens || sessionTokens.models.length === 0) return null;

  if (options?.variant === "sidebar_summary") {
    return buildSidebarSessionTokenSummaryModel(sessionTokens, options);
  }

  const maxWidth = normalizeMaxWidth(options?.maxWidth);
  if (maxWidth !== undefined && maxWidth < WIDE_SESSION_TOKEN_LINE_WIDTH) {
    return buildCompactSessionTokenSectionModel(sessionTokens, maxWidth);
  }

  return buildWideSessionTokenSectionModel(sessionTokens);
}

/**
 * Render the shared session input/output token section lines.
 *
 * Returns an empty array when there is no data to display.
 * Callers are responsible for inserting a leading blank line if needed.
 */
export function renderSessionTokensLines(
  sessionTokens?: SessionTokensData,
  options?: { maxWidth?: number },
): string[] {
  const section = buildSessionTokenSectionModel(sessionTokens, options);
  return section ? [section.heading, ...section.lines] : [];
}

/**
 * Render the sidebar-only aggregate session token summary lines.
 *
 * The TUI sidebar keeps the heading but switches to a single total summary line
 * so the fixed-width panel stays compact without dropping grouped/classic quota rows.
 */
export function renderSidebarSessionTokenSummaryLines(
  sessionTokens?: SessionTokensData,
  options?: { maxWidth?: number },
): string[] {
  const section = buildSessionTokenSectionModel(sessionTokens, {
    maxWidth: options?.maxWidth,
    variant: "sidebar_summary",
  });
  return section ? [section.heading, ...section.lines] : [];
}

import type { QuotaRenderData } from "./quota-render-data.js";
import type { QuotaToastConfig } from "./types.js";
import type { QuotaToastError } from "./entries.js";

import { isValueEntry } from "./entries.js";
import {
  bar,
  formatDisplayedPercentLabel,
  resolveDisplayedPercent,
} from "./format-utils.js";
import {
  sanitizeQuotaRenderData,
  sanitizeSingleLineDisplayText,
} from "./display-sanitize.js";
import { buildSingleWindowPercentEntryDisplayName } from "./quota-entry-display.js";

const COMPACT_SEGMENT_SEPARATOR = " · ";
const COMPACT_PERCENT_BAR_WIDTH = 6;
const ELLIPSIS = "…";

function normalizeMaxWidth(maxWidth: number): number {
  if (!Number.isFinite(maxWidth)) return 96;
  return Math.max(0, Math.trunc(maxWidth));
}

function compactText(text: string): string {
  return sanitizeSingleLineDisplayText(text);
}

function truncateSingleLine(text: string, maxWidth: number): string {
  const width = normalizeMaxWidth(maxWidth);
  if (width === 0) return "";

  const singleLine = compactText(text);
  if (singleLine.length <= width) return singleLine;
  if (width === 1) return ELLIPSIS;
  return `${singleLine.slice(0, width - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}

function formatCompactPercentLabel(
  percentRemaining: number,
  mode: QuotaToastConfig["percentDisplayMode"],
): string {
  return formatDisplayedPercentLabel(percentRemaining, mode).split(" ")[0] ?? "0%";
}

function formatCompactDisplayName(name: string): string {
  return compactText(name.replace(/^\[([^\]]+)\](.*)$/u, "$1$2"));
}

function formatCompactEntrySegment(params: {
  entry: QuotaRenderData["entries"][number];
  percentDisplayMode: QuotaToastConfig["percentDisplayMode"];
}): string | null {
  const { entry, percentDisplayMode } = params;

  if (isValueEntry(entry)) {
    const name = compactText(entry.name);
    const value = compactText(entry.value);
    const segment = [name, value].filter(Boolean).join(" ");
    return segment || null;
  }

  const name = formatCompactDisplayName(buildSingleWindowPercentEntryDisplayName(entry));
  const displayedPercent = resolveDisplayedPercent(entry.percentRemaining, percentDisplayMode);
  const percentLabel = formatCompactPercentLabel(entry.percentRemaining, percentDisplayMode);
  const segment = [name, bar(displayedPercent, COMPACT_PERCENT_BAR_WIDTH), percentLabel]
    .filter(Boolean)
    .join(" ");
  return segment || null;
}

function formatCompactTokenCount(count: number): string {
  if (!Number.isFinite(count)) return "0";
  if (Math.abs(count) >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/u, "")}M`;
  }
  if (Math.abs(count) >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/u, "")}K`;
  }
  return String(Math.trunc(count));
}

function formatCompactSessionTokensSegment(data: QuotaRenderData): string | null {
  const sessionTokens = data.sessionTokens;
  if (!sessionTokens) return null;

  const hasTokenData =
    sessionTokens.models.length > 0 ||
    sessionTokens.totalInput > 0 ||
    sessionTokens.totalOutput > 0;
  if (!hasTokenData) return null;

  return compactText(
    `tok ${formatCompactTokenCount(sessionTokens.totalInput)} in / ${formatCompactTokenCount(
      sessionTokens.totalOutput,
    )} out`,
  );
}

function formatIssueCount(count: number): string {
  return `+${count} issue${count === 1 ? "" : "s"}`;
}

function formatFirstErrorSegment(errors: QuotaToastError[]): string | null {
  const first = errors[0];
  if (!first) return null;

  const firstError = compactText(`${first.label}: ${first.message}`);
  if (errors.length === 1) return firstError;
  return compactText(`${firstError} +${errors.length - 1}`);
}

export function buildCompactQuotaStatusLine(params: {
  data: QuotaRenderData;
  percentDisplayMode?: QuotaToastConfig["percentDisplayMode"];
  maxWidth: number;
}): string {
  const maxWidth = normalizeMaxWidth(params.maxWidth);
  if (maxWidth === 0) return "";

  const data = sanitizeQuotaRenderData(params.data);
  const percentDisplayMode = params.percentDisplayMode ?? "remaining";
  const segments = data.entries
    .map((entry) => formatCompactEntrySegment({ entry, percentDisplayMode }))
    .filter((segment): segment is string => Boolean(segment));

  const sessionTokensSegment = formatCompactSessionTokensSegment(data);
  if (sessionTokensSegment) {
    segments.push(sessionTokensSegment);
  }

  if (data.errors.length > 0) {
    if (segments.length === 0) {
      const errorSegment = formatFirstErrorSegment(data.errors);
      if (errorSegment) segments.push(errorSegment);
    } else {
      const issueSegment = formatIssueCount(data.errors.length);
      const candidate = [...segments, issueSegment].join(COMPACT_SEGMENT_SEPARATOR);
      if (compactText(candidate).length <= maxWidth) {
        segments.push(issueSegment);
      }
    }
  }

  return truncateSingleLine(segments.join(COMPACT_SEGMENT_SEPARATOR), maxWidth);
}

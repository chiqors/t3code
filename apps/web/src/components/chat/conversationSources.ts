import type { ChatMessage } from "~/types";

export type ConversationSource =
  | {
      readonly id: string;
      readonly kind: "attachment";
      readonly title: string;
      readonly detail: string;
      readonly previewUrl?: string;
      readonly mimeType: string;
      readonly sizeBytes: number;
    }
  | {
      readonly id: string;
      readonly kind: "link";
      readonly title: string;
      readonly detail: string;
      readonly url: string;
    };

const USER_LINK_PATTERN = /\bhttps?:\/\/[^\s<>"']+/giu;
const TRAILING_LINK_PUNCTUATION = /[),.;:!?\]}]+$/u;

function normalizeUserLink(candidate: string): string | null {
  const trimmed = candidate.replace(TRAILING_LINK_PUNCTUATION, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function linkTitle(rawUrl: string): string {
  const url = new URL(rawUrl);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/u, "");
  return `${url.host}${path}`;
}

function formatAttachmentDetail(mimeType: string, sizeBytes: number): string {
  const category = mimeType.startsWith("image/") ? "Image" : "File";
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return `${category} uploaded by you`;
  const units = ["B", "KB", "MB", "GB"] as const;
  const unitIndex = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** unitIndex;
  const formatted = unitIndex === 0 || value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${category} - ${formatted} ${units[unitIndex]} - Uploaded by you`;
}

export function deriveConversationSources(
  messages: ReadonlyArray<ChatMessage>,
): ReadonlyArray<ConversationSource> {
  const sources: ConversationSource[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    if (message.role !== "user") continue;

    for (const attachment of message.attachments ?? []) {
      const id = `attachment:${attachment.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      sources.push({
        id,
        kind: "attachment",
        title: attachment.name,
        detail: formatAttachmentDetail(attachment.mimeType, attachment.sizeBytes),
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        ...(attachment.previewUrl ? { previewUrl: attachment.previewUrl } : {}),
      });
    }

    for (const match of message.text.matchAll(USER_LINK_PATTERN)) {
      const url = match[0] ? normalizeUserLink(match[0]) : null;
      if (!url) continue;
      const id = `link:${url}`;
      if (seen.has(id)) continue;
      seen.add(id);
      sources.push({
        id,
        kind: "link",
        title: linkTitle(url),
        detail: "Link shared by you",
        url,
      });
    }
  }

  return sources;
}

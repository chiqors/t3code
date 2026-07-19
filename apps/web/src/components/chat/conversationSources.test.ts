import { MessageId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { ChatMessage } from "~/types";
import { deriveConversationSources } from "./conversationSources";

function message(input: Partial<ChatMessage> & Pick<ChatMessage, "role" | "text">): ChatMessage {
  const { role, text, ...rest } = input;
  return {
    id: MessageId.make(`message-${role}-${text.length}`),
    role,
    text,
    turnId: null,
    streaming: false,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
    ...rest,
  };
}

describe("deriveConversationSources", () => {
  it("only includes attachments and links supplied by the user", () => {
    const sources = deriveConversationSources([
      message({
        role: "user",
        text: "Please inspect https://example.com/docs.",
        attachments: [
          {
            type: "image",
            id: "image-1",
            name: "error.png",
            mimeType: "image/png",
            sizeBytes: 1_536,
            previewUrl: "blob:preview",
          },
        ],
      }),
      message({
        role: "assistant",
        text: "The app also printed http://localhost:8080 and https://generated.example/output.",
      }),
      message({ role: "system", text: "Visit https://system.example/internal." }),
    ]);

    expect(sources).toEqual([
      {
        id: "attachment:image-1",
        kind: "attachment",
        title: "error.png",
        detail: "Image - 1.5 KB - Uploaded by you",
        mimeType: "image/png",
        sizeBytes: 1_536,
        previewUrl: "blob:preview",
      },
      {
        id: "link:https://example.com/docs",
        kind: "link",
        title: "example.com/docs",
        detail: "Link shared by you",
        url: "https://example.com/docs",
      },
    ]);
  });

  it("deduplicates repeated user attachments and normalized links", () => {
    const attachment = {
      type: "image" as const,
      id: "image-1",
      name: "error.png",
      mimeType: "image/png",
      sizeBytes: 500,
    };
    const sources = deriveConversationSources([
      message({ role: "user", text: "https://example.com", attachments: [attachment] }),
      message({ role: "user", text: "Again: https://example.com/", attachments: [attachment] }),
    ]);

    expect(sources.map((source) => source.id)).toEqual([
      "attachment:image-1",
      "link:https://example.com/",
    ]);
  });
});

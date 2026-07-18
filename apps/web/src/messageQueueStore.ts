import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type {
  ModelSelection,
  MessageId,
  ProviderDriverKind,
  ProviderInteractionMode,
  ServerProvider,
  ScopedThreadRef,
  RuntimeMode,
} from "@t3tools/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ElementContextDraft } from "./lib/elementContext";
import type { TerminalContextDraft } from "./lib/terminalContext";
import type { PreviewAnnotationPayload } from "@t3tools/contracts";
import type { ReviewCommentContext } from "./reviewCommentContext";
import { resolveStorage } from "./lib/storage";

export interface QueuedImageAttachment {
  type: "image";
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface QueuedChatMessage {
  id: MessageId;
  rawPrompt: string;
  messageText: string;
  displayText: string;
  attachments: QueuedImageAttachment[];
  terminalContexts: TerminalContextDraft[];
  elementContexts: ElementContextDraft[];
  previewAnnotations: PreviewAnnotationPayload[];
  reviewComments: ReviewCommentContext[];
  selectedProvider: ProviderDriverKind;
  selectedModel: string;
  selectedProviderModels: ReadonlyArray<ServerProvider["models"][number]>;
  selectedPromptEffort: string | null;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: ProviderInteractionMode;
  createdAt: string;
  status: "queued" | "failed";
  error?: string;
}

interface MessageQueueState {
  itemsByThreadKey: Record<string, QueuedChatMessage[]>;
  enabledByThreadKey: Record<string, boolean>;
  enqueue: (ref: ScopedThreadRef, item: QueuedChatMessage) => void;
  remove: (ref: ScopedThreadRef, itemId: string) => void;
  markFailed: (ref: ScopedThreadRef, itemId: string, error: string) => void;
  markQueued: (ref: ScopedThreadRef, itemId: string) => void;
  reorder: (ref: ScopedThreadRef, fromIndex: number, toIndex: number) => void;
  setEnabled: (ref: ScopedThreadRef, enabled: boolean) => void;
}

const EMPTY_ITEMS: QueuedChatMessage[] = [];

function updateItems(
  state: MessageQueueState,
  ref: ScopedThreadRef,
  update: (items: QueuedChatMessage[]) => QueuedChatMessage[],
) {
  const key = scopedThreadKey(ref);
  const current = state.itemsByThreadKey[key] ?? EMPTY_ITEMS;
  const next = update(current);
  if (next.length === 0) {
    const { [key]: _removed, ...itemsByThreadKey } = state.itemsByThreadKey;
    return { itemsByThreadKey };
  }
  return { itemsByThreadKey: { ...state.itemsByThreadKey, [key]: next } };
}

export const useMessageQueueStore = create<MessageQueueState>()(
  persist(
    (set) => ({
      itemsByThreadKey: {},
      enabledByThreadKey: {},
      enqueue: (ref, item) => set((state) => updateItems(state, ref, (items) => [...items, item])),
      remove: (ref, itemId) =>
        set((state) =>
          updateItems(state, ref, (items) => items.filter((item) => item.id !== itemId)),
        ),
      markFailed: (ref, itemId, error) =>
        set((state) =>
          updateItems(state, ref, (items) =>
            items.map((item) => (item.id === itemId ? { ...item, status: "failed", error } : item)),
          ),
        ),
      markQueued: (ref, itemId) =>
        set((state) =>
          updateItems(state, ref, (items) =>
            items.map((item) => {
              if (item.id !== itemId) return item;
              const { error: _error, ...queuedItem } = item;
              return { ...queuedItem, status: "queued" };
            }),
          ),
        ),
      reorder: (ref, fromIndex, toIndex) =>
        set((state) =>
          updateItems(state, ref, (items) => {
            if (
              fromIndex < 0 ||
              toIndex < 0 ||
              fromIndex >= items.length ||
              toIndex >= items.length ||
              fromIndex === toIndex
            ) {
              return items;
            }
            const next = [...items];
            const [moved] = next.splice(fromIndex, 1);
            if (!moved) return items;
            next.splice(toIndex, 0, moved);
            return next;
          }),
        ),
      setEnabled: (ref, enabled) => {
        const key = scopedThreadKey(ref);
        set((state) => ({
          enabledByThreadKey: { ...state.enabledByThreadKey, [key]: enabled },
        }));
      },
    }),
    {
      name: "t3code:message-queue:v1",
      version: 1,
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: (state) => ({
        itemsByThreadKey: state.itemsByThreadKey,
        enabledByThreadKey: state.enabledByThreadKey,
      }),
    },
  ),
);

export function selectThreadMessageQueue(
  itemsByThreadKey: Record<string, QueuedChatMessage[]>,
  ref: ScopedThreadRef | null | undefined,
): QueuedChatMessage[] {
  if (!ref) return EMPTY_ITEMS;
  return itemsByThreadKey[scopedThreadKey(ref)] ?? EMPTY_ITEMS;
}

export function selectThreadMessageQueueEnabled(
  enabledByThreadKey: Record<string, boolean>,
  ref: ScopedThreadRef | null | undefined,
): boolean {
  if (!ref) return true;
  return enabledByThreadKey[scopedThreadKey(ref)] ?? true;
}

import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisIcon,
  GripVerticalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { Button } from "../ui/button";
import { cn } from "~/lib/utils";
import type { QueuedChatMessage } from "../../messageQueueStore";

interface QueuedMessagesPanelProps {
  items: QueuedChatMessage[];
  queueEnabled: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (item: QueuedChatMessage) => void;
  onEdit: (item: QueuedChatMessage) => void;
  onRetry: (item: QueuedChatMessage) => void;
  onSteer: (item: QueuedChatMessage) => void;
  onOpenSideChat: (item: QueuedChatMessage) => void;
  onToggleQueue: () => void;
}

export function QueuedMessagesPanel({
  items,
  queueEnabled,
  onReorder,
  onDelete,
  onEdit,
  onRetry,
  onSteer,
  onOpenSideChat,
  onToggleQueue,
}: QueuedMessagesPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Queued messages"
      className="mx-auto mb-1.5 w-full max-w-3xl overflow-hidden rounded-xl border border-border/60 bg-card/92 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-border/45 border-b px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {items.length} queued {items.length === 1 ? "message" : "messages"}
        </span>
        <span className="flex items-center gap-1.5">
          {queueEnabled ? "Runs in order" : "Queueing off"}
          {!queueEnabled ? (
            <XCircleIcon className="size-3.5" />
          ) : (
            <CheckCircle2Icon className="size-3.5 text-emerald-500" />
          )}
        </span>
      </div>
      <ol className="divide-y divide-border/35">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedIndex !== null) onReorder(draggedIndex, index);
              setDraggedIndex(null);
            }}
            className={cn(
              "group flex min-h-9 items-center gap-1.5 px-2.5 py-1 text-xs transition-colors hover:bg-accent/40",
              draggedIndex === index && "bg-accent/50 opacity-60",
            )}
          >
            <button
              type="button"
              draggable
              aria-label={`Reorder queued message ${index + 1}`}
              className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/45 hover:bg-accent hover:text-foreground active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVerticalIcon className="size-3.5" />
            </button>
            <span className="w-4 shrink-0 text-center font-mono text-[10px] text-muted-foreground/55">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground/90" title={item.displayText}>
              {item.displayText || "Image attachment"}
            </span>
            {item.status === "failed" ? (
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
                title={item.error ?? "Retry this message"}
              >
                Retry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSteer(item)}
                className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Send this message into the current turn"
              >
                <SendIcon className="size-3" />
                <span className="hidden sm:inline">Steer</span>
              </button>
            )}
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete queued message ${index + 1}`}
              title="Delete queued message"
              onClick={() => onDelete(item)}
              className="size-6 text-muted-foreground/60 hover:text-destructive"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`More actions for queued message ${index + 1}`}
                    title="More actions"
                    className="size-6 text-muted-foreground/60"
                  />
                }
              >
                <EllipsisIcon className="size-3.5" />
              </MenuTrigger>
              <MenuPopup align="end" side="top">
                <MenuItem onClick={() => onEdit(item)}>
                  <PencilIcon />
                  Edit message
                </MenuItem>
                <MenuItem onClick={() => onOpenSideChat(item)}>
                  <SendIcon />
                  Open in side chat
                </MenuItem>
                <MenuItem onClick={onToggleQueue}>
                  <XCircleIcon />
                  {queueEnabled ? "Turn off queueing" : "Turn on queueing"}
                </MenuItem>
              </MenuPopup>
            </Menu>
            <div className="hidden items-center gap-0.5 sm:flex">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === 0}
                aria-label="Move queued message up"
                title="Move up"
                className="size-5 text-muted-foreground/45"
                onClick={() => onReorder(index, index - 1)}
              >
                <ChevronUpIcon className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === items.length - 1}
                aria-label="Move queued message down"
                title="Move down"
                className="size-5 text-muted-foreground/45"
                onClick={() => onReorder(index, index + 1)}
              >
                <ChevronDownIcon className="size-3" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

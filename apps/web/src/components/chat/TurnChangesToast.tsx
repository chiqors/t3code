import type { TurnDiffSummary } from "../../types";
import { summarizeTurnDiffStats } from "../../lib/turnDiffTree";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { DiffStatLabel } from "./DiffStatLabel";
import { SquarePenIcon, XIcon } from "lucide-react";

export function TurnChangesToast({
  summary,
  bottomOffset,
  onOpen,
  onDismiss,
  placement = "floating",
}: {
  summary: TurnDiffSummary;
  bottomOffset: number;
  onOpen: () => void;
  onDismiss: () => void;
  placement?: "floating" | "composer";
}) {
  const stats = summarizeTurnDiffStats(summary.files);
  const fileLabel = `${summary.files.length} ${summary.files.length === 1 ? "file" : "files"} changed`;
  const content = (
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center overflow-hidden rounded-full border border-border/80 bg-popover/95 text-popover-foreground shadow-lg/10 backdrop-blur-sm">
      <button
        type="button"
        className={cn(
          "flex min-w-0 items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
          "hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
        onClick={onOpen}
        aria-label={`Review ${fileLabel}`}
      >
        <SquarePenIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{fileLabel}</span>
        <DiffStatLabel additions={stats.additions} deletions={stats.deletions} layout="inline" />
      </button>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="mr-1 size-5 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
              aria-label="Dismiss file changes"
            />
          }
        >
          <XIcon className="size-3" />
        </TooltipTrigger>
        <TooltipPopup side="top">Dismiss file changes</TooltipPopup>
      </Tooltip>
    </div>
  );

  if (placement === "composer") {
    return (
      <div
        className="pointer-events-none flex justify-center px-2 pb-1"
        data-testid="turn-changes-toast"
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
      style={{ bottom: bottomOffset + 42 }}
      data-testid="turn-changes-toast"
    >
      {content}
    </div>
  );
}

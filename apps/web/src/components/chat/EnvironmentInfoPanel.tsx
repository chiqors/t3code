import type {
  EnvironmentId,
  OrchestrationThreadActivity,
  VcsStatusResult,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  ComputerIcon,
  Globe2Icon,
  GitBranchIcon,
  GitCompareArrowsIcon,
  GitCommitIcon,
  ImageIcon,
  LaptopIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  PanelRightOpenIcon,
  SlidersHorizontalIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { useEnvironment } from "../../state/environments";
import { useKnownTerminalSessions } from "../../state/terminalSessions";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "~/lib/utils";
import { faviconUrlForOrigin } from "~/lib/favicon";
import type { ConversationSource } from "./conversationSources";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const ENVIRONMENT_INFO_PANEL_OPEN_KEY = "chat_environment_info_open";
const ENVIRONMENT_INFO_PANEL_COLLAPSED_KEY = "chat_environment_info_collapsed";
const MAX_ENVIRONMENT_INFO_ROWS = 10;

interface EnvironmentInfoPanelProps {
  environmentId: EnvironmentId;
  gitStatus: VcsStatusResult | null;
  activities: ReadonlyArray<OrchestrationThreadActivity>;
  sources: ReadonlyArray<ConversationSource>;
  onOpenSources: () => void;
  onOpenProcesses: () => void;
  rightPanelOpen: boolean;
}

function OpenDetailsButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6 rounded-sm p-0 text-muted-foreground hover:text-foreground"
            onClick={onClick}
            aria-label={label}
          >
            <PanelRightOpenIcon className="size-3.5" />
          </Button>
        }
      />
      <TooltipPopup side="top">{label}</TooltipPopup>
    </Tooltip>
  );
}

export function SourceVisual({ source }: { source: ConversationSource }) {
  const [failed, setFailed] = useState(false);
  const imageUrl =
    source.kind === "attachment" ? source.previewUrl : faviconUrlForOrigin(source.url, 32);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden
        className={cn(
          "size-8 shrink-0 border border-border/70 bg-muted object-cover",
          source.kind === "link" && "p-1.5",
        )}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center border border-border/70 bg-muted/30 text-muted-foreground">
      {source.kind === "link" ? (
        <Globe2Icon className="size-3.5" />
      ) : (
        <ImageIcon className="size-3.5" />
      )}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  trailing,
  onClick,
}: {
  icon: typeof GitBranchIcon;
  label: string;
  value?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <span className="flex min-h-9 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-foreground/90 transition-colors hover:bg-accent/70">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value ? <span className="max-w-44 truncate text-muted-foreground">{value}</span> : null}
      {trailing ?? <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/60" />}
    </span>
  );
  return onClick ? (
    <button type="button" className="w-full" onClick={onClick}>
      {content}
    </button>
  ) : (
    <span className="block w-full">{content}</span>
  );
}

function useEnvironmentInfoPanelOpen() {
  return useLocalStorage(ENVIRONMENT_INFO_PANEL_OPEN_KEY, true, Schema.Boolean);
}

function useEnvironmentInfoPanelCollapsed() {
  return useLocalStorage(ENVIRONMENT_INFO_PANEL_COLLAPSED_KEY, false, Schema.Boolean);
}

export function shouldShowEnvironmentInfoPanel(
  preferredOpen: boolean,
  rightPanelOpen: boolean,
): boolean {
  return preferredOpen && !rightPanelOpen;
}

export function EnvironmentInfoToggle({ rightPanelOpen }: { rightPanelOpen: boolean }) {
  const [open, setOpen] = useEnvironmentInfoPanelOpen();
  const compactWindow = useMediaQuery("max-xl");
  const label = rightPanelOpen
    ? "Environment information is hidden while the right panel is open"
    : compactWindow
      ? "Environment information will return when the window is wider"
      : open
        ? "Hide environment information"
        : "Show environment information";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            variant="ghost"
            size="sm"
            pressed={!compactWindow && shouldShowEnvironmentInfoPanel(open, rightPanelOpen)}
            onPressedChange={setOpen}
            aria-label={label}
            disabled={rightPanelOpen}
            data-testid="environment-info-trigger"
          >
            <SlidersHorizontalIcon className="size-3.5" />
          </Toggle>
        }
      />
      <TooltipPopup side="bottom">{label}</TooltipPopup>
    </Tooltip>
  );
}

export function EnvironmentInfoPanel({
  environmentId,
  gitStatus,
  activities,
  sources,
  onOpenSources,
  onOpenProcesses,
  rightPanelOpen,
}: EnvironmentInfoPanelProps) {
  const [open] = useEnvironmentInfoPanelOpen();
  const compactWindow = useMediaQuery("max-xl");
  const [collapsed, setCollapsed] = useEnvironmentInfoPanelCollapsed();
  const [backgroundProcessesExpanded, setBackgroundProcessesExpanded] = useState(true);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const environment = useEnvironment(environmentId);
  const isPrimary = environment?.entry.target._tag === "PrimaryConnectionTarget";
  const changes = gitStatus?.workingTree;
  const activityCount = activities.length;
  const visibleSources = sources.slice(0, MAX_ENVIRONMENT_INFO_ROWS);
  const knownTerminalSessions = useKnownTerminalSessions({
    environmentId,
    threadId: null,
  });
  const backgroundProcesses = knownTerminalSessions
    .filter((session) => session.state.summary?.hasRunningSubprocess === true)
    .map((session) => ({
      id: session.target.terminalId,
      label: session.state.summary?.label || "Background process",
    }));

  if (compactWindow || !shouldShowEnvironmentInfoPanel(open, rightPanelOpen)) {
    return null;
  }

  return (
    <aside
      aria-label="Environment information"
      data-testid="environment-info-panel"
      className="absolute top-[calc(var(--workspace-topbar-height)+0.75rem)] right-3 z-30 max-h-[calc(100%-var(--workspace-topbar-height)-1.5rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg/5 sm:right-4"
    >
      <div>
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Environment</p>
            <p className="mt-0.5 max-w-64 truncate text-sm font-medium">
              {environment?.label ?? "Current environment"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isPrimary ? (
              <LaptopIcon className="size-4 text-muted-foreground" />
            ) : (
              <CloudIcon className="size-4 text-muted-foreground" />
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-6 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setCollapsed((value) => !value)}
                    aria-expanded={!collapsed}
                    aria-label={
                      collapsed
                        ? "Expand environment information"
                        : "Collapse environment information"
                    }
                    data-testid="environment-info-collapse-trigger"
                  >
                    {collapsed ? (
                      <ChevronRightIcon className="size-3.5" />
                    ) : (
                      <ChevronDownIcon className="size-3.5" />
                    )}
                  </Button>
                }
              />
              <TooltipPopup side="top">
                {collapsed ? "Expand environment information" : "Collapse environment information"}
              </TooltipPopup>
            </Tooltip>
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-0.5">
              <InfoRow
                icon={ListFilterIcon}
                label="Changes"
                value={
                  changes
                    ? `+${changes.insertions.toLocaleString()} -${changes.deletions.toLocaleString()}`
                    : "No repository status"
                }
                trailing={
                  changes ? (
                    <span className="text-xs font-medium">
                      <span className="text-emerald-500">
                        +{changes.insertions.toLocaleString()}
                      </span>{" "}
                      <span className="text-rose-500">-{changes.deletions.toLocaleString()}</span>
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                icon={isPrimary ? LaptopIcon : CloudIcon}
                label="Workspace"
                value={isPrimary ? "Local" : "Remote"}
              />
              <InfoRow
                icon={GitBranchIcon}
                label="Branch"
                value={gitStatus?.refName ?? "Detached"}
              />
              <InfoRow
                icon={GitCommitIcon}
                label="Commit or push"
                trailing={<ArrowUpRightIcon className="size-3.5 text-muted-foreground/60" />}
              />
              <InfoRow
                icon={GitCompareArrowsIcon}
                label="Compare branch"
                trailing={<ArrowUpRightIcon className="size-3.5 text-muted-foreground/60" />}
              />
            </div>

            <Separator />

            <div className="space-y-0.5">
              <p className="px-1 text-xs font-medium text-muted-foreground">Computer Use</p>
              <InfoRow
                icon={ComputerIcon}
                label="Picture in Picture"
                value="Unavailable"
                trailing={<span className="text-xs text-muted-foreground/60">Hidden</span>}
              />
            </div>

            <Separator />

            <div className="space-y-0.5">
              <div className="flex min-h-7 items-center justify-between rounded-sm px-1 hover:bg-accent/60">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                  onClick={() => setBackgroundProcessesExpanded((value) => !value)}
                  aria-expanded={backgroundProcessesExpanded}
                >
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    Background processes
                  </p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {backgroundProcesses.length}
                    {backgroundProcessesExpanded ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronRightIcon className="size-3.5" />
                    )}
                  </span>
                </button>
                {backgroundProcesses.length > 0 ? (
                  <OpenDetailsButton label="Open background processes" onClick={onOpenProcesses} />
                ) : null}
              </div>
              {backgroundProcessesExpanded ? (
                backgroundProcesses.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground/70">No background processes</p>
                ) : (
                  <>
                    {backgroundProcesses.slice(0, MAX_ENVIRONMENT_INFO_ROWS).map((process) => (
                      <div
                        key={process.id}
                        className="flex min-h-9 min-w-0 items-center gap-2 rounded-md px-1.5 text-[13px] text-foreground/90"
                      >
                        <TerminalSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate" title={process.label}>
                          {process.label}
                        </span>
                        <MoreHorizontalIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                      </div>
                    ))}
                    {backgroundProcesses.length > MAX_ENVIRONMENT_INFO_ROWS ? (
                      <p className="px-1 text-[11px] text-muted-foreground">
                        +{backgroundProcesses.length - MAX_ENVIRONMENT_INFO_ROWS} more running
                      </p>
                    ) : null}
                  </>
                )
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2 px-1">
              <div className="flex min-h-7 items-center justify-between rounded-sm hover:bg-accent/60">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                  onClick={() => setSourcesExpanded((value) => !value)}
                  aria-expanded={sourcesExpanded}
                >
                  <p className="text-xs font-medium text-muted-foreground">Sources</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {sources.length}
                    {sourcesExpanded ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronRightIcon className="size-3.5" />
                    )}
                  </span>
                </button>
                {sources.length > 0 ? (
                  <OpenDetailsButton label="Open conversation sources" onClick={onOpenSources} />
                ) : null}
              </div>
              {sourcesExpanded ? (
                <>
                  {sources.length === 0 ? (
                    <p className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
                      Files and links you add to this conversation will appear here.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      {visibleSources.map((source) => {
                        const content = (
                          <>
                            <SourceVisual source={source} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground/90">
                                {source.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {source.detail}
                              </span>
                            </span>
                            {source.kind === "link" ? (
                              <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                            ) : null}
                          </>
                        );
                        return source.kind === "link" ? (
                          <a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={source.url}
                            className="flex min-w-0 items-center gap-2.5 py-2.5 transition-colors hover:bg-accent/50"
                          >
                            {content}
                          </a>
                        ) : (
                          <div
                            key={source.id}
                            title={source.title}
                            className="flex min-w-0 items-center gap-2.5 py-2.5"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {sources.length > MAX_ENVIRONMENT_INFO_ROWS ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="w-full justify-start px-1.5 text-muted-foreground"
                      onClick={onOpenSources}
                    >
                      View all
                      <ArrowUpRightIcon className="size-3" />
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Subagents</p>
                {activityCount > 0 ? (
                  <span className="text-xs text-muted-foreground">{activityCount} activity</span>
                ) : null}
              </div>
              <div
                className={cn(
                  "rounded-md border border-border/70 bg-muted/20 px-2.5 py-2",
                  activityCount > 0 && "bg-accent/30",
                )}
              >
                <p className="text-xs text-foreground/85">
                  {activityCount > 0
                    ? "Agent activity is available in this thread."
                    : "No active subagents"}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  T3 Code does not currently support spawning or managing child subagent threads.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

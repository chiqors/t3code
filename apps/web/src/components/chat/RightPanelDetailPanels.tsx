import type { EnvironmentId } from "@t3tools/contracts";
import { Activity, ArrowUpRightIcon, TerminalSquareIcon } from "lucide-react";

import { useKnownTerminalSessions } from "../../state/terminalSessions";
import { resolveTerminalSessionLabel } from "@t3tools/shared/terminalLabels";
import type { ConversationSource } from "./conversationSources";
import { SourceVisual } from "./EnvironmentInfoPanel";

export function ConversationSourcesPanel({
  sources,
}: {
  sources: ReadonlyArray<ConversationSource>;
}) {
  return (
    <section className="min-h-full bg-background p-5">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-medium text-foreground">Conversation sources</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Files and links you added to this session.
            </p>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">{sources.length}</span>
        </div>
        {sources.length === 0 ? (
          <div className="border-y border-border/70 py-8 text-sm text-muted-foreground">
            Add a file or link in the composer to make it available here.
          </div>
        ) : (
          <div className="divide-y border-y border-border/70">
            {sources.map((source) => {
              const content = (
                <>
                  <SourceVisual source={source} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {source.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {source.detail}
                    </span>
                  </span>
                  {source.kind === "link" ? (
                    <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : null}
                </>
              );
              return source.kind === "link" ? (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 py-3 transition-colors hover:bg-accent/50"
                >
                  {content}
                </a>
              ) : (
                <div key={source.id} className="flex min-w-0 items-center gap-3 py-3">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function BackgroundProcessesPanel({ environmentId }: { environmentId: EnvironmentId }) {
  const sessions = useKnownTerminalSessions({ environmentId, threadId: null });
  const processes = sessions.filter(
    (session) => session.state.summary?.hasRunningSubprocess === true,
  );

  return (
    <section className="min-h-full bg-background p-5">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-medium text-foreground">Background processes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Processes currently running across this environment.
            </p>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">{processes.length}</span>
        </div>
        {processes.length === 0 ? (
          <div className="border-y border-border/70 py-8 text-sm text-muted-foreground">
            No background processes are running.
          </div>
        ) : (
          <div className="divide-y border-y border-border/70">
            {processes.map((session) => {
              const summary = session.state.summary;
              const label = resolveTerminalSessionLabel(session.target.terminalId, summary);
              return (
                <div
                  key={session.target.terminalId}
                  className="flex min-w-0 items-center gap-3 py-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center border border-border/70 bg-muted/30 text-muted-foreground">
                    <TerminalSquareIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Activity className="size-3" />
                      {summary?.status ?? "running"} - Terminal {session.target.terminalId}
                      {summary?.pid ? ` - PID ${summary.pid}` : ""}
                    </span>
                    {summary?.cwd ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground/70">
                        {summary.cwd}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

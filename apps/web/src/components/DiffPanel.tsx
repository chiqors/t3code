import { useAtomValue } from "@effect/atom-react";
import { useParams } from "@tanstack/react-router";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { safeErrorLogAttributes } from "@t3tools/client-runtime/errors";
import type { ScopedThreadRef, TurnId } from "@t3tools/contracts";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Columns2Icon,
  CopyIcon,
  ChevronsUpDownIcon,
  EllipsisIcon,
  FileMinus2Icon,
  FolderTreeIcon,
  ImageIcon,
  MessageSquareIcon,
  PilcrowIcon,
  Rows3Icon,
  RefreshCwIcon,
  SearchIcon,
  TextWrapIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOpenInPreferredEditor } from "../editorPreferences";
import { type DraftId, useComposerDraftStore } from "../composerDraftStore";
import { openDiffFilePrimaryAction } from "../diffFileActions";
import { useCheckpointDiff } from "~/lib/checkpointDiffState";
import { cn } from "~/lib/utils";
import { selectThreadDiffPanelSelection, useDiffPanelStore } from "../diffPanelStore";
import { useTheme } from "../hooks/useTheme";
import {
  buildFileDiffRenderKey,
  getDiffCollapseIconClassName,
  getRenderablePatch,
  resolveDiffThemeName,
  resolveFileDiffPath,
} from "../lib/diffRendering";
import { summarizeTurnDiffStats } from "../lib/turnDiffTree";
import { useTurnDiffSummaries } from "../hooks/useTurnDiffSummaries";
import { useProject, useThread } from "../state/entities";
import { resolveThreadRouteRef } from "../threadRoutes";
import { useClientSettings } from "../hooks/useSettings";
import { formatShortTimestamp } from "../timestampFormat";
import { DiffPanelLoadingState, DiffPanelShell, type DiffPanelMode } from "./DiffPanelShell";
import { AnnotatableCodeView, type AnnotatableCodeViewHandle } from "./diffs/AnnotatableCodeView";
import { ToggleGroup, Toggle } from "./ui/toggle-group";
import { Switch } from "./ui/switch";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "./ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { useEnvironmentQuery } from "../state/query";
import { serverEnvironment } from "../state/server";
import { reviewEnvironment } from "../state/review";
import { vcsEnvironment } from "../state/vcs";
import { buildBaseRefChoices, filterBaseRefChoices } from "../lib/baseRefChoices";
import { ChangedFilesTreeView } from "./chat/ChangedFilesTree";
import { DiffStatLabel } from "./chat/DiffStatLabel";
import { type TurnDiffFileChange } from "../types";

type DiffRenderMode = "stacked" | "split";
type DiffThemeType = "light" | "dark";
const AUTOMATIC_BASE_REF = "__automatic_base_ref__";

function diffStatusLabel(type: string): string {
  switch (type) {
    case "new":
      return "A";
    case "deleted":
      return "D";
    case "rename-pure":
    case "rename-changed":
      return "R";
    default:
      return "M";
  }
}

function diffStatusName(status: string): string {
  switch (status) {
    case "A":
      return "Added";
    case "D":
      return "Deleted";
    case "R":
      return "Renamed";
    default:
      return "Modified";
  }
}

function diffStatusClassName(status: string): string {
  switch (status) {
    case "A":
      return "border-success/30 bg-success/10 text-success";
    case "D":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "R":
      return "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

interface CollapsedDiffFilesState {
  readonly scopeKey: string | null;
  readonly fileKeys: ReadonlySet<string>;
}

const EMPTY_COLLAPSED_DIFF_FILE_KEYS: ReadonlySet<string> = new Set();

const DIFF_PANEL_UNSAFE_CSS = `
[data-diffs-header],
[data-diff],
[data-file],
[data-error-wrapper],
[data-virtualizer-buffer] {
  --diffs-header-font-family: var(--font-sans) !important;
  --diffs-font-family: var(--font-mono) !important;
  --diffs-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-light-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-dark-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-token-light-bg: transparent;
  --diffs-token-dark-bg: transparent;

  --diffs-bg-context-override: color-mix(in srgb, var(--background) 97%, var(--foreground));
  --diffs-bg-hover-override: color-mix(in srgb, var(--background) 94%, var(--foreground));
  --diffs-bg-separator-override: color-mix(in srgb, var(--background) 95%, var(--foreground));
  --diffs-bg-buffer-override: color-mix(in srgb, var(--background) 90%, var(--foreground));

  --diffs-bg-addition-override: color-mix(in srgb, var(--background) 92%, var(--success));
  --diffs-bg-addition-number-override: color-mix(in srgb, var(--background) 88%, var(--success));
  --diffs-bg-addition-hover-override: color-mix(in srgb, var(--background) 85%, var(--success));
  --diffs-bg-addition-emphasis-override: color-mix(in srgb, var(--background) 80%, var(--success));

  --diffs-bg-deletion-override: color-mix(in srgb, var(--background) 92%, var(--destructive));
  --diffs-bg-deletion-number-override: color-mix(in srgb, var(--background) 88%, var(--destructive));
  --diffs-bg-deletion-hover-override: color-mix(in srgb, var(--background) 85%, var(--destructive));
  --diffs-bg-deletion-emphasis-override: color-mix(
    in srgb,
    var(--background) 80%,
    var(--destructive)
  );

  background-color: var(--diffs-bg) !important;
}

[data-file-info] {
  background-color: color-mix(in srgb, var(--card) 94%, var(--foreground)) !important;
  border-block-color: var(--border) !important;
  color: var(--foreground) !important;
}

[data-diffs-header] {
  position: sticky !important;
  top: 0;
  z-index: 4;
  background-color: color-mix(in srgb, var(--card) 94%, var(--foreground)) !important;
  border-bottom: 1px solid var(--border) !important;
  align-items: center !important;
  font-family: var(--font-sans) !important;
  font-size: 12px !important;
  line-height: 1 !important;
  min-height: 32px !important;
  padding-block: 6px !important;
}

[data-diffs-header] [data-header-content] {
  align-items: center !important;
  line-height: 1 !important;
}

[data-diffs-header] [data-metadata] {
  align-items: center !important;
  line-height: 1 !important;
  font-variant-numeric: tabular-nums;
}

[data-diffs-header] [data-additions-count],
[data-diffs-header] [data-deletions-count] {
  font-family: var(--font-mono) !important;
  font-size: 11px !important;
  font-variant-numeric: tabular-nums;
  line-height: 1 !important;
}

[data-diffs-header] [data-change-icon],
[data-diffs-header] [data-rename-icon] {
  display: block;
  flex-shrink: 0;
}

[data-title] {
  cursor: pointer;
  transition:
    color 120ms ease,
    text-decoration-color 120ms ease;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
  font-family: var(--font-sans) !important;
}

[data-title]:hover {
  color: color-mix(in srgb, var(--foreground) 84%, var(--primary)) !important;
  text-decoration-color: currentColor;
}

[data-separator="line-info"] [data-unmodified-lines],
[data-separator="line-info-basic"] [data-unmodified-lines] {
  align-items: center;
  align-self: stretch;
  display: flex;
  flex: 1 1 auto;
}
`;

interface DiffPanelProps {
  mode?: DiffPanelMode;
  composerDraftTarget: ScopedThreadRef | DraftId;
  initialGitScope: "branch" | "unstaged";
}

export { DiffWorkerPoolProvider } from "./DiffWorkerPoolProvider";

export default function DiffPanel({
  mode = "inline",
  composerDraftTarget,
  initialGitScope: initialGitScopeProp,
}: DiffPanelProps) {
  const { resolvedTheme } = useTheme();
  const settings = useClientSettings();
  const [initialGitScope] = useState(initialGitScopeProp);
  const [diffRenderMode, setDiffRenderMode] = useState<DiffRenderMode>("stacked");
  const [wordWrap, setWordWrap] = useState(settings.wordWrap);
  const [fileFilter, setFileFilter] = useState("");
  const [allNavigatorDirectoriesExpanded, setAllNavigatorDirectoriesExpanded] = useState(true);
  const [filesPanelOpen, setFilesPanelOpen] = useState(true);
  const [wordDiffs, setWordDiffs] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [diffIgnoreWhitespace, setDiffIgnoreWhitespace] = useState(settings.diffIgnoreWhitespace);
  const [baseRefQuery, setBaseRefQuery] = useState("");
  const [collapsedDiffFiles, setCollapsedDiffFiles] = useState<CollapsedDiffFilesState>(() => ({
    scopeKey: null,
    fileKeys: EMPTY_COLLAPSED_DIFF_FILE_KEYS,
  }));
  const codeViewRef = useRef<AnnotatableCodeViewHandle>(null);

  const routeThreadRef = useParams({
    strict: false,
    select: (params) => resolveThreadRouteRef(params),
  });
  const activeThreadId = routeThreadRef?.threadId ?? null;
  const activeThread = useThread(routeThreadRef);
  const activeProjectId = activeThread?.projectId ?? null;
  const activeProject = useProject(
    activeThread && activeProjectId
      ? {
          environmentId: activeThread.environmentId,
          projectId: activeProjectId,
        }
      : null,
  );
  const activeCwd = activeThread?.worktreePath ?? activeProject?.workspaceRoot;
  const serverConfig = useAtomValue(
    serverEnvironment.configValueAtom(activeThread?.environmentId ?? null),
  );
  const openInPreferredEditor = useOpenInPreferredEditor(
    activeThread?.environmentId ?? null,
    serverConfig?.availableEditors ?? [],
  );
  const gitStatusQuery = useEnvironmentQuery(
    activeThread !== null && activeThread !== undefined && activeCwd != null
      ? vcsEnvironment.status({
          environmentId: activeThread.environmentId,
          input: { cwd: activeCwd },
        })
      : null,
  );
  const diffSelection = useDiffPanelStore((state) =>
    selectThreadDiffPanelSelection(
      state.byThreadKey,
      routeThreadRef,
      initialGitScope === "unstaged",
    ),
  );
  const isGitRepo = gitStatusQuery.data?.isRepo ?? true;
  const { turnDiffSummaries, inferredCheckpointTurnCountByTurnId } =
    useTurnDiffSummaries(activeThread);
  const orderedTurnDiffSummaries = useMemo(
    () =>
      [...turnDiffSummaries].toSorted((left, right) => {
        const leftTurnCount =
          left.checkpointTurnCount ?? inferredCheckpointTurnCountByTurnId[left.turnId] ?? 0;
        const rightTurnCount =
          right.checkpointTurnCount ?? inferredCheckpointTurnCountByTurnId[right.turnId] ?? 0;
        if (leftTurnCount !== rightTurnCount) {
          return rightTurnCount - leftTurnCount;
        }
        return right.completedAt.localeCompare(left.completedAt);
      }),
    [inferredCheckpointTurnCountByTurnId, turnDiffSummaries],
  );

  useEffect(() => {
    if (!routeThreadRef || diffSelection.kind !== "turn") return;
    useDiffPanelStore.getState().reconcileTurnSelection(
      routeThreadRef,
      orderedTurnDiffSummaries.map((summary) => summary.turnId),
    );
  }, [diffSelection, orderedTurnDiffSummaries, routeThreadRef]);

  const selectedTurnId = diffSelection.kind === "turn" ? diffSelection.turnId : null;
  const selectedGitScope = diffSelection.kind === "unstaged" ? "unstaged" : "branch";
  const selectedBaseRef = diffSelection.kind === "branch" ? diffSelection.baseRef : null;
  const selectedFilePath = diffSelection.kind === "turn" ? diffSelection.filePath : null;
  const selectedFileRevealRequestId =
    diffSelection.kind === "turn" ? diffSelection.revealRequestId : 0;
  const selectedTurn =
    selectedTurnId === null
      ? undefined
      : (orderedTurnDiffSummaries.find((summary) => summary.turnId === selectedTurnId) ??
        orderedTurnDiffSummaries[0]);
  const selectedCheckpointTurnCount =
    selectedTurn &&
    (selectedTurn.checkpointTurnCount ?? inferredCheckpointTurnCountByTurnId[selectedTurn.turnId]);
  const latestTurn = orderedTurnDiffSummaries[0];
  const selectedScopeLabel =
    selectedTurnId === null
      ? selectedGitScope === "unstaged"
        ? "Working tree"
        : "Branch changes"
      : selectedTurn?.turnId === latestTurn?.turnId
        ? "Latest turn"
        : `Turn ${selectedCheckpointTurnCount ?? "?"}`;
  const reviewSectionId = selectedTurn ? `turn:${selectedTurn.turnId}` : selectedGitScope;
  const draftReviewComments = useComposerDraftStore(
    (store) => store.getComposerDraft(composerDraftTarget)?.reviewComments,
  );
  const reviewComments = useMemo(
    () => draftReviewComments?.filter((comment) => comment.sectionId === reviewSectionId) ?? [],
    [draftReviewComments, reviewSectionId],
  );
  const reviewCommentCount = reviewComments.length;
  const collapseScopeKey = routeThreadRef
    ? `${routeThreadRef.environmentId}:${routeThreadRef.threadId}:${reviewSectionId}`
    : null;
  const collapsedDiffFileKeys =
    collapsedDiffFiles.scopeKey === collapseScopeKey
      ? collapsedDiffFiles.fileKeys
      : EMPTY_COLLAPSED_DIFF_FILE_KEYS;
  const reviewSectionTitle = selectedTurn
    ? `Turn ${selectedCheckpointTurnCount ?? "?"}`
    : selectedGitScope === "unstaged"
      ? "Working tree"
      : "Branch changes";
  const selectedCheckpointRange = useMemo(
    () =>
      typeof selectedCheckpointTurnCount === "number"
        ? {
            fromTurnCount: Math.max(0, selectedCheckpointTurnCount - 1),
            toTurnCount: selectedCheckpointTurnCount,
          }
        : null,
    [selectedCheckpointTurnCount],
  );
  const activeCheckpointDiff = useCheckpointDiff(
    {
      environmentId: activeThread?.environmentId ?? null,
      threadId: activeThreadId,
      fromTurnCount: selectedCheckpointRange?.fromTurnCount ?? null,
      toTurnCount: selectedCheckpointRange?.toTurnCount ?? null,
      ignoreWhitespace: diffIgnoreWhitespace,
      cacheScope: selectedTurn ? `turn:${selectedTurn.turnId}` : null,
    },
    { enabled: isGitRepo && selectedTurn !== undefined },
  );
  const primaryBranchDiffPreview = useEnvironmentQuery(
    selectedTurnId === null && activeThread && activeCwd
      ? reviewEnvironment.diffPreview({
          environmentId: activeThread.environmentId,
          input: {
            cwd: activeCwd,
            ...(selectedBaseRef ? { baseRef: selectedBaseRef } : {}),
            ignoreWhitespace: diffIgnoreWhitespace,
          },
        })
      : null,
  );
  const shouldRetryBranchDiffAtEnvironmentCwd =
    selectedTurnId === null &&
    primaryBranchDiffPreview.error?.includes("configured workspace root") === true &&
    serverConfig?.cwd !== undefined &&
    serverConfig.cwd !== activeCwd;
  const fallbackBranchDiffPreview = useEnvironmentQuery(
    shouldRetryBranchDiffAtEnvironmentCwd && activeThread && serverConfig
      ? reviewEnvironment.diffPreview({
          environmentId: activeThread.environmentId,
          input: {
            cwd: serverConfig.cwd,
            ...(selectedBaseRef ? { baseRef: selectedBaseRef } : {}),
            ignoreWhitespace: diffIgnoreWhitespace,
          },
        })
      : null,
  );
  const branchDiffPreview = shouldRetryBranchDiffAtEnvironmentCwd
    ? fallbackBranchDiffPreview
    : primaryBranchDiffPreview;
  const selectedGitSource = branchDiffPreview.data?.sources.find(
    (source) => source.kind === (selectedGitScope === "unstaged" ? "working-tree" : "branch-range"),
  );
  const localBranchRefs = useEnvironmentQuery(
    selectedTurnId === null &&
      selectedGitScope === "branch" &&
      activeThread &&
      branchDiffPreview.data?.cwd
      ? vcsEnvironment.listRefs({
          environmentId: activeThread.environmentId,
          input: {
            cwd: branchDiffPreview.data.cwd,
            includeMatchingRemoteRefs: true,
            refKind: "local",
            ...(baseRefQuery.trim().length > 0 ? { query: baseRefQuery.trim() } : {}),
            limit: 100,
          },
        })
      : null,
  );
  const remoteBranchRefs = useEnvironmentQuery(
    selectedTurnId === null &&
      selectedGitScope === "branch" &&
      activeThread &&
      branchDiffPreview.data?.cwd
      ? vcsEnvironment.listRefs({
          environmentId: activeThread.environmentId,
          input: {
            cwd: branchDiffPreview.data.cwd,
            includeMatchingRemoteRefs: true,
            refKind: "remote",
            ...(baseRefQuery.trim().length > 0 ? { query: baseRefQuery.trim() } : {}),
            limit: 100,
          },
        })
      : null,
  );
  const baseRefChoices = buildBaseRefChoices(
    localBranchRefs.data?.refs.filter((ref) => ref.name !== selectedGitSource?.headRef) ?? [],
    remoteBranchRefs.data?.refs ?? [],
  );
  const matchingBaseRefChoices = filterBaseRefChoices(baseRefChoices, baseRefQuery);
  const valueForBaseRefChoice = (choice: (typeof baseRefChoices)[number]) =>
    selectedBaseRef && selectedBaseRef === choice.remote?.name
      ? selectedBaseRef
      : (choice.local?.name ?? choice.remote?.name ?? choice.id);
  const baseRefItems = [AUTOMATIC_BASE_REF, ...baseRefChoices.map(valueForBaseRefChoice)];
  const filteredBaseRefItems = [
    ...(baseRefQuery.trim().length === 0 ? [AUTOMATIC_BASE_REF] : []),
    ...matchingBaseRefChoices.map(valueForBaseRefChoice),
  ];
  const gitDiff = selectedGitSource?.diff;

  const selectedPatch = selectedTurn ? activeCheckpointDiff.data?.diff : gitDiff;
  const isSelectedPatchTruncated = !selectedTurn && selectedGitSource?.truncated === true;
  const isLoadingSelectedPatch = selectedTurn
    ? activeCheckpointDiff.isPending
    : branchDiffPreview.isPending;
  const selectedPatchError = selectedTurn ? activeCheckpointDiff.error : branchDiffPreview.error;
  const hasResolvedPatch = typeof selectedPatch === "string";
  const hasNoNetChanges = hasResolvedPatch && selectedPatch.trim().length === 0;
  const renderablePatch = useMemo(
    () =>
      getRenderablePatch(selectedPatch, `diff-panel:${resolvedTheme}`, {
        compactPartialHunkOffsets: selectedTurnId === null,
      }),
    [resolvedTheme, selectedPatch, selectedTurnId],
  );
  const renderableFiles = useMemo(() => {
    if (!renderablePatch || renderablePatch.kind !== "files") {
      return [];
    }
    return renderablePatch.files.toSorted((left, right) =>
      resolveFileDiffPath(left).localeCompare(resolveFileDiffPath(right), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [renderablePatch]);
  const codeViewFiles = useMemo(
    () =>
      renderableFiles.map((fileDiff) => {
        const fileKey = buildFileDiffRenderKey(fileDiff);
        return {
          fileDiff,
          filePath: resolveFileDiffPath(fileDiff),
          fileKey,
          collapsed: collapsedDiffFileKeys.has(fileKey),
        };
      }),
    [collapsedDiffFileKeys, renderableFiles],
  );
  const reviewTreeFiles = useMemo<ReadonlyArray<TurnDiffFileChange>>(
    () =>
      codeViewFiles.map(({ fileDiff, filePath }) => {
        const authoritativeFile = selectedTurn?.files.find((file) => file.path === filePath);
        const workingTreeFile =
          selectedTurnId === null && selectedGitScope === "unstaged"
            ? gitStatusQuery.data?.workingTree.files.find((file) => file.path === filePath)
            : undefined;
        return {
          path: filePath,
          kind: fileDiff.type,
          additions:
            authoritativeFile?.additions ??
            workingTreeFile?.insertions ??
            fileDiff.hunks.reduce((total, hunk) => total + hunk.additionLines, 0),
          deletions:
            authoritativeFile?.deletions ??
            workingTreeFile?.deletions ??
            fileDiff.hunks.reduce((total, hunk) => total + hunk.deletionLines, 0),
        };
      }),
    [
      codeViewFiles,
      gitStatusQuery.data?.workingTree.files,
      selectedGitScope,
      selectedTurn,
      selectedTurnId,
    ],
  );
  const filteredReviewTreeFiles = useMemo(() => {
    const query = fileFilter.trim().toLowerCase();
    if (!query) return reviewTreeFiles;
    return reviewTreeFiles.filter((file) => file.path.toLowerCase().includes(query));
  }, [fileFilter, reviewTreeFiles]);
  const reviewStatusByPath = useMemo(
    () =>
      Object.fromEntries(reviewTreeFiles.map((file) => [file.path, diffStatusLabel(file.kind)])),
    [reviewTreeFiles],
  );

  useEffect(() => {
    if (!selectedFilePath) return;
    const file = codeViewFiles.find((candidate) => candidate.filePath === selectedFilePath);
    if (!file) return;
    codeViewRef.current?.scrollTo({ type: "item", id: file.fileKey, align: "start" });
  }, [codeViewFiles, selectedFilePath, selectedFileRevealRequestId]);

  const openDiffFile = useCallback(
    (filePath: string) => {
      openDiffFilePrimaryAction({
        threadRef: routeThreadRef,
        filePath,
        activeCwd,
        openInEditor: (targetPath) => {
          void (async () => {
            const result = await openInPreferredEditor(targetPath);
            if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
              console.warn("Failed to open diff file in editor.", {
                operation: "open-diff-file",
                ...(routeThreadRef
                  ? {
                      environmentId: routeThreadRef.environmentId,
                      threadId: routeThreadRef.threadId,
                    }
                  : {}),
                ...safeErrorLogAttributes(squashAtomCommandFailure(result)),
              });
            }
          })();
        },
      });
    },
    [activeCwd, openInPreferredEditor, routeThreadRef],
  );
  const toggleDiffFileCollapsed = useCallback(
    (fileKey: string) => {
      setCollapsedDiffFiles((current) => {
        const next = new Set(current.scopeKey === collapseScopeKey ? current.fileKeys : []);
        if (next.has(fileKey)) {
          next.delete(fileKey);
        } else {
          next.add(fileKey);
        }
        return { scopeKey: collapseScopeKey, fileKeys: next };
      });
    },
    [collapseScopeKey],
  );

  const setAllDiffFilesCollapsed = useCallback(
    (collapsed: boolean) => {
      setCollapsedDiffFiles({
        scopeKey: collapseScopeKey,
        fileKeys: collapsed
          ? new Set(codeViewFiles.map(({ fileKey }) => fileKey))
          : EMPTY_COLLAPSED_DIFF_FILE_KEYS,
      });
    },
    [codeViewFiles, collapseScopeKey],
  );

  const refreshDiff = useCallback(() => {
    gitStatusQuery.refresh();
    primaryBranchDiffPreview.refresh();
    fallbackBranchDiffPreview.refresh();
    localBranchRefs.refresh();
    remoteBranchRefs.refresh();
  }, [
    fallbackBranchDiffPreview,
    gitStatusQuery,
    localBranchRefs,
    primaryBranchDiffPreview,
    remoteBranchRefs,
  ]);

  const copyGitApplyCommand = useCallback(async () => {
    const command = "git diff --no-ext-diff | git apply --3way";
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
  }, []);

  const focusDiffFile = useCallback(
    (filePath: string, fileKey: string) => {
      if (selectedTurnId !== null && routeThreadRef) {
        useDiffPanelStore.getState().selectTurn(routeThreadRef, selectedTurnId, filePath);
        return;
      }
      codeViewRef.current?.scrollTo({ type: "item", id: fileKey, align: "start" });
    },
    [routeThreadRef, selectedTurnId],
  );

  const selectTurn = (turnId: TurnId) => {
    if (!routeThreadRef) return;
    useDiffPanelStore.getState().selectTurn(routeThreadRef, turnId);
  };
  const selectGitScope = (scope: "branch" | "unstaged") => {
    if (!routeThreadRef) return;
    useDiffPanelStore.getState().selectGitScope(routeThreadRef, scope);
  };
  const selectBranchBaseRef = (baseRef: string | null) => {
    if (!routeThreadRef) return;
    useDiffPanelStore.getState().selectBranchBaseRef(routeThreadRef, baseRef);
  };
  const renderedReviewTreeStats = summarizeTurnDiffStats(reviewTreeFiles);
  const selectedScopeFileCount = selectedTurn
    ? selectedTurn.files.length
    : selectedTurnId === null && selectedGitScope === "unstaged" && gitStatusQuery.data
      ? gitStatusQuery.data.workingTree.files.length
      : reviewTreeFiles.length;
  const selectedScopeStats = selectedTurn
    ? summarizeTurnDiffStats(selectedTurn.files)
    : selectedTurnId === null && selectedGitScope === "unstaged" && gitStatusQuery.data
      ? {
          additions: gitStatusQuery.data.workingTree.insertions,
          deletions: gitStatusQuery.data.workingTree.deletions,
        }
      : renderedReviewTreeStats;

  const headerRow = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3 [-webkit-app-region:no-drag]">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-muted/70 px-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Diff scope: ${selectedScopeLabel}`}
          >
            <span className="truncate">{selectedScopeLabel}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onClick={() => selectGitScope("unstaged")}>
              <span>Working tree</span>
              {selectedTurnId === null && selectedGitScope === "unstaged" && (
                <CheckIcon className="ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => selectGitScope("branch")}>
              <span>Branch changes</span>
              {selectedTurnId === null && selectedGitScope === "branch" && (
                <CheckIcon className="ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (latestTurn) selectTurn(latestTurn.turnId);
              }}
            >
              <span>Latest turn</span>
              {selectedTurnId !== null && selectedTurn?.turnId === latestTurn?.turnId && (
                <CheckIcon className="ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Turn</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {orderedTurnDiffSummaries.map((summary) => {
                  const turnCount =
                    summary.checkpointTurnCount ??
                    inferredCheckpointTurnCountByTurnId[summary.turnId] ??
                    "?";
                  return (
                    <DropdownMenuItem
                      key={summary.turnId}
                      onClick={() => selectTurn(summary.turnId)}
                    >
                      <span>Turn {turnCount}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {formatShortTimestamp(summary.completedAt, settings.timestampFormat)}
                      </span>
                      {summary.turnId === selectedTurn?.turnId && <CheckIcon className="ml-1" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        {selectedScopeFileCount > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <span>
              {selectedScopeFileCount} {selectedScopeFileCount === 1 ? "file" : "files"}
            </span>
            <DiffStatLabel
              additions={selectedScopeStats.additions}
              deletions={selectedScopeStats.deletions}
              layout="inline"
            />
          </div>
        ) : null}
        {selectedTurnId === null && selectedGitScope === "branch" && selectedGitSource?.baseRef && (
          <div
            className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden text-xs text-muted-foreground"
            title={`${selectedGitSource.headRef ?? "HEAD"} → ${selectedGitSource.baseRef}`}
            aria-label={`Comparing ${selectedGitSource.headRef ?? "HEAD"} against ${selectedGitSource.baseRef}`}
          >
            <span className="min-w-0 max-w-48 truncate">{selectedGitSource.headRef ?? "HEAD"}</span>
            <ArrowRightIcon className="size-3.5 shrink-0 opacity-70" />
            <Combobox
              items={baseRefItems}
              filteredItems={filteredBaseRefItems}
              value={selectedBaseRef ?? AUTOMATIC_BASE_REF}
              onOpenChange={(open) => {
                if (!open) setBaseRefQuery("");
              }}
              onValueChange={(value) => {
                if (!value) return;
                selectBranchBaseRef(value === AUTOMATIC_BASE_REF ? null : value);
              }}
            >
              <ComboboxTrigger
                className="inline-flex min-w-0 max-w-48 items-center gap-1 overflow-hidden rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Change comparison target. Currently ${selectedGitSource.baseRef}`}
              >
                <span className="min-w-0 truncate">{selectedGitSource.baseRef}</span>
                <ChevronDownIcon className="size-3.5 shrink-0 opacity-70" />
              </ComboboxTrigger>
              <ComboboxPopup
                align="start"
                className="w-72 min-w-0 max-w-[calc(100vw-1rem)] overflow-hidden [&>[data-slot=combobox-popup]]:min-w-0 [&>[data-slot=combobox-popup]]:overflow-hidden"
              >
                <div className="min-w-0 shrink-0 px-3 pt-2.5">
                  <div className="relative -translate-y-px border-b border-border/70 pb-1.5 transition-colors focus-within:border-ring">
                    <SearchIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55"
                    />
                    <ComboboxInput
                      className="[&_input]:h-6.5 [&_input]:ps-5 [&_input]:font-sans [&_input]:leading-6.5"
                      inputClassName="rounded-none bg-transparent text-sm"
                      placeholder="Search refs..."
                      showTrigger={false}
                      size="sm"
                      unstyled
                      value={baseRefQuery}
                      onChange={(event) => setBaseRefQuery(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 border-b border-border/70 ps-3 pe-6.5 pt-2 pb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  <span aria-hidden="true" />
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center">
                    <span>Branch</span>
                    <span className="text-right">Remote</span>
                  </div>
                </div>
                <ComboboxEmpty>No matching refs.</ComboboxEmpty>
                <ComboboxList className="max-h-64 min-w-0 overflow-x-hidden">
                  <ComboboxItem
                    className="h-8 w-full min-w-0 grid-cols-[1rem_minmax(0,1fr)] py-0"
                    contentClassName="w-full min-w-0 overflow-hidden"
                    value={AUTOMATIC_BASE_REF}
                  >
                    <span className="block min-w-0 truncate">Automatic</span>
                  </ComboboxItem>
                  {baseRefChoices.map((choice) => {
                    const item = valueForBaseRefChoice(choice);
                    const hasBoth = choice.local !== null && choice.remote !== null;
                    const useRemote = choice.remote?.name === item;
                    return (
                      <ComboboxItem
                        key={choice.id}
                        className="h-8 w-full min-w-0 grid-cols-[1rem_minmax(0,1fr)] py-0"
                        contentClassName="w-full min-w-0 overflow-hidden"
                        value={item}
                      >
                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center overflow-hidden">
                          <span className="block min-w-0 truncate pe-2">{choice.label}</span>
                          {hasBoth ? (
                            <div
                              className="flex justify-end"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <Switch
                                aria-label={`Use remote version of ${choice.label}`}
                                checked={useRemote}
                                className="[--thumb-size:--spacing(3)]"
                                onCheckedChange={(checked) => {
                                  const nextRef = checked
                                    ? choice.remote?.name
                                    : choice.local?.name;
                                  if (nextRef) selectBranchBaseRef(nextRef);
                                }}
                              />
                            </div>
                          ) : choice.remote ? (
                            <span
                              className="flex justify-end text-muted-foreground"
                              title="Remote only"
                            >
                              <CheckIcon aria-hidden="true" className="size-3" />
                            </span>
                          ) : null}
                        </div>
                      </ComboboxItem>
                    );
                  })}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  collapsedDiffFileKeys.size === codeViewFiles.length && codeViewFiles.length > 0
                    ? "Expand all diffs"
                    : "Collapse all diffs"
                }
                onClick={() =>
                  setAllDiffFilesCollapsed(
                    !(
                      collapsedDiffFileKeys.size === codeViewFiles.length &&
                      codeViewFiles.length > 0
                    ),
                  )
                }
              />
            }
          >
            <ChevronsUpDownIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup side="top">
            {collapsedDiffFileKeys.size === codeViewFiles.length && codeViewFiles.length > 0
              ? "Expand all diffs"
              : "Collapse all diffs"}
          </TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  filesPanelOpen && "bg-muted/70 text-foreground",
                )}
                aria-label={filesPanelOpen ? "Hide changed files" : "Show changed files"}
                aria-pressed={filesPanelOpen}
                onClick={() => setFilesPanelOpen((open) => !open)}
              />
            }
          >
            <FolderTreeIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup side="top">{filesPanelOpen ? "Hide files" : "Show files"}</TooltipPopup>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Diff options"
          >
            <EllipsisIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={refreshDiff}>
              <RefreshCwIcon />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={wordWrap} onCheckedChange={setWordWrap}>
              Enable word wrap
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={wordDiffs} onCheckedChange={setWordDiffs}>
              Enable word diffs
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={diffIgnoreWhitespace}
              onCheckedChange={setDiffIgnoreWhitespace}
            >
              Hide whitespace
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem disabled>
              <FileMinus2Icon />
              Don&apos;t load full files
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <ImageIcon />
              Enable rich preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void copyGitApplyCommand()}>
              <CopyIcon />
              Copy git apply command
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToggleGroup
          className="shrink-0"
          variant="outline"
          size="xs"
          value={[diffRenderMode]}
          onValueChange={(value) => {
            const next = value[0];
            if (next === "stacked" || next === "split") {
              setDiffRenderMode(next);
            }
          }}
        >
          <Toggle title="Unified diff" aria-label="Unified diff" value="stacked">
            <Rows3Icon className="size-3" />
          </Toggle>
          <Toggle title="Split diff" aria-label="Split diff" value="split">
            <Columns2Icon className="size-3" />
          </Toggle>
        </ToggleGroup>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                aria-label={wordWrap ? "Disable diff line wrapping" : "Enable diff line wrapping"}
                variant="outline"
                size="xs"
                pressed={wordWrap}
                onPressedChange={(pressed) => {
                  setWordWrap(Boolean(pressed));
                }}
              />
            }
          >
            <TextWrapIcon className="size-3" />
          </TooltipTrigger>
          <TooltipPopup side="top">
            {wordWrap ? "Disable line wrapping" : "Enable line wrapping"}
          </TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                aria-label={
                  diffIgnoreWhitespace ? "Show whitespace changes" : "Hide whitespace changes"
                }
                variant="outline"
                size="xs"
                pressed={diffIgnoreWhitespace}
                onPressedChange={(pressed) => {
                  setDiffIgnoreWhitespace(Boolean(pressed));
                }}
              />
            }
          >
            <PilcrowIcon className="size-3" />
          </TooltipTrigger>
          <TooltipPopup side="top">
            {diffIgnoreWhitespace ? "Show whitespace changes" : "Hide whitespace changes"}
          </TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                aria-label="Review comments"
                variant="outline"
                size="xs"
                pressed={commentsPanelOpen}
                onPressedChange={(pressed) => setCommentsPanelOpen(Boolean(pressed))}
              />
            }
          >
            <MessageSquareIcon className="size-3" />
            {reviewCommentCount > 0 ? (
              <span className="ml-0.5 text-[10px]">{reviewCommentCount}</span>
            ) : null}
          </TooltipTrigger>
          <TooltipPopup side="top">Review comments</TooltipPopup>
        </Tooltip>
      </div>
    </>
  );

  return (
    <DiffPanelShell mode={mode} header={headerRow}>
      {!activeThread ? (
        <div className="flex flex-1 items-center justify-center px-5 text-center text-xs text-muted-foreground/70">
          Select a thread to inspect turn diffs.
        </div>
      ) : !isGitRepo ? (
        <div className="flex flex-1 items-center justify-center px-5 text-center text-xs text-muted-foreground/70">
          Turn diffs are unavailable because this project is not a git repository.
        </div>
      ) : selectedTurnId !== null && orderedTurnDiffSummaries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 text-center text-xs text-muted-foreground/70">
          No completed turns yet.
        </div>
      ) : (
        <>
          <div className="relative flex min-h-0 min-w-0 flex-1">
            {filesPanelOpen ? (
              <aside className="hidden w-60 shrink-0 flex-col border-r border-border/70 bg-card/20 md:flex">
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 px-3 text-xs">
                  <span className="font-medium text-foreground">Changed files</span>
                  <span className="tabular-nums text-muted-foreground">
                    {selectedScopeFileCount}
                  </span>
                </div>
                <div className="relative mx-2 my-2 shrink-0">
                  <SearchIcon className="pointer-events-none absolute top-1.5 left-2 size-3.5 text-muted-foreground" />
                  <input
                    type="search"
                    value={fileFilter}
                    onChange={(event) => setFileFilter(event.target.value)}
                    placeholder="Filter files..."
                    aria-label="Filter changed files"
                    className="h-7 w-full rounded-md border border-border/70 bg-background px-7 text-xs outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-2">
                  {filteredReviewTreeFiles.length === 0 ? (
                    <p className="px-2 py-4 text-[11px] text-muted-foreground/70">
                      {fileFilter ? "No matching files." : "No changed files."}
                    </p>
                  ) : (
                    <ChangedFilesTreeView
                      files={filteredReviewTreeFiles}
                      allDirectoriesExpanded={allNavigatorDirectoriesExpanded}
                      resolvedTheme={resolvedTheme}
                      activeFilePath={selectedFilePath}
                      statusByPath={reviewStatusByPath}
                      getStatusLabel={diffStatusName}
                      getStatusClassName={diffStatusClassName}
                      onOpenFile={(filePath) => {
                        const file = codeViewFiles.find(
                          (candidate) => candidate.filePath === filePath,
                        );
                        if (file) focusDiffFile(filePath, file.fileKey);
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center gap-1 border-t border-border/70 px-3 text-[11px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  onClick={() => setAllNavigatorDirectoriesExpanded((value) => !value)}
                >
                  <ChevronsUpDownIcon className="size-3.5" />
                  {allNavigatorDirectoriesExpanded ? "Collapse folders" : "Expand folders"}
                </button>
              </aside>
            ) : null}
            <div className="diff-panel-viewport flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {isSelectedPatchTruncated && (
                <p className="shrink-0 border-b border-border/70 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                  This diff was truncated because it exceeded the preview limit. The changes shown
                  are incomplete.
                </p>
              )}
              {selectedPatchError && !renderablePatch && (
                <div className="px-3">
                  <p className="mb-2 text-[11px] text-red-500/80">{selectedPatchError}</p>
                </div>
              )}
              {!renderablePatch ? (
                isLoadingSelectedPatch ? (
                  <DiffPanelLoadingState
                    label={
                      selectedTurn
                        ? "Loading checkpoint diff..."
                        : selectedGitScope === "unstaged"
                          ? "Loading working tree diff..."
                          : "Loading branch diff..."
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 py-2 text-xs text-muted-foreground/70">
                    <p>
                      {hasNoNetChanges
                        ? "No net changes in this selection."
                        : "No patch available for this selection."}
                    </p>
                  </div>
                )
              ) : renderablePatch.kind === "files" ? (
                <div
                  className="min-h-0 flex-1"
                  onClickCapture={(event) => {
                    const composedPath = event.nativeEvent.composedPath?.() ?? [];
                    const title = composedPath.find(
                      (node): node is HTMLElement =>
                        node instanceof HTMLElement && node.hasAttribute("data-title"),
                    );
                    const filePath = title?.textContent?.trim();
                    if (filePath) openDiffFile(filePath);
                  }}
                >
                  <AnnotatableCodeView
                    viewerRef={codeViewRef}
                    key={collapseScopeKey ?? reviewSectionId}
                    className="diff-render-surface h-full min-h-0 overflow-auto"
                    files={codeViewFiles}
                    sectionId={reviewSectionId}
                    sectionTitle={reviewSectionTitle}
                    composerDraftTarget={composerDraftTarget}
                    renderHeaderPrefix={(fileDiff, fileKey, collapsed) => {
                      const filePath = resolveFileDiffPath(fileDiff);
                      return (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 transition-colors hover:bg-foreground/10 focus-visible:outline-hidden",
                                  getDiffCollapseIconClassName(fileDiff),
                                )}
                                aria-label={
                                  collapsed ? `Expand ${filePath}` : `Collapse ${filePath}`
                                }
                                aria-expanded={!collapsed}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleDiffFileCollapsed(fileKey);
                                }}
                              />
                            }
                          >
                            {collapsed ? (
                              <ChevronRightIcon className="size-4" />
                            ) : (
                              <ChevronDownIcon className="size-4" />
                            )}
                          </TooltipTrigger>
                          <TooltipPopup side="top">
                            {collapsed ? "Expand diff" : "Collapse diff"}
                          </TooltipPopup>
                        </Tooltip>
                      );
                    }}
                    options={{
                      diffStyle: diffRenderMode === "split" ? "split" : "unified",
                      lineDiffType: wordDiffs ? "word" : "none",
                      overflow: wordWrap ? "wrap" : "scroll",
                      theme: resolveDiffThemeName(resolvedTheme),
                      themeType: resolvedTheme as DiffThemeType,
                      unsafeCSS: DIFF_PANEL_UNSAFE_CSS,
                      stickyHeaders: true,
                      hunkSeparators: "line-info",
                      layout: { paddingTop: 8, paddingBottom: 8, gap: 8 },
                    }}
                  />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto p-2">
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground/75">{renderablePatch.reason}</p>
                    <pre
                      className={cn(
                        "max-h-[72vh] rounded-md border border-border/70 bg-background/70 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground/90",
                        wordWrap
                          ? "overflow-auto whitespace-pre-wrap wrap-break-word"
                          : "overflow-auto",
                      )}
                    >
                      {renderablePatch.text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            {commentsPanelOpen ? (
              <aside className="absolute inset-y-0 right-0 z-10 flex w-72 max-w-[80%] flex-col border-l border-border bg-card shadow-xl">
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-xs">
                  <span className="font-medium text-foreground">Review comments</span>
                  <span className="tabular-nums text-muted-foreground">
                    {reviewComments.length}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {reviewComments.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      Select lines in the diff to add a comment.
                    </p>
                  ) : (
                    reviewComments.map((comment) => (
                      <div key={comment.id} className="border-b border-border/70 px-3 py-3">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="truncate">{comment.filePath}</span>
                          <span className="shrink-0">{comment.rangeLabel}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        </>
      )}
    </DiffPanelShell>
  );
}

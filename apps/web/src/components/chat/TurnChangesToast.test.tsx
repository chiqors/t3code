import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import type { TurnDiffSummary } from "../../types";
import { TurnChangesToast } from "./TurnChangesToast";

describe("TurnChangesToast", () => {
  it("renders the latest turn file count and shared diff totals", () => {
    const markup = renderToStaticMarkup(
      <TurnChangesToast
        summary={
          {
            turnId: "turn-1",
            status: "ready",
            files: [
              { path: "src/App.tsx", kind: "modified", additions: 117, deletions: 0 },
              { path: "src/main.tsx", kind: "modified", additions: 4, deletions: 2 },
            ],
          } as unknown as TurnDiffSummary
        }
        bottomOffset={80}
        onOpen={() => {}}
        onDismiss={() => {}}
      />,
    );

    expect(markup).toContain("2 files changed");
    expect(markup).toContain("+121");
    expect(markup).toContain("-2");
    expect(markup).toContain('data-testid="turn-changes-toast"');
  });
});

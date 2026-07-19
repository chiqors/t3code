import { describe, expect, it } from "vite-plus/test";

import { getSourceControlIssueSearchUrl } from "./sourceControlPresentation";

describe("getSourceControlIssueSearchUrl", () => {
  it("builds the GitHub issues destination", () => {
    expect(
      getSourceControlIssueSearchUrl({
        kind: "github",
        name: "GitHub",
        baseUrl: "https://github.com/",
      }),
    ).toBe("https://github.com/issues");
  });

  it("builds the GitLab issues destination", () => {
    expect(
      getSourceControlIssueSearchUrl({
        kind: "gitlab",
        name: "GitLab",
        baseUrl: "https://gitlab.example.com/",
      }),
    ).toBe("https://gitlab.example.com/dashboard/issues");
  });

  it("does not invent an issue destination for unsupported providers", () => {
    expect(
      getSourceControlIssueSearchUrl({
        kind: "unknown",
        name: "Source control",
        baseUrl: "https://example.com",
      }),
    ).toBeNull();
  });
});

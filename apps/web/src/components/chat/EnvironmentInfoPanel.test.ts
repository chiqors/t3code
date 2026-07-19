import { describe, expect, it } from "vite-plus/test";

import { shouldShowEnvironmentInfoPanel } from "./EnvironmentInfoPanel";

describe("shouldShowEnvironmentInfoPanel", () => {
  it("shows the preferred panel when the right panel is closed", () => {
    expect(shouldShowEnvironmentInfoPanel(true, false)).toBe(true);
  });

  it("stays available beside the right panel", () => {
    expect(shouldShowEnvironmentInfoPanel(true, true)).toBe(true);
  });

  it("respects an explicit hidden preference", () => {
    expect(shouldShowEnvironmentInfoPanel(false, false)).toBe(false);
  });
});

import { describe, expect, it } from "vite-plus/test";

import { shouldShowEnvironmentInfoPanel } from "./EnvironmentInfoPanel";

describe("shouldShowEnvironmentInfoPanel", () => {
  it("shows the preferred panel when the right panel is closed", () => {
    expect(shouldShowEnvironmentInfoPanel(true, false)).toBe(true);
  });

  it("temporarily hides it while the right panel is open", () => {
    expect(shouldShowEnvironmentInfoPanel(true, true)).toBe(false);
  });

  it("respects an explicit hidden preference", () => {
    expect(shouldShowEnvironmentInfoPanel(false, false)).toBe(false);
  });
});

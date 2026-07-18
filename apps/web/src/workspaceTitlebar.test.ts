import { describe, expect, it } from "vite-plus/test";

import { zoomCompensatedInsetPx } from "./workspaceTitlebar";

describe("zoomCompensatedInsetPx", () => {
  it("keeps the inset unchanged at the initial device pixel ratio", () => {
    expect(zoomCompensatedInsetPx(90, 2, 2)).toBe("90px");
  });

  it("shrinks the CSS reservation when page zoom increases", () => {
    expect(zoomCompensatedInsetPx(90, 2, 2.5)).toBe("72px");
  });

  it("expands the CSS reservation when page zoom decreases", () => {
    expect(zoomCompensatedInsetPx(90, 2, 1.5)).toBe("120px");
  });
});

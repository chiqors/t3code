export const COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS =
  "[[data-sidebar-state=collapsed]_&]:pl-[var(--workspace-titlebar-content-left)]";

/**
 * Native macOS traffic lights stay in window coordinates while page content
 * follows Chromium's page zoom. Scale the renderer-side reservation by the
 * relative device-pixel-ratio change so the first app control remains aligned.
 */
export function zoomCompensatedInsetPx(
  baseInsetPx: number,
  initialDevicePixelRatio: number,
  currentDevicePixelRatio: number,
): string {
  if (
    !Number.isFinite(baseInsetPx) ||
    !Number.isFinite(initialDevicePixelRatio) ||
    !Number.isFinite(currentDevicePixelRatio) ||
    initialDevicePixelRatio <= 0 ||
    currentDevicePixelRatio <= 0
  ) {
    return `${baseInsetPx}px`;
  }
  return `${baseInsetPx * (initialDevicePixelRatio / currentDevicePixelRatio)}px`;
}

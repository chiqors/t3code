import { useAtomValue } from "@effect/atom-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { isElectron } from "../env";
import { resolveShortcutCommand, shortcutLabelForCommand } from "../keybindings";
import { cn, isMacPlatform } from "../lib/utils";
import { primaryServerKeybindingsAtom } from "../state/server";
import { useClientSettings } from "../hooks/useSettings";
import ThreadSidebar from "./Sidebar";
import ThreadSidebarV2 from "./SidebarV2";
import { useSidebarStageBackdropVariant } from "./SidebarStageBackdrop";
import {
  Sidebar,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
  useSidebarVisibility,
} from "./ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { zoomCompensatedInsetPx } from "~/workspaceTitlebar";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;
const MACOS_TRAFFIC_LIGHTS_LEFT_INSET_PX = 90;

function SidebarControl() {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const { isMobile, state, toggleSidebar } = useSidebar();
  const isSidebarVisible = useSidebarVisibility();
  const stageBackdropVariant = useSidebarStageBackdropVariant();
  const shortcutLabel = shortcutLabelForCommand(keybindings, "sidebar.toggle");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (resolveShortcutCommand(event, keybindings) !== "sidebar.toggle") return;

      event.preventDefault();
      event.stopPropagation();
      toggleSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keybindings, toggleSidebar]);

  if (isElectron && !isMobile && state === "expanded") {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-[var(--workspace-controls-left)] top-[var(--workspace-controls-top)] z-50 flex h-[var(--workspace-controls-height)] items-center"
      data-sidebar-control=""
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarTrigger
              className={cn(
                "pointer-events-auto",
                isSidebarVisible &&
                  stageBackdropVariant &&
                  "hover:bg-white/15 [&_svg]:text-white/85! [&_svg]:hover:text-white!",
              )}
              aria-label="Toggle main sidebar"
            />
          }
        />
        <TooltipPopup side="bottom">
          Toggle main sidebar{shortcutLabel ? ` (${shortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
    </div>
  );
}

export function AppSidebarLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const sidebarV2Enabled = useClientSettings((settings) => settings.sidebarV2Enabled);
  const pathname = useLocation({ select: (location) => location.pathname });
  // Settings routes render the settings nav, which lives in the v1 component
  // and is identical for both sidebars, so v1 stays mounted there.
  const isOnSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const useSidebarV2 = sidebarV2Enabled && !isOnSettings;
  const isMacosDesktop = isElectron && isMacPlatform(navigator.platform);
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(() => {
    const getWindowFullscreenState = window.desktopBridge?.getWindowFullscreenState;
    return isMacosDesktop && typeof getWindowFullscreenState === "function"
      ? getWindowFullscreenState()
      : false;
  });
  const initialDevicePixelRatioRef = useRef(
    typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1,
  );
  const initialZoomFactorRef = useRef(
    (() => {
      const zoomFactor = window.desktopBridge?.getWindowZoomFactor?.();
      return typeof zoomFactor === "number" && Number.isFinite(zoomFactor) && zoomFactor > 0
        ? zoomFactor
        : 1;
    })(),
  );
  const [zoomFactor, setZoomFactor] = useState(initialZoomFactorRef.current);
  useEffect(() => {
    const bridge = window.desktopBridge;
    const updateZoomFactor = () => {
      const bridgeZoomFactor = bridge?.getWindowZoomFactor?.();
      if (
        typeof bridgeZoomFactor === "number" &&
        Number.isFinite(bridgeZoomFactor) &&
        bridgeZoomFactor > 0
      ) {
        setZoomFactor(bridgeZoomFactor);
        return;
      }
      const nextDevicePixelRatio = window.devicePixelRatio;
      if (
        typeof nextDevicePixelRatio === "number" &&
        Number.isFinite(nextDevicePixelRatio) &&
        nextDevicePixelRatio > 0
      ) {
        setZoomFactor(nextDevicePixelRatio / initialDevicePixelRatioRef.current);
      }
    };
    const viewport = window.visualViewport;
    window.addEventListener("resize", updateZoomFactor);
    viewport?.addEventListener("resize", updateZoomFactor);
    const unsubscribe = bridge?.onWindowZoomFactorChange?.(setZoomFactor);
    updateZoomFactor();
    return () => {
      window.removeEventListener("resize", updateZoomFactor);
      viewport?.removeEventListener("resize", updateZoomFactor);
      unsubscribe?.();
    };
  }, []);
  const macosWindowControlsStyle =
    isMacosDesktop && !isWindowFullscreen
      ? ({
          // Electron's native traffic lights stay in physical window
          // coordinates while Chromium scales CSS pixels with page zoom.
          // Keep the whole renderer titlebar at the native physical height,
          // not only the floating controls and collapsed-sidebar trigger.
          "--workspace-topbar-height": zoomCompensatedInsetPx(52, 1, zoomFactor),
          "--workspace-controls-left": zoomCompensatedInsetPx(
            MACOS_TRAFFIC_LIGHTS_LEFT_INSET_PX,
            1,
            zoomFactor,
          ),
          "--workspace-controls-height": zoomCompensatedInsetPx(52, 1, zoomFactor),
        } as CSSProperties)
      : undefined;

  useEffect(() => {
    if (!isMacosDesktop) return;
    const bridge = window.desktopBridge;
    if (!bridge) return;
    const { getWindowFullscreenState, onWindowFullscreenStateChange } = bridge;
    if (
      typeof getWindowFullscreenState !== "function" ||
      typeof onWindowFullscreenStateChange !== "function"
    ) {
      return;
    }

    const unsubscribe = onWindowFullscreenStateChange(setIsWindowFullscreen);
    setIsWindowFullscreen(getWindowFullscreenState());
    return unsubscribe;
  }, [isMacosDesktop]);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "open-settings") {
        const isSettingsRoute = /^\/settings(\/|$)/.test(pathname);
        if (!isSettingsRoute) {
          void navigate({ to: "/settings" });
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate, pathname]);

  return (
    <SidebarProvider className="h-dvh! min-h-0!" defaultOpen style={macosWindowControlsStyle}>
      <Sidebar
        side="left"
        collapsible="offcanvas"
        className={
          // v2 is a raised panel against the pure-black canvas: its card
          // surface lets the bordered thread cards read as set into it.
          useSidebarV2
            ? "border-r border-black/15 bg-neutral-100 text-foreground dark:border-white/10 dark:bg-card"
            : "border-r border-border bg-card text-foreground"
        }
        resizable={{
          minWidth: THREAD_SIDEBAR_MIN_WIDTH,
          shouldAcceptWidth: ({ nextWidth, wrapper }) =>
            wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
          storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
        }}
      >
        {useSidebarV2 ? <ThreadSidebarV2 /> : <ThreadSidebar />}
        <SidebarRail />
      </Sidebar>
      {children}
      <SidebarControl />
    </SidebarProvider>
  );
}

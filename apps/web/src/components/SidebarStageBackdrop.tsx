import { useAtomValue } from "@effect/atom-react";

import { APP_STAGE_LABEL } from "../branding";
import { resolveServerBackedAppStageLabel } from "../branding.logic";
import { primaryServerConfigAtom } from "../state/server";

export type SidebarStageBackdropVariant = "nightly" | "dev" | "alpha";

// A wide viewBox keeps the 96-unit art height at a fixed scale while sidebar resizing reveals
// more horizontal canvas instead of zooming the scene.
const STAGE_BACKDROP_VIEW_BOX = "0 0 8192 96";

export function resolveSidebarStageBackdropVariant(
  stageLabel: string,
): SidebarStageBackdropVariant | null {
  const normalized = stageLabel.trim().toLowerCase();
  if (normalized === "nightly") return "nightly";
  if (normalized === "dev") return "dev";
  if (normalized === "alpha") return "alpha";
  return null;
}

export function useSidebarStageBackdropVariant(): SidebarStageBackdropVariant | null {
  const primaryServerVersion =
    useAtomValue(primaryServerConfigAtom)?.environment.serverVersion ?? null;

  return resolveSidebarStageBackdropVariant(
    resolveServerBackedAppStageLabel({
      primaryServerVersion,
      fallbackStageLabel: APP_STAGE_LABEL,
    }),
  );
}

/** Stage-channel header art; palettes mirror the per-channel app icons in `assets/`. */
export function SidebarStageBackdrop({ variant }: { variant: SidebarStageBackdropVariant }) {
  return (
    <div
      aria-hidden
      className="sidebar-stage-backdrop pointer-events-none absolute inset-x-0 top-0 z-0 h-24 select-none overflow-hidden"
    >
      {variant === "nightly" ? (
        <NightlySkyArt />
      ) : variant === "dev" ? (
        <DevBlueprintArt />
      ) : (
        <AlphaStudioArt />
      )}
    </div>
  );
}

function AlphaStudioArt() {
  return (
    <svg
      className="stage-alpha h-full w-full"
      fill="none"
      preserveAspectRatio="xMinYMin slice"
      viewBox={STAGE_BACKDROP_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="stage-alpha-base"
          x1="0"
          y1="0"
          x2="0"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop style={{ stopColor: "var(--stage-alpha-top)" }} />
          <stop offset="0.36" style={{ stopColor: "var(--stage-alpha-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--stage-alpha-bottom)" }} />
        </linearGradient>
        <radialGradient
          id="stage-alpha-glow-left"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(116 10) rotate(22) scale(172 46)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFF8D9" stopOpacity="0.24" />
          <stop offset="0.5" stopColor="#A48BFF" stopOpacity="0.1" />
          <stop offset="1" stopColor="#1A1C26" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="stage-alpha-glow-right"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(620 8) rotate(168) scale(220 64)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7CB8FF" stopOpacity="0.24" />
          <stop offset="0.55" stopColor="#4A64FF" stopOpacity="0.12" />
          <stop offset="1" stopColor="#161821" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="stage-alpha-band"
          x1="0"
          y1="0"
          x2="0"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" stopOpacity="0.14" />
          <stop offset="0.18" stopColor="#C7DCFF" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#8CA8FF" stopOpacity="0.04" />
          <stop offset="1" stopColor="#0E0F16" stopOpacity="0" />
        </linearGradient>
        <pattern id="stage-alpha-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" stroke="#EEF4FF" strokeOpacity="0.045" strokeWidth="0.5" />
        </pattern>
        <pattern id="stage-alpha-major" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" stroke="#EEF4FF" strokeOpacity="0.08" strokeWidth="0.6" />
        </pattern>
      </defs>

      <rect width="100%" height="96" fill="url(#stage-alpha-base)" />
      <rect width="100%" height="96" fill="url(#stage-alpha-glow-left)" />
      <rect width="100%" height="96" fill="url(#stage-alpha-glow-right)" />
      <rect width="100%" height="96" fill="url(#stage-alpha-band)" />
      <rect width="100%" height="96" fill="url(#stage-alpha-grid)" />
      <rect width="100%" height="96" fill="url(#stage-alpha-major)" />

      <path
        d="M0 14H100"
        stroke="#F6F8FF"
        strokeOpacity="0.16"
        strokeLinecap="round"
        strokeWidth="0.75"
      />
      <path
        d="M132 14H180"
        stroke="#F6F8FF"
        strokeOpacity="0.12"
        strokeLinecap="round"
        strokeWidth="0.75"
      />
      <path
        d="M548 14H676"
        stroke="#EFF5FF"
        strokeOpacity="0.11"
        strokeLinecap="round"
        strokeWidth="0.75"
      />
      <path
        d="M702 14H740"
        stroke="#EFF5FF"
        strokeOpacity="0.08"
        strokeLinecap="round"
        strokeWidth="0.75"
      />

      <circle cx="592" cy="26" r="18" stroke="#E8F0FF" strokeOpacity="0.16" strokeWidth="0.7" />
      <circle cx="592" cy="26" r="8" stroke="#E8F0FF" strokeOpacity="0.12" strokeWidth="0.6" />
      <path
        d="M592 4V48M570 26H614"
        stroke="#E8F0FF"
        strokeOpacity="0.12"
        strokeLinecap="round"
        strokeWidth="0.55"
      />

      <path
        d="M736 12V28M732 12H740M732 28H740"
        stroke="#F4F8FF"
        strokeOpacity="0.2"
        strokeWidth="0.7"
      />
      <path d="M758 12V22M754 12H762" stroke="#F4F8FF" strokeOpacity="0.16" strokeWidth="0.7" />

      <path
        d="M248 42C286 26 330 26 370 38C410 50 456 50 500 34"
        stroke="#D7E3FF"
        strokeOpacity="0.1"
        strokeWidth="0.75"
      />
    </svg>
  );
}

const NIGHTLY_STARS: ReadonlyArray<{
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}> = [
  { cx: 14, cy: 10, r: 0.6, opacity: 0.85 },
  { cx: 38, cy: 22, r: 0.4, opacity: 0.55 },
  { cx: 58, cy: 8, r: 0.5, opacity: 0.7 },
  { cx: 84, cy: 16, r: 0.4, opacity: 0.5 },
  { cx: 104, cy: 7, r: 0.6, opacity: 0.8 },
  { cx: 126, cy: 20, r: 0.4, opacity: 0.55 },
  { cx: 148, cy: 11, r: 0.5, opacity: 0.7 },
  { cx: 170, cy: 24, r: 0.4, opacity: 0.5 },
  { cx: 192, cy: 9, r: 0.6, opacity: 0.8 },
  { cx: 214, cy: 18, r: 0.4, opacity: 0.55 },
  { cx: 236, cy: 8, r: 0.5, opacity: 0.7 },
  { cx: 258, cy: 20, r: 0.45, opacity: 0.6 },
  { cx: 278, cy: 11, r: 0.55, opacity: 0.75 },
  { cx: 26, cy: 34, r: 0.4, opacity: 0.45 },
  { cx: 118, cy: 34, r: 0.4, opacity: 0.45 },
  { cx: 202, cy: 32, r: 0.4, opacity: 0.5 },
  { cx: 268, cy: 34, r: 0.4, opacity: 0.45 },
];

const NIGHTLY_SPARKLES: ReadonlyArray<{ x: number; y: number }> = [
  { x: 70, y: 28 },
  { x: 160, y: 36 },
  { x: 246, y: 26 },
];

function NightlySkyArt() {
  return (
    <svg
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMinYMin slice"
      viewBox={STAGE_BACKDROP_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="stage-night-sky"
          x1="24"
          y1="0"
          x2="264"
          y2="96"
          gradientUnits="userSpaceOnUse"
          spreadMethod="reflect"
        >
          <stop stopColor="#07152F" />
          <stop offset="0.5" stopColor="#151443" />
          <stop offset="1" stopColor="#32155B" />
        </linearGradient>
        <linearGradient
          id="stage-night-veil"
          x1="0"
          y1="0"
          x2="0"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D7E2FF" stopOpacity="0.18" />
          <stop offset="0.4" stopColor="#91A3FF" stopOpacity="0.08" />
          <stop offset="1" stopColor="#0B102D" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id="stage-night-glow"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(216 18) rotate(137) scale(120 84)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5165D8" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#283075" stopOpacity="0.16" />
          <stop offset="1" stopColor="#111635" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="stage-night-cloud"
          x1="0"
          y1="60"
          x2="288"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4EA4FF" stopOpacity="0.5" />
          <stop offset="0.52" stopColor="#696FEA" stopOpacity="0.62" />
          <stop offset="1" stopColor="#A85BEA" stopOpacity="0.5" />
        </linearGradient>
        <filter
          id="stage-night-soft"
          x="-24"
          y="-24"
          width="336"
          height="144"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <pattern id="stage-night-stars" width="288" height="96" patternUnits="userSpaceOnUse">
          <g fill="#E4EAFF">
            {NIGHTLY_STARS.map((star) => (
              <circle
                key={`${star.cx}-${star.cy}`}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fillOpacity={star.opacity}
              />
            ))}
          </g>
          <g stroke="#C8D7FF" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="0.6">
            {NIGHTLY_SPARKLES.map((sparkle) => (
              <g key={`${sparkle.x}-${sparkle.y}`}>
                <path d={`M${sparkle.x - 1.5} ${sparkle.y}H${sparkle.x + 1.5}`} />
                <path d={`M${sparkle.x} ${sparkle.y - 1.5}V${sparkle.y + 1.5}`} />
              </g>
            ))}
          </g>
        </pattern>
        <pattern id="stage-night-glows" width="640" height="96" patternUnits="userSpaceOnUse">
          <rect width="640" height="96" fill="url(#stage-night-glow)" />
        </pattern>
      </defs>

      <rect width="100%" height="96" fill="url(#stage-night-sky)" />
      <rect width="100%" height="96" fill="url(#stage-night-veil)" />
      <rect width="100%" height="96" fill="url(#stage-night-glows)" />
      <rect width="100%" height="96" fill="url(#stage-night-stars)" />

      <path
        d="M-10 26C44 8 104 10 156 24C205 37 266 37 298 20"
        stroke="#B9C7FF"
        strokeOpacity="0.22"
        strokeWidth="0.75"
      />
      <path
        d="M-10 38C48 20 108 20 162 34C214 47 265 48 298 33"
        stroke="#98A7FF"
        strokeOpacity="0.14"
        strokeWidth="0.65"
      />
      <circle cx="246" cy="18" r="9.5" stroke="#E5EAFF" strokeOpacity="0.35" strokeWidth="0.8" />
      <circle cx="246" cy="18" r="4.2" fill="#E5EAFF" fillOpacity="0.28" />

      <g filter="url(#stage-night-soft)">
        <path
          d="M-12 88C-12 74 0 63 14 63C18 50 30 41 44 41C58 41 70 49 74 62C79 57 86 54 94 54C110 54 123 66 124 82C132 83 138 88 141 96H-12V88Z"
          fill="url(#stage-night-cloud)"
        />
      </g>
      <g filter="url(#stage-night-soft)">
        <path
          d="M150 96C151 84 161 75 173 75C176 64 186 57 198 57C210 57 220 64 223 75C231 75 238 80 241 87C250 87 257 91 260 96H150Z"
          fill="url(#stage-night-cloud)"
          fillOpacity="0.8"
        />
      </g>

      <path
        d="M214 50C226 46 234 40 240 31C248 20 259 16 271 16"
        stroke="#E7EEFF"
        strokeOpacity="0.24"
        strokeLinecap="round"
        strokeWidth="0.7"
      />
      <path
        d="M214 50C225 54 233 61 238 70C243 78 251 84 264 86"
        stroke="#D2E2FF"
        strokeOpacity="0.18"
        strokeLinecap="round"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function DevBlueprintArt() {
  return (
    <svg
      className="stage-blueprint h-full w-full"
      fill="none"
      preserveAspectRatio="xMinYMin slice"
      viewBox={STAGE_BACKDROP_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="stage-bp-paper"
          x1="60"
          y1="0"
          x2="220"
          y2="96"
          gradientUnits="userSpaceOnUse"
          spreadMethod="reflect"
        >
          <stop style={{ stopColor: "var(--stage-bp-top)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--stage-bp-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--stage-bp-bottom)" }} />
        </linearGradient>
        <linearGradient
          id="stage-bp-header-band"
          x1="0"
          y1="0"
          x2="0"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="0.3" stopColor="#AEE7FF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#1E45F0" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id="stage-bp-glow"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(216 14) rotate(137) scale(120 84)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D4F6FF" stopOpacity="0.4" />
          <stop offset="0.52" stopColor="#65C8FF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#276AF1" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="stage-bp-glow-celeste"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(474 44) rotate(166) scale(156 92)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D2FFFF" stopOpacity="0.34" />
          <stop offset="0.5" stopColor="#48DCF5" stopOpacity="0.18" />
          <stop offset="1" stopColor="#277EF1" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="stage-bp-glow-violet"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(704 18) rotate(145) scale(132 88)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D9D8FF" stopOpacity="0.3" />
          <stop offset="0.52" stopColor="#7C8BFF" stopOpacity="0.14" />
          <stop offset="1" stopColor="#3155DF" stopOpacity="0" />
        </radialGradient>
        <pattern id="stage-bp-grid-minor" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" stroke="#EAF6FF" strokeOpacity="0.14" strokeWidth="0.5" />
        </pattern>
        <pattern id="stage-bp-grid-major" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" stroke="#EAF6FF" strokeOpacity="0.26" strokeWidth="0.6" />
        </pattern>
        <pattern id="stage-bp-ruler" width="32" height="6" patternUnits="userSpaceOnUse">
          <path
            d="M4 0V2.5M12 0V2.5M20 0V4M28 0V2.5"
            stroke="#DDF7FF"
            strokeOpacity="0.5"
            strokeWidth="0.5"
          />
        </pattern>
        <pattern id="stage-bp-glows" width="768" height="96" patternUnits="userSpaceOnUse">
          <rect width="768" height="96" fill="url(#stage-bp-glow)" />
          <rect width="768" height="96" fill="url(#stage-bp-glow-celeste)" />
          <rect width="768" height="96" fill="url(#stage-bp-glow-violet)" />
        </pattern>
        <pattern id="stage-bp-annotations" width="768" height="96" patternUnits="userSpaceOnUse">
          <g stroke="#DDF7FF" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="0.7">
            <path d="M180 64H264" strokeDasharray="5 4" />
            <path d="M180 61V67M264 61V67" />
            <path d="M276 10V44" strokeDasharray="4 4" strokeOpacity="0.5" />
            <path d="M273 10H279M273 44H279" strokeOpacity="0.5" />
            <path d="M348 30H428" strokeDasharray="3.5 5" strokeOpacity="0.5" />
            <path d="M348 27V33M428 27V33" strokeOpacity="0.5" />
            <path d="M512 48V80" strokeDasharray="5 3" strokeOpacity="0.45" />
            <path d="M509 48H515M509 80H515" strokeOpacity="0.45" />
            <path d="M590 70H724" strokeDasharray="7 4" strokeOpacity="0.55" />
            <path d="M590 67V73M724 67V73" strokeOpacity="0.55" />
          </g>

          <g stroke="#DDF7FF" strokeLinecap="round" strokeOpacity="0.55" strokeWidth="0.6">
            <g>
              <path d="M34 60L38 64M38 60L34 64" />
            </g>
            <g>
              <path d="M228 26H234M231 23V29" />
            </g>
            <g>
              <path d="M143 51H149M146 48V54" />
            </g>
            <g>
              <path d="M316 16L322 22M322 16L316 22" />
            </g>
            <g>
              <path d="M468 70H476M472 66V74" />
            </g>
            <g>
              <path d="M558 28L564 34M564 28L558 34" />
            </g>
            <g>
              <path d="M742 44H750M746 40V48" />
            </g>
          </g>

          <g stroke="#DDF7FF" strokeOpacity="0.35" strokeWidth="0.6">
            <circle cx="196" cy="38" r="13" strokeDasharray="3.5 4" />
            <path d="M196 33V43M191 38H201" strokeOpacity="0.6" strokeWidth="0.4" />
            <circle cx="414" cy="64" r="10" strokeDasharray="2.5 3.5" />
            <path d="M414 60V68M410 64H418" strokeOpacity="0.6" strokeWidth="0.4" />
            <circle cx="648" cy="32" r="15" strokeDasharray="4 5" />
            <path d="M648 26V38M642 32H654" strokeOpacity="0.6" strokeWidth="0.4" />
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="96" fill="url(#stage-bp-paper)" />
      <rect width="100%" height="96" fill="url(#stage-bp-header-band)" />
      <rect width="100%" height="96" fill="url(#stage-bp-glows)" />
      <rect width="100%" height="96" fill="url(#stage-bp-grid-minor)" />
      <rect width="100%" height="96" fill="url(#stage-bp-grid-major)" />
      <rect width="100%" height="6" fill="url(#stage-bp-ruler)" />
      <rect width="100%" height="96" fill="url(#stage-bp-annotations)" />

      <g opacity="0.68">
        <path
          d="M24 16H102"
          stroke="#F3FCFF"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeWidth="0.8"
        />
        <path
          d="M24 16V32"
          stroke="#F3FCFF"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeWidth="0.8"
        />
        <path
          d="M24 32H48"
          stroke="#F3FCFF"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeWidth="0.8"
        />
        <path
          d="M126 16H196"
          stroke="#E2F7FF"
          strokeOpacity="0.38"
          strokeLinecap="round"
          strokeWidth="0.7"
        />
        <circle cx="226" cy="18" r="7.5" stroke="#EAFBFF" strokeOpacity="0.4" strokeWidth="0.7" />
        <path d="M226 12V24M220 18H232" stroke="#EAFBFF" strokeOpacity="0.32" strokeWidth="0.55" />
      </g>

      <g opacity="0.45">
        <path
          d="M532 12H616M532 12V28M616 12V28M532 28H616"
          stroke="#F1FDFF"
          strokeOpacity="0.32"
          strokeWidth="0.75"
        />
        <path
          d="M648 15H720"
          stroke="#F1FDFF"
          strokeOpacity="0.22"
          strokeLinecap="round"
          strokeWidth="0.65"
        />
      </g>
    </svg>
  );
}

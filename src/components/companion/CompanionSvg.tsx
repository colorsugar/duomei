import type { CompanionState } from "./companionStates";

type CompanionSvgProps = {
  state?: CompanionState;
  className?: string;
  title?: string;
};

export function CompanionSvg({ state = "sit", className = "", title = "DUOMEI Companion" }: CompanionSvgProps) {
  const isLook = state === "look";
  const isBlink = state === "blink";
  const isWave = state === "wave";
  const isWalk = state === "walk";
  const isHappy = state === "happy";
  const isSleep = state === "sleep";
  const isStretch = state === "stretch";
  const isYawn = state === "yawn";
  const isDrag = state === "drag";
  const isRest = state === "rest";
  const showFlag = state === "flag";
  const showLost = state === "lost";
  const isSleepy = isSleep || isYawn || isRest;
  const bodyClassName = [
    "companion-body",
    isWalk ? "is-walking" : "",
    isHappy ? "is-happy" : "",
    isDrag ? "is-dragging" : "",
    isSleepy ? "is-sleeping" : "",
    isRest ? "is-resting" : "",
    isStretch ? "is-stretching" : "",
    isYawn ? "is-yawning" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const armClassName = [
    "companion-arm",
    isWave ? "companion-arm--wave" : "",
    showFlag ? "companion-arm--flag" : "",
    isStretch ? "companion-arm--stretch" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const eyesClassName = [
    "companion-eyes",
    isLook ? "is-looking" : "",
    isBlink || isSleepy ? "is-blinking" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={`duomei-companion-svg duomei-companion-svg--${state} ${className}`.trim()}
      viewBox="0 0 180 180"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      <g className="companion-ground" fill="none" stroke="#d4c7ad" strokeWidth="2.5" strokeLinecap="round">
        <path d="M39 154c27 8 79 8 104-1" opacity="0.55" />
        <path d="M54 160c18 3 54 3 74-1" opacity="0.32" />
      </g>

      {showLost ? (
        <g className="companion-lost-sign" transform="translate(101 18)">
          <path d="M6 36v48" stroke="#7d6b55" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M-40 1c24-5 61-4 87 1 4 15 2 32-2 46-27 5-59 5-86 0-4-15-3-33 1-47Z"
            fill="#f1dfc0"
            stroke="#332d25"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text x="3" y="22" textAnchor="middle" fontSize="15" fontWeight="900" fill="#332d25">
            404
          </text>
          <text x="3" y="38" textAnchor="middle" fontSize="10" fontWeight="800" fill="#5f5245">
            LOST?
          </text>
          <path d="M-28 35c15 2 41 2 63-1" stroke="#ad8f64" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        </g>
      ) : null}

      {showFlag ? (
        <g className="companion-flag" transform="translate(116 34)">
          <path d="M0 61V5" stroke="#6f5d45" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M1 6c17-5 29 2 42 0v29c-13 4-25-3-42 1Z" fill="#d9b451" stroke="#332d25" strokeWidth="2.6" />
          <path d="M12 18c4-4 9-4 14 0" fill="none" stroke="#7d8f45" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : null}

      {isSleepy ? (
        <g className="companion-sleep-z" fill="#6f5d45" fontWeight="900">
          <text x="126" y="45" fontSize="15">
            z
          </text>
          <text x="140" y="34" fontSize="20">
            z
          </text>
        </g>
      ) : null}

      <g className={bodyClassName}>
        <g className="companion-feet" fill="#efe0bf" stroke="#332d25" strokeWidth="3.2" strokeLinejoin="round">
          <path d="M56 140c-12 0-20 6-19 14 16 3 28 1 36-5-2-6-8-9-17-9Z" />
          <path d="M94 142c-5 9 2 14 17 12 5-6 2-13-8-16-4 1-7 2-9 4Z" />
        </g>

        <g className="companion-torso">
          <path
            d="M52 93c18-10 51-8 66 11 13 17 7 39-18 47-24 8-59 1-70-20-8-16 3-30 22-38Z"
            fill="#f7edda"
            stroke="#332d25"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M58 108c10 8 34 9 50 1" fill="none" stroke="#d8b455" strokeWidth="7" strokeLinecap="round" opacity="0.65" />
          <path d="M82 117c5 3 12 3 17 0" fill="none" stroke="#d8b455" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        </g>

        <g className={armClassName}>
          <path
            d="M112 105c18-11 30-5 31 8 1 11-9 19-25 18"
            fill="#f7edda"
            stroke="#332d25"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {isWave ? (
            <path d="M145 91c4-5 9-8 14-10M149 103c6-1 11-1 16 1" stroke="#d9b451" strokeWidth="2.5" strokeLinecap="round" />
          ) : null}
        </g>

        <g className="companion-head">
          <path
            className="companion-pixel-edge"
            d="M54 41h56c10 0 18 8 18 18v49c0 10-8 18-18 18H54c-10 0-18-8-18-18V59c0-10 8-18 18-18Z"
            fill="#d1b77f"
            opacity="0.2"
            transform="translate(4 5)"
          />
          <path
            d="M50 36h58c12 0 21 9 21 21v50c0 12-9 21-21 21H50c-12 0-21-9-21-21V57c0-12 9-21 21-21Z"
            fill="#fbf3df"
            stroke="#332d25"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          <path d="M45 38c12-15 56-17 71-1" fill="none" stroke="#d7c5a6" strokeWidth="6" strokeLinecap="round" opacity="0.55" />

          <g className="companion-sprout">
            <path d="M81 36c2-15 0-24-4-31" fill="none" stroke="#5f6f33" strokeWidth="4" strokeLinecap="round" />
            <path d="M79 17c-13-10-26-7-34 3 11 5 24 5 34-3Z" fill="#8e9f3f" stroke="#332d25" strokeWidth="2.5" />
            <path d="M83 18c13-10 27-6 34 5-12 5-24 4-34-5Z" fill="#9aad49" stroke="#332d25" strokeWidth="2.5" />
          </g>

          <g className="companion-hat" opacity="0.94">
            <path d="M34 53c19-12 69-13 91-1 2 7-1 12-10 15-24-7-51-7-75 1-9-3-11-8-6-15Z" fill="#dfcfad" stroke="#332d25" strokeWidth="3" />
          </g>

          <g className={eyesClassName}>
            <rect x="58" y="77" width="7" height="15" rx="2.5" fill="#2d2924" />
            <rect x="94" y="77" width="7" height="15" rx="2.5" fill="#2d2924" />
          </g>
          <circle cx="50" cy="100" r="5" fill="#e9a679" opacity="0.58" />
          <circle cx="110" cy="100" r="5" fill="#e9a679" opacity="0.58" />
          {isYawn ? (
            <ellipse cx="81" cy="101" rx="5" ry="6" fill="#2d2924" opacity="0.82" />
          ) : (
            <path d={isHappy ? "M71 98c5 7 16 7 21 0" : "M73 98c4 3 11 3 15 0"} fill="none" stroke="#2d2924" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
      </g>
    </svg>
  );
}

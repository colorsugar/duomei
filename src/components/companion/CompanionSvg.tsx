import type { CompanionState } from "./companionStates";

type CompanionSvgProps = {
  state?: CompanionState;
  className?: string;
  title?: string;
};

export function CompanionSvg({ state = "sit", className = "", title = "DUOMEI 小旅伴" }: CompanionSvgProps) {
  const isLook = state === "look";
  const isWave = state === "wave";
  const isWalk = state === "walk";
  const showFlag = state === "flag";
  const showLost = state === "lost";

  return (
    <svg
      className={`duomei-companion-svg duomei-companion-svg--${state} ${className}`.trim()}
      viewBox="0 0 160 160"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g className="companion-ground" fill="none" stroke="#d4c7ad" strokeWidth="2" strokeLinecap="round">
        <path d="M38 136c21 7 65 7 87-1" opacity="0.55" />
        <path d="M48 140c12 3 45 4 65 0" opacity="0.34" />
      </g>

      {showLost ? (
        <g className="companion-lost-sign" transform="translate(86 23)">
          <path d="M10 18v64" stroke="#7d6b55" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M-30 0c18-4 53-3 75 1 3 14 1 31-2 43-24 4-52 4-75 0-3-14-2-30 2-44Z"
            fill="#f4ead8"
            stroke="#4d463c"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <text x="5" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#4d463c">
            404
          </text>
          <text x="5" y="36" textAnchor="middle" fontSize="10" fill="#7d6b55">
            迷路了
          </text>
        </g>
      ) : null}

      {showFlag ? (
        <g className="companion-flag" transform="translate(99 34)">
          <path d="M0 52V4" stroke="#7d6b55" strokeWidth="3" strokeLinecap="round" />
          <path d="M1 5c16-4 25 2 37 0v25c-12 4-23-2-37 1Z" fill="#d8a84e" stroke="#4d463c" strokeWidth="2" />
        </g>
      ) : null}

      <g className={isWalk ? "companion-body is-walking" : "companion-body"} transform="translate(0 0)">
        <g className="companion-backpack" transform="translate(99 80)">
          <path
            d="M8 5c10 2 17 11 18 26 1 20-7 33-22 34-14 1-25-9-25-27C-21 17-9 3 8 5Z"
            fill="#d8c39f"
            stroke="#3d3933"
            strokeWidth="2.8"
          />
          <path d="M-8 22c8 3 20 3 28 0" fill="none" stroke="#7d6b55" strokeWidth="2" strokeLinecap="round" />
          <path d="M-11 42c8 4 21 4 29 0" fill="none" stroke="#7d6b55" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="14" r="4" fill="#d8a84e" stroke="#7d6b55" strokeWidth="1.6" />
        </g>

        <g className="companion-tail" fill="#fbf6eb" stroke="#3d3933" strokeWidth="2.6" strokeLinecap="round">
          <path d="M45 99c-18 1-26 15-20 25 5 8 18 5 22-3" />
        </g>

        <g className="companion-body-shape">
          <path
            d="M44 70c20-14 54-9 67 15 13 23 2 51-29 55-31 5-57-8-62-30-4-18 6-31 24-40Z"
            fill="#fbf6eb"
            stroke="#3d3933"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path d="M44 105c-3 13-2 24 7 31" fill="none" stroke="#d9cdb9" strokeWidth="2" strokeLinecap="round" />
        </g>

        <g className="companion-head" transform="translate(0 0)">
          <path
            d="M40 51c8-20 47-24 64-7 13 14 10 35-7 45-16 10-47 8-59-5-8-9-7-22 2-33Z"
            fill="#fbf6eb"
            stroke="#3d3933"
            strokeWidth="2.8"
          />
          <path d="M50 42c8-18 36-22 47-6" fill="none" stroke="#3d3933" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          <g className="companion-eyes" transform={isLook ? "translate(2 -1)" : "translate(0 0)"}>
            <circle cx="61" cy="66" r="3.2" fill="#2d2924" />
            <circle cx="88" cy="65" r="3.2" fill="#2d2924" />
          </g>
          <path d="M73 75c3 3 8 3 11 0" fill="none" stroke="#2d2924" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 49c-3-10 2-18 10-15" fill="#fbf6eb" stroke="#3d3933" strokeWidth="2.4" />
          <path d="M99 47c6-8 14-4 13 6" fill="#fbf6eb" stroke="#3d3933" strokeWidth="2.4" />
        </g>

        <g className="companion-hat" transform="translate(0 0)">
          <path
            d="M36 48c15-16 55-20 78-3 4 8 2 14-5 18-21-8-49-8-72 2-8-4-9-10-1-17Z"
            fill="#e6d4b6"
            stroke="#3d3933"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M52 29c14-9 38-9 51 2 8 9 10 19 9 27-22-8-52-8-76 2 1-14 6-25 16-31Z"
            fill="#e9dac0"
            stroke="#3d3933"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path d="M54 45c14-6 37-6 51 1" fill="none" stroke="#b59d78" strokeWidth="2" strokeLinecap="round" />
        </g>

        <g className={isWave ? "companion-arm companion-arm--wave" : "companion-arm"} transform="translate(0 0)">
          <path
            d="M108 92c16-9 24-4 25 8 1 10-7 18-20 18"
            fill="#fbf6eb"
            stroke="#3d3933"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </g>
        <g className="companion-front-paws" fill="#fbf6eb" stroke="#3d3933" strokeWidth="2.6">
          <path d="M50 127c-6 0-10 5-9 10 9 2 16 1 22-4" />
          <path d="M82 130c-2 7 3 10 12 9 3-5 1-10-5-13" />
        </g>
        <path d="M54 91c11 5 29 5 40-1" fill="none" stroke="#e8c98b" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
      </g>
    </svg>
  );
}

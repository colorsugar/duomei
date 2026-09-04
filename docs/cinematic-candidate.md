# Cinematic candidate — review only

Requested by the owner on 2026-09-04: a separate, substantial visual/interaction redesign with unchanged content. This candidate must not merge into `main`, enter the ready `cursor/*` auto-publish path, or replace `duomei.site` without a later explicit promotion request.

## Direction

A warm, cinematic journal: a real pearlescent metal ribbon in the hero; ochre editorial early news; a spacious journal carousel; a dark book gallery; a jade landscape window; peach sticker sheets; paper poetry; an ink-violet Skill ending. The nine chapter order, existing copy, public book plates, mascot, music and map stay shared. The full-screen chapter index has native dialog focus management and keyboard dismissal. Frozen header behavior is unchanged.

## Implementation

- `src/experience/CinematicHero.tsx` and `public/experience/sculpture.js`: local, vendored Three.js; custom closed ribbon geometry, PMREM studio reflections, physically based material, pointer/scroll camera response, pause, offscreen/document visibility suspension, adaptive DPR. The still poster uses the same geometry rendered in Blender, not a photo or a scan.
- `src/experience/ChapterAtmosphere.tsx`: resize-cached chapter bounds, visible-section CSS updates and semantic chapter navigation. No React state updates on animation frames except when the chapter actually changes. Note-card tilt code is untouched.
- `src/experience/cinematic.css`: presentation overrides scoped to the candidate home and selected public secondary pages. Existing card/carousel/reader input ownership is preserved.
- Route chunks and editors load on demand; music remains outside the route Suspense boundary. Touch devices and reduced-motion visitors use native scroll. Background tabs stop the smooth-scroll loop.
- `VITE_CINEMATIC_PREVIEW=1` is only for the independent private review build: protected class-book and admin entry screens link to the existing formal site. Normal builds preserve existing handlers. No production secret or private original is copied.

## Review build

The independent review hosting package contains the validated Vite output and a small Worker for SPA routing plus anonymous music endpoints. All public assets are copied unchanged. `/api/guyu-*` fails closed in the review worker; only the formal site serves the protected book. The main repository's EdgeOne release configuration is untouched apart from development host compatibility in Vite.

## Validation and limits

- Root TypeScript/Vite build and existing home/navigation, music, public-book hash, reader touch and access-core tests pass.
- Browser checks at desktop width and 320/390 CSS-pixel iframe widths cover hero fallback, chapter dialog, early news, books and the Guilin entrance. Responsive iframes are layout checks, not physical-phone acceptance.
- The cloud browser has no WebGL; it shows the genuine rendered fallback. Do not claim that live 3D rendering, device FPS, battery behavior, Safari gestures or protected production flows were device-tested here.
- Static geometry, dependencies and all public assets stay local. No new analytics, credentials, remote 3D vendor, or mandatory animation library is introduced.

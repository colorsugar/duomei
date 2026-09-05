# Cinematic candidate — review only

Requested by the owner: a separate visual and interaction redesign with unchanged content. Keep this on candidate/cinematic-20260905 and the independent private review Site. Never merge into main or enter the ready cursor/* auto-publish path without an explicit promotion request.

## Current direction — 2026-09-05 revision

The rejected abstract ribbon is removed. The hero is a full-bleed, real Guilin aerial film with a 16.8-second blended loop, oversized DUOMEI typography, an opening aperture and a scroll dolly. Existing editable subname, description and scroll hint remain intact. No fictional geography or generated model is presented as Guilin.

Each chapter has its own entrance:

| Chapter | Camera and entrance |
| --- | --- |
| 首页 | Real drone glide, wide aperture, staggered title |
| 早报 | Perspective newspaper fold and headline reveal |
| 小记 | Lateral photo-rail tracking, counter-moving heading |
| 快活 | Two-stage wide-screen curtain around the existing paper scene |
| 故语 | Pullback from the book, delayed caption rise |
| 云游 | Expanding landscape window and longer image dolly |
| 颜色 | Opposing panel movement and rotation into alignment |
| 微言 | Horizontal title reveal and rising reading window |
| Skill | Ruled rows unfold in sequence |

## Implementation

- CinematicHero.tsx uses a native muted inline video. Desktop: 1080p / 3,837,462 bytes; mobile: portrait 1080×1920 / 2,775,369 bytes. Only one source is selected before loading. The 44 KB desktop / 34 KB portrait WebP posters are immediate. Playback pauses offscreen and in background tabs. Reduced motion defaults to a still; visitors can explicitly play or pause.
- ChapterAtmosphere.tsx caches section bounds on resize and observes visibility. The eight authored sequences in cinematic-shots.css replay on re-entry and become static under reduced motion. No added card pointer listeners or changes to the note-card tilt pipeline.
- CinematicRouteTransition.tsx coordinates one transition for all public pathname changes, including history and reader journeys. Native View Transitions capture the outgoing viewport, wait for the lazy incoming route to mount, then animate the new snapshot. Other browsers use a short closing curtain and opening reveal. Readiness has a bounded timeout; superseded transitions cancel. Hash/search-only movement, admin and reduced motion stay direct.
- RouteScrollManager receives the displayed location so scroll restoration happens with the incoming view. The shared note journey defers snapshot ownership to this coordinator; existing list position and image/title names remain.
- Music stays outside route Suspense and keeps the same audio element. Header code, touch activation, reader gestures, public book pages, content and embedded map are unchanged.
- Route chunks and editors still load on demand. Touch devices retain native momentum.
- VITE_CINEMATIC_PREVIEW=1 remains the private review boundary: the class-book and admin entries link to the formal site, with no copied private originals or production secrets.

## Review output

The private review package contains the complete Vite output plus the unchanged SPA/anonymous-music Worker. The formal EdgeOne project and deployment workflows are untouched.

## Verification and limits

- TypeScript/Vite build, 30 home/navigation tests, 33 music tests, and 33 Guyu/access/book-integrity tests pass for this revision.
- The retired source-string assertion for the old paper veil was replaced with behavioral route-policy checks, covering forward/return paths, reduced motion, background navigation, anchors and admin.
- Footage frames, format, both rendition sizes, silent tracks, faststart and the loop seam were inspected.
- This revision has not been browser- or physical-device-tested. Earlier candidate browser checks apply only to that earlier build. Do not claim measured phone FPS, Safari gesture acceptance or live transition QA.
- The separate production media Worker is unchanged. Its optional test runner is absent in this checkout; its suite/dry deployment was not rerun for this private visual revision.

See hero-footage.md for the chosen asset's source and license.

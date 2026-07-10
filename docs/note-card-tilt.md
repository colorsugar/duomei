# Note Card 3D Tilt Contract

This document protects the homepage note-card mouse-follow effect. Read this before changing `NotesCarousel.tsx` or any `.duomei-note-card` hover styles.

## What Must Stay True

- Note-card tilt is driven by a single pointer pipeline in `src/components/NotesCarousel.tsx`.
- Do not add extra card-level `onMouseMove`, `onPointerMove`, or native `mousemove` listeners for the same effect.
- Do not read `getBoundingClientRect()` on every pointer event. Cache the active card rect and update through `requestAnimationFrame`.
- During `.duomei-note-card.is-tilting`, do not animate `transform`. The card must follow the pointer immediately.
- Only the reset state should animate `transform`, through `.is-resetting-tilt`.
- Keep the final CSS override near the end of `src/styles.css`:
  - comment: `Final tilt restore: keep the original fast 3D mouse-follow effect on note cards.`
  - scale: `scale3d(1.09, 1.09, 1.09)`
  - rotate variables: `--note-tilt-x`, `--note-tilt-y`

## Current Implementation

`src/components/NotesCarousel.tsx` owns the interaction:

- `activeTiltCardRef`: current card under the pointer.
- `activeTiltRectRef`: cached card bounds.
- `pendingTiltRef`: latest pointer coordinates.
- `tiltFrameRef`: one scheduled animation frame.
- `scheduleCardTilt(...)`: stores pointer state and schedules the frame.
- `applyCardTilt(...)`: writes `--note-tilt-x` and `--note-tilt-y`.
- `resetActiveCardTilt(...)`: clears active card state and applies the short reset animation.

`src/styles.css` owns the presentation:

- `.notes-carousel .duomei-note-card.is-tilting` applies the fast 3D transform.
- `.notes-carousel .duomei-note-card.is-resetting-tilt` applies the short return transition.
- The photo inside `.note-card-cover` may keep its slower in-frame zoom, but it must not override the card transform.

## If The Effect Breaks Again

1. Search `src/styles.css` for later `.duomei-note-card:hover` or `.duomei-note-card.is-tilting` rules.
2. If a later rule changes `transform`, either remove it or update the final restore block so it remains last.
3. Search `src/components/NotesCarousel.tsx` for extra mouse/pointer move listeners.
4. Keep only the carousel-level pointer handler. Remove duplicate card-level move handlers.
5. Check that `.is-tilting` has no `transform` transition. If it feels delayed, this is usually the cause.
6. Run `npm.cmd run build`.
7. Test locally at `http://127.0.0.1:5173/` by hovering the homepage note cards.

## Safe Tuning

- Stronger/lighter tilt: change `tiltLimit` in `applyCardTilt`.
- Bigger/smaller hover scale: change `scale3d(...)` only in the final restore block.
- Faster/slower reset: change `.is-resetting-tilt`, not `.is-tilting`.
- Slower photo zoom: adjust `.note-card-cover` image transitions without touching card transform.

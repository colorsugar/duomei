# DUOMEI 多美小记 · UI System v2

## Direction

An editorial travel journal with a quiet, tactile paper surface. The redesign preserves the existing warm paper, ink, olive, hand-drawn illustration, poetry and photography language. Motion should feel like turning a page or noticing a breeze: present, short, and never in the way of reading or editing.

## Page structures

- Home: Marquee Hero → editorial notes rail → curved transition → Time poetry experience.
- Note detail: Long Document with a strong cover, narrow reading measure, anchored metadata, and discreet previous/next navigation.
- Time: immersive poetry canvas; atmospheric motion is allowed only here and in the dream transition.
- Admin and note editor: Workbench with persistent orientation, clear status, large controls, and reversible destructive actions.
- Navigation: a single DOM tree that compresses after scroll; on mobile it becomes an accessible paper menu. No glass treatment.
- Footer: mast-headed editorial close with wordmark, short identity line, and reading-progress rule.

## Color

All shipped colors are defined in `tokens.css` as OKLCH tokens.

- Paper / elevated paper / wash provide the surface hierarchy.
- Ink / secondary ink / muted ink provide readable type hierarchy.
- Olive is the sole interactive accent.
- Caramel is atmospheric only.
- Brick is reserved for destructive actions and errors.
- Focus rings always use the high-contrast focus token.

## Typography

- Display and article titles: Yu Mincho / Songti SC / STSong.
- Body and controls: Microsoft YaHei / PingFang SC / system sans.
- DUOMEI wordmark only: Georgia fallback stack, retained as a brand outlier.
- Reading measure: 64–70ch. UI copy uses sentence case and compact Chinese labels.

## Space and shape

- 4px base spacing rhythm with named steps from 4px to 96px.
- Primary content max width: 1180px; article max width: 760px.
- Cards: 18–28px radius according to size.
- Controls: 10–14px radius, minimum 44px touch target (48px for coarse pointers).
- Shadows are warm and low contrast; no layered glass or neon glow.

## Motion

- Micro feedback: 120–180ms.
- UI transitions: 220–360ms, ease-out.
- Hero and Time atmosphere: up to 800ms when non-blocking.
- Detail-page critical text is readable within 320ms; below-fold content reveals on intersection only.
- All motion has a `prefers-reduced-motion` path.
- The existing note-card rAF tilt pipeline remains the only pointer-follow implementation.

## Components

- Buttons: solid olive primary, paper secondary, text/quiet tertiary, brick danger.
- Status: textual chip plus icon/shape; color never carries meaning alone.
- Dialogs: native dialog semantics, explicit title/body/actions, focus restoration.
- Toasts: `role=status` for success, `role=alert` for errors; no auto-hide while focus is inside.
- Skeletons: paper blocks with a reduced-motion-safe sheen.
- Empty states: a short editorial sentence plus one next action.
- Image lightbox: native dialog, close button, keyboard escape, next/previous when multiple images, touch pan delegated to the browser.

## Responsive rules

- Verify 320, 375, 414, 768, 1280 and 1440 CSS pixels.
- `html` and `body` use `overflow-x: clip`.
- No primary affordance wraps.
- Image grids use `minmax(0, 1fr)`.
- Decorative overflow is clipped by its local section, never the document.
- Mobile controls are at least 44px and layouts become one column before labels wrap.

## Accessibility

- One meaningful `h1` per page.
- Visible `:focus-visible` outlines.
- Dialogs carry labels and descriptions.
- Decorative images are ignored; content images keep meaningful alt text.
- Hover-only effects receive focus and touch equivalents.

## Exports

- CSS custom properties: `tokens.css`.
- Tailwind mapping: `colors.paper`, `colors.ink`, `colors.olive`, spacing values and radii mirror the CSS token names if Tailwind is introduced later.
- DTCG: color and dimension token names map one-to-one from the CSS custom properties.
- shadcn mapping: background=`paper`, foreground=`ink`, primary=`olive`, secondary=`paper-elevated`, muted=`paper-wash`, destructive=`brick`, border=`rule`, ring=`focus`.

## Preservation contract

No storage, Supabase, publish/draft, backup/restore, upload/crop, route, or poetry-editor business logic is redesigned in this pass. Visual and interaction changes must remain reversible and keep the current content model intact.

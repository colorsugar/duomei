# Cinematic review: supplied MotionSites films

This revision belongs only to candidate/cinematic-20260905 and the owner-private review Site. Do not promote it to EdgeOne or main without the user requesting promotion.

The user explicitly replaced the previous Yangshuo hero with their supplied MotionSites visual reference. All five camera films are user-supplied CloudFront URLs, downloaded on 2026-09-05. Scene 01 is the cosmic portrait, 02 the star canyon, 03 the night garden, 04 the reading field, and 05 the cloud reader. The footage is visual fiction, not a depiction of Guilin. No location claim is attached to it. Sources are recorded in public/experience/sources.json.

Desktop H.264 renditions retain source resolution up to 1920px; mobile renditions are composed at 720×1280. All files are silent, fast-start, same-origin, with WebP first-frame posters. Only intersecting stages play. Leaving a stage or hiding the tab pauses decoding. Reduced motion retains still posters and immediately visible content. Failed loading restores the poster; the hero has an explicit playback retry.

The first film's camera motion plays continuously. Scrolling adds a large dolly into the scene while its title recedes. Subsequent chapters use the existing 230svh track for distinct scroll-driven establishing shots: dolly, lateral tracking, iris, pullback, panorama, orbit, crane rise, and focus. Readable existing content appears after the establishing shot. This is composited video and scroll motion, not newly reconstructed real-time 3D. Route snapshot transitions, fallback curtains, persistent music, original content, protected book boundaries and existing note gestures are retained.

The header receives a visual glass skin through candidate-only CSS. Its frozen touch event chain, destinations, visibility and hide-on-scroll rules are unchanged. The prior time-triggered entrance animations have been replaced by scroll-linked chapter camera choreography so an animation cannot finish before its stage reaches the reader.

Verification: TypeScript/Vite build and the homepage navigation/hold regression gate are required. Existing public book bytes remain unchanged. Browser and physical iPhone testing were not performed in this turn; no frame-rate guarantee is claimed.

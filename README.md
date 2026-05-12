// Behind the scenes todos:

- [ ] a virtual prayer box that takes people's prayers and displays them on the screen with the smoke clouds. If a user stays for a long time they see these manifest.
- Persistence. I'd resist saving to a server / global feed at first — that immediately invites moderation, abuse, anonymity questions, infrastructure. But localStorage for the user's own prayers — so when they return to the page, their previous prayers float up again at intervals — is perfect. Their candle becomes a private space that remembers.
- Privacy framing. Make it explicit somewhere subtle: "this stays in your browser. no one else sees it." That's the magic — it's a private ritual that nobody else's analytics is reading.
- Eventual evolution. If you ever did want shared prayers, I'd think about it more like a wishing-well metaphor — write your prayer, watch it float up, and maybe see one anonymous prayer drift down past yours from someone else's candle. Constraints (length, frequency) would do most of the moderation.
- A small "the candle has burned out" moment. When meltedCandleHeight() hits totalCandleHeight, the smoke could thin (drop cloudCount to 1) and a tiny line of text could fade in: // candle_engine.js: complete. Then fade. The relight button stays there for the next ritual.

---

steps

1. Find a real candle. Light it. Watch it burn.
2. Take notes. What are you drawn to? What's happening externally? Internally? In the candle. In you.
3. Make a wish, dedication, complaint. Say a prayer. Burn something!
4. Fork the CodePen. It's your turn.
5. Change the colours, the smoke, the drips, the timing, the mood, rip all the text out, edit it, it's all laid out nice and neat and css is good for you.
6. OR if you're really clicky, attempt to code your own candle from scratch. Do it in ascii, do it in svg, vibes-code it out like I know you can.
7. When the candle starts to smile, send it to me. I wanna see.

---

The recipe (vanilla JS + GSAP → React/Next.js embed):

1. "use client" at the top. Anything DOM/timer/storage-reliant is client-only.
2. Module-level const config blocks stay verbatim. CONFIG, SMOKE_CONFIG, CLOUD_SHAPES, storage keys — these are the dial board the user tunes; they're not React state and shouldn't be.
3. TypeScript types for engine state. Convert the JS state shape to a type EngineState = { ... }. Type the GSAP tween/timeline arrays as gsap.core.Tween[] and gsap.core.Timeline[].
4. Refs for everything DOM-ish. Replace every document.querySelector with a useRef<HTMLElement>(null) declared at the top of the component, and pass each via ref={...} in JSX.
5. One big useEffect(() => { ... }, []) owns the engine. Inside, declare state as a closure-scoped let/const, then declare every helper (spawnDrip, meltCandle, spawnCloud, clearCandle, init, applyReducedMotion, etc.) as nested functions that close over state and the captured refs. Imperative DOM creation (document.createElement) stays as-is — appending to wrapperRef.current instead of document.body.
6. Cleanup in the effect's return. clearCandle() runs on unmount AND between strict-mode double-mount. Idempotency is critical — kill all tweens, remove all DOM nodes.
7. "Imperative bridge" refs for handlers. Anything React handlers need to call into the engine (restart, toggle motion) gets stored in a useRef<() => void>(() => {}) inside the effect, then read by handlers. This avoids re-running the effect just to update a handler.
8. Genuine UI state stays in useState. Toggle button labels and class flags (reducedMotion, todosOpen) live in React state. Sync them into engineStateRef.current via a small secondary useEffect([dep]).
9. High-frequency text updates (e.g. melt readouts) stay imperative. Update .textContent via refs every melt tick; don't re-render JSX 60 times/second.
10. Switch position: fixed → position: absolute and wrap everything in a position: relative; w-100vw; h-100vh; overflow: hidden shell. Embed becomes self-contained even if the parent isn't fullscreen.
11. Append imperatively-created elements to the wrapper ref, not document.body. Smoke clouds, drips, etc. all live inside the embed.
12. Inline <style>{styles}</style> block with selectors prefixed by the wrapper class (.candle-embed). One file, scoped, no external CSS coupling. Replace body.todos-open with .candle-embed.todos-open.
13. localStorage reads inside the effect, never at module level — would crash on SSR.
14. try/catch around localStorage.setItem — silently degrades in private mode / disabled storage.
15. Default exports, PascalCase identifier matches the existing EmbeddedComponents convention.

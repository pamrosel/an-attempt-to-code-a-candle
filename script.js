// 🕯️ An Attempt to Code a Candle — vanilla JS + GSAP
// Tweak the dials below to make this candle your own.

const CONFIG = {
  // — Meta ——
  version: "3.0",
  author: "sp@m_digit@l",

  // — Candle body ——
  totalCandleHeight: 320, // px — how tall the candle starts
  candleWidth: 80, // px — how wide the candle is

  // — Drips ——
  dripCount: 3, // how many drips to spawn (try 1–6)
  dripWidth: 12, // px — diameter of each drip
  dripHeight: 20, // px — final stretched height once it lands
  dripFallDuration: 3, // seconds — how long each drip takes to fall
  dripStaggerSeconds: 1.8, // seconds — max random delay between drip falls

  // — Melt ——
  meltDurationSeconds: 100, // seconds — full burn time, full candle to nothing
};

const SMOKE_CONFIG = {
  cloudCount: 4, // how many smoke puffs floating at once
  fadeInSeconds: 4, // seconds — fade in as the puff appears
  fadeOutSeconds: 3, // seconds — fade out as it dissipates
  minDriftSeconds: 10, // seconds — shortest rise time
  maxDriftSeconds: 22, // seconds — longest rise time
  spawnStaggerSeconds: 3, // seconds between each puff first appearing
  fontSizePx: 13, // px — character size
  opacity: 1, // 0–1 — peak opacity at fade-in apex
  swayMaxVw: 5, // vw — max sideways drift while rising (± from start)
  startTopMinVh: 48, // vh — closest to top (above candle)
  startTopMaxVh: 62, // vh — closest to candle / bottom
  horizontalSpreadVw: 28, // vw — ± horizontal spread from screen center
};

// Add / edit shapes freely. Whitespace is preserved exactly.
// Aim for soft particle characters (° o O ~ ' .) over crisp outlines.
const CLOUD_SHAPES = [
  ` . ° .
° o O °
 ' ~ '`,
  `°   .   o
  o ° O
.   °   °
  O o °`,
  ` *
( )
 *`,
  `  .~~~.
 ° o O °
  '~~~'
   ~
    ~`,
  `   . o .
  ° O o °
 o ° o ° o
  ° o O °
   ' ~ '`,
];

// — DOM refs ——————————————————————————————————————————————————————
const candleContainer = document.querySelector(".candle-container");
const leftReadoutEl = document.querySelector("[data-readout-left]");
const rightReadoutEl = document.querySelector("[data-readout-right]");
const restartBtn = document.querySelector("[data-restart]");
const reduceMotionBtn = document.querySelector("[data-reduce-motion]");
const todosToggleBtn = document.querySelector("[data-todos-toggle]");

// — State —————————————————————————————————————————————————————————
const state = {
  currentCandleHeight: CONFIG.totalCandleHeight,
  zones: [],
  drips: [], // each: { dripEl, waxlineEl, x, endY, isFalling, isEngulfed }
  clouds: [], // <pre> elements for each smoke puff
  cloudTweens: [], // GSAP timelines for the smoke puffs
  meltTween: null,
  dripTweens: [], // every GSAP tween we create, kept for cleanup on restart
  reducedMotion: false, // honors system prefs + user toggle (persisted)
};

// — Reduced motion ————————————————————————————————————————————————
// Off by default unless the user's OS has reduce-motion on, OR they
// have explicitly toggled the in-page checkbox before. The user's
// explicit choice always wins over the system preference.
const REDUCED_MOTION_KEY = "my-candle:reduced-motion";
const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
state.reducedMotion = (() => {
  const saved = localStorage.getItem(REDUCED_MOTION_KEY);
  return saved !== null ? saved === "true" : reducedMotionMQ.matches;
})();

const dripTop = -CONFIG.dripWidth / 4;
const trackWidth = CONFIG.dripWidth * 0.7;

// — Derived values ————————————————————————————————————————————————
const meltedCandleHeight = () =>
  Math.round(CONFIG.totalCandleHeight - state.currentCandleHeight);

const activeDripCount = () => state.drips.filter((d) => !d.isEngulfed).length;

// — Math helpers ——————————————————————————————————————————————————

// Generate 1–3 "preferred zones" along the candle's width where drips
// like to form. Each zone has a center (0–1) and a radius (5–8% wide).
function generatePreferredZones() {
  const count = Math.floor(Math.random() * 3) + 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      center: Math.random(),
      radius: 0.05 + Math.random() * 0.03,
    });
  }
  return out;
}

// Pick an x-position for a drip, biased toward one of the preferred zones.
function getRandomDripXFromZones(zones, candleWidth) {
  if (zones.length === 0) return Math.random() * candleWidth;
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const offset = (Math.random() * 2 - 1) * zone.radius;
  const percent = Math.min(Math.max(0, zone.center + offset), 1);
  return percent * candleWidth;
}

// How far does a drip travel before settling? 60–100% of current candle height.
function getRandomDripLength() {
  const min = state.currentCandleHeight * 0.6;
  const max = state.currentCandleHeight * 1;
  return min + Math.random() * (max - min);
}

// — DOM updates ———————————————————————————————————————————————————

// Edit these template literals freely — whitespace is preserved, so
// you can lay out ASCII / columns / etc. and see it live.
function renderReadouts() {
  leftReadoutEl.textContent = `// an_attempt_to_code_a_candle.js
// v ${CONFIG.version} by ${CONFIG.author}
// melted: ${meltedCandleHeight()}px
// drips: ${activeDripCount()}`;

  rightReadoutEl.textContent = `- [x] candle body
- [x] wax lines choose their own paths
- [x] drips pool under wax lines
- [x] body + wax remember time elapsed
- [x] smoke clouds
- [ ] more drips & less obedient
- [ ] wick
- [ ] flame
- [ ] more smoke clouds
- [ ] surface highlights
- [ ] virtual prayer box

`;
}

function renderReduceMotionToggle() {
  reduceMotionBtn.textContent = `// reduce motion [${state.reducedMotion ? "x" : " "}] `;
  reduceMotionBtn.setAttribute("aria-pressed", String(state.reducedMotion));
}

function renderTodosToggle(isOpen) {
  todosToggleBtn.textContent = isOpen ? "[close]" : "[todos]";
  todosToggleBtn.setAttribute("aria-expanded", String(isOpen));
}

// Apply the current `state.reducedMotion` value to running animations.
// Currently only smoke is affected — drips and the melt are core to
// the candle metaphor, so they stay even with reduced motion on.
function applyReducedMotion() {
  if (state.reducedMotion) {
    state.cloudTweens.forEach((t) => t.kill());
    state.cloudTweens = [];
    state.clouds.forEach((c) => c.remove());
    state.clouds = [];
    return;
  }
  const dripsLanded =
    state.drips.length > 0 && state.drips.every((d) => !d.isFalling);
  if (dripsLanded && state.clouds.length === 0) {
    spawnAllClouds();
  }
}

function applyMeltState() {
  candleContainer.style.height = `${state.currentCandleHeight}px`;
  renderReadouts();

  // Each settled wax-line shrinks with the candle as it melts.
  state.drips.forEach((d) => {
    if (!d.isFalling) {
      const h = Math.max(0, Math.round(d.endY - meltedCandleHeight()));
      d.waxlineEl.style.height = `${h}px`;
    }
  });
}

// — Drip lifecycle ————————————————————————————————————————————————

function spawnDrip(delaySec, onLanded) {
  const dripEl = document.createElement("div");
  dripEl.className = "drip";
  const waxlineEl = document.createElement("div");
  waxlineEl.className = "wax-line";
  candleContainer.appendChild(waxlineEl);
  candleContainer.appendChild(dripEl);

  const x = getRandomDripXFromZones(state.zones, CONFIG.candleWidth);
  const startY = CONFIG.totalCandleHeight - state.currentCandleHeight; // 0 at start
  const endY = startY + getRandomDripLength();

  const drip = {
    dripEl,
    waxlineEl,
    x,
    endY,
    isFalling: true,
    isEngulfed: false,
  };
  state.drips.push(drip);

  // Initial styles
  dripEl.style.width = `${CONFIG.dripWidth}px`;
  dripEl.style.height = `${CONFIG.dripHeight}px`;
  dripEl.style.left = `${x - CONFIG.dripWidth / 2}px`;

  waxlineEl.style.width = `${trackWidth}px`;
  waxlineEl.style.left = `${x - trackWidth / 2}px`;
  waxlineEl.style.top = `${dripTop}px`;
  waxlineEl.style.height = "0px";

  // Animate the drip falling
  const fallTween = gsap.fromTo(
    dripEl,
    {
      top: `${startY - CONFIG.dripWidth / 2}px`,
      opacity: 1,
      width: CONFIG.dripWidth,
      height: CONFIG.dripWidth,
    },
    {
      delay: delaySec,
      width: CONFIG.dripWidth,
      height: CONFIG.dripHeight,
      top: `${endY - CONFIG.dripHeight / 2}px`,
      duration: CONFIG.dripFallDuration,
      ease: "power2.inOut",
      onComplete: () => {
        drip.isFalling = false;
        // Switch from `top`-anchored to `bottom`-anchored so the drip stays
        // glued to its resting spot as the candle melts beneath it.
        dripEl.style.top = "auto";
        dripEl.style.bottom = `${
          CONFIG.totalCandleHeight - endY - CONFIG.dripHeight / 2 + dripTop
        }px`;
        onLanded();
      },
    },
  );
  state.dripTweens.push(fallTween);

  // Animate the wax-line drawing itself behind the drip
  const lineTween = gsap.fromTo(
    waxlineEl,
    { height: 0 },
    {
      delay: delaySec,
      height: endY,
      duration: CONFIG.dripFallDuration,
      ease: "power2.inOut",
    },
  );
  state.dripTweens.push(lineTween);
}

// — The candle ————————————————————————————————————————————————————

function meltCandle(durationMs) {
  const meltObj = { progress: 0 };
  state.meltTween = gsap.to(meltObj, {
    progress: 1,
    duration: durationMs / 1000,
    ease: "linear",
    onUpdate: () => {
      state.currentCandleHeight =
        CONFIG.totalCandleHeight * (1 - meltObj.progress);
      applyMeltState();

      // Absorb each drip when the melting candle catches up to it.
      state.drips.forEach((d) => {
        const meltedEndY = CONFIG.totalCandleHeight - d.endY;
        if (
          !d.isEngulfed &&
          state.currentCandleHeight <= meltedEndY + CONFIG.dripHeight
        ) {
          d.isEngulfed = true;
          gsap.to(d.dripEl, {
            scaleY: 0,
            transformOrigin: "bottom",
            opacity: 0,
            duration: 2,
            ease: "power2.in",
          });
        }
      });
    },
  });
}

// — Smoke clouds —————————————————————————————————————————————————

// Each puff is its own <pre>: spawns mid-screen at opacity 0,
// waits its stagger delay, fades in as it starts rising, drifts up
// with a tiny sideways sway, then fades out as it dissipates near
// the top. Loops forever after the first cycle.
function spawnCloud(initialDelay = 0) {
  const cloudEl = document.createElement("pre");
  cloudEl.className = "smoke-cloud";
  cloudEl.textContent =
    CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)];
  cloudEl.style.fontSize = `${SMOKE_CONFIG.fontSizePx}px`;
  cloudEl.style.lineHeight = "1.05";
  cloudEl.style.opacity = 0;

  // Spawn around the middle of the screen, biased toward horizontal
  // center where the candle sits.
  const startTopVh =
    SMOKE_CONFIG.startTopMinVh +
    Math.random() * (SMOKE_CONFIG.startTopMaxVh - SMOKE_CONFIG.startTopMinVh);
  const startLeftVw =
    50 + (Math.random() * 2 - 1) * SMOKE_CONFIG.horizontalSpreadVw;

  cloudEl.style.top = `${startTopVh}vh`;
  cloudEl.style.left = `${startLeftVw}vw`;

  document.body.appendChild(cloudEl);
  state.clouds.push(cloudEl);

  const fadeIn = SMOKE_CONFIG.fadeInSeconds;
  const drift =
    SMOKE_CONFIG.minDriftSeconds +
    Math.random() *
      (SMOKE_CONFIG.maxDriftSeconds - SMOKE_CONFIG.minDriftSeconds);
  const fadeOut = SMOKE_CONFIG.fadeOutSeconds;

  const swayVw = (Math.random() * 2 - 1) * SMOKE_CONFIG.swayMaxVw;

  const tl = gsap.timeline({ repeat: -1, delay: initialDelay });
  tl.fromTo(
    cloudEl,
    { y: 0, x: 0, opacity: 0 },
    {
      y: "-5vh",
      opacity: SMOKE_CONFIG.opacity,
      duration: fadeIn,
      ease: "power1.out",
    },
  );
  tl.to(cloudEl, {
    y: "-30vh",
    x: `${swayVw}vw`,
    duration: drift,
    ease: "none",
  });
  tl.to(cloudEl, {
    y: "-50vh",
    opacity: 0,
    duration: fadeOut,
    ease: "power1.in",
  });

  state.cloudTweens.push(tl);
}

function spawnAllClouds() {
  for (let i = 0; i < SMOKE_CONFIG.cloudCount; i++) {
    spawnCloud(i * SMOKE_CONFIG.spawnStaggerSeconds);
  }
}

// Tear everything down so a fresh candle can be lit.
function clearCandle() {
  state.dripTweens.forEach((t) => t.kill());
  state.dripTweens = [];
  if (state.meltTween) {
    state.meltTween.kill();
    state.meltTween = null;
  }
  state.drips.forEach((d) => {
    d.dripEl.remove();
    d.waxlineEl.remove();
  });
  state.drips = [];
  state.cloudTweens.forEach((t) => t.kill());
  state.cloudTweens = [];
  state.clouds.forEach((c) => c.remove());
  state.clouds = [];
  state.currentCandleHeight = CONFIG.totalCandleHeight;
  state.zones = [];
}

function init() {
  clearCandle();

  candleContainer.style.width = `${CONFIG.candleWidth}px`;
  candleContainer.style.height = `${state.currentCandleHeight}px`;
  candleContainer.style.background = CONFIG.candleColor;

  state.zones = generatePreferredZones();
  renderReadouts();

  // Spawn N drips with random staggered delays. Wait for all of them to
  // land before kicking off the melt — keeps the geometry simple.
  let pendingLandings = CONFIG.dripCount;
  const onLanded = () => {
    pendingLandings--;
    if (pendingLandings === 0) {
      meltCandle(CONFIG.meltDurationSeconds * 1000);
      if (!state.reducedMotion) spawnAllClouds();
    }
  };

  for (let i = 0; i < CONFIG.dripCount; i++) {
    const delay = Math.random() * CONFIG.dripStaggerSeconds;
    spawnDrip(delay, onLanded);
  }
}

restartBtn.addEventListener("click", init);

reduceMotionBtn.addEventListener("click", () => {
  state.reducedMotion = !state.reducedMotion;
  localStorage.setItem(REDUCED_MOTION_KEY, String(state.reducedMotion));
  renderReduceMotionToggle();
  applyReducedMotion();
});

todosToggleBtn.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("todos-open");
  renderTodosToggle(isOpen);
});

renderReduceMotionToggle();
renderTodosToggle(false);
init();

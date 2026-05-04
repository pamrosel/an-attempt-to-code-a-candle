<script lang="ts">
  type Zone = {
    center: number;
    radius: number;
  };

  import { onMount } from 'svelte';
  import gsap from 'gsap';

  // Candle 🕯️
  export let totalCandleHeight = 200;
  export let candleWidth = 80;
  export let candleColor = '#f5e9d3';
  let currentCandleHeight = totalCandleHeight;
  // $: = reactive statement instead of defined once
  $: meltedCandleHeight = Math.round(totalCandleHeight - currentCandleHeight);
  let zones: Zone[] = [];

  // Drip 💧
  let drip;
  let waxline;
  let dripWidth = 8;
  let dripHeight = 20;
  let dripTop = -dripWidth / 4;
  let trackWidth = dripWidth * 0.7;
  let dripIsFalling = true;
  let dripIsEngulfed = false;
  $: waxlineHeight = Math.max(0, Math.round(endY - meltedCandleHeight));

  // Drip X Math = Random Positioning
  function getRandomDripX() {
    return dripWidth + Math.random() * candleWidth;
  }

  function getRandomDripLength() {
    const min = currentCandleHeight * 0.6;
    const max = currentCandleHeight * 1;
    return min + Math.random() * (max - min);
  }

  function getRandomDripXFromZones(zones: Zone[], candleWidth: number): number {
    if (zones.length === 0) return Math.random() * candleWidth;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const offset = (Math.random() * 2 - 1) * zone.radius; // -radius to +radius
    const percent = Math.min(Math.max(0, zone.center + offset), 1); // clamp between 0–1
    return percent * candleWidth;
  }

  let dripX = getRandomDripXFromZones(zones, candleWidth);
  $: trackLeft = dripX - trackWidth / 2;
  $: dripLeft = dripX - dripWidth / 2;
  $: startY = totalCandleHeight - currentCandleHeight;
  let endY: number;

  function generatePreferredZones(): Zone[] {
    const count = Math.floor(Math.random() * 3) + 1; // Randomly assign 1 to 3 zones
    const zones: Zone[] = [];
    console.log('count', count);
    console.log('zones', zones);

    for (let i = 0; i < count; i++) {
      const center = Math.random(); // Randomly assign a center point between 0 and 1
      const radius = 0.05 + Math.random() * 0.03; // Randomly assign a radius between 5% and 8% of the candle width
      zones.push({ center, radius });
    }
    return zones;
  }

  function meltCandle(duration = 100_000) {
    const meltObj = { progress: 0 };

    gsap.to(meltObj, {
      progress: 1,
      duration: duration / 1000,
      ease: 'linear',
      onUpdate: () => {
        currentCandleHeight = totalCandleHeight * (1 - meltObj.progress);
        const meltedEndY = totalCandleHeight - endY;
        if (!dripIsEngulfed && currentCandleHeight <= meltedEndY + dripHeight) {
          dripIsEngulfed = true;
          gsap.to(drip, {
            scaleY: 0,
            transformOrigin: 'bottom',
            opacity: 0,
            duration: 2,
            ease: 'power2.in',
          });
        }
      },
    });
  }

  onMount(() => {
    zones = generatePreferredZones();

    endY = startY + getRandomDripLength();
    // Animate drip
    gsap.fromTo(
      drip,
      {
        top: `${startY - dripWidth / 2}px`,
        opacity: 1,
        width: dripWidth,
        height: dripWidth,
      },
      {
        width: dripWidth,
        height: dripHeight,
        top: `${endY - dripHeight / 2}px`,
        duration: 3,
        ease: 'power2.inOut',
        onComplete: () => {
          dripIsFalling = false;
          gsap.to(drip, { opacity: 0.6 });
          meltCandle();
        },
      },
    );

    // Animate wax line
    gsap.fromTo(
      waxline,
      { height: 0 },
      {
        height: endY,
        duration: 3,
        ease: 'power2.inOut',
      },
    );
  });
</script>

<h2
  style="
  position: fixed;
  top: 0;
  left: 0;
  "
>
  Melted Candle Height: {meltedCandleHeight}px
</h2>
<h2
  style="
  position: fixed;
  top: 0;
  right: 0;
  "
>
  Waxline Height: {waxlineHeight}px
</h2>
<div class="viewbox">
  <div
    class="candle-container"
    style="
    width: {candleWidth}px;
    height: {currentCandleHeight}px;
    background: {candleColor};
  "
  >
    <div
      bind:this={waxline}
      class="wax-line"
      style="
      width: {trackWidth}px;
      height: {waxlineHeight}px;
      left: {trackLeft}px;
      top: {dripTop}px;
    "
    ></div>

    <div
      class="drip"
      bind:this={drip}
      style="
      width: {dripWidth}px;
      height: {dripHeight}px;
      left: {dripLeft}px;
      bottom: {dripIsFalling ? 'auto' : totalCandleHeight - endY - dripHeight / 2 + dripTop}px;
    "
    ></div>
  </div>
</div>

<!-- top: {dripIsFalling ? 'auto' : waxlineHeight - dripHeight / 2 + dripTop}px; -->

<style>
  .viewbox {
    display: flex;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgb(239 255 157 / 27%) 0%, rgba(255, 249, 211, 0) 100%);
    align-items: end;
  }

  .candle-container {
    margin: 0 auto;
    position: relative;
    border-radius: 10px;
  }

  .drip {
    position: absolute;
    background: #fff4e1;
    border-radius: 50% 50% 40% 40%;
    z-index: 1;
  }

  .wax-line {
    position: absolute;
    background: #fff4e1a2;
    border-radius: 2px;
    z-index: 0;
  }
</style>

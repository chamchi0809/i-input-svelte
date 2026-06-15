<script lang="ts">
  import { IInput, distanceUnits } from "../lib/index.js";

  let basic = $state(42);
  let precise = $state(3.14159);
  let limited = $state(50);
  let angle = $state(45);
  let meters = $state(1.8);
  let percent = $state(0.5);
  let priced = $state(1299.99);
</script>

<main>
  <h1>i-input-svelte</h1>
  <p class="sub">Blender-style number input for Svelte 5 — drag to scrub, click to type.</p>

  <section>
    <h2>Basics</h2>
    <label>Basic <IInput bind:value={basic} /></label>
    <label>Precision 5 <IInput bind:value={precise} precision={5} step={0.01} /></label>
  </section>

  <section>
    <h2>Limits &amp; fill bar (custom rendering)</h2>
    <label>
      0–100
      <IInput bind:value={limited} hardMin={0} hardMax={100} scrubDirection="x">
        {#snippet children(state)}
          <div
            style="position:absolute; inset:0; width:{state.normalized *
              100}%; background:#4a7fb8; opacity:0.4; pointer-events:none;"
          ></div>
        {/snippet}
      </IInput>
    </label>
    <label>
      Angle (wraps 360→0)
      <IInput
        bind:value={angle}
        hardMin={0}
        hardMax={360}
        wrapMode="hard-limit"
        unit="°"
      />
    </label>
  </section>

  <section>
    <h2>Units &amp; formatting</h2>
    <label>
      Distance (try "5km", "3ft 2in", "1m + 2cm")
      <IInput bind:value={meters} unit="m" unitSystem={distanceUnits} step={0.1} />
    </label>
    <label>
      Percent
      <IInput
        bind:value={percent}
        step={0.01}
        hardMin={0}
        hardMax={1}
        formatDisplay={({ value }) => `${(value * 100).toFixed(0)}%`}
      />
    </label>
    <label>
      Currency
      <IInput
        bind:value={priced}
        step={0.5}
        formatDisplay={({ value }) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(value)}
      />
    </label>
  </section>

  <section>
    <h2>Styling</h2>
    <label>
      Pill
      <IInput
        bind:value={basic}
        styles={{ root: "border-radius:999px; background:#10243a; border-color:#1d3a5c" }}
      />
    </label>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #1b1b1b;
    color: #ddd;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }
  h1 {
    margin: 0 0 0.25rem;
  }
  .sub {
    margin: 0 0 2rem;
    color: #999;
  }
  section {
    margin-bottom: 2rem;
  }
  h2 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    border-bottom: 1px solid #333;
    padding-bottom: 0.5rem;
  }
  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.75rem 0;
    font-size: 0.9rem;
  }
</style>

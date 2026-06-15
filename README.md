# i-input-svelte

A Blender-style universal number input for **Svelte 5**.

Drag-to-scrub, inline math expressions (`3 * 2 + 1`), pluggable unit systems
(`5km`, `3ft 2in`, `1m + 2cm`), soft/hard limits, value rollover, and fully
custom rendering.

Ships a styled `<IInput />` component and a headless `createIInput` controller.

**▶ [Live demo & playground](https://i-input-svelte.pages.dev)**

> This is a Svelte port of [`i-input`](https://github.com/FarazzShaikh/i-input)
> by [Faraz Shaikh](https://farazzshaikh.com). All credit for the original
> design and logic goes to the upstream project.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Options](#options) — shared props for the component and controller
- [`IInput` component](#iinput-component) — extra props
- [Custom rendering (children snippet)](#custom-rendering-children-snippet)
- [`createIInput` controller (headless)](#createiinput-controller-headless)
- [Units](#units)
- [Helpers](#helpers)
- [Interactions](#interactions)
- [Development](#development)
- [License](#license)

## Install

```sh
npm install i-input-svelte
# or
pnpm add i-input-svelte
```

`svelte` >= 5 is a peer dependency.

## Quick start

```svelte
<script lang="ts">
  import { IInput } from "i-input-svelte";
  let value = $state(0);
</script>

<IInput bind:value />
```

You can also use a callback instead of (or alongside) `bind:value`:

```svelte
<IInput {value} onChange={(v) => (value = v)} />
```

## Options

Accepted by both the `IInput` component and the `createIInput` controller.

| Name               | Type                                     | Default   | Description                                                                       |
| ------------------ | ---------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `value`            | `number`                                 | `0`       | The current value (controlled). Bindable on the component.                        |
| `onChange`         | `(value: number) => void`                | —         | Called with the next value.                                                       |
| `step`             | `number`                                 | `1`       | Increment for arrow keys, wheel, and scrubbing.                                   |
| `precision`        | `number`                                 | `3`       | Max decimal places shown in the default display.                                  |
| `disabled`         | `boolean`                                | `false`   | Disables all interaction.                                                         |
| `scrub`            | `boolean`                                | `true`    | Enable drag-to-scrub. When `false`, click/tap edits instead.                      |
| `scrubSensitivity` | `number`                                 | `1`       | Multiplier for scrub speed (`< 1` is slower).                                     |
| `scrubDirection`   | `"x" \| "y" \| "free"`                   | `"free"`  | Scrub axis. `"free"` responds to both (drag right/up to increase).                |
| `hardMin`          | `number`                                 | `-∞`      | Absolute lower bound; enforced even when typing.                                  |
| `hardMax`          | `number`                                 | `+∞`      | Absolute upper bound; enforced even when typing.                                  |
| `softMin`          | `number`                                 | `hardMin` | Lower bound for scrub/step; typing can exceed it.                                 |
| `softMax`          | `number`                                 | `hardMax` | Upper bound for scrub/step; typing can exceed it.                                 |
| `wrapMode`         | `"none" \| "hard-limit" \| "soft-limit"` | `"none"`  | Wrap past the bounds instead of clamping (e.g. an angle 360° → 0°).               |
| `unit`             | `string`                                 | —         | Display/parse unit suffix (e.g. `"%"`, `"m"`).                                    |
| `unitSystem`       | `UnitSystem`                             | —         | Recognized units for parsing & display (see [Units](#units)).                     |
| `customUnits`      | `UnitDefinition[]`                       | —         | Extra units appended to `unitSystem` (or used standalone).                        |
| `formatDisplay`    | `(info) => string`                       | —         | Custom display formatter. `info` = `{ value, unit, unitSystem, defaultDisplay }`. |

## `IInput` component

Renders a styled, interactive input. Accepts every [option](#options) above
plus the following.

| Name           | Type                                          | Default | Description                                                            |
| -------------- | --------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `children`     | `Snippet<[state, actions]>`                   | —       | Render overlay content. See [below](#custom-rendering-children-snippet). |
| `styles`       | `IInputStyles`                                | —       | Inline **CSS-text** overrides per part (see table below).              |
| `classNames`   | `IInputClassNames`                            | —       | Class name overrides per part (same keys as `styles`).                 |
| `style`        | `string`                                      | —       | Shortcut for `styles.root`.                                            |
| `class`        | `string`                                      | —       | Shortcut for `classNames.root`.                                        |
| `placeholder`  | `string`                                      | —       | Input placeholder while editing.                                       |
| `name` / `id`  | `string`                                      | —       | Forwarded to the `<input>`.                                            |
| `readOnly`     | `boolean`                                     | `false` | Forwarded to the `<input>`.                                            |
| `required`     | `boolean`                                     | `false` | Forwarded to the `<input>`.                                            |
| `autoComplete` | `string`                                      | `"off"` | Forwarded to the `<input>`.                                            |
| `inputMode`    | `string`                                      | —       | Forwarded to the `<input>`.                                            |
| `tabIndex`     | `number`                                      | —       | Forwarded to the root element (needed for keyboard focus).             |
| `aria-*`       | `string \| boolean`                           | —       | `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-invalid`.   |

### Style / className parts

`styles` and `classNames` share these keys. Note that `styles` values are
**CSS text strings** (Svelte inline styles), not objects:

| Key            | Applies to                                |
| -------------- | ----------------------------------------- |
| `root`         | The outer wrapper element.                |
| `input`        | The `<input>` shown while editing.        |
| `display`      | The text shown while not editing.         |
| `rootInvalid`  | The root when the typed text is invalid.  |
| `inputInvalid` | The input when the typed text is invalid. |

```svelte
<IInput
  bind:value
  styles={{
    root: "border-radius:999px; background:#10243a",
    input: "color:#dbeafe",
  }}
/>
```

## Custom rendering (children snippet)

Pass a `children` snippet to render overlay content (fill bars, icons,
buttons…) on top of the input. It receives the current `state` and `actions`.

```svelte
<IInput bind:value hardMin={0} hardMax={100}>
  {#snippet children(state, actions)}
    <!-- a fill bar driven by the normalized value -->
    <div
      style="position:absolute; inset:0; width:{state.normalized *
        100}%; background:#4a7fb8; opacity:0.5; pointer-events:none;"
    ></div>
    {#if state.hovering}
      <button data-role="step" onclick={() => actions.stepBy(1)}>+</button>
    {/if}
  {/snippet}
</IInput>
```

Give interactive overlay elements `data-role="step"` so a click on them does
not start a scrub/edit on the root.

`state` and `actions` are the same objects the controller exposes — see below.

## `createIInput` controller (headless)

For full control over markup, use the headless controller. Pass a getter that
returns the current options so it stays reactive, then wire the returned
`use:` actions and reactive getters into your own template.

```svelte
<script lang="ts">
  import { createIInput } from "i-input-svelte";

  let value = $state(0);
  const i = createIInput(() => ({ value, onChange: (v) => (value = v) }));
</script>

<div use:i.root tabindex="0">
  {#if i.editing}
    <input use:i.input bind:value={i.text} />
  {:else}
    <span>{i.display}{i.displayUnit ? ` ${i.displayUnit}` : ""}</span>
  {/if}
</div>
```

### Controller members

| Member            | Type                          | Description                                          |
| ----------------- | ----------------------------- | ---------------------------------------------------- |
| `root`            | Svelte action                 | `use:i.root` on your wrapper element.                |
| `input`           | Svelte action                 | `use:i.input` on the `<input>` (rendered while editing). |
| `text`            | `string` (get/set)            | Bind with `bind:value={i.text}`.                     |
| `state`           | `IInputState`                 | Snapshot of all reactive state.                      |
| `actions`         | `IInputActions`               | Imperative helpers (see below).                      |

State is also exposed directly as reactive getters: `i.editing`, `i.hovering`,
`i.dragging`, `i.isTextValid`, `i.display`, `i.displayUnit`, `i.normalized`.

### `state`

| Field         | Type                  | Description                                  |
| ------------- | --------------------- | -------------------------------------------- |
| `editing`     | `boolean`             | The text input is active.                    |
| `hovering`    | `boolean`             | Pointer is over the control.                 |
| `dragging`    | `boolean`             | A scrub drag is in progress.                 |
| `text`        | `string`              | Current raw text in the input.               |
| `isTextValid` | `boolean`             | Whether `text` parses to a finite number.    |
| `display`     | `string`              | Formatted value shown when not editing.      |
| `displayUnit` | `string \| undefined` | Unit suffix appended to the display, if any. |
| `normalized`  | `number`              | Value mapped to `0–1` across the soft range. |

### `actions`

| Method        | Description                                  |
| ------------- | -------------------------------------------- |
| `stepBy(dir)` | Step by `±step` (`dir` is `-1` or `1`).      |
| `negate()`    | Flip the sign of the current value.          |
| `set(value)`  | Set the value (clamped/wrapped accordingly). |

## Units

A `UnitSystem` defines a base unit and the units recognized when parsing and
displaying. A built-in `distanceUnits` system (base = meter) is provided.

```svelte
<script lang="ts">
  import { IInput, distanceUnits } from "i-input-svelte";
  let meters = $state(1.8);
</script>

<!-- accepts "5km", "3ft 2in", "1m + 2cm" → stored in meters -->
<IInput bind:value={meters} unit="m" unitSystem={distanceUnits} />
```

Define your own:

```ts
const unitSystem = {
  baseNames: ["px"],
  units: [
    { names: ["px"], toBase: 1 },
    { names: ["rem"], toBase: 16 },
  ],
};
```

### `customUnits`

Use `customUnits` to add extra `UnitDefinition`s without redefining a whole
system. They are appended to `unitSystem` (later definitions win on name
clashes); if no `unitSystem` is given, they form a standalone unitless system.

```svelte
<IInput
  bind:value={meters}
  unit="m"
  unitSystem={distanceUnits}
  customUnits={[{ names: ["px", "pixel", "pixels"], toBase: 0.0002645833 }]}
/>
<!-- now "100px" parses alongside "5km", "3ft 2in", ... -->
```

Each `UnitDefinition` is `{ names: string[]; toBase: number }` — `names` are the
case-insensitive aliases (canonical name first) and `toBase` converts that unit
into the system's base.

## Helpers

Exported alongside the component and controller:

| Export                                             | Kind         | Description                                                                                 |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `distanceUnits`                                    | `UnitSystem` | Built-in distance system (base = meter): km, m, cm, mm, mi, yd, ft, in, …                   |
| `extendUnitSystem(system, custom)`                 | function     | Returns a new `UnitSystem` with `custom` units appended (later definitions win on clashes). |
| `findUnit(system, name)`                           | function     | Look up a `UnitDefinition` by any of its names (case-insensitive); `null` if not found.     |
| `formatComposite(value, system, valueUnit, parts)` | function     | Format a value across multiple units, e.g. `5' 10.87"` or `1h 23m`.                         |
| `evaluateExpression(text)`                         | function     | Safely evaluate a math expression; returns `number \| null`.                                |

```ts
import { findUnit, formatComposite, distanceUnits } from "i-input-svelte";

findUnit(distanceUnits, "ft"); // → { names: ["'", "ft", ...], toBase: 0.3048 }

formatComposite(1.8, distanceUnits, "m", [{ unit: "'" }, { unit: '"' }]);
// → "5' 10.866\""
```

`formatComposite` parts are `{ unit, suffix?, separator?, precision? }`: earlier
parts are floored to whole counts and the final part absorbs the remainder.

### Types

Exported types: `IInputProps`, `UseIInputOptions`, `IInputState`,
`IInputActions`, `IInputStyles`, `IInputClassNames`, `UnitSystem`,
`UnitDefinition`, `CompositePart`.

## Interactions

- **Drag** the control to scrub (hold `Shift` for fine steps, `Ctrl`/`Cmd` for
  precision).
- **Click / tap** to type. Inline math and units are evaluated on commit.
- **Arrow Up/Down** or **mouse wheel** to step by `step`.
- **`-`** while not editing negates the value.
- **Enter** commits, **Escape** cancels.

> Keyboard focus on the root requires a `tabIndex`/`tabindex` (the styled
> component forwards `tabIndex`; the headless example sets `tabindex="0"`).

## Development

```sh
npm install
npm run dev    # run the playground in src/demo
npm run check  # type-check with svelte-check
npm run build  # build the library to dist/ with svelte-package
```

## License

MIT © [Faraz Shaikh](https://farazzshaikh.com) (original) and the Svelte port
authors. See [LICENSE](./LICENSE).

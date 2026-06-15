<script lang="ts">
  import type { FullAutoFill } from "svelte/elements";
  import { createIInput } from "./iinput.svelte.js";
  import type { IInputProps } from "./types.js";

  let {
    // value / change
    value = $bindable(0),
    onChange,
    // options read in markup
    disabled = false,
    scrub = true,
    scrubDirection = "free",
    // styling
    styles,
    classNames,
    style,
    class: className,
    // input attributes
    name,
    id,
    placeholder,
    readOnly,
    required,
    autoComplete,
    inputMode,
    tabIndex,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
    // overlay
    children,
    // remaining options (step, precision, hardMin, unit, …)
    ...rest
  }: IInputProps = $props();

  const controller = createIInput(() => ({
    ...rest,
    value,
    disabled,
    scrub,
    scrubDirection,
    onChange: (next: number) => {
      value = next;
      onChange?.(next);
    },
  }));

  const root = controller.root;
  const input = controller.input;

  const invalid = $derived(controller.invalid);

  const cursor = $derived(
    controller.editing
      ? "text"
      : disabled
        ? "not-allowed"
        : !scrub
          ? "text"
          : scrubDirection === "y"
            ? "ns-resize"
            : scrubDirection === "free"
              ? "move"
              : "ew-resize",
  );
  const touchAction = $derived(
    controller.editing || disabled || !scrub ? "auto" : "none",
  );

  const rootStyle = $derived(
    [
      "position:relative",
      "display:inline-flex",
      "align-items:center",
      "height:32px",
      "min-width:150px",
      "padding:0 10px",
      "background:#2a2a2a",
      "border:1px solid #3b3b3b",
      "border-radius:6px",
      "color:#ddd",
      "border-color:transparent",
      'font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      "font-size:16px",
      "overscroll-behavior:contain",
      `touch-action:${touchAction}`,
      `cursor:${cursor}`,
      "user-select:none",
      "box-sizing:border-box",
      `opacity:${disabled ? 0.5 : 1}`,
      "overflow:hidden",
      styles?.root,
      invalid ? (styles?.rootInvalid ?? "color:#f66;border-color:#f66") : null,
      style,
    ]
      .filter(Boolean)
      .join(";"),
  );

  const inputStyle = $derived(
    [
      "flex:1",
      "width:100%",
      "min-width:0",
      "background:transparent",
      "border:none",
      "outline:none",
      "color:inherit",
      "font:inherit",
      "padding:0",
      "text-align:center",
      "overscroll-behavior:contain",
      styles?.input,
      invalid ? styles?.inputInvalid : null,
    ]
      .filter(Boolean)
      .join(";"),
  );

  const displayStyle = $derived(
    [
      "position:relative",
      "z-index:1",
      "flex:1",
      "text-align:center",
      "pointer-events:none",
      "white-space:nowrap",
      "overflow:hidden",
      "text-overflow:ellipsis",
      styles?.display,
    ]
      .filter(Boolean)
      .join(";"),
  );

  const autocompleteAttr = $derived((autoComplete ?? "off") as FullAutoFill);

  const rootClass = $derived(
    [
      classNames?.root,
      invalid ? classNames?.rootInvalid : undefined,
      className,
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  );

  const inputClass = $derived(
    [classNames?.input, invalid ? classNames?.inputInvalid : undefined]
      .filter(Boolean)
      .join(" ") || undefined,
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  use:root
  tabindex={tabIndex}
  aria-disabled={disabled || undefined}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledby}
  aria-describedby={ariaDescribedby}
  aria-invalid={ariaInvalid ?? (invalid || undefined)}
  class={rootClass}
  style={rootStyle}
>
  {@render children?.(controller.state, controller.actions)}

  {#if controller.editing}
    <input
      use:input
      bind:value={controller.text}
      size="1"
      {name}
      {id}
      {placeholder}
      readonly={readOnly}
      {required}
      autocomplete={autocompleteAttr}
      inputmode={inputMode}
      class={inputClass}
      style={inputStyle}
    />
  {:else}
    <span class={classNames?.display} style={displayStyle}>
      {controller.display}{controller.displayUnit
        ? ` ${controller.displayUnit}`
        : ""}
    </span>
  {/if}
</div>

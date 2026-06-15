import { tick } from "svelte";
import type { Action } from "svelte/action";
import {
  axisDelta,
  clamp,
  evaluateText,
  formatNumber,
  getPixelsPerStep,
  getUnitToBase,
  nextStep,
  normalize,
  resolveUnitSystem,
  wrap,
  type DragState,
} from "./utils/index.js";
import type { UnitDefinition, UnitSystem } from "./utils/units.js";

export interface UseIInputOptions {
  /** The current value (controlled). */
  value: number;
  /** Called with the next value whenever it changes. */
  onChange: (value: number) => void;
  /** Increment for arrow keys, wheel, and scrubbing. */
  step?: number;
  /** Max decimal places shown in the default display. */
  precision?: number;
  /** Custom display formatter. */
  formatDisplay?: (info: {
    value: number;
    unit: string | undefined;
    unitSystem: UnitSystem | undefined;
    defaultDisplay: string;
  }) => string;

  disabled?: boolean;

  // Scrub
  scrub?: boolean;
  scrubSensitivity?: number;
  scrubDirection?: "x" | "y" | "free";

  // Limits
  hardMin?: number;
  hardMax?: number;
  softMin?: number;
  softMax?: number;
  wrapMode?: "none" | "hard-limit" | "soft-limit";

  // Units
  unit?: string;
  unitSystem?: UnitSystem;
  customUnits?: UnitDefinition[];
}

export interface IInputState {
  editing: boolean;
  hovering: boolean;
  dragging: boolean;
  text: string;
  isTextValid: boolean;
  display: string;
  displayUnit: string | undefined;
  normalized: number;
}

export interface IInputActions {
  stepBy: (dir: -1 | 1) => void;
  negate: () => void;
  set: (value: number) => void;
}

const HARD_DEFAULT_MIN = -Infinity;
const HARD_DEFAULT_MAX = Infinity;
const DRAG_THRESHOLD_PX = 3;

/**
 * Headless reactive controller for a Blender-style number input.
 *
 * Holds all interaction state with Svelte runes and exposes:
 *   - reactive getters (`editing`, `display`, …) plus a `state` snapshot,
 *   - imperative `actions` (`stepBy`, `negate`, `set`),
 *   - two Svelte actions, `root` and `input`, that wire up DOM events.
 *
 * Prefer the {@link IInput} component for the common case; reach for the
 * controller when you need full control over the markup.
 */
export class IInputController {
  #getOptions: () => UseIInputOptions;

  #editing = $state(false);
  #hovering = $state(false);
  #dragging = $state(false);
  #editingText = $state("");
  #isTextValid = $state(true);

  #inputEl: HTMLInputElement | null = null;
  #drag: DragState | null = null;

  constructor(getOptions: () => UseIInputOptions) {
    this.#getOptions = getOptions;
  }

  // --- Resolved options (with defaults) -----------------------------------

  get #o() {
    return this.#getOptions();
  }
  get #value() {
    return this.#o.value;
  }
  get #onChange() {
    return this.#o.onChange;
  }
  get #step() {
    return this.#o.step ?? 1;
  }
  get #precision() {
    return this.#o.precision ?? 3;
  }
  get #disabled() {
    return this.#o.disabled ?? false;
  }
  get #scrub() {
    return this.#o.scrub ?? true;
  }
  get #scrubDirection() {
    return this.#o.scrubDirection ?? "free";
  }
  get #scrubSensitivity() {
    return this.#o.scrubSensitivity ?? 1;
  }
  get #hardMin() {
    return this.#o.hardMin ?? HARD_DEFAULT_MIN;
  }
  get #hardMax() {
    return this.#o.hardMax ?? HARD_DEFAULT_MAX;
  }
  get #wrapMode() {
    return this.#o.wrapMode ?? "none";
  }
  get #unit() {
    return this.#o.unit;
  }
  get #formatDisplay() {
    return this.#o.formatDisplay;
  }

  get #softLow() {
    return this.#o.softMin ?? this.#hardMin;
  }
  get #softHigh() {
    return this.#o.softMax ?? this.#hardMax;
  }

  // Resolve the active wrap range based on `wrapMode`, falling back to
  // clamping when the chosen range isn't finite.
  get #wrapLow() {
    return this.#wrapMode === "hard-limit" ? this.#hardMin : this.#softLow;
  }
  get #wrapHigh() {
    return this.#wrapMode === "hard-limit" ? this.#hardMax : this.#softHigh;
  }
  get #canWrap() {
    return (
      this.#wrapMode !== "none" &&
      Number.isFinite(this.#wrapLow) &&
      Number.isFinite(this.#wrapHigh)
    );
  }

  get #activeUnitSystem(): UnitSystem | undefined {
    return resolveUnitSystem(this.#o.unitSystem, this.#o.customUnits);
  }
  get #valueUnitToBase() {
    return getUnitToBase(this.#activeUnitSystem, this.#unit);
  }

  // --- Pure helpers --------------------------------------------------------

  #clampHard(next: number) {
    return this.#canWrap
      ? wrap(next, this.#wrapLow, this.#wrapHigh)
      : clamp(next, this.#hardMin, this.#hardMax);
  }
  #clampSoft(next: number) {
    return this.#canWrap
      ? wrap(next, this.#wrapLow, this.#wrapHigh)
      : clamp(next, this.#softLow, this.#softHigh);
  }
  #formatValue(next: number) {
    return formatNumber(next, this.#precision);
  }
  #evalText(raw: string) {
    return evaluateText(
      raw,
      this.#activeUnitSystem,
      this.#unit,
      this.#valueUnitToBase,
    );
  }
  #commitValue(next: number) {
    const clamped = this.#clampHard(next);
    if (clamped !== this.#value) this.#onChange(clamped);
    return clamped;
  }

  // --- Public reactive state ----------------------------------------------

  get editing() {
    return this.#editing;
  }
  get hovering() {
    return this.#hovering;
  }
  get dragging() {
    return this.#dragging;
  }
  get isTextValid() {
    return this.#isTextValid;
  }

  /**
   * Current raw text in the input. While editing this is the editable buffer;
   * otherwise it mirrors the formatted value. Writable so it can be used with
   * `bind:value` on an `<input>`.
   */
  get text() {
    return this.#editing ? this.#editingText : this.#formatValue(this.#value);
  }
  set text(next: string) {
    this.#editingText = next;
    const parsed = this.#evalText(next);
    this.#isTextValid = parsed !== null && Number.isFinite(parsed);
  }

  get display() {
    const defaultDisplay = this.#formatValue(this.#value);
    const formatDisplay = this.#formatDisplay;
    return formatDisplay
      ? formatDisplay({
          value: this.#value,
          unit: this.#unit,
          unitSystem: this.#activeUnitSystem,
          defaultDisplay,
        })
      : defaultDisplay;
  }

  get displayUnit(): string | undefined {
    return this.#formatDisplay
      ? undefined
      : (this.#unit ?? this.#activeUnitSystem?.baseNames[0]);
  }

  get normalized() {
    return normalize(this.#value, this.#softLow, this.#softHigh);
  }

  /** Snapshot of the current reactive state (re-evaluated on access). */
  get state(): IInputState {
    return {
      editing: this.editing,
      hovering: this.hovering,
      dragging: this.dragging,
      text: this.text,
      isTextValid: this.isTextValid,
      display: this.display,
      displayUnit: this.displayUnit,
      normalized: this.normalized,
    };
  }

  /** True while the typed text fails to parse to a finite number. */
  get invalid() {
    return this.#editing && !this.#isTextValid;
  }

  // --- Actions (imperative) -----------------------------------------------

  set = (next: number) => {
    if (!this.#disabled) this.#commitValue(next);
  };

  negate = () => this.set(-this.#value);

  stepBy = (dir: -1 | 1) => {
    if (this.#disabled) return;
    const parsed = this.#editing ? this.#evalText(this.#editingText) : null;
    const base = parsed !== null && Number.isFinite(parsed) ? parsed : this.#value;
    const next = this.#commitValue(this.#clampSoft(nextStep(base, this.#step, dir)));

    this.#editingText = this.#formatValue(next);
    this.#isTextValid = true;
    void tick().then(() => this.#inputEl?.select());
  };

  get actions(): IInputActions {
    return { stepBy: this.stepBy, negate: this.negate, set: this.set };
  }

  // --- Editing lifecycle ---------------------------------------------------

  #startEditing = (selectAll = true) => {
    if (this.#disabled) return;
    this.#editingText = this.#formatValue(this.#value);
    this.#isTextValid = true;
    this.#editing = true;
    void tick().then(() => {
      this.#inputEl?.focus();
      if (selectAll) this.#inputEl?.select();
    });
  };

  #stopEditing = () => {
    this.#editing = false;
  };

  #commitEdit = () => {
    if (!this.#editing) return;
    const parsed = this.#evalText(this.#editingText);
    if (parsed !== null && Number.isFinite(parsed)) this.#commitValue(parsed);
    this.#stopEditing();
  };

  // --- DOM event handlers --------------------------------------------------

  #handleWheel = (event: WheelEvent) => {
    if (this.#disabled) return;
    event.preventDefault();
    this.stepBy(event.deltaY > 0 ? 1 : -1);
  };

  #onPointerDown = (event: PointerEvent) => {
    if (this.#disabled || this.#editing || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.dataset?.role === "step") return;

    if (!this.#scrub) {
      event.preventDefault();
      this.#startEditing(true);
      return;
    }

    event.preventDefault();
    this.#drag = {
      startX: event.clientX,
      startY: event.clientY,
      startValue: this.#value,
      moved: false,
      pointerId: event.pointerId,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  #onPointerMove = (event: PointerEvent) => {
    const drag = this.#drag;
    if (!drag) return;

    const deltaPx = axisDelta(event, drag, this.#scrubDirection);
    if (!drag.moved) {
      if (Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      this.#dragging = true;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      return;
    }

    const pxPerStep = getPixelsPerStep({
      element: event.currentTarget as HTMLElement,
      direction: this.#scrubDirection,
      sensitivity: this.#scrubSensitivity,
      precision: event.ctrlKey || event.metaKey,
      step: this.#step,
      softMin: this.#softLow,
      softMax: this.#softHigh,
    });

    let delta = (deltaPx / pxPerStep) * this.#step;
    if (!event.shiftKey) delta = Math.round(delta / this.#step) * this.#step;
    this.set(this.#clampSoft(drag.startValue + delta));
  };

  #endDrag = (event: PointerEvent) => {
    const drag = this.#drag;
    if (!drag) return drag;
    const el = event.currentTarget as HTMLElement;
    if (el.hasPointerCapture(drag.pointerId)) {
      el.releasePointerCapture(drag.pointerId);
    }
    this.#drag = null;
    this.#dragging = false;
    return drag;
  };

  #onPointerUp = (event: PointerEvent) => {
    const drag = this.#endDrag(event);
    // A press without movement is a tap → begin editing.
    if (drag && !drag.moved) this.#startEditing(true);
  };

  // `pointercancel` fires when the browser takes over the gesture (common on
  // touch). Abort the drag but do NOT treat it as a tap, otherwise scrubbing
  // would instantly fall back to editing on touch devices.
  #onPointerCancel = (event: PointerEvent) => {
    this.#endDrag(event);
  };

  #onPointerEnter = () => {
    this.#hovering = true;
  };
  #onPointerLeave = () => {
    this.#hovering = false;
  };

  #onFocus = (event: FocusEvent) => {
    if (event.target !== event.currentTarget) return;
    if (!this.#editing) this.#startEditing(true);
  };

  #onRootKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && this.#editing) {
      event.preventDefault();
      this.#commitEdit();
      return;
    }
    if (event.key === "Escape" && this.#editing) {
      event.preventDefault();
      this.#stopEditing();
      return;
    }
    if (event.key === "Tab" && this.#editing) {
      this.#commitEdit();
      return;
    }
    if (event.key === "-" && !this.#editing && !this.#disabled) {
      event.preventDefault();
      this.negate();
      return;
    }
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !this.#editing) {
      event.preventDefault();
      this.stepBy(event.key === "ArrowUp" ? 1 : -1);
    }
  };

  #onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "-") {
      const input = event.currentTarget as HTMLInputElement;
      const allSelected =
        input.value.length > 0 &&
        input.selectionStart === 0 &&
        input.selectionEnd === input.value.length;
      if (allSelected) {
        const parsed = this.#evalText(this.#editingText);
        if (parsed !== null && Number.isFinite(parsed)) {
          event.preventDefault();
          this.#editingText = this.#formatValue(-parsed);
          this.#isTextValid = true;
          void tick().then(() => this.#inputEl?.select());
        }
      }
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    this.stepBy(event.key === "ArrowUp" ? 1 : -1);
  };

  #onBlur = () => this.#commitEdit();

  // --- Svelte `use:` actions ----------------------------------------------

  /**
   * Wire root-level interaction onto the wrapper element. The wheel listener
   * is attached non-passively so the page doesn't scroll while stepping.
   */
  root: Action<HTMLElement> = (node) => {
    node.addEventListener("wheel", this.#handleWheel, { passive: false });
    node.addEventListener("pointerdown", this.#onPointerDown);
    node.addEventListener("pointermove", this.#onPointerMove);
    node.addEventListener("pointerup", this.#onPointerUp);
    node.addEventListener("pointercancel", this.#onPointerCancel);
    node.addEventListener("pointerenter", this.#onPointerEnter);
    node.addEventListener("pointerleave", this.#onPointerLeave);
    node.addEventListener("keydown", this.#onRootKeyDown);
    node.addEventListener("focus", this.#onFocus);
    return {
      destroy: () => {
        node.removeEventListener("wheel", this.#handleWheel);
        node.removeEventListener("pointerdown", this.#onPointerDown);
        node.removeEventListener("pointermove", this.#onPointerMove);
        node.removeEventListener("pointerup", this.#onPointerUp);
        node.removeEventListener("pointercancel", this.#onPointerCancel);
        node.removeEventListener("pointerenter", this.#onPointerEnter);
        node.removeEventListener("pointerleave", this.#onPointerLeave);
        node.removeEventListener("keydown", this.#onRootKeyDown);
        node.removeEventListener("focus", this.#onFocus);
      },
    };
  };

  /**
   * Wire the editing `<input>`. Pair with `bind:value={controller.text}` so
   * typed text flows back through the controller.
   */
  input: Action<HTMLInputElement> = (node) => {
    this.#inputEl = node;
    node.addEventListener("blur", this.#onBlur);
    node.addEventListener("keydown", this.#onInputKeyDown);
    return {
      destroy: () => {
        node.removeEventListener("blur", this.#onBlur);
        node.removeEventListener("keydown", this.#onInputKeyDown);
        if (this.#inputEl === node) this.#inputEl = null;
      },
    };
  };
}

/**
 * Create a headless {@link IInputController}. Pass a getter returning the
 * current options so the controller stays reactive to prop changes.
 *
 * ```svelte
 * <script lang="ts">
 *   import { createIInput } from "i-input-svelte";
 *   let value = $state(0);
 *   const i = createIInput(() => ({ value, onChange: (v) => (value = v) }));
 * </script>
 *
 * <div use:i.root tabindex="0">
 *   {#if i.editing}
 *     <input use:i.input bind:value={i.text} />
 *   {:else}
 *     <span>{i.display}{i.displayUnit ? ` ${i.displayUnit}` : ""}</span>
 *   {/if}
 * </div>
 * ```
 */
export function createIInput(
  getOptions: () => UseIInputOptions,
): IInputController {
  return new IInputController(getOptions);
}

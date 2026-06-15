import type { Snippet } from "svelte";
import type {
  IInputActions,
  IInputState,
  UseIInputOptions,
} from "./iinput.svelte.js";

export interface IInputStyles {
  root?: string;
  input?: string;
  display?: string;
  rootInvalid?: string;
  inputInvalid?: string;
}

export interface IInputClassNames {
  root?: string;
  input?: string;
  display?: string;
  rootInvalid?: string;
  inputInvalid?: string;
}

export type IInputProps = Omit<UseIInputOptions, "value" | "onChange"> & {
  /** Current value. Bindable: `bind:value`. */
  value?: number;
  /** Called with the next value. Use instead of (or alongside) `bind:value`. */
  onChange?: (value: number) => void;

  /** Render overlay content (fill bars, buttons…) on top of the input. */
  children?: Snippet<[IInputState, IInputActions]>;

  /** Inline CSS-text overrides per part. */
  styles?: IInputStyles;
  /** Class name overrides per part. */
  classNames?: IInputClassNames;
  /** Shortcut for `styles.root` (inline CSS text). */
  style?: string;
  /** Shortcut for `classNames.root`. */
  class?: string;

  name?: string;
  id?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  tabIndex?: number;
};

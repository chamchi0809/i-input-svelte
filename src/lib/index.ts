export { default as IInput } from "./IInput.svelte";
export type {
  IInputProps,
  IInputStyles,
  IInputClassNames,
} from "./types.js";

export {
  createIInput,
  IInputController,
  type IInputActions,
  type IInputState,
  type UseIInputOptions,
} from "./iinput.svelte.js";

export {
  distanceUnits,
  extendUnitSystem,
  findUnit,
  formatBase,
  formatComposite,
  preprocessUnits,
  type CompositePart,
  type PreprocessUnitsResult,
  type UnitDefinition,
  type UnitSystem,
} from "./utils/units.js";

export { evaluateExpression } from "./utils/evaluateExpression.js";

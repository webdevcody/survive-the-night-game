import Interactive from "./interactive";
import Positionable from "./positionable";

export const extensionsMap = {
  [Interactive.Name]: Interactive,
  [Positionable.Name]: Positionable,
} as const;

export { Interactive, Positionable };
export * from "./types";

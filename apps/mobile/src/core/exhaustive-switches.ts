export const exhaustiveSwitch = (value: never): never => {
  throw new Error(`Unhandled case: ${value}`);
};

export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled case: ${value}`);
};

export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${value}`);
};

export const exhaustiveSwitchWithDefault = <T>(
  value: never,
  defaultValue: T
): T => {
  return defaultValue;
};

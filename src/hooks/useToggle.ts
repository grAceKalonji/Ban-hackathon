import { useState, useCallback } from 'react';

export function useToggle(
  initial = false,
): [boolean, () => void, (val: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((val: boolean) => setValue(val), []);
  return [value, toggle, set];
}

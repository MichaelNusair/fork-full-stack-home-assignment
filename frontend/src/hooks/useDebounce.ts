import { useState, useEffect } from 'react';

// Cleanup cancels pending timers on each value change, so only the last
// value within the delay window is emitted (prevents excessive API calls).
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

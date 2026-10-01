import { useState, useEffect } from 'react';

/**
 * A custom hook that delays updating the debounced value until after the 
 * specified delay has passed without any new updates to the value.
 * 
 * @param {*} value The value to debounce
 * @param {number} delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    // This is how we prevent debounced value from updating if value is changed ...
    // .. within the delay period. Timeout gets cleared and restarted.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

export function useUndoableState(initialState) {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Use a debounced setter for capturing history
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const captureHistory = useCallback(
    debounce((currentState) => {
      setPast((prevPast) => [...prevPast, currentState]);
      setFuture([]); // Clear future on new action
    }, 500),
    []
  );

  const setWithHistory = useCallback(
    (newState) => {
      const nextState = typeof newState === 'function' ? newState(state) : newState;
      if (JSON.stringify(state) !== JSON.stringify(nextState)) {
        captureHistory(state);
        setState(nextState);
      }
    },
    [state, captureHistory]
  );

  // Use this when we just want to load data without affecting history (like initial load)
  const setWithoutHistory = useCallback((newState) => {
    setState(newState);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setPast(newPast);
    setFuture([state, ...future]);
    setState(previous);
  }, [past, future, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast([...past, state]);
    setFuture(newFuture);
    setState(next);
  }, [past, future, state]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return [state, setWithHistory, undo, redo, canUndo, canRedo, setWithoutHistory];
}

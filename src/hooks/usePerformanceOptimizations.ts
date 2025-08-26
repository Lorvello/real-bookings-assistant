// Optimized useEffect dependencies and memoization patterns
import { useCallback, useMemo, useRef, useEffect } from 'react';

// Performance-optimized debounce hook
export const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Optimized interval hook with cleanup
export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

// Stable object reference hook to prevent unnecessary re-renders
export const useStableObject = <T extends Record<string, any>>(obj: T): T => {
  const stableRef = useRef<T>(obj);
  
  const isEqual = useMemo(() => {
    const keys1 = Object.keys(obj);
    const keys2 = Object.keys(stableRef.current);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => obj[key] === stableRef.current[key]);
  }, [obj]);
  
  if (!isEqual) {
    stableRef.current = obj;
  }
  
  return stableRef.current;
};

// Optimized array dependency hook
export const useStableArray = <T>(arr: T[]): T[] => {
  const stableRef = useRef<T[]>(arr);
  
  const isEqual = useMemo(() => {
    if (arr.length !== stableRef.current.length) return false;
    return arr.every((item, index) => item === stableRef.current[index]);
  }, [arr]);
  
  if (!isEqual) {
    stableRef.current = arr;
  }
  
  return stableRef.current;
};
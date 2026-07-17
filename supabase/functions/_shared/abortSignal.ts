export interface ComposedAbortSignal {
  signal: AbortSignal;
  dispose: () => void;
}

/** Compose a caller-owned deadline with a shorter provider timeout. */
export function composeAbortSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): ComposedAbortSignal {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parent?.reason);

  if (parent?.aborted) abortFromParent();
  else parent?.addEventListener("abort", abortFromParent, { once: true });

  const timeout = setTimeout(
    () =>
      controller.abort(new DOMException("Provider timeout", "TimeoutError")),
    Math.max(1, timeoutMs),
  );

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

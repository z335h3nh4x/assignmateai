import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

/**
 * Warns the user before navigating away or closing the tab when `dirty` is true.
 * - Router navigations: intercepted via TanStack's `useBlocker` with a confirm dialog.
 * - Full unloads / tab close: intercepted via `beforeunload`.
 */
export function useUnsavedChanges(dirty: boolean, message = "You have unsaved changes. Leave anyway?") {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, message]);

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !window.confirm(message);
    },
    enableBeforeUnload: false,
  });
}

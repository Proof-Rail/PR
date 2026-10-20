'use client';

/**
 * useCopyToClipboard
 *
 * Thin wrapper around the Clipboard API that also manages a short-lived
 * "copied!" feedback state.  Handles the case where the Clipboard API is
 * unavailable (e.g. non-HTTPS, old browsers) by falling back to
 * document.execCommand.
 *
 * Usage:
 *   const { copy, copied } = useCopyToClipboard();
 *   <button onClick={() => copy(text)}>{copied ? 'Copied!' : 'Copy'}</button>
 */

import { useState, useCallback, useRef } from 'react';

export interface UseCopyToClipboardResult {
  /**
   * Copy `text` to the clipboard.  Returns `true` on success, `false` if the
   * copy could not be performed (permission denied, API unavailable, etc.).
   */
  copy: (text: string) => Promise<boolean>;
  /** `true` for `feedbackMs` milliseconds after a successful copy. */
  copied: boolean;
}

/**
 * @param feedbackMs  Duration (ms) for which `copied` stays `true`.
 *                    Defaults to 2000 ms.
 */
export function useCopyToClipboard(feedbackMs = 2000): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  // Keep a ref to the reset timer so it can be cleared on re-copy.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      let success = false;

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          // Modern Clipboard API (requires HTTPS / localhost).
          await navigator.clipboard.writeText(text);
          success = true;
        } else {
          // Legacy fallback via a transient textarea.
          const el = document.createElement('textarea');
          el.value = text;
          el.style.position = 'fixed';
          el.style.left = '-9999px';
          el.style.top = '-9999px';
          document.body.appendChild(el);
          el.focus();
          el.select();
          success = document.execCommand('copy');
          document.body.removeChild(el);
        }
      } catch {
        success = false;
      }

      if (success) {
        // Clear any existing timer before starting a new one.
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        setCopied(true);
        timerRef.current = setTimeout(() => setCopied(false), feedbackMs);
      }

      return success;
    },
    [feedbackMs],
  );

  return { copy, copied };
}

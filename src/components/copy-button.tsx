"use client";

import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";

interface CopyButtonProps {
  // The text that goes to the clipboard.
  value: string;
  // What is being copied, for the accessible name: "customer email".
  what: string;
}

// Copies a short text. When the browser has no clipboard (an insecure address,
// a blocked permission) nothing happens and nothing breaks: the text stays on
// the page to be selected by hand.
export function CopyButton({ value, what }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${what}`}
        className={buttonStyles({
          variant: "secondary",
          size: "sm",
          className: "min-w-24 shrink-0",
        })}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {/* Tells a screen reader what the button did. */}
      <span role="status" className="sr-only">
        {copied ? `Copied ${what}` : ""}
      </span>
    </>
  );
}

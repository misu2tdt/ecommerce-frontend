"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// After the visitor moves to another page of a list, brings the start of the
// results into view and puts keyboard focus there, so a screen reader announces
// the new page and a keyboard user does not start again from the top of the
// page. It does nothing on the first load.
export function PageFocus({ targetId }: { targetId: string }) {
  const page = useSearchParams().get("page");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  }, [page, targetId]);

  return null;
}

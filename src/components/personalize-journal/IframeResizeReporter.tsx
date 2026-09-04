"use client";

import { useEffect } from "react";

/** When embedded in an iframe (the theme wraps this page with the real Sanaya
 * header/footer, same pattern as jc-embed.liquid does for the customizer),
 * tell the parent page our actual content height so it can resize the
 * iframe instead of showing a fixed-height scrollbar. No-op when viewed
 * standalone. */
export function IframeResizeReporter() {
  useEffect(() => {
    if (window.parent === window) return;

    function postHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "sanaya-journal-resize", height }, "*");
    }

    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    window.addEventListener("resize", postHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, []);

  return null;
}

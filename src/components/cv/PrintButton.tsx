"use client";

import { Icon } from "@/components/Icon";

/** Plan 3 replaces this with a link to /cv.pdf. */
export function PrintButton() {
  return (
    <button className="btn btn-stock" type="button" onClick={() => window.print()}>
      Download CV <Icon name="download" />
    </button>
  );
}

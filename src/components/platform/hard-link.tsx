"use client";

import type { ReactNode, MouseEvent } from "react";

/** Force a full document navigation (avoids Safari RSC soft-nav cookie drops). */
export function HardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Always hard-navigate — do not allow Next soft routing to take over.
    e.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

"use client";

import { track } from "@/lib/analytics";

export const REPO_URL = "https://github.com/blivius/tydbase";

export function GithubLink({
  className,
  path = "",
  children = "Source on GitHub",
}: {
  className?: string;
  path?: string;
  children?: string;
}) {
  return (
    <a
      href={`${REPO_URL}${path}`}
      className={className ?? "tyd-link"}
      onClick={() => track("github_click", { path: path || "/" })}
    >
      {children}
    </a>
  );
}

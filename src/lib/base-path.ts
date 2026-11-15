/**
 * Public mount path, for serving the app under a sub-path such as /portofolio (Tailscale Funnel path mount).
 * Set BASE_PATH when running `next build`; it is inlined, so a change needs a rebuild. Unset means the root.
 * next/link, redirect() and the router add it on their own; plain hrefs, <img>/<image> srcs and cookie paths do not.
 */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an absolute in-app path ("/cv") with the mount path. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

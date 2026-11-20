import { BASE_PATH } from "@/lib/base-path";

/**
 * metadataBase for a page, so og:url and og:image come out absolute: the origin of the owner's site URL plus the
 * mount path. Next composes relative fields (and the opengraph-image route) onto its end, but does not add the mount
 * path to them on its own. Empty when the URL does not parse.
 */
export function siteBase(siteUrl: string): { metadataBase?: URL } {
  try {
    return { metadataBase: new URL(`${new URL(siteUrl).origin}${BASE_PATH}/`) };
  } catch {
    return {};
  }
}

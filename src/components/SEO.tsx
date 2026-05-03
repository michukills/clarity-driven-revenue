import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title: string;
  description: string;
  /** Path relative to site root. If omitted, current pathname is used. */
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  /**
   * When true, sets `<meta name="robots" content="noindex,follow">` so
   * search engines do not index the page (used for utility/conversion
   * routes like /diagnostic-apply that should not appear in SERPs).
   */
  noindex?: boolean;
}

const SITE_ORIGIN = "https://www.revenueandgrowthsystems.com";

function setMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Lightweight per-page SEO. Updates document title, description,
 * canonical, and OpenGraph/Twitter title+description tags on mount
 * and whenever props change. Avoids adding a runtime dependency.
 */
export default function SEO({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  noindex,
}: SEOProps) {
  const location = useLocation();
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    const url = `${SITE_ORIGIN}${canonical ?? location.pathname}`;
    setLink("canonical", url);

    const ogT = ogTitle ?? title;
    const ogD = ogDescription ?? description;
    setMeta('meta[property="og:title"]', "property", "og:title", ogT);
    setMeta('meta[property="og:description"]', "property", "og:description", ogD);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", ogT);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", ogD);

    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noindex ? "noindex,follow" : "index,follow",
    );
  }, [title, description, canonical, ogTitle, ogDescription, noindex, location.pathname]);

  return null;
}

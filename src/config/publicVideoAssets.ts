/**
 * P81A — Public video / share / download asset registry.
 *
 * Single source of truth for PUBLIC website videos, downloadable public
 * video assets, and public social-share metadata. This registry is
 * intentionally separate from `toolWalkthroughVideos.ts`, which serves
 * the in-portal instructional walkthroughs (no download / no social
 * share, ever).
 *
 * The registry is honest: a video is only marked `finished` when a real
 * public-safe asset exists. Public components must NEVER render a fake
 * playable <video> or a download button against a nonexistent file.
 */

export type PublicVideoStatus =
  | "finished"
  | "script_needed"
  | "recording_needed"
  | "editing_needed"
  | "planned"
  | "not_available";

export interface PublicVideoAsset {
  video_key: string;
  title: string;
  description: string;
  /** Public route this video appears on (e.g. "/demo"). */
  page_context: string;
  video_status: PublicVideoStatus;
  video_url: string | null;
  poster_url: string | null;
  download_url: string | null;
  captions_url: string | null;
  transcript_url: string | null;
  duration_label: string | null;
  /** Plain-text share title (used in og:title fallback / share copy). */
  share_title: string;
  /** Plain-text share description used by social-share utilities. */
  share_description: string;
  /** CTA label used inside share copy. */
  scorecard_cta_label: string;
  /** Public CTA URL — must be a public route, not a private asset. */
  scorecard_cta_url: string;
  allow_download: boolean;
  allow_social_share: boolean;
  /** Only true when a real, public-safe video file exists for OG video tags. */
  og_video_allowed: boolean;
  last_updated: string;
}

export const PUBLIC_VIDEO_ASSETS: PublicVideoAsset[] = [
  {
    video_key: "rgs_system_demo_animation",
    title: "RGS System Demo (silent walkthrough)",
    description:
      "Eight-scene silent walkthrough that explains how RGS finds the gear that may be slipping first. Renders in-page (no remote video file).",
    page_context: "/demo",
    video_status: "finished",
    // The demo is rendered as a code-driven motion storyboard
    // (`SystemDemoAnimation`), not an MP4. There is intentionally
    // no remote file URL, and therefore no download button.
    video_url: null,
    poster_url: null,
    download_url: null,
    captions_url: null,
    transcript_url: "/demo#transcript",
    duration_label: "~90s",
    share_title: "See how RGS finds the slipping gears",
    share_description:
      "Most business problems look like five separate problems. They are usually one slipping gear. See how stable your business really is — take the RGS Business Stability Scorecard™.",
    scorecard_cta_label: "Take the RGS Business Stability Scorecard™",
    scorecard_cta_url: "/scorecard",
    allow_download: false,
    allow_social_share: true,
    og_video_allowed: false,
    last_updated: "2026-05-05",
  },
  {
    video_key: "rgs_os_walkthrough",
    title: "Watch the RGS OS demo",
    description:
      "Recorded product walkthrough of the RGS OS using sample/demo data. Honest status: recording not yet finished — the page renders a 'video coming soon' placeholder and never a fake playable video.",
    page_context: "/demo",
    video_status: "recording_needed",
    video_url: null,
    poster_url: null,
    download_url: null,
    captions_url: null,
    transcript_url: null,
    duration_label: null,
    share_title: "RGS OS demo — coming soon",
    share_description:
      "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.",
    scorecard_cta_label: "Take the RGS Business Stability Scorecard™",
    scorecard_cta_url: "/scorecard",
    allow_download: false,
    allow_social_share: false,
    og_video_allowed: false,
    last_updated: "2026-05-05",
  },
];

export const PUBLIC_SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/RevenuAndGrowthSystems/",
  instagram:
    "https://www.instagram.com/revenueandgrowthsystems?igsh=bWznwnmzy2bzgyb3dj&utm_source=qr",
} as const;

const enc = encodeURIComponent;

export interface ShareTargets {
  facebook: string;
  linkedin: string;
  twitter: string;
  email: string;
}

/**
 * Build encoded share URLs for a public page. Share URLs always point at
 * the public PAGE (not a raw video file or private storage path), and
 * the share text includes the scorecard CTA where appropriate.
 */
export function buildPublicShareTargets(input: {
  pageUrl: string;
  shareText: string;
}): ShareTargets {
  const u = enc(input.pageUrl);
  const t = enc(input.shareText);
  const both = enc(`${input.shareText} ${input.pageUrl}`);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    email: `mailto:?subject=${enc("Revenue & Growth Systems")}&body=${both}`,
  };
}

/**
 * Truthful platform-limitation note for ADMIN/help copy only. Website
 * share buttons share a public page link with rich preview metadata —
 * they do NOT force a native playable social-video post or a clickable
 * CTA inside a native social video. Admin tooling can surface this so
 * the team uploads natively when a true playable post is required.
 */
export const PUBLIC_SHARE_PLATFORM_NOTE =
  "Website share buttons share the public page URL with rich preview metadata. To post a native playable video on a social platform, upload the video directly through that platform's posting or ad tools.";

export function getPublicVideo(key: string): PublicVideoAsset | undefined {
  return PUBLIC_VIDEO_ASSETS.find((v) => v.video_key === key);
}

/** True only when this entry is safe to render as a real playable video. */
export function isPublicVideoPlayable(v: PublicVideoAsset): boolean {
  return v.video_status === "finished" && !!v.video_url;
}

/** True only when this entry is safe to expose as a download button. */
export function isPublicVideoDownloadable(v: PublicVideoAsset): boolean {
  return (
    v.allow_download &&
    v.video_status === "finished" &&
    !!v.download_url
  );
}

/** True only when this entry should emit og:video / og:video:* metadata. */
export function isPublicVideoOgEligible(v: PublicVideoAsset): boolean {
  return (
    v.og_video_allowed &&
    v.video_status === "finished" &&
    !!v.video_url
  );
}
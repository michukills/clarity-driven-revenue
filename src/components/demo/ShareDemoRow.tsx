import { useState } from "react";
import {
  Facebook,
  Linkedin,
  Twitter,
  Mail,
  Link as LinkIcon,
  MessageCircle,
  Share2,
} from "lucide-react";

const SHARE_URL =
  "https://revenueandgrowthsystems.com/demo?utm_source=share&utm_medium=social&utm_campaign=rgs_system_demo_v2";
const SHARE_TEXT =
  "Are you reacting to problems… or operating with a system that guides the solution? See how Revenue & Growth Systems turns business signals into a clearer operating picture.";

const enc = encodeURIComponent;

const targets = [
  {
    label: "Facebook",
    icon: Facebook,
    href: `https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`,
  },
  {
    label: "LinkedIn",
    icon: Linkedin,
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`,
  },
  {
    label: "X",
    icon: Twitter,
    href: `https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SHARE_URL)}`,
  },
  {
    label: "Reddit",
    icon: Share2,
    href: `https://www.reddit.com/submit?url=${enc(SHARE_URL)}&title=${enc("RGS System Demo")}`,
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    href: `https://api.whatsapp.com/send?text=${enc(`${SHARE_TEXT} ${SHARE_URL}`)}`,
  },
  {
    label: "Email",
    icon: Mail,
    href: `mailto:?subject=${enc("RGS System Demo")}&body=${enc(`${SHARE_TEXT}\n\n${SHARE_URL}`)}`,
  },
];

export default function ShareDemoRow() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
      role="group"
      aria-label="Share this demo"
    >
      <span className="text-xs uppercase tracking-widest text-foreground/70 font-semibold mr-1">
        Share this demo:
      </span>
      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${t.label}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 bg-[hsl(0_0%_10%)] text-foreground/90 hover:text-foreground hover:border-[hsl(78,30%,45%)]/60 hover:bg-[hsl(0_0%_12%)] transition-all duration-200 text-xs font-medium"
        >
          <t.icon size={13} strokeWidth={1.85} className="text-[hsl(78,32%,72%)]" />
          {t.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy share link"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[hsl(78,30%,45%)]/50 bg-[hsl(78_36%_35%/0.10)] text-foreground hover:bg-[hsl(78_36%_35%/0.18)] transition-all duration-200 text-xs font-medium"
      >
        <LinkIcon size={13} strokeWidth={1.85} className="text-[hsl(78,32%,72%)]" />
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  );
}
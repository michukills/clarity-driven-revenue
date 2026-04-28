import { useState } from "react";
import { Facebook, Linkedin, Twitter, Mail, Link as LinkIcon, MessageCircle, Share2 } from "lucide-react";

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
    label: "X (Twitter)",
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

export default function ShareDemo() {
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
    <div className="max-w-3xl mx-auto rounded-2xl border border-border/50 bg-card/40 px-6 py-8 md:px-10 md:py-10 text-center">
      <p className="text-xs uppercase tracking-widest text-[hsl(78,24%,60%)] font-semibold mb-3">
        Share this demo
      </p>
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-3">
        Share this demo
      </h2>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto mb-7">
        Show someone what it looks like when a business runs with a system
        instead of reacting to problems.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {targets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${t.label}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-border/60 bg-[hsl(0_0%_10%)] text-foreground/90 hover:text-foreground hover:border-[hsl(78,30%,45%)]/60 hover:bg-[hsl(0_0%_12%)] transition-all duration-200 text-xs md:text-sm font-medium"
          >
            <t.icon size={15} strokeWidth={1.75} className="text-[hsl(78,28%,68%)]" />
            {t.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          aria-label="Copy share link"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-[hsl(78,30%,45%)]/50 bg-[hsl(78_36%_35%/0.08)] text-foreground hover:bg-[hsl(78_36%_35%/0.14)] transition-all duration-200 text-xs md:text-sm font-medium"
        >
          <LinkIcon size={15} strokeWidth={1.75} className="text-[hsl(78,28%,68%)]" />
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/70 mt-5">
        Link: revenueandgrowthsystems.com/demo
      </p>
    </div>
  );
}
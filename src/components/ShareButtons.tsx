import { Linkedin, Mail, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  url?: string;
}

const ShareButtons = ({ title, url }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">Share</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin size={16} />
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedUrl}`}
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="Share via email"
      >
        <Mail size={16} />
      </a>
      <button
        onClick={copyLink}
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="Copy link"
      >
        {copied ? (
          <span className="text-xs text-primary">Copied</span>
        ) : (
          <LinkIcon size={16} />
        )}
      </button>
    </div>
  );
};

export default ShareButtons;

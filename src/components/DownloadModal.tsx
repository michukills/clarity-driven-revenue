import { useState } from "react";
import { X, Download, Check } from "lucide-react";

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
}

const DownloadModal = ({ open, onClose }: DownloadModalProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && name.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="text-primary" size={24} />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              Download ready
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your copy of the RGS Revenue Operating System™ Overview is ready.
            </p>
            <a
              href="/rgs-revenue-operating-system-overview.pdf"
              download
              className="btn-primary"
              onClick={onClose}
            >
              <Download size={16} />
              Download PDF
            </a>
          </div>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold text-foreground mb-1">
              Download the Overview
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              The RGS Revenue Operating System™ — our framework for building predictable revenue, summarized in one clean document.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dl-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  id="dl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="dl-email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="dl-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="input-field"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Get the Overview
              </button>
              <p className="text-xs text-muted-foreground text-center">
                No spam. We respect your time.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DownloadModal;

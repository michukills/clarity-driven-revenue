import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

interface EmailSubscribeFormProps {
  variant?: "inline" | "block";
}

const EmailSubscribeForm = ({ variant = "block" }: EmailSubscribeFormProps) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Check size={16} />
        <span>You're subscribed. We'll be in touch.</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="input-field flex-1 text-sm"
        />
        <button type="submit" className="btn-primary px-4 py-2.5">
          Subscribe
        </button>
      </form>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        Get practical revenue system insights for trade business owners. No hype. No spam.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary px-5 py-2.5">
          Subscribe
          <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
};

export default EmailSubscribeForm;

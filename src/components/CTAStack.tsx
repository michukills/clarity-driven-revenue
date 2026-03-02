import { Link } from "react-router-dom";
import { ArrowRight, Download } from "lucide-react";

interface CTAStackProps {
  onDownloadClick: () => void;
}

const CTAStack = ({ onDownloadClick }: CTAStackProps) => {
  return (
    <div className="border-t border-border pt-12 mt-16 space-y-6">
      <h3 className="font-display text-xl font-semibold text-foreground">
        What to do next
      </h3>

      <Link to="/contact" className="btn-primary w-full sm:w-auto">
        Schedule Your Revenue Systems Review
        <ArrowRight size={16} />
      </Link>

      <div>
        <button
          onClick={onDownloadClick}
          className="btn-outline w-full sm:w-auto"
        >
          <Download size={16} />
          Download the Revenue System Overview
        </button>
      </div>

      <div>
        <Link
          to="/insights"
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          Subscribe for Insights →
        </Link>
      </div>
    </div>
  );
};

export default CTAStack;

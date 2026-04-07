const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Inquiry";

const Footer = () => {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Revenue &amp; Growth Systems LLC
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Stable businesses run on systems, not guesswork.
            </p>
          </div>
          <a
            href={mailtoLink}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            info@revenueandgrowthsystems.com
          </a>
        </div>
        <div className="mt-6 pt-4 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Revenue &amp; Growth Systems LLC. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

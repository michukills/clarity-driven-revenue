import Navbar from "./Navbar";
import Footer from "./Footer";
import StickyCTA from "./StickyCTA";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* pb keeps page content above the fixed StickyCTA so it never sits
          on top of in-page actions; Footer adds its own bottom padding to
          keep the legal links row visible. */}
      <main className="flex-1 pt-16 pb-24">{children}</main>
      <Footer />
      <StickyCTA />
    </div>
  );
};

export default Layout;

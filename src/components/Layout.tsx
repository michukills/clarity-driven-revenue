import Navbar from "./Navbar";
import Footer from "./Footer";
import StickyCTA from "./StickyCTA";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 pb-24">{children}</main>
      <Footer />
      <StickyCTA />
    </div>
  );
};

export default Layout;

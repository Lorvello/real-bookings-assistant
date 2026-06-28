
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation(["notFound", "app"]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // F-036: /404 (path="*") wraps no DashboardLayout, so the F-035 title effect never
  // runs here and the page previously set no document.title, leaving the browser tab
  // on whatever the prior page left (or the index.html default). Mirror the F-035
  // app-peer pattern: an i18n page title + the shared `app.documentTitleSuffix` brand
  // suffix, following the EN<->NL toggle (`t` identity flips on changeLanguage).
  useEffect(() => {
    const suffix = t("app.documentTitleSuffix", { ns: "app", defaultValue: "Bookings Assistant" });
    document.title = `${t("notFound.documentTitle", "Page Not Found")} | ${suffix}`;
  }, [t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] px-4 text-white">
      <main className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-white/45 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-white mb-2">
            {t("notFound.title", "Page Not Found")}
          </h2>
          <p className="text-white/60 mb-8">
            {t("notFound.description", "The page you are looking for does not exist or has been moved.")}
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              {t("notFound.backHome", "Back to Home")}
            </Link>
          </Button>

          <Button variant="outline" asChild className="w-full">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("notFound.goDashboard", "Go to Dashboard")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;

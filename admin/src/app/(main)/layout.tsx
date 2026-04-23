import { Home } from "lucide-react";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site.config";
import { NavigationLinks } from "./layout/navigation-links";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {siteConfig.siteName} Admin
                </h1>
              </div>
            </div>
          </div>

          <NavigationLinks />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <main>{children}</main>
      </div>
    </div>
  );
}

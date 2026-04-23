import type { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relative max-w-[700px] mx-auto md:mt-24 sm:shadow-lg">
      {children}
    </div>
  );
}

"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/ui/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-cream">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}

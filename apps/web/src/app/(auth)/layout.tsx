import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Image src="/logo.png" alt="Chiavi" width={360} height={100} className="h-24 w-auto" />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <div className="mt-12 flex flex-col items-center gap-2">
        <p className="text-sm text-navy-light/50">
          &copy; 2026 Chiavi. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-navy-light/40">
          <a href="/privacy" className="hover:text-gold transition">Privacy Policy</a>
          <span>&middot;</span>
          <a href="/terms" className="hover:text-gold transition">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

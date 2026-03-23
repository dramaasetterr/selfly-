import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Image src="/logo.png" alt="Chiavo" width={360} height={100} className="h-24 w-auto" />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-12 text-sm text-navy-light/50">
        &copy; 2026 Chiavo. All rights reserved.
      </p>
    </div>
  );
}

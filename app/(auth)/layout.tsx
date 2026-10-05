import { MapPin } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">SORSOVENT</span>
          </Link>
        </div>
      </header>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

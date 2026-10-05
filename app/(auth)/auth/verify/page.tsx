import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyPage({ searchParams }: { searchParams: { error?: string } }) {
  if (searchParams.error) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-sm text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Verification Failed</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {searchParams.error}
        </p>
        <Link href="/auth/login" className="block w-full">
          <Button variant="outline" className="w-full">Return to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-sm text-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
        <p className="text-muted-foreground text-sm">
          Please wait while we verify your account.
        </p>
      </div>
    </div>
  );
}

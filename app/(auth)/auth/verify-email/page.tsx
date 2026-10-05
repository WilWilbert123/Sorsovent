import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-sm text-center">
      <div className="flex flex-col items-center mb-8">
        <div className="p-3 bg-primary/10 rounded-full mb-4">
          <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm mt-2">
          We've sent a verification link to your email address. Please click the link to verify your account and continue to Sorsovent.
        </p>
      </div>

      <div className="space-y-4">
        <Link href="/auth/login" className="block w-full">
          <Button className="w-full">Return to login</Button>
        </Link>
      </div>
    </div>
  );
}

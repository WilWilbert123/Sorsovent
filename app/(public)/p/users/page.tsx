import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicUsersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Users className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Sorsovent Community</h1>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Join thousands of locals sharing experiences, discovering events, and building community in Sorsogon.
      </p>
      
      <div className="bg-card border rounded-2xl p-8 max-w-md w-full shadow-sm mb-8">
        <h2 className="font-semibold mb-2">Member Directory</h2>
        <p className="text-sm text-muted-foreground mb-6">
          To protect user privacy, the community directory is only visible to registered members.
        </p>
        <Link href="/auth/login" className="block w-full">
          <Button className="w-full">Sign In to Connect</Button>
        </Link>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Don't have an account? <Link href="/auth/register" className="text-primary hover:underline font-medium">Join Sorsovent today</Link>
      </div>
    </div>
  );
}

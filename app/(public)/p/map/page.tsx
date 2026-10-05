import { Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicMapPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <MapIcon className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Interactive Map</h1>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Discover events, communities, and local businesses around Sorsogon on our interactive map.
      </p>
      
      <div className="bg-card border rounded-2xl p-8 max-w-md w-full shadow-sm mb-8">
        <h2 className="font-semibold mb-2">Sign in to unlock</h2>
        <p className="text-sm text-muted-foreground mb-6">
          To protect the privacy of our community members, the interactive map is only available to registered users.
        </p>
        <Link href="/auth/login" className="block w-full">
          <Button className="w-full">Sign In to View Map</Button>
        </Link>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Don't have an account? <Link href="/auth/register" className="text-primary hover:underline font-medium">Join Sorsovent today</Link>
      </div>
    </div>
  );
}

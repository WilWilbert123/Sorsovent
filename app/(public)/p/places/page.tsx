import { MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicPlacesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <MapPin className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Local Places Directory</h1>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Explore popular spots, local businesses, and community hubs in Sorsogon.
      </p>
      
      <div className="bg-card border rounded-2xl p-8 max-w-md w-full shadow-sm mb-8">
        <h2 className="font-semibold mb-2">Member Feature</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The places directory and reviews are available exclusively to Sorsovent members.
        </p>
        <Link href="/auth/login" className="block w-full">
          <Button className="w-full">Sign In to View Places</Button>
        </Link>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Don't have an account? <Link href="/auth/register" className="text-primary hover:underline font-medium">Join Sorsovent today</Link>
      </div>
    </div>
  );
}

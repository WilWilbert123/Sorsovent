import { MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicPlaceDetailsPage({ params }: { params: { placeId: string } }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <MapPin className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Place Details</h1>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Detailed information, reviews, and upcoming events at this location.
      </p>
      
      <div className="bg-card border rounded-2xl p-8 max-w-md w-full shadow-sm mb-8">
        <h2 className="font-semibold mb-2">Member Exclusive</h2>
        <p className="text-sm text-muted-foreground mb-6">
          To view full details, read reviews, and see who's currently checked in, please sign in.
        </p>
        <Link href={`/auth/login?next=/places/${params.placeId}`} className="block w-full">
          <Button className="w-full">Sign In to View Place</Button>
        </Link>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <Link href="/places" className="text-muted-foreground hover:text-foreground">
          ← Back to Places Directory
        </Link>
      </div>
    </div>
  );
}

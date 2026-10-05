import { MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full relative flex flex-col">
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-4 py-2 rounded-xl shadow-md border font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Sorsogon Interactive Map
      </div>

      <div className="flex-1 bg-muted relative flex items-center justify-center p-4">
        {/* Fallback pattern for map */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 bg-background p-8 rounded-2xl shadow-xl max-w-md text-center border">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Map Integration Pending</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            The interactive map requires a valid Mapbox access token. Once configured by the system administrator (`NEXT_PUBLIC_MAPBOX_TOKEN`), this view will render the live community map of Sorsogon.
          </p>
          <Button variant="outline" className="w-full">
            Return to Explore
          </Button>
        </div>
      </div>
    </div>
  );
}

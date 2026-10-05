import Link from "next/link";
import { MapPin, CalendarDays, Users, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">SORSOVENT</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium hover:text-primary">Home</Link>
            <Link href="/explore" className="text-sm font-medium hover:text-primary text-muted-foreground">Explore</Link>
            <Link href="/map" className="text-sm font-medium hover:text-primary text-muted-foreground">Map</Link>
            <Link href="/events" className="text-sm font-medium hover:text-primary text-muted-foreground">Events</Link>
            <Link href="/places" className="text-sm font-medium hover:text-primary text-muted-foreground">Places</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background/5 -z-10" />
          <div className="container px-4 md:px-6 flex flex-col items-center text-center">
            <Badge variant="outline" className="mb-4">Welcome to Sorsogon</Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mb-6">
              Discover what's happening <span className="text-primary">around you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
              Events. People. Places. Community. All connected by location.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/explore">
                <Button size="lg" className="w-full sm:w-auto group">
                  Explore Events
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/map">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Map
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="py-20 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
              <div className="flex flex-col items-center md:items-start p-6 bg-card rounded-2xl border shadow-sm">
                <div className="p-3 bg-primary/10 text-primary rounded-xl mb-4">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create Events</h3>
                <p className="text-muted-foreground">Host your own events and invite the local community to join.</p>
              </div>
              <div className="flex flex-col items-center md:items-start p-6 bg-card rounded-2xl border shadow-sm">
                <div className="p-3 bg-primary/10 text-primary rounded-xl mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Meet People</h3>
                <p className="text-muted-foreground">Connect with others who share your interests through event group chats.</p>
              </div>
              <div className="flex flex-col items-center md:items-start p-6 bg-card rounded-2xl border shadow-sm">
                <div className="p-3 bg-primary/10 text-primary rounded-xl mb-4">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Discover Places</h3>
                <p className="text-muted-foreground">Find popular spots, hidden gems, and trending locations nearby.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-card">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">SORSOVENT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sorsovent. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ className, variant, children }: any) {
  return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">{children}</div>
}

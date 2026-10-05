import { MapPin, Users, CalendarDays, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          About Sorsovent
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The premier geo-social networking and event discovery platform designed specifically for the Sorsogon community.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <h2 className="text-3xl font-bold mb-4">Connecting our community</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Sorsovent was built with a simple mission: to make it easier for people in Sorsogon to connect, discover local events, and build meaningful relationships within their community. 
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Whether you're looking for weekend activities, wanting to join local interest groups, or hoping to stay updated with your neighborhood, Sorsovent brings it all together in one beautiful, easy-to-use platform.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            <CalendarDays className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Discover Events</h3>
            <p className="text-sm text-muted-foreground">Find local happenings and activities</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border shadow-sm mt-8">
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Build Community</h3>
            <p className="text-sm text-muted-foreground">Connect with neighbors and friends</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border shadow-sm -mt-8">
            <MapPin className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Explore Sorsogon</h3>
            <p className="text-sm text-muted-foreground">Interactive maps of places and spots</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            <ShieldCheck className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Privacy First</h3>
            <p className="text-sm text-muted-foreground">Secure and private location data</p>
          </div>
        </div>
      </div>
      
      <div className="bg-primary/5 rounded-3xl p-8 md:p-12 text-center border border-primary/10">
        <h2 className="text-2xl font-bold mb-4">Built with Modern Technology</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Sorsovent is engineered using Next.js, Supabase, and Tailwind CSS to ensure a lightning-fast, secure, and fully responsive experience on both mobile and desktop devices.
        </p>
      </div>
    </div>
  );
}

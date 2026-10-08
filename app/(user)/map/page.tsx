"use client";

import { useState } from "react";
import { MapPin, Navigation, Compass, Layers } from "lucide-react";
import { MapView } from "@/components/map/map-view";
import { SORSOGON_FEATURED_LOCATIONS, SORSOGON_CENTER } from "@/lib/map/mapbox";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeCenter, setActiveCenter] = useState(SORSOGON_CENTER);
  const [activeZoom, setActiveZoom] = useState(11);

  const categories = ["All", "Beach", "Nature", "Adventure", "Government"];

  const filteredLocations =
    selectedCategory === "All"
      ? SORSOGON_FEATURED_LOCATIONS
      : SORSOGON_FEATURED_LOCATIONS.filter((loc) => loc.category === selectedCategory);

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row relative bg-background overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-card p-4 flex flex-col gap-4 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base">Sorsogon Live Map</h1>
            <p className="text-xs text-muted-foreground">OpenStreetMap Navigation</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Categories
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Spots List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Featured Locations ({filteredLocations.length})
          </label>
          {filteredLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setActiveCenter({ lat: loc.lat, lng: loc.lng });
                setActiveZoom(13);
              }}
              className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {loc.name}
                </p>
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {loc.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc.description}</p>
            </button>
          ))}
        </div>

        {/* Reset View Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => {
            setActiveCenter(SORSOGON_CENTER);
            setActiveZoom(11);
          }}
        >
          <Navigation className="h-3.5 w-3.5" /> Reset Map View
        </Button>
      </div>

      {/* Map Display Container */}
      <div className="flex-1 h-full min-h-[400px] relative">
        <MapView locations={filteredLocations} center={activeCenter} zoom={activeZoom} />
      </div>
    </div>
  );
}

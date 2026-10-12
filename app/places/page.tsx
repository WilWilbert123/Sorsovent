"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Search,
  Compass,
  Trees,
  Waves,
  Coffee,
  Calendar,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface PlaceItem {
  id: string;
  name: string;
  municipality: string;
  category: "eco" | "beaches" | "cafes" | "culture";
  categoryLabel: string;
  description: string;
  lat: number;
  lng: number;
  tag: string;
  image: string;
}

const PLACES_DATA: PlaceItem[] = [
  // Eco Parks & Nature
  {
    id: "bulusan-lake",
    name: "Bulusan Lake & National Park",
    municipality: "Bulusan",
    category: "eco",
    categoryLabel: "Eco Park",
    description: "Serene emerald crater lake at the foot of Mt. Bulusan volcano with rainforest trails and kayaking.",
    lat: 12.7528,
    lng: 124.095,
    tag: "National Park",
    image: "/places/bulusan-lake.jpg",
  },
  {
    id: "prieto-diaz-mangrove",
    name: "Prieto Diaz Mangrove Eco-Park",
    municipality: "Prieto Diaz",
    category: "eco",
    categoryLabel: "Eco Park",
    description: "Award-winning protected mangrove sanctuary featuring long bamboo boardwalks and birdwatching.",
    lat: 13.0458,
    lng: 124.1917,
    tag: "Conservation",
    image: "/places/mangrove.jpg",
  },
  {
    id: "irosin-hot-springs",
    name: "Irosin Mateo Hot & Cold Springs",
    municipality: "Irosin",
    category: "eco",
    categoryLabel: "Hot Springs",
    description: "Therapeutic volcanic mineral spring pools surrounded by lush mountain scenery in the caldera.",
    lat: 12.7056,
    lng: 124.0319,
    tag: "Wellness",
    image: "/places/hot-springs.jpg",
  },
  {
    id: "rompeolas-baywalk",
    name: "Rompeolas (Sorsogon Baywalk)",
    municipality: "Sorsogon City",
    category: "eco",
    categoryLabel: "Baywalk",
    description: "Picturesque waterfront promenade along Sorsogon Bay, famous for sunsets and open sea breezes.",
    lat: 12.9698,
    lng: 124.0068,
    tag: "Scenic Promenade",
    image: "/places/baywalk.jpg",
  },
  {
    id: "casiguran-bayfront",
    name: "Casiguran Bayfront & Park",
    municipality: "Casiguran",
    category: "eco",
    categoryLabel: "Bayfront",
    description: "Peaceful coastal reserve offering panoramic views across Sorsogon Bay towards Mt. Bulusan.",
    lat: 12.8719,
    lng: 124.0083,
    tag: "Coastal Park",
    image: "/places/bulusan-lake.jpg",
  },

  // Beaches & Surfing
  {
    id: "subic-beach-matnog",
    name: "Subic Pink Sand Beach",
    municipality: "Matnog",
    category: "beaches",
    categoryLabel: "Beach",
    description: "World-famous crushed red coral beach with soft pinkish sand, crystal turquoise waters, and marine sanctuaries.",
    lat: 12.5858,
    lng: 124.0863,
    tag: "Pink Sand",
    image: "/places/pink-beach.jpg",
  },
  {
    id: "gubat-surfing-beach",
    name: "Gubat Surfing Beach (Rizal Beach)",
    municipality: "Gubat",
    category: "beaches",
    categoryLabel: "Surfing",
    description: "Premier surf destination with consistent Pacific swells, friendly surf instructors, and beach camps.",
    lat: 12.9167,
    lng: 124.125,
    tag: "Surf Spot",
    image: "/places/pink-beach.jpg",
  },
  {
    id: "paguriran-island",
    name: "Paguriran Island & Lagoon",
    municipality: "Bacon District",
    category: "beaches",
    categoryLabel: "Lagoon",
    description: "A natural coral-walled saltwater swimming pool enclosed by rocky formations rising from white sand shores.",
    lat: 12.8942,
    lng: 123.9575,
    tag: "Natural Pool",
    image: "/places/pink-beach.jpg",
  },
  {
    id: "bacon-boardwalk",
    name: "Bacon Boardwalk & Beach",
    municipality: "Bacon District",
    category: "beaches",
    categoryLabel: "Beach",
    description: "Breezy Pacific oceanfront boardwalk lined with coconut palms and community swim spots.",
    lat: 13.0381,
    lng: 124.0397,
    tag: "Boardwalk",
    image: "/places/baywalk.jpg",
  },
  {
    id: "sta-magdalena-beach",
    name: "Sta. Magdalena Beach Park",
    municipality: "Sta. Magdalena",
    category: "beaches",
    categoryLabel: "Beach",
    description: "Quiet southern beaches overlooking the San Bernardino Strait with crystal clear swimming waters.",
    lat: 12.6469,
    lng: 124.1083,
    tag: "Secluded Shore",
    image: "/places/pink-beach.jpg",
  },

  // Cafes & Dining
  {
    id: "rompeolas-cafes",
    name: "Rompeolas Seaside Cafes & Food Park",
    municipality: "Sorsogon City",
    category: "cafes",
    categoryLabel: "Food & Cafe",
    description: "Vibrant seaside promenade lined with local coffee pop-ups, grilled seafood, and street delicacies.",
    lat: 12.9698,
    lng: 124.0068,
    tag: "Sunset Dining",
    image: "/places/cafe.jpg",
  },
  {
    id: "casa-dominga",
    name: "Casa Dominga Bicolano Heritage Dining",
    municipality: "Sorsogon City",
    category: "cafes",
    categoryLabel: "Restaurant",
    description: "Celebrated heritage restaurant serving authentic Bicol express, laing, and signature pili desserts.",
    lat: 12.974,
    lng: 124.005,
    tag: "Heritage Cuisine",
    image: "/places/cafe.jpg",
  },
  {
    id: "gubat-surf-shack",
    name: "Gubat Surf Break Cafes",
    municipality: "Gubat",
    category: "cafes",
    categoryLabel: "Cafe",
    description: "Laid-back beachside cafes offering artisan pour-overs, smoothie bowls, and fresh local fruit juices.",
    lat: 12.9167,
    lng: 124.125,
    tag: "Beach Cafe",
    image: "/places/cafe.jpg",
  },
  {
    id: "pili-haven-hub",
    name: "Sorsogon Pili Delicacies & Coffee Hub",
    municipality: "Sorsogon City",
    category: "cafes",
    categoryLabel: "Specialty Cafe",
    description: "Specialty artisan coffee house pairing local native beans with fresh honey-glazed and roasted pili nuts.",
    lat: 12.972,
    lng: 124.002,
    tag: "Pili Delicacies",
    image: "/places/cafe.jpg",
  },

  // Culture & Heritage
  {
    id: "barcelona-church",
    name: "Barcelona Church & Ruins Plaza",
    municipality: "Barcelona",
    category: "culture",
    categoryLabel: "Historical",
    description: "Historic 1874 Spanish church constructed from coral stone and egg whites overlooking the Pacific Ocean.",
    lat: 12.8681,
    lng: 124.1419,
    tag: "1874 Landmark",
    image: "/places/church.jpg",
  },
  {
    id: "donsol-whale-shark",
    name: "Donsol Whale Shark Interaction Center",
    municipality: "Donsol",
    category: "culture",
    categoryLabel: "Ecotourism",
    description: "World-renowned pioneer hub for ethical, responsible encounters with gentle giant whale sharks (Butanding).",
    lat: 12.9073,
    lng: 123.6033,
    tag: "Ecotourism",
    image: "/places/mangrove.jpg",
  },
  {
    id: "juban-heritage",
    name: "Juban Heritage Houses",
    municipality: "Juban",
    category: "culture",
    categoryLabel: "Heritage",
    description: "Rows of well-preserved Spanish-colonial 'bahay na bato' ancestral homes along the national highway.",
    lat: 12.8469,
    lng: 123.9936,
    tag: "Ancestral Homes",
    image: "/places/church.jpg",
  },
  {
    id: "sorsogon-capitol",
    name: "Sorsogon Provincial Capitol & Park",
    municipality: "Sorsogon City",
    category: "culture",
    categoryLabel: "Landmark",
    description: "The historic neoclassical provincial capitol building set within manicured gardens and water fountains.",
    lat: 12.9743,
    lng: 124.0044,
    tag: "Provincial Center",
    image: "/places/baywalk.jpg",
  },
];

function PlacesView() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category")?.toLowerCase() || "all";

  // Normalize initial category
  const normalizedCategory = useMemo(() => {
    if (initialCategoryParam.startsWith("eco") || initialCategoryParam === "nature") return "eco";
    if (initialCategoryParam.startsWith("beach")) return "beaches";
    if (initialCategoryParam.startsWith("cafe") || initialCategoryParam === "food") return "cafes";
    if (initialCategoryParam.startsWith("cultur") || initialCategoryParam === "history") return "culture";
    return "all";
  }, [initialCategoryParam]);

  const [activeCategory, setActiveCategory] = useState<string>(normalizedCategory);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlaces = useMemo(() => {
    return PLACES_DATA.filter((place) => {
      const matchesCategory =
        activeCategory === "all" || place.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset horizontal scroll when category or search changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [activeCategory, searchQuery]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Navigation Header */}
      <header className="shrink-0 h-14 w-full border-b border-border/50 bg-background/80 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="font-bold text-base sm:text-xl tracking-tight">SORSOVENT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/map"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Map
            </Link>
            <Link
              href="/events"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/places"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-foreground bg-muted/60 transition-colors"
            >
              Places
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="icon" />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="text-xs sm:text-sm shadow-xs font-semibold">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Arena */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col justify-between items-center overflow-hidden">
        {/* Simple & Clean Header & Filters Toolbar */}
        <div className="w-full max-w-2xl mx-auto text-center shrink-0 pt-0.5 sm:pt-1">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] sm:text-xs font-semibold mb-1 shadow-2xs">
            <Compass className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />
            <span>14 Municipalities of Sorsogon</span>
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight">
            Discover Places &{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Hidden Gems
            </span>
          </h1>

          {/* Clean Subtitle */}
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground max-w-md mx-auto mt-0.5 sm:mt-1 leading-snug line-clamp-2">
            From volcanic crater lakes and pink sand beaches to seaside cafes and colonial landmarks.
          </p>

          {/* Clean Search Input */}
          <div className="relative max-w-md w-full mx-auto mt-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search places or municipality (Bulusan, Matnog, Gubat)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 sm:h-8.5 pl-9 pr-4 rounded-full bg-card/80 dark:bg-card/50 border border-border/80 dark:border-white/10 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-emerald-500/30 text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          {/* Clean Minimalist Category Tabs */}
          <div className="relative w-full max-w-lg mx-auto mt-2">
            <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-2">
              <button
                onClick={() => setActiveCategory("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 dark:border-white/10"
                  }`}
              >
                <Compass className="h-3 w-3" />
                <span>All Spots</span>
              </button>

              <button
                onClick={() => setActiveCategory("eco")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${activeCategory === "eco"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 dark:border-white/10"
                  }`}
              >
                <Trees className="h-3 w-3 text-emerald-500" />
                <span>Eco Parks</span>
              </button>

              <button
                onClick={() => setActiveCategory("beaches")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${activeCategory === "beaches"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 dark:border-white/10"
                  }`}
              >
                <Waves className="h-3 w-3 text-cyan-500" />
                <span>Beaches</span>
              </button>

              <button
                onClick={() => setActiveCategory("cafes")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${activeCategory === "cafes"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 dark:border-white/10"
                  }`}
              >
                <Coffee className="h-3 w-3 text-amber-500" />
                <span>Cafes</span>
              </button>

              <button
                onClick={() => setActiveCategory("culture")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${activeCategory === "culture"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 dark:border-white/10"
                  }`}
              >
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span>Culture</span>
              </button>
            </div>
          </div>
        </div>

        {/* Floating Cards Arena (Centered Vertically to Fill Screen Naturally without Dead Space) */}
        <div className="flex-1 min-h-0 w-full flex flex-col justify-center items-center relative my-auto">
          {/* Subtle Mobile Edge Fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background via-background/40 to-transparent z-20 sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background via-background/40 to-transparent z-20 sm:hidden" />

          {/* Previous Glide Button (Desktop) */}
          {filteredPlaces.length > 5 && (
            <button
              onClick={() =>
                scrollContainerRef.current?.scrollBy({ left: -340, behavior: "smooth" })
              }
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-card/90 border border-border/80 shadow-md backdrop-blur-md hover:bg-muted text-foreground transition-all cursor-pointer hidden sm:flex items-center justify-center active:scale-95"
              aria-label="Previous places"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Next Glide Button (Desktop) */}
          {filteredPlaces.length > 5 && (
            <button
              onClick={() =>
                scrollContainerRef.current?.scrollBy({ left: 340, behavior: "smooth" })
              }
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-card/90 border border-border/80 shadow-md backdrop-blur-md hover:bg-muted text-foreground transition-all cursor-pointer hidden sm:flex items-center justify-center active:scale-95"
              aria-label="Next places"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Horizontal Floating Cards Track */}
          <div
            ref={scrollContainerRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="w-full flex items-center overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-[8vw] sm:px-8 py-2"
          >
            {filteredPlaces.length === 0 ? (
              <div className="text-center py-6 px-5 bg-card/60 border border-dashed border-border/80 rounded-2xl max-w-sm mx-auto animate-in fade-in">
                <div className="p-2 bg-muted rounded-xl w-fit mx-auto mb-2 text-muted-foreground">
                  <Compass className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">No places found</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Try a different search keyword or category.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs rounded-xl h-7"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3.5 sm:gap-4.5 lg:gap-6 flex-nowrap py-1 sm:py-3 ${filteredPlaces.length <= 4
                  ? "mx-auto justify-center"
                  : "justify-start"
                  }`}
              >
                {filteredPlaces.map((place, idx) => {
                  // Cyclic Stagger: Left side down, right side up across each 5-item wave (Desktop only)
                  const cycle = idx % 5;
                  const slope = Math.round((2 - cycle) * 4); // +8px (left) to -8px (right)
                  const altWave = idx % 2 === 0 ? 3 : -3;
                  const staggerY = slope + altWave;
                  const floatAnim = `animate-float-${(idx % 4) + 1}`;

                  return (
                    <div
                      key={place.id}
                      style={{
                        ["--stagger" as any]: `${staggerY}px`,
                      }}
                      className="shrink-0 transition-transform duration-300 snap-center sm:[transform:translateY(var(--stagger))]"
                    >
                      <div
                        className={`w-[80vw] max-w-[340px] h-[48vh] max-h-[420px] min-h-[290px] sm:h-52 sm:w-52 md:h-56 md:w-56 lg:h-60 lg:w-60 xl:h-64 xl:w-64 sm:aspect-square rounded-3xl border border-white/25 dark:border-white/15 shadow-md hover:shadow-2xl hover:scale-102 active:scale-98 transition-all duration-300 relative overflow-hidden group cursor-pointer sm:${floatAnim}`}
                      >
                        {/* Background Scenic Image */}
                        <img
                          src={place.image}
                          alt={place.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />

                        {/* Protective Dark Gradient Overlay for Maximum Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25 group-hover:via-black/35 transition-colors" />

                        {/* Card Content Overlay */}
                        <div className="relative z-10 h-full p-4 sm:p-4.5 flex flex-col justify-between text-white">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                              {place.categoryLabel}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-white/90 font-medium flex items-center gap-1 truncate max-w-[120px] sm:max-w-none drop-shadow-xs">
                              <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{place.municipality}</span>
                            </span>
                          </div>

                          {/* Middle / Lower Content: Title, Tag & Description */}
                          <div className="space-y-1.5 mt-auto mb-2">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] sm:text-[11px] text-white font-medium max-w-full border border-white/15">
                              <span className="truncate">{place.tag}</span>
                            </div>
                            <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug drop-shadow-md">
                              {place.name}
                            </h3>
                            <p className="text-[11px] sm:hidden text-white/85 line-clamp-2 leading-relaxed drop-shadow-xs">
                              {place.description}
                            </p>
                          </div>

                          {/* Bottom Action */}
                          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-white/60 sm:hidden">
                              Tap to inspect
                            </span>
                            <Link
                              href={`/map?lat=${place.lat}&lng=${place.lng}`}
                              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-300 hover:text-white group/btn transition-colors drop-shadow-xs ml-auto"
                            >
                              <span>View on Map</span>
                              <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform text-emerald-300" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Swipe Hint Micro-Indicator */}
          {filteredPlaces.length > 1 && (
            <div className="flex sm:hidden items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground/75 pt-1">
              <span>Swipe horizontally to view all {filteredPlaces.length} spots</span>
            </div>
          )}
        </div>
      </main>

      {/* Slim Footer */}
      <footer className="shrink-0 h-9 sm:h-10 w-full border-t border-border/40 bg-background/50 backdrop-blur-xs flex items-center z-20">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>&copy; {new Date().getFullYear()} Sorsovent. All rights reserved.</span>
          </div>
          <Link href="/" className="hover:text-foreground text-primary font-medium transition-colors">
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function PlacesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading places...
        </div>
      }
    >
      <PlacesView />
    </Suspense>
  );
}

"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/explore?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        placeholder="Search Sorsovent..."
        className="w-full h-10 pl-9 pr-4 rounded-full border bg-muted/50 focus:bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}

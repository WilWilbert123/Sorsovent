export function getCategoryEmoji(category?: string, name?: string): string {
  const text = `${category || ""} ${name || ""}`.toLowerCase();
  if (text.includes("basket") || text.includes("hoop")) return "🏀";
  if (text.includes("soccer") || text.includes("footbal")) return "⚽";
  if (text.includes("sport") || text.includes("fit") || text.includes("run") || text.includes("marathon")) return "🏆";
  if (text.includes("music") || text.includes("concert") || text.includes("band") || text.includes("sing")) return "🎵";
  if (text.includes("food") || text.includes("dine") || text.includes("eat") || text.includes("festival")) return "🍔";
  if (text.includes("art") || text.includes("paint") || text.includes("exhibit")) return "🎨";
  if (text.includes("tech") || text.includes("code") || text.includes("hack") || text.includes("startup")) return "💻";
  if (text.includes("night") || text.includes("party") || text.includes("bar")) return "🍻";
  if (text.includes("community") || text.includes("volunte") || text.includes("meetup")) return "👥";
  if (text.includes("outdoor") || text.includes("hike") || text.includes("camp") || text.includes("beach")) return "🏖️";
  if (text.includes("game") || text.includes("esport")) return "🎮";
  return "📍";
}

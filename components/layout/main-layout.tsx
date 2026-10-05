export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 w-full max-w-screen-2xl mx-auto">
        {children}
      </main>
    </div>
  );
}

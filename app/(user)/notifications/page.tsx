import { BellOff } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-2xl bg-card">
        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <BellOff className="h-10 w-10 text-primary opacity-60" />
        </div>
        <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          You don't have any new notifications. When someone interacts with your posts, follows you, or an event you're attending has updates, you'll see them here.
        </p>
      </div>
    </div>
  );
}

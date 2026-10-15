import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Event",
  description: "Create a new event on Mingle",
};

export default function CreateEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

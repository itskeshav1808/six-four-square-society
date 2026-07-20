import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicHeader, PublicFooter } from "@/components/public-chrome";
import { ChessBackground } from "@/components/chess-background";
import { AnthemPlayer } from "@/components/anthem-player";

export const Route = createFileRoute("/_public")({
  component: () => (
    <div className="min-h-screen flex flex-col relative">
      <ChessBackground />
      <PublicHeader />
      <main className="flex-1"><Outlet /></main>
      <PublicFooter />
      <AnthemPlayer />
    </div>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { featuredTournamentQuery, sponsorsQuery, mediaQuery } from "@/lib/supabase-queries";
import { siteContentAllQuery, makeCms } from "@/lib/home-content";
import { HomeHero } from "@/components/home/hero";
import { AboutAct } from "@/components/home/about-act";
import { Pillars } from "@/components/home/pillars";
import { Journey } from "@/components/home/journey";
import { Prizes } from "@/components/home/prizes";
import { GalleryShowcase } from "@/components/home/gallery-showcase";
import { Closing } from "@/components/home/closing";
import { SponsorRibbon } from "@/components/sponsor-ribbon";
import { ScrollProgress } from "@/components/scroll-progress";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "64 Squares Society — Premier Chess Tournaments in India" },
      {
        name: "description",
        content:
          "Rated chess tournaments, live standings, transparent prizes and a community built for the long game. Register for the next 64 Squares Society event.",
      },
      { property: "og:title", content: "64 Squares Society — Every Move Matters" },
      {
        property: "og:description",
        content: "Premier chess tournaments, live standings, and a community built for the long game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredTournamentQuery);
    context.queryClient.ensureQueryData(siteContentAllQuery);
    context.queryClient.ensureQueryData(sponsorsQuery);
    context.queryClient.ensureQueryData(mediaQuery);
  },
  component: Home,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredTournamentQuery);
  const { data: content } = useSuspenseQuery(siteContentAllQuery);
  const { data: sponsors } = useSuspenseQuery(sponsorsQuery);
  const { data: media } = useSuspenseQuery(mediaQuery);
  const cms = makeCms(content);

  return (
    <div>
      <ScrollProgress />

      {/* Opening — cinematic stage + the essentials */}
      <HomeHero cms={cms} featured={featured} />

      {/* Development — who we are, in numbers */}
      <AboutAct cms={cms} />

      {/* Position — how we run events */}
      <Pillars cms={cms} />

      {/* Middlegame — the path from entry to champion */}
      <Journey cms={cms} />

      {/* Daily practice */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 rule-gold" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Practice</span>
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {cms.t("home_puzzle_heading", "Sharpen your calculation daily")}
          </h2>
        </div>
        <Reveal>
          <DailyPuzzle />
        </Reveal>
      </section>

      {/* Achievement — prizes */}
      <Prizes cms={cms} pool={Number(featured?.prize_pool ?? 0)} />

      {/* Gallery — signature showcase */}
      <GalleryShowcase cms={cms} media={media} />

      {/* Partners */}
      <SponsorRibbon
        sponsors={sponsors}
        label={cms.t("home_sponsors_label", "Backed by")}
        heading={cms.t("home_sponsors_heading", "Our partners")}
      />

      {/* Your move */}
      <Closing cms={cms} />
    </div>
  );
}

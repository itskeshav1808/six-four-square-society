import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { featuredTournamentQuery, siteContentQuery, sponsorsQuery, mediaQuery } from "@/lib/supabase-queries";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { Reveal } from "@/components/reveal";
import { JourneyTimeline } from "@/components/journey-timeline";
import { GalleryStrip } from "@/components/gallery-strip";
import { FinalMove } from "@/components/final-move";
import { OpeningHero } from "@/components/opening-hero";
import { DevelopmentSection } from "@/components/development-section";
import { FeaturedMatch } from "@/components/featured-match";
import { PrizePodium } from "@/components/prize-podium";
import { SponsorRibbon } from "@/components/sponsor-ribbon";
import { ScrollProgress } from "@/components/scroll-progress";
import { ActHeading } from "@/components/act";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "64 Squares Society — Premier Chess Tournaments in India" },
      {
        name: "description",
        content:
          "Rated chess tournaments, live standings, and a community built for the long game. Register for the next 64 Squares Society event.",
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
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_title"));
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_subtitle"));
    context.queryClient.ensureQueryData(sponsorsQuery);
    context.queryClient.ensureQueryData(mediaQuery);
  },
  component: Home,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredTournamentQuery);
  const { data: heroTitle } = useSuspenseQuery(siteContentQuery("home_hero_title"));
  const { data: heroSub } = useSuspenseQuery(siteContentQuery("home_hero_subtitle"));
  const { data: sponsors } = useSuspenseQuery(sponsorsQuery);

  return (
    <div>
      <ScrollProgress />

      {/* Act I — Opening */}
      <OpeningHero title={heroTitle?.title} subtitle={heroSub?.title} featured={featured} />

      {/* Act II — Development */}
      <DevelopmentSection />

      {/* Act III — Middlegame: the next event */}
      {featured && <FeaturedMatch featured={featured} />}

      {/* Act IV — The Attack: journey + puzzle */}
      <JourneyTimeline />

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <ActHeading
          index="IV."
          act="The Attack"
          move="!?"
          title={["Sharpen your", "calculation daily."]}
          blurb="A fresh tactical position every day — the same habit our champions keep."
        />
        <Reveal>
          <DailyPuzzle />
        </Reveal>
      </section>


      {/* Act V — Victory: prizes */}
      <PrizePodium pool={Number(featured?.prize_pool ?? 0)} />

      {/* Interlude — the arena */}
      <GalleryStrip />

      {/* Sponsors */}
      <SponsorRibbon sponsors={sponsors} />

      {/* Endgame */}
      <FinalMove />
    </div>
  );
}

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
import { ChessScrollBoard } from "@/components/chess-scroll-board";
import { SfxToggle } from "@/components/sfx-toggle";

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

/** Wrapper that tags a section for the scroll board's colour blending. */
function Scene({
  id,
  theme,
  children,
}: {
  id: string;
  theme: string;
  children: React.ReactNode;
}) {
  return (
    <div className="board-through" data-board-section={id} data-board-theme={theme}>
      {children}
    </div>
  );
}

function Home() {
  const { data: featured } = useSuspenseQuery(featuredTournamentQuery);
  const { data: content } = useSuspenseQuery(siteContentAllQuery);
  const { data: sponsors } = useSuspenseQuery(sponsorsQuery);
  const { data: media } = useSuspenseQuery(mediaQuery);
  const cms = makeCms(content);

  return (
    <div className="relative">
      <ScrollProgress />
      <ChessScrollBoard cms={cms} />
      <div className="fixed bottom-4 right-[7.5rem] z-40 flex items-center rounded-full glass px-1.5 py-1.5 shadow-lg">
        <SfxToggle />
      </div>

      {/* Opening — cinematic stage + the essentials */}
      <Scene id="hero" theme="dark">
        <HomeHero cms={cms} featured={featured} />
      </Scene>

      {/* Development — who we are, in numbers */}
      <Scene id="about" theme="cream">
        <AboutAct cms={cms} />
      </Scene>

      {/* Position — how we run events */}
      <Scene id="pillars" theme="green">
        <Pillars cms={cms} />
      </Scene>

      {/* Middlegame — the path from entry to champion */}
      <Scene id="journey" theme="green">
        <Journey cms={cms} />
      </Scene>

      {/* Daily practice */}
      <Scene id="puzzle" theme="cream">
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
      </Scene>

      {/* Achievement — prizes */}
      <Scene id="prizes" theme="dark">
        <Prizes cms={cms} pool={Number(featured?.prize_pool ?? 0)} />
      </Scene>

      {/* Gallery — signature showcase */}
      <Scene id="gallery" theme="dark">
        <GalleryShowcase cms={cms} media={media} />
      </Scene>

      {/* Partners */}
      <Scene id="sponsors" theme="cream">
        <SponsorRibbon
          sponsors={sponsors}
          label={cms.t("home_sponsors_label", "Backed by")}
          heading={cms.t("home_sponsors_heading", "Our partners")}
        />
      </Scene>

      {/* Your move */}
      <Scene id="closing" theme="dark">
        <Closing cms={cms} />
      </Scene>
    </div>
  );
}

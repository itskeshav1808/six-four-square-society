import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — 64 Squares Society" },
      { name: "description", content: "How 64 Squares Society collects, uses, and protects personal data of players, parents, and visitors." },
      { property: "og:title", content: "Privacy Policy — 64 Squares Society" },
      { property: "og:description", content: "How we handle your personal data, minors' data, and tournament media." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose-content">
      <div className="text-xs uppercase tracking-[0.2em] text-gold">Legal</div>
      <h1 className="mt-2 font-display text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-xl mt-6">1. Who we are</h2>
          <p>64 Squares Society ("we", "us") organises chess tournaments and community events. This policy explains what personal information we collect from players, parents/guardians of minor players, volunteers, sponsors and website visitors, and how we handle it.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">2. Information we collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Player details:</strong> full name, date of birth, gender, city/state, school, phone, email, ratings (FIDE / CDA / self-declared), and emergency contact.</li>
            <li><strong>Minor players (under 18):</strong> parent/guardian name and phone number, in addition to the player details above. Registration for junior categories requires a parent/guardian to submit and consent to this policy on the child's behalf.</li>
            <li><strong>Payment records:</strong> amount, method, transaction reference or uploaded proof link. We do not store card, UPI credentials, or bank passwords.</li>
            <li><strong>Event data:</strong> pairings, results, standings, check-in status, certificates issued.</li>
            <li><strong>Media:</strong> photographs and videos captured at our tournaments.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">3. How we use it</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Running tournaments — verification, pairings, standings, prize distribution, certificates.</li>
            <li>Communicating with players and parents about their registration, schedule changes and results.</li>
            <li>Publishing standings and player profiles on the public site so results are shareable.</li>
            <li>Sharing tournament photos and videos in our gallery, on our social media, and in event recaps.</li>
            <li>Improving our operations and events.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">4. Photos and videos from events</h2>
          <p>By registering for or attending a 64 Squares Society event, you acknowledge that photographs and video may be captured and used by us in our gallery, on our website, and on our social media channels to promote chess and future events. If you (or the parent/guardian of a minor player) do not want a specific image used, contact us at 64squaressociety@gmail.com and we will remove it from our published materials.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">5. Sharing with third parties</h2>
          <p>We do not sell personal data. We share only what's necessary with service providers who help us run the platform (hosting, database, email delivery, payment processing). Results and standings are public by design.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">6. Data retention</h2>
          <p>We keep player, registration, and result records to maintain tournament history and rating trends. You may request deletion of personal contact information by writing to us; historical results tied to your name may be retained as part of the public event record.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">7. Security</h2>
          <p>We use industry-standard hosting with row-level access controls. No system is perfectly secure — please use a unique password for your account and inform us immediately of any suspected unauthorised access.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">8. Contact</h2>
          <p>Questions or requests about this policy: <a className="underline" href="mailto:64squaressociety@gmail.com">64squaressociety@gmail.com</a>.</p>
        </section>
      </div>
    </article>
  );
}

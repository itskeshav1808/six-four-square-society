import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — 64 Squares Society" },
      { name: "description", content: "Terms of participation, code of conduct, refunds, and liability for 64 Squares Society tournaments." },
      { property: "og:title", content: "Terms & Conditions — 64 Squares Society" },
      { property: "og:description", content: "Terms of participation and code of conduct for our tournaments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-xs uppercase tracking-[0.2em] text-gold">Legal</div>
      <h1 className="mt-2 font-display text-4xl font-semibold">Terms & Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-xl mt-6">1. Acceptance</h2>
          <p>By registering for a 64 Squares Society tournament or using this website, you agree to these Terms and to our <a className="underline" href="/privacy">Privacy Policy</a>. For minor players, a parent or legal guardian must register on the player's behalf and accept these Terms.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">2. Registration & eligibility</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All information provided during registration must be accurate. Misrepresenting age, rating, identity, or category eligibility may result in disqualification without refund.</li>
            <li>Junior categories require the registrant to be within the stated age limit as of the tournament start date.</li>
            <li>The organisers reserve the right to refuse or cancel a registration.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">3. Payment & refunds</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Entry fees are due at registration. Confirmation is issued once payment is verified.</li>
            <li>Withdrawals more than 7 days before the event: full refund minus processing charges. Within 7 days: no refund, at the organiser's discretion.</li>
            <li>If a tournament is cancelled by the organisers, entry fees will be refunded in full.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">4. Code of conduct</h2>
          <p>Players, parents and spectators are expected to behave respectfully towards opponents, arbiters, volunteers and venue staff. Cheating, use of chess engines, unsporting behaviour, or disruption will result in immediate disqualification and possible banning from future events.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">5. Arbiter & tournament rules</h2>
          <p>FIDE Laws of Chess apply, subject to specific tournament rules published on the event page. The Chief Arbiter's decision is final in all game-related matters.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">6. Photography & media</h2>
          <p>Photographs and videos may be captured at our events and used in our gallery, on our website, and on our social media. See the <a className="underline" href="/privacy">Privacy Policy</a> for details and how to request removal of a specific image.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">7. Liability</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Participants attend at their own risk. 64 Squares Society is not liable for personal injury, loss, theft, or damage to belongings at the venue, except where required by law.</li>
            <li>Parents/guardians are responsible for the safety and supervision of minor players outside of active playing time.</li>
            <li>Our total liability in respect of any registration is limited to the entry fee paid.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">8. Changes</h2>
          <p>We may update these Terms from time to time. Continued use of the site or participation in events after an update constitutes acceptance of the revised Terms.</p>
        </section>
        <section>
          <h2 className="font-display text-xl mt-6">9. Contact</h2>
          <p>Questions: <a className="underline" href="mailto:64squaressociety@gmail.com">64squaressociety@gmail.com</a>.</p>
        </section>
      </div>
    </article>
  );
}

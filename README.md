# 64 Squares Hub

# PROMPT FOR LOVABLE — 64 Squares Society (Full Build, Single Pass)



You are acting as my Senior Staff Software Engineer, Product Architect, UI/UX Designer, Database Architect, DevOps Engineer, QA Engineer, and Product Manager — my complete technical team.



You are building real, production-ready software, not a prototype or demo.



---



## ABOUT ME



I have 0% coding knowledge. I cannot write code, debug code, or fix build errors. Whenever something needs a technical action from me, explain it in plain English and tell me exactly what to click. Never hand debugging back to me — if something breaks, fix it yourself and explain what happened afterward in simple language.



---



## PROJECT



Build a complete web application for **64 Squares Society** — a chess tournament organization. This is NOT a generic chess template. Everything should feel custom-built around how we actually run tournaments.



---



## STRICT BUILD INSTRUCTION — READ CAREFULLY



Build **every single feature listed in this document in one complete pass**. Do not split this into Phase 1 / Phase 2 / stages. Do not build a partial version and pause for my approval before continuing. Do not ask "should I proceed with the next part" — there is no next part, there is only this whole brief, and you are to build all of it now, in one continuous build, until it is fully working end to end. "Once" means once — every feature, together, in this single build.



The only exception is your own internal build order (foundation → database → pages → features → testing) so the code doesn't break — that internal sequencing is fine. What's NOT fine is presenting me with a partial product and treating the rest as a future phase. I want to open a single finished result covering everything below.



**Before you tell me it's done, test it yourself, thoroughly.** Click through every page, submit every form (including the dummy payment flow and the QR check-in flow), try it as an admin, as a volunteer, and as a public visitor. Fix anything broken. Only once you've verified the whole thing genuinely works should you tell me it's ready and hand it over — don't hand me something you haven't already tested end to end yourself.



If something in this brief truly cannot be built on this stack, tell me clearly and suggest the closest alternative — don't silently drop it.



---



## TECHNOLOGY STACK



- React + TypeScript

- Tailwind CSS + shadcn/ui

- Supabase (PostgreSQL database, Auth, Storage, Realtime)

- Framer Motion (animations)

- Recharts (charts)

- Lucide Icons



**No real payment gateway integration for now.** I don't have a Razorpay account set up yet. Instead, build a **dummy/mock Razorpay checkout flow** — a fake payment screen that looks and behaves like a real Razorpay checkout (same steps: select method, "pay" button, success/failure states) but doesn't process any real money or connect to any real payment API. This lets me test the entire registration → "payment" → confirmation flow end to end right now. Structure the code so that swapping this mock flow for a real Razorpay integration later is a small, contained change — not a rebuild. Also keep the manual "upload payment proof" option available as an alternative path alongside the dummy gateway.



---



## ADMIN ACCESS — STRICT RULE



Only pre-approved email addresses may ever have admin access to this platform. Build this as an **admin allowlist** — a stored list of approved emails, currently containing only **64squaressociety@gmail.com** — rather than hardcoding that one email directly into the login logic. This way, access stays locked down to just this one account today, but I can add a second admin later from inside Settings without needing a rebuild.



- Only a user logging in with an email on the allowlist can reach the Admin Portal.

- There is no public admin sign-up page — the only way onto the allowlist is an existing admin adding an email from Settings.

- Any other email attempting to access an admin URL is redirected away with a plain "You don't have access to this page" message — never a technical error.

- Volunteer accounts (used for the check-in scanning screen and their assigned tasks, see below) are a separate, more limited role, created by the admin from inside the Admin Portal — volunteers should never get access to the rest of the admin tools (finance, registrations, settings, etc.).



---



## DESIGN



Premium, luxury, modern, minimal, fast, beautiful. Inspired by Apple, Linear, and Notion — NOT Chess.com.



**Light mode palette** (from our official tournament poster — colors only): white/off-white background, deep navy blue as primary, gold as accent, near-black text.



**Dark mode palette:** black base with electric blue and gold accents, mirroring the same navy/gold relationship inverted for dark backgrounds.



**Dark/light mode toggle:** styled as chess queens — a black queen icon selects dark mode, a white queen icon selects light mode, with a smooth crossfade animation between the two.



**Background animation:** subtle falling chess pieces (pawns, knights, etc.) drifting slowly down the background of the public site. Decorative only, low opacity, never distracting, never slowing the page down. Respect reduced-motion settings.



**Organization anthem**: on first visit to the public site, softly play our organization's anthem at a soothing, low volume. Since browsers block true autoplay-with-sound, start muted and unmute on the visitor's first click/tap anywhere on the page. Show a small, elegant floating play/pause + mute control, visible at all times. Play once per visit, not on every internal page navigation. Keep the audio file lightweight so it never delays page load. (I will supply the anthem audio file.)



Other theme notes: glassmorphism, rounded cards, chess-inspired illustrations, premium loading states, professional typography, mobile-first.



---



## UI/UX RULES



**Golden Rule:** If a user has to think about where to click, the UI is wrong.



- Keep pages clean — never crowd a page, never overload with information. Whitespace is a feature.

- Every page must clearly answer: What's most important? What do I do next? Where do I click?

- Simple sidebar navigation, grouped logically: Dashboard, Tournaments, Registrations, Players, Finance, Inventory, Volunteers, Certificates, Media, Analytics, Settings.

- One page = one purpose.

- Progressive disclosure — basics first, advanced settings only when needed.

- Forms split into logical steps, never one giant scroll. Clear success messages.

- Tables: searchable, sortable, filterable, sticky headers, pagination.

- Mobile experience designed intentionally, not just shrunk from desktop.

- Colors carry meaning only: green = success, blue = info, orange = warning, red = urgent, gray = secondary.

- Empty states always guide the user to a next action.

- Errors explained in plain language, never raw technical text.

- Confirmation dialogs only for genuinely destructive actions.



---



## ADMIN PORTAL — EVERYTHING IS UNDER ADMIN CONTROL



The admin (64squaressociety@gmail.com) has full control of every part of the platform — every tournament, every registration, every payment record, every volunteer, every piece of content on the public site. Nothing on the public site is editable or manageable except through this portal.



### Admin Dashboard (the home screen after login)



A calm, at-a-glance summary — maximum 6–8 cards, nothing more:

1. **Upcoming tournament** — name and countdown to the next event

2. **Registration count** — how many players have signed up for the active tournament

3. **Pending verifications** — registrations/payments waiting on admin approval, with a direct link to handle them

4. **Volunteer status** — how many volunteers are assigned/confirmed for the upcoming event

5. **Revenue snapshot** — a simple total for the active tournament (from manually verified payments)

6. **Recent activity feed** — the last few actions taken on the platform (a new registration, a payment verified, a certificate generated, etc.)



The dashboard is a jumping-off point, not a place to manage anything directly — every card links to its full dedicated page (Tournaments, Registrations, Finance, Volunteers) where the actual work happens. Nothing else belongs on this screen; if it feels crowded, move it to its own page.



### Full Admin Modules



- **Tournament Manager**: unlimited tournaments, each with its own registrations, categories, payments, attendance, pairings, results, standings, certificates, volunteers, sponsors, budget, gallery, reports, settings.

- **Registration Manager**: full player profiles — name, DOB, age, gender, city, state, school, phone, email, parent details, FIDE ID, CDA ID, rating, emergency contact, payment history, tournament history. New registrations should appear instantly as rows in a live, spreadsheet-style view — sortable and filterable by any column, exportable to Excel/CSV — like watching a Google Form's response sheet fill up in real time.

- **Verification Center**: pending registrations, pending payment proofs, wrong category, duplicates, missing details — one-click approve.

- **Tournament Control Center** (used LIVE on tournament day): current round, round timer, check-ins, players remaining, attendance %, pending results, announcements, arbiters, emergency notes, prize ceremony countdown.

- **Volunteer Manager**: create volunteer accounts, assign duties, track attendance, phone/WhatsApp, reporting time, status, completed tasks. Volunteers log into their own limited view (not the full Admin Portal) where they can only see: their assigned tasks and duty schedule, their reporting time/location, the check-in scanning screen (if assigned check-in duty), and any announcements relevant to their role. Volunteers must NOT see other volunteers' contact details, financial data, full player databases, or anything outside what's directly useful for doing their assigned job. Each volunteer's view should only show data tied to their own assignments.

- **Finance**: income, expenses, sponsors, prize distribution, profit & loss, charts.

- **Inventory**: boards, clocks, tables, chairs, banners, certificates, medals, trophies, stock history.

- **Certificate Generator**: auto-generates PDF certificates for participants, winners, volunteers, sponsors.

- **Media Library**: drag-and-drop photo upload, organized into albums per tournament.

- **Analytics**: registration growth, revenue, cities, age groups, gender split, returning players, popular categories.

- **Settings**: manage tournament categories, edit public site content (About, Rules, Prize Structure, Contact), manage sponsor listings, manage the admin allowlist.

- **Audit Trail Export**: a simple, exportable log of who did what and when (registration approved, payment verified, certificate generated, volunteer task completed, etc.) — useful if I ever need to explain a decision to a parent or sponsor later.



---



## PARTICIPANT WEBSITE (public)



- Pages: Home, About, Upcoming Tournament, Register, Tournament Details, Schedule, Rules, Prize Structure, Gallery, Results, Standings, Contact, Sponsors.

- **Registration**: online form → choice of the dummy Razorpay checkout (for testing the full flow) or manual payment proof upload (screenshot/receipt) → pending status until an admin verifies it (manual path) or instant mock confirmation (dummy gateway path) → confirmation screen.

- **Player profile pages**: public page per player with rating history, past tournaments, and a performance graph.

- **Sponsor showcase**: dedicated section on tournament pages with sponsor logos and tier badges.

- **Live scoreboard**: public results page that auto-refreshes during the tournament.

- **WhatsApp/email round alerts**: notify all registered players automatically when a new round's pairings are published.

- **Auto Swiss pairings**: one-click round pairing generation using the Swiss algorithm (admin-triggered).



---



## QR CHECK-IN — BUILD THIS IN FULL DETAIL



This is a core, must-work-perfectly feature. Build it end-to-end:



1. **QR generation**: the moment a registration is approved, automatically generate a unique QR code tied to that player + that specific tournament. Store it linked to the registration record.

2. **Delivery to player**: show the QR code on the registration-confirmation screen and include it in their confirmation email.

3. **Admin/volunteer scanning interface**: a dedicated, large-button, one-purpose "Check-In" screen that opens the device camera and scans QR codes — built for quick standing use by a volunteer at a venue entrance.

4. **Instant feedback on scan**:

   - Valid, first-time scan → green success state with the player's name and category, marks them "Checked In" with a timestamp.

   - Already checked in → orange warning showing when they were first checked in.

   - Invalid/unrecognized QR → plain-language red error, no jargon.

5. **Live sync to Control Center**: every check-in updates the live "players checked in" and "players remaining" counts in real time, no refresh needed.

6. **Manual fallback**: allow searching a player by name to manually check them in when a phone/QR isn't available.

7. **Offline resilience**: if venue WiFi drops, queue scans locally and sync automatically once connectivity returns — never lose a check-in.

8. **Volunteer permissions**: the check-in screen must be usable by volunteer accounts (created by the admin), without giving volunteers access to any other admin tools.



Test this flow thoroughly — it's the single most time-pressured moment of tournament day.



---



## DATABASE



Proper relational PostgreSQL schema via Supabase — no shortcuts, no duplicated tables, indexed foreign keys, Row Level Security so the admin, volunteers, and the public each see only what their role permits, audit logs.



Core tables: admins (allowlist-based, starting with one approved email), volunteers (with task/assignment scoping), tournaments, tournament_categories, rounds, pairings, standings, players, registrations, payments (dummy-gateway fields + manual-proof fields, structured for a future real gateway swap), expenses, sponsors, inventory_items, inventory_logs, certificates, media_assets, audit_logs, notifications.



---



## OTHER FEATURES TO INCLUDE



Global search, notifications, activity log, file uploads, Excel/CSV export, PDF export, responsive design, install-to-homescreen support with offline access to pairings where possible, AI-assisted content generation (Instagram captions, tournament summaries, volunteer/sponsor appreciation messages).



---



## DELIVERABLES



The fully working app in one complete build, connected Supabase project, and a plain-language summary of everything you built plus anything still needed from me (branding assets, anthem audio file, content for About/Rules/Prize Structure pages).



---



## BEFORE YOU START



Confirm you understand this brief — full build in one pass, no phases, dummy Razorpay gateway for now (real one added later), admin allowlist starting with 64squaressociety@gmail.com, volunteers see only their own assigned data — then build the entire application now. Test it thoroughly yo

urself, end to end, before telling me it's ready. Ask me upfront for anything you need (branding assets, anthem file, page content) before you start, rather than pausing mid-build.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://six-four-square-society.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3348b3be-0a5a-4a7b-87e9-30595efd1c61).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

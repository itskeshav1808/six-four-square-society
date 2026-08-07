INSERT INTO public.site_content (key, title, body) VALUES
('home_hero_eyebrow','64 Squares Society — Est. 2024', 'Small line shown above the hero headline.'),
('home_hero_cta_primary','Register now','Label of the main hero button (always links to registration).'),
('home_hero_cta_secondary','Browse tournaments','Label of the secondary hero button.'),
('home_facts_label','The next event','Small label shown above the tournament facts.'),
('home_about_heading','A society built for the long game','Heading of the About act on the homepage.'),
('home_about_body','Chess rewards patience.
So do we. Every 64 Squares event is run by players, for players.
Fair pairings, published prizes, and results you can trust.','Each line becomes its own animated sentence.'),
('home_stats','1200|Players hosted
48|Rated tournaments
14|Cities represented
100|Percent transparent prizes','One stat per line: value|label'),
('home_pillars_heading','How we run the board','Heading for the four-pillar section.'),
('home_pillars','Rated & official|FIDE-aligned rules, arbiters on the floor, and ratings that count.
Transparent prizes|The full prize split is published before round one.
Live standings|Pairings and results go online the moment a round ends.
Real community|Coaches, parents and players who keep coming back.','One pillar per line: title|description'),
('home_journey_heading','From registration to champion','Heading for the journey timeline.'),
('home_journey','Registration|Fill the form, upload a photo, pay online or by proof.
Verification|We verify your payment and issue your check-in QR.
Tournament|Arrive, scan your QR, take your board.
Results|Standings update live after every round.
Champion|Certificates and prizes, on the same day.','One step per line: title|description'),
('home_prize_heading','Prizes worth playing for','Heading of the prize section.'),
('home_prize_body','A transparent prize split, published before the first round.','Blurb under the prize heading.'),
('home_gallery_heading','From the arena','Heading of the homepage gallery.'),
('home_gallery_body','Moments from our tournament halls.','Blurb under the gallery heading.'),
('home_gallery_cta','View full gallery','Label of the gallery link.'),
('home_sponsors_heading','Backed by our partners','Heading of the sponsor section.'),
('home_sponsors_label','Supported by','Small label above the sponsor heading.'),
('home_final_heading','Your Move.','Big closing headline.'),
('home_final_body','The next tournament is open for entries.','Line under the closing headline.'),
('home_final_cta','Register now','Label of the closing button.')
ON CONFLICT (key) DO NOTHING;
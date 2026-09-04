-- =============================================================================
-- 20260904001700  the rest of ticket 1.3: checklist module content
-- =============================================================================
-- Ticket 1.3 is "extract all workbook content to seed SQL", and the plan calls
-- it "the largest single task in the project — budget 4-6 days on its own".
-- Roughly half of it was done as the phases needed it: 93 tasks, 59 countdown
-- checks, 227 vendor questions, 30 RACI activities, 24 ceremony components, 17
-- registration requirements, 56 timeline events, 24 contingencies, the budget
-- categories and lines, and the lookups.
--
-- This is the other half: 414 rows across the fourteen checklist modules, which
-- until now started EMPTY. Phase 6 built the tables and one component to render
-- them; without content they were a shape rather than a product. 82 packing
-- items and 62 photographs are not things anybody types the week before a
-- wedding.
--
-- ONE TEMPLATE TABLE, NOT FOURTEEN — and this is deliberately the opposite of
-- what Phase 6 decided for the domain tables, so the difference is worth
-- stating.
--
-- For the DOMAIN tables, seventeen real tables beat one with a jsonb bag
-- because those columns carry foreign keys to `guests` and `vendors`, check
-- constraints, and generated TypeScript that the app is written against.
-- Reference content has none of those needs: it is written once by this
-- migration, read once by the seed function, references nothing, and is never
-- typed into the client. So the columns here are still REAL columns — not
-- jsonb — but they live in one table with a `module` discriminator, and the
-- sparse ones are simply null for the modules that do not use them.
--
-- WHAT IS DELIBERATELY NOT SEEDED
--
-- The 22 Contact Sheet has 19 names in it and the wedding party sheet has a
-- Name column. Those belong to the couple whose workbook this was. A template
-- arriving with somebody else's family in it would be both wrong and a small
-- privacy failure, so only the ROLE comes across — "Gift table attendant",
-- "Registration witness 1" — and the name is left for each couple. Same
-- principle as ticket 5.5's person_name.
-- =============================================================================

create table if not exists template.checklist_items (
  id             bigint generated always as identity primary key,
  locale         text not null references template.locales (code) on delete cascade,
  -- Matches the `slug` in src/features/checklists/config.ts, so the mapping
  -- between a module's content and its screen is one string in both places.
  module         text not null,
  seq            int  not null,

  name           text not null,
  applicability  applicability not null default 'required',

  -- The module-specific columns, each used by the modules that need it. Null
  -- elsewhere, which is what "sparse" means and is the cost of one table.
  subject        text,          -- attire, jewellery, beauty: who it is for
  area           text,          -- decor
  section        text,          -- shots
  course         text,          -- menu
  container      text,          -- procurement: which bag
  category       text,          -- procurement; accommodation room type
  group_label    text,          -- contacts
  window_label   text,          -- closure: day after / week 1 / month 2+
  role           text,          -- wedding party
  side           wedding_side,  -- wedding party
  priority       text,          -- shots: Must / Should / Nice to have
  people_needed  text,          -- shots
  location       text,          -- shots
  vehicle        text,          -- transport
  qty            int,
  tiers          int,           -- cake
  servings       int,           -- cake
  cost_minor     bigint,        -- procurement estimate, transport cost
  offset_days    int,           -- beauty, closure: days relative to the wedding
  at_time        time,          -- transport pick-up, cake delivery
  until_time     time,          -- transport arrival, cake setup
  needed_on_day  boolean,       -- procurement
  notes          text,

  unique (locale, module, seq)
);

grant select on template.checklist_items to authenticated;

comment on table template.checklist_items is
  'Ticket 1.3. Reference content for the fourteen checklist modules, one table '
  'with a module discriminator. Real columns rather than jsonb, but one table '
  'rather than fourteen: unlike the domain tables this references nothing, has '
  'no constraints worth enforcing per module, and is never typed into the '
  'client. Contains no personal data — roles, not names.';

insert into template.checklist_items
  (locale, module, seq, name, applicability, subject, area, section, course,
   container, category, group_label, window_label, role, side, priority,
   people_needed, location, vehicle, qty, tiers, servings, cost_minor,
   offset_days, at_time, until_time, needed_on_day, notes)
values
  ('poruwa', 'attire', 1, 'Kandyan / Poruwa saree (osari)', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 2, 'Saree blouse', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 3, 'Reception / going-away outfit', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 4, 'Bridal shoes', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 5, 'Veil', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 6, 'Undergarments & shapewear', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 7, 'Saree pins, falls and petticoat', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 8, 'Wedding suit / national dress', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 9, 'Shirt', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 10, 'Tie / bow tie', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 11, 'Shoes', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 12, 'Belt', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 13, 'Socks', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 14, 'Cufflinks', 'optional', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 15, 'Watch', 'optional', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 16, 'Outfit + shoes', 'required', 'Bridesmaid 1', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 17, 'Outfit + shoes', 'required', 'Bridesmaid 2', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 18, 'Outfit + shoes', 'required', 'Bridesmaid 3', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 19, 'Outfit + shoes', 'required', 'Groomsman 1', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 20, 'Outfit + shoes', 'required', 'Groomsman 2', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 21, 'Outfit + shoes', 'required', 'Groomsman 3', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 22, 'Outfit + shoes', 'optional', 'Flower girl', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 23, 'Outfit + shoes', 'optional', 'Page boy', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 24, 'Saree', 'required', 'Bride''s mother', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 25, 'Saree', 'required', 'Groom''s mother', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 26, 'Suit / national dress', 'required', 'Bride''s father', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'attire', 27, 'Suit / national dress', 'required', 'Groom''s father', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 1, 'Bridal necklace set', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 2, 'Earrings', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 3, 'Bangles', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 4, 'Nalalpata (forehead ornament)', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 5, 'Konda mal / hair jewellery', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 6, 'Waist chain (hawadiya)', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 7, 'Anklets', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 8, 'Bride''s wedding ring', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 9, 'Groom''s wedding ring', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 10, 'Engagement ring', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 11, 'Groom''s chain', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 12, 'Bride''s mother''s jewellery', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'jewellery', 13, 'Borrowed family heirloom', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'beauty', 1, 'Skin consultation with a dermatologist / salon', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -180, null, null, null, null),
  ('poruwa', 'beauty', 2, 'Facial course - session 1', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -150, null, null, null, null),
  ('poruwa', 'beauty', 3, 'Facial course - session 2', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -120, null, null, null, null),
  ('poruwa', 'beauty', 4, 'Hair treatment / trim', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -110, null, null, null, null),
  ('poruwa', 'beauty', 5, 'Makeup and hair trial (wear the trial for a full evening)', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -100, null, null, null, null),
  ('poruwa', 'beauty', 6, 'Facial course - session 3', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -90, null, null, null, null),
  ('poruwa', 'beauty', 7, 'Second makeup trial if the first was not right', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -70, null, null, null, null),
  ('poruwa', 'beauty', 8, 'Facial course - session 4', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -45, null, null, null, null),
  ('poruwa', 'beauty', 9, 'Hair colour / gloss', 'optional', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -30, null, null, null, null),
  ('poruwa', 'beauty', 10, 'Final facial - nothing new after this', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -14, null, null, null, null),
  ('poruwa', 'beauty', 11, 'Threading / waxing', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -7, null, null, null, null),
  ('poruwa', 'beauty', 12, 'Manicure and pedicure', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -3, null, null, null, null),
  ('poruwa', 'beauty', 13, 'WEDDING DAY - dresser arrives, hair & makeup', 'required', 'Bride', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, null, null),
  ('poruwa', 'beauty', 14, 'Facial / grooming treatment', 'optional', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -30, null, null, null, null),
  ('poruwa', 'beauty', 15, 'Haircut - practice cut', 'optional', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -21, null, null, null, null),
  ('poruwa', 'beauty', 16, 'Haircut - final', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -5, null, null, null, null),
  ('poruwa', 'beauty', 17, 'Beard shape / clean shave', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -1, null, null, null, null),
  ('poruwa', 'beauty', 18, 'WEDDING DAY - grooming and dressing', 'required', 'Groom', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, null, null),
  ('poruwa', 'beauty', 19, 'Hair & makeup trial (optional, group booking)', 'optional', 'Bridesmaids', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -45, null, null, null, null),
  ('poruwa', 'beauty', 20, 'WEDDING DAY - hair & makeup', 'required', 'Bridesmaids', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, null, null),
  ('poruwa', 'beauty', 21, 'WEDDING DAY - hair & makeup', 'required', 'Bride''s mother', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, null, null),
  ('poruwa', 'beauty', 22, 'WEDDING DAY - hair & makeup', 'required', 'Groom''s mother', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, null, null),
  ('poruwa', 'decor', 1, 'Welcome arch / entrance decoration', 'required', null, 'Entrance', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 2, 'Welcome board with the couple''s names', 'required', null, 'Entrance', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 3, 'Directional signage from the car park', 'required', null, 'Entrance', null, null, null, null, null, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 4, 'Oil lamp (pahana) at the door', 'required', null, 'Entrance', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 5, 'Guest book and pen table', 'required', null, 'Welcome area', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 6, 'Gift table (with a lockable box)', 'required', null, 'Welcome area', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 7, 'Seating chart board', 'required', null, 'Welcome area', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 8, 'Welcome drinks station decor', 'required', null, 'Welcome area', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 9, 'PORUWA structure', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 10, 'Poruwa floral decoration', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 11, 'White cloth for the Poruwa steps', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 12, 'Kalasa pots', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 13, 'Betel tray (bulath thattuwa)', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 14, 'Coconut and cutting mat', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 15, 'Kiribath and sweets tray', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 16, 'Ceremony backdrop', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 17, 'Aisle decor / petals', 'optional', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 18, 'Registration / signing table and chairs', 'required', null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 19, 'Stage backdrop', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 20, 'Head table decoration', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 21, 'Couple''s chairs', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 22, 'Guest table centrepieces', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 25, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 23, 'Table numbers', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 25, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 24, 'Place cards', 'optional', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 200, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 25, 'Menu cards', 'optional', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 25, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 26, 'Chair covers and sashes', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 200, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 27, 'Table linen and runners', 'required', null, 'Reception', null, null, null, null, null, null, null, null, null, null, null, null, 30, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 28, 'Cake table decoration', 'required', null, 'Cake & gifts', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 29, 'Cake stand', 'required', null, 'Cake & gifts', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 30, 'Cake knife (ribboned)', 'required', null, 'Cake & gifts', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 31, 'Favour display', 'optional', null, 'Cake & gifts', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 32, 'Stage uplighting', 'required', null, 'Lighting', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 33, 'Fairy lights / ceiling drape', 'required', null, 'Lighting', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 34, 'Candles and lanterns', 'optional', null, 'Lighting', null, null, null, null, null, null, null, null, null, null, null, null, 20, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 35, 'Spotlight on the Poruwa', 'required', null, 'Lighting', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 36, 'Photo booth / selfie corner', 'optional', null, 'Extras', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 37, 'Lounge seating', 'optional', null, 'Extras', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 38, 'Restroom flowers / basket', 'optional', null, 'Extras', null, null, null, null, null, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 39, 'Outdoor / garden lighting', 'optional', null, 'Extras', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'decor', 40, 'Wet-weather cover (check the forecast)', 'optional', null, 'Extras', null, null, null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 1, 'Welcome drinks (non-alcoholic)', 'required', null, null, null, 'Welcome', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 2, 'Welcome drinks (alcoholic)', 'optional', null, null, null, 'Welcome', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 3, 'Canapes / short eats passed around', 'required', null, null, null, 'Welcome', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 4, 'Kiribath and sweets for the Poruwa', 'required', null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 5, 'Rice - white / yellow / basmati', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 6, 'Chicken curry', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 7, 'Fish / seafood dish', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 8, 'Beef or mutton dish', 'optional', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 9, 'Vegetarian mains (at least 3)', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 10, 'Dhal, mallum, papadam, chutney', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 11, 'Noodles / pasta / western option', 'optional', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 12, 'Salad bar', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 13, 'Live cooking station (hoppers / kottu)', 'optional', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 14, 'Bread and butter', 'required', null, null, null, 'Buffet', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 15, 'Watalappan', 'required', null, null, null, 'Dessert', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 16, 'Curd and treacle', 'optional', null, null, null, 'Dessert', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 17, 'Ice cream / western desserts', 'required', null, null, null, 'Dessert', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 18, 'Fresh fruit', 'required', null, null, null, 'Dessert', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 19, 'Wedding cake pieces', 'required', null, null, null, 'Dessert', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 20, 'Bottled water on every table', 'required', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 21, 'Soft drinks', 'required', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 22, 'Fresh juice', 'optional', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 23, 'Tea / coffee station', 'required', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 24, 'Beer / arrack / spirits', 'optional', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 25, 'Wine', 'optional', null, null, null, 'Beverage', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 26, 'Children''s meals', 'required', null, null, null, 'Service', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 27, 'Vendor and crew meals', 'required', null, null, null, 'Service', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 28, 'Head table served first', 'required', null, null, null, 'Service', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 29, 'Elderly / VIP tables served first', 'required', null, null, null, 'Service', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'menu', 30, 'Take-away boxes for the family', 'optional', null, null, null, 'Service', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'cake', 1, 'Wedding cake', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 3, 12, null, null, '16:00', '17:30', null, null),
  ('poruwa', 'transport', 1, 'Dresser to bridal suite', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Van', null, null, null, null, null, '13:00', '16:00', null, null),
  ('poruwa', 'transport', 2, 'Photographer to bridal suite', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '14:30', '15:00', null, null),
  ('poruwa', 'transport', 3, 'Bride''s family to venue', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '17:00', '17:45', null, null),
  ('poruwa', 'transport', 4, 'Groom''s family to venue', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '17:00', '17:45', null, null),
  ('poruwa', 'transport', 5, 'Groom to venue', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '17:30', '18:00', null, null),
  ('poruwa', 'transport', 6, 'Bride to venue (bridal car)', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Decorated car', null, null, null, null, null, '18:15', '18:45', null, null),
  ('poruwa', 'transport', 7, 'Bridal party to venue', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Van', null, null, null, null, null, '17:30', '18:00', null, null),
  ('poruwa', 'transport', 8, 'Guest bus - pick-up point 1', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Bus', null, null, null, null, null, '17:00', '18:30', null, null),
  ('poruwa', 'transport', 9, 'Guest bus - pick-up point 2', 'optional', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Bus', null, null, null, null, null, '17:00', '18:30', null, null),
  ('poruwa', 'transport', 10, 'Kandyan dancers & drummers', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Van', null, null, null, null, null, '17:00', '18:00', null, null),
  ('poruwa', 'transport', 11, 'Registrar to venue', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '18:45', '19:15', null, null),
  ('poruwa', 'transport', 12, 'Cake delivery', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Van', null, null, null, null, null, '15:30', '16:00', null, null),
  ('poruwa', 'transport', 13, 'Decor team & equipment', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Lorry', null, null, null, null, null, '08:00', '09:00', null, null),
  ('poruwa', 'transport', 14, 'Elderly relatives - door to door', 'optional', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '17:30', '18:30', null, null),
  ('poruwa', 'transport', 15, 'Guest bus - return', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Bus', null, null, null, null, null, '23:30', '01:00', null, null),
  ('poruwa', 'transport', 16, 'Couple to bridal suite', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Decorated car', null, null, null, null, null, '23:45', '23:55', null, null),
  ('poruwa', 'transport', 17, 'Jewellery back to safe custody', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Car', null, null, null, null, null, '23:45', '00:30', null, null),
  ('poruwa', 'transport', 18, 'Airport transfer - overseas guests', 'optional', null, null, null, null, null, null, null, null, null, null, null, null, null, 'Van', null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 1, 'Bride & Groom - bridal suite', 'required', null, null, null, null, null, 'Suite', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 2, 'Bride - getting ready', 'required', null, null, null, null, null, 'Deluxe', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 3, 'Groom - getting ready', 'required', null, null, null, null, null, 'Deluxe', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 4, 'Bride''s parents', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 5, 'Groom''s parents', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 6, 'Bride''s siblings', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 7, 'Groom''s siblings', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 8, 'Outstation family 1', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 9, 'Outstation family 2', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 10, 'Outstation family 3', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 11, 'VIP guest', 'required', null, null, null, null, null, 'Double', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'accommodation', 12, 'Bridal dresser (if staying)', 'required', null, null, null, null, null, 'Single', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 1, 'Bride''s dress / saree hanging', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 2, 'Jewellery, rings and shoes flat-lay', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 3, 'Invitation card detail shot', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Nice', null, 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 4, 'Bride having hair & makeup done', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 5, 'Bride''s mother helping with the saree', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride + mother', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 6, 'Bride''s father seeing her for the first time', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride + father', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 7, 'Bride with bridesmaids', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride + bridesmaids', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 8, 'Bride alone - full length portrait', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Bride', 'Bridal suite', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 9, 'Groom getting ready / tying the tie', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Groom', 'Groom''s room', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 10, 'Groom with his father', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Groom + father', 'Groom''s room', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 11, 'Groom with his mother', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Groom + mother', 'Groom''s room', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 12, 'Groom with groomsmen', 'required', null, null, 'Preparation', null, null, null, null, null, null, null, 'Must', 'Groom + groomsmen', 'Groom''s room', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 13, 'Kandyan dancers and drummers at the entrance', 'required', null, null, 'Arrival', null, null, null, null, null, null, null, 'Must', 'Troupe', 'Entrance', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 14, 'Groom''s procession in', 'required', null, null, 'Arrival', null, null, null, null, null, null, null, 'Must', 'Groom', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 15, 'Bride entering with her father', 'required', null, null, 'Arrival', null, null, null, null, null, null, null, 'Must', 'Bride + father', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 16, 'Couple stepping onto the Poruwa', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 17, 'Ashtaka chanting - wide shot', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 18, 'Betel offering', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 19, 'Ring exchange - close up on the hands', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 20, 'Thread tying - close up', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 21, 'Water pouring over the tied hands', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 22, 'Jayamangala Gatha singers', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Singers', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 23, 'White cloth given to the bride''s mother', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Groom + mother', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 24, 'Coconut splitting', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', null, 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 25, 'Kiribath being fed to the couple', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 26, 'Oil lamp lighting', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Both families', 'Poruwa', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 27, 'Signing the marriage register', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Couple + registrar', 'Signing table', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 28, 'Witnesses signing', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Witnesses', 'Signing table', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 29, 'Parents'' faces during the ceremony', 'required', null, null, 'Ceremony', null, null, null, null, null, null, null, 'Must', 'Parents', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 30, 'Couple with bride''s parents', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + parents', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 31, 'Couple with groom''s parents', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + parents', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 32, 'Couple with both sets of parents', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + parents', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 33, 'Couple with bride''s siblings', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + siblings', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 34, 'Couple with groom''s siblings', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + siblings', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 35, 'Couple with grandparents', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Couple + grandparents', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 36, 'Bride''s extended family', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Bride''s family', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 37, 'Groom''s extended family', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Groom''s family', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 38, 'Full wedding party', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Wedding party', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 39, 'Bride with her bridesmaids', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Bride + bridesmaids', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 40, 'Groom with his groomsmen', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Must', 'Groom + groomsmen', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 41, 'VIP / special guests', 'required', null, null, 'Family', null, null, null, null, null, null, null, 'Nice', 'VIPs', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 42, 'Couple portraits - golden hour outdoors', 'required', null, null, 'Couple', null, null, null, null, null, null, null, 'Must', 'Couple', 'Garden', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 43, 'Couple portraits - indoor / stage', 'required', null, null, 'Couple', null, null, null, null, null, null, null, 'Must', 'Couple', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 44, 'Detail shot of the rings on hands', 'required', null, null, 'Couple', null, null, null, null, null, null, null, 'Must', 'Couple', 'Anywhere', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 45, 'Candid laughing / quiet moment', 'required', null, null, 'Couple', null, null, null, null, null, null, null, 'Must', 'Couple', 'Anywhere', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 46, 'Room and decor before guests enter', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', null, 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 47, 'Poruwa and stage empty (wide)', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', null, 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 48, 'Cake table and cake detail', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', null, 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 49, 'Couple''s grand entrance', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'Couple', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 50, 'Cake cutting', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'Couple', 'Cake table', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 51, 'Toast / speeches', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'Speakers', 'Stage', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 52, 'First dance', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Optional', 'Couple', 'Dance floor', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 53, 'Traditional dance performance', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Optional', 'Troupe', 'Dance floor', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 54, 'Guests at each table (table rounds)', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'All guests', 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 55, 'Dance floor candids', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'Guests', 'Dance floor', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 56, 'Buffet and food detail', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Nice', null, 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 57, 'Guest book and gift table', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Nice', null, 'Welcome area', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 58, 'Send-off / final shot of the night', 'required', null, null, 'Reception', null, null, null, null, null, null, null, 'Must', 'Couple', 'Entrance', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 59, 'Drone shot of the venue', 'required', null, null, 'Video', null, null, null, null, null, null, null, 'Optional', null, 'Outdoors', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 60, 'Interviews / messages from family', 'required', null, null, 'Video', null, null, null, null, null, null, null, 'Optional', 'Family', 'Lounge', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 61, 'Live stream check for overseas family', 'required', null, null, 'Video', null, null, null, null, null, null, null, 'Optional', null, 'Ballroom', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'shots', 62, 'Same-day edit handover to the DJ', 'required', null, null, 'Video', null, null, null, null, null, null, null, 'Optional', null, 'AV desk', null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 1, 'Bride', 'required', null, null, null, null, null, null, 'Couple', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 2, 'Groom', 'required', null, null, null, null, null, null, 'Couple', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 3, 'Maid / Matron of Honour', 'required', null, null, null, null, null, null, 'Couple', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 4, 'Best Man', 'required', null, null, null, null, null, null, 'Couple', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 5, 'Bride''s father', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 6, 'Bride''s mother', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 7, 'Groom''s father', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 8, 'Groom''s mother', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 9, 'Family rep - bride''s side', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 10, 'Family rep - groom''s side', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 11, 'Jewellery custodian', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 12, 'Gift table attendant', 'required', null, null, null, null, null, null, 'Family', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 13, 'Wedding coordinator', 'required', null, null, null, null, null, null, 'Running the day', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 14, 'Venue banquet manager', 'required', null, null, null, null, null, null, 'Running the day', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 15, 'MC', 'required', null, null, null, null, null, null, 'Running the day', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 16, 'DJ', 'required', null, null, null, null, null, null, 'Running the day', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 17, 'Poruwa officiant / Ashtaka chanter', 'required', null, null, null, null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 18, 'Marriage registrar', 'required', null, null, null, null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 19, 'Witness 1', 'required', null, null, null, null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 20, 'Witness 2', 'required', null, null, null, null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 21, 'Jayamangala Gatha singers', 'required', null, null, null, null, null, null, 'Ceremony', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 22, 'Photographer', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 23, 'Videographer', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 24, 'Decorator', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 25, 'Florist', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 26, 'Caterer', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 27, 'Cake', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 28, 'Kandyan dancers', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 29, 'Drummers', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 30, 'Bridal dresser / makeup', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 31, 'Sound & AV', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 32, 'Saree designer', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 33, 'Jeweller', 'required', null, null, null, null, null, null, 'Vendors', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 34, 'Bridal car driver', 'required', null, null, null, null, null, null, 'Transport', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 35, 'Groom''s car driver', 'required', null, null, null, null, null, null, 'Transport', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 36, 'Guest bus driver 1', 'required', null, null, null, null, null, null, 'Transport', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 37, 'Guest bus driver 2', 'required', null, null, null, null, null, null, 'Transport', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 38, 'Transport company', 'required', null, null, null, null, null, null, 'Transport', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 39, 'Nearest hospital', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 40, 'Doctor / clinic', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 41, 'Venue security', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 42, 'Police emergency', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 43, 'Ambulance (Suwa Seriya)', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 44, 'Electrician / venue maintenance', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 45, 'Back-up driver', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'contacts', 46, 'Back-up coordinator', 'required', null, null, null, null, null, null, 'Emergency', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'procurement', 1, 'Safety pins - assorted sizes', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 2, 'Sewing kit with matching thread', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 80000, null, null, null, true, null),
  ('poruwa', 'procurement', 3, 'Fashion tape / double-sided tape', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 70000, null, null, null, true, null),
  ('poruwa', 'procurement', 4, 'Spare saree pins', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 60000, null, null, null, true, null),
  ('poruwa', 'procurement', 5, 'Stain remover pen', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 90000, null, null, null, true, null),
  ('poruwa', 'procurement', 6, 'Tissues and blotting paper', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 7, 'Mints / breath freshener', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 40000, null, null, null, true, null),
  ('poruwa', 'procurement', 8, 'Deodorant', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 90000, null, null, null, true, null),
  ('poruwa', 'procurement', 9, 'Basic first-aid supplies (plasters, antiseptic)', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 150000, null, null, null, true, null),
  ('poruwa', 'procurement', 10, 'Painkillers and any personal medication', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 100000, null, null, null, true, null),
  ('poruwa', 'procurement', 11, 'Blister plasters', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 60000, null, null, null, true, null),
  ('poruwa', 'procurement', 12, 'Small scissors', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 13, 'Super glue (for shoes / beading)', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 30000, null, null, null, true, null),
  ('poruwa', 'procurement', 14, 'Hand fan / portable fan', 'required', null, null, null, null, 'Bride''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 200000, null, null, null, true, null),
  ('poruwa', 'procurement', 15, 'Lipstick used by the makeup artist', 'required', null, null, null, null, 'Bride''s bag', 'Beauty', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 16, 'Powder / blotting compact', 'required', null, null, null, null, 'Bride''s bag', 'Beauty', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 17, 'Hair pins, bobby pins, hair spray', 'required', null, null, null, null, 'Bride''s bag', 'Beauty', null, null, null, null, null, null, null, null, 1, null, null, 120000, null, null, null, true, null),
  ('poruwa', 'procurement', 18, 'Nail file and clear polish', 'required', null, null, null, null, 'Bride''s bag', 'Beauty', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 19, 'Comfortable flat shoes for later', 'required', null, null, null, null, 'Bride''s bag', 'Beauty', null, null, null, null, null, null, null, null, 1, null, null, 350000, null, null, null, true, null),
  ('poruwa', 'procurement', 20, 'Water bottle and a straw', 'required', null, null, null, null, 'Bride''s bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 30000, null, null, null, true, null),
  ('poruwa', 'procurement', 21, 'Snacks for the getting-ready room', 'required', null, null, null, null, 'Bride''s bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 150000, null, null, null, true, null),
  ('poruwa', 'procurement', 22, 'Phone charger and power bank', 'required', null, null, null, null, 'Bride''s bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 400000, null, null, null, true, null),
  ('poruwa', 'procurement', 23, 'Spare shirt', 'required', null, null, null, null, 'Groom''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 24, 'Lint roller', 'required', null, null, null, null, 'Groom''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 70000, null, null, null, true, null),
  ('poruwa', 'procurement', 25, 'Shoe shine cloth', 'required', null, null, null, null, 'Groom''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 1, null, null, 30000, null, null, null, true, null),
  ('poruwa', 'procurement', 26, 'Spare socks', 'required', null, null, null, null, 'Groom''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 2, null, null, 80000, null, null, null, true, null),
  ('poruwa', 'procurement', 27, 'Handkerchiefs', 'required', null, null, null, null, 'Groom''s bag', 'Emergency kit', null, null, null, null, null, null, null, null, 3, null, null, 90000, null, null, null, true, null),
  ('poruwa', 'procurement', 28, 'Phone charger and power bank', 'required', null, null, null, null, 'Groom''s bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 29, 'Deodorant and comb', 'required', null, null, null, null, 'Groom''s bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 80000, null, null, null, true, null),
  ('poruwa', 'procurement', 30, 'NICs / passports - both', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 31, 'Birth certificates - both', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 32, 'Notice of marriage receipt', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 33, 'Witnesses'' NIC photocopies', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 34, 'Venue contract and final invoice', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 35, 'Vendor contracts folder', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 36, 'Printed timeline (20 Day Timeline)', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 3, null, null, 10000, null, null, null, true, null),
  ('poruwa', 'procurement', 37, 'Printed contact sheet (22 Contact Sheet)', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 3, null, null, 10000, null, null, null, true, null),
  ('poruwa', 'procurement', 38, 'Printed seating list', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 3, null, null, 20000, null, null, null, true, null),
  ('poruwa', 'procurement', 39, 'Printed shot list for the photographer', 'required', null, null, null, null, 'Documents box', 'Documents', null, null, null, null, null, null, null, null, 2, null, null, 10000, null, null, null, true, null),
  ('poruwa', 'procurement', 40, 'Cash for tips - in labelled envelopes', 'required', null, null, null, null, 'Documents box', 'Money', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 41, 'Cash for day-of balances', 'required', null, null, null, null, 'Documents box', 'Money', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 42, 'Bridal jewellery set (see 12 Attire & Jewellery)', 'required', null, null, null, null, 'Jewellery case', 'Jewellery', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 43, 'Wedding rings in their box', 'required', null, null, null, null, 'Jewellery case', 'Jewellery', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 44, 'Nalalpata and hair jewellery', 'required', null, null, null, null, 'Jewellery case', 'Jewellery', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 45, 'Betel leaves (bulath)', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 150000, null, null, null, true, null),
  ('poruwa', 'procurement', 46, 'Betel tray (bulath thattuwa)', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 47, 'Coconut flower', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 100000, null, null, null, true, null),
  ('poruwa', 'procurement', 48, 'Coconut for splitting', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 20000, null, null, null, true, null),
  ('poruwa', 'procurement', 49, 'Gold thread', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 50, 'White cloth for the bride''s mother', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 300000, null, null, null, true, null),
  ('poruwa', 'procurement', 51, 'Oil lamp (pahana), oil and wicks', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 52, 'Matches / lighter', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 2, null, null, 10000, null, null, null, true, null),
  ('poruwa', 'procurement', 53, 'Kiribath and sweets tray', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 54, 'Kalasa pot and water', 'required', null, null, null, null, 'Ceremony box', 'Ceremony', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 55, 'Guest book and two good pens', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 250000, null, null, null, true, null),
  ('poruwa', 'procurement', 56, 'Gift box / lockable money box', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 350000, null, null, null, true, null),
  ('poruwa', 'procurement', 57, 'Table numbers', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 25, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 58, 'Place cards', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 200, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 59, 'Seating chart board', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 60, 'Welcome board', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 61, 'Guest favours', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 200, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 62, 'Cake knife and server (ribboned)', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 63, 'Cake topper', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 64, 'Cake boxes for guests', 'required', null, null, null, null, 'Reception box', 'Reception', null, null, null, null, null, null, null, null, 200, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 65, 'Parents'' gifts', 'required', null, null, null, null, 'Reception box', 'Gifts', null, null, null, null, null, null, null, null, 4, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 66, 'Bridal party gifts', 'required', null, null, null, null, 'Reception box', 'Gifts', null, null, null, null, null, null, null, null, 8, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 67, 'Traditional family gifts (sarees / cloth)', 'required', null, null, null, null, 'Reception box', 'Gifts', null, null, null, null, null, null, null, null, 4, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 68, 'Extension cords', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 2, null, null, 250000, null, null, null, true, null),
  ('poruwa', 'procurement', 69, 'Multi-plug adaptors', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 2, null, null, 120000, null, null, null, true, null),
  ('poruwa', 'procurement', 70, 'Masking tape and cello tape', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 2, null, null, 60000, null, null, null, true, null),
  ('poruwa', 'procurement', 71, 'Scissors and a marker pen', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 2, null, null, 40000, null, null, null, true, null),
  ('poruwa', 'procurement', 72, 'Cable ties and string', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 1, null, null, 50000, null, null, null, true, null),
  ('poruwa', 'procurement', 73, 'Torch', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 1, null, null, 150000, null, null, null, true, null),
  ('poruwa', 'procurement', 74, 'Umbrellas', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 4, null, null, 400000, null, null, null, true, null),
  ('poruwa', 'procurement', 75, 'Spare camera batteries / memory cards', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 76, 'Bluetooth speaker for the getting-ready room', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 1, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 77, 'Notepad and pens', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 2, null, null, 40000, null, null, null, true, null),
  ('poruwa', 'procurement', 78, 'Bin bags (for clearing up)', 'required', null, null, null, null, 'Tech box', 'Logistics', null, null, null, null, null, null, null, null, 5, null, null, 30000, null, null, null, true, null),
  ('poruwa', 'procurement', 79, 'Change of clothes for both', 'required', null, null, null, null, 'Overnight bag', 'Personal', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 80, 'Toiletries and makeup remover', 'required', null, null, null, null, 'Overnight bag', 'Personal', null, null, null, null, null, null, null, null, 1, null, null, 200000, null, null, null, true, null),
  ('poruwa', 'procurement', 81, 'Next-day outfit', 'required', null, null, null, null, 'Overnight bag', 'Personal', null, null, null, null, null, null, null, null, 2, null, null, 0, null, null, null, true, null),
  ('poruwa', 'procurement', 82, 'Saree storage bag / garment cover', 'required', null, null, null, null, 'Overnight bag', 'Personal', null, null, null, null, null, null, null, null, 2, null, null, 150000, null, null, null, true, null),
  ('poruwa', 'closure', 1, 'Settle every remaining vendor balance (filter 04 Payments for unpaid)', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 2, 'Return rented jewellery and reclaim the deposit', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 3, 'Check the jewellery register - every item accounted for', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 4, 'Return rented decor, AV, linen and hired equipment', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 5, 'Collect all personal belongings from the venue and suite', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 6, 'Check out of the hotel and reclaim any room deposit', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 7, 'Count the cash gifts with two people present and bank them', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 8, 'Collect the guest book and gifts', 'required', null, null, null, null, null, null, null, 'Day after', null, null, null, null, null, null, null, null, null, null, 1, null, null, null, null),
  ('poruwa', 'closure', 9, 'Log every gift received against the guest in 09 Guests', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 5, null, null, null, null),
  ('poruwa', 'closure', 10, 'Reclaim every refundable deposit (see 03 Budget column O)', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 7, null, null, null, null),
  ('poruwa', 'closure', 11, 'Dry-clean and store the saree and the suit', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 7, null, null, null, null),
  ('poruwa', 'closure', 12, 'Return borrowed family items and heirlooms', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 7, null, null, null, null),
  ('poruwa', 'closure', 13, 'Chase any missing receipts and file them', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 7, null, null, null, null),
  ('poruwa', 'closure', 14, 'Thank the vendors who did well - and tell them why', 'required', null, null, null, null, null, null, null, 'Week 1', null, null, null, null, null, null, null, null, null, null, 7, null, null, null, null),
  ('poruwa', 'closure', 15, 'Confirm the photo album delivery date in writing', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 14, null, null, null, null),
  ('poruwa', 'closure', 16, 'Confirm the video delivery date in writing', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 14, null, null, null, null),
  ('poruwa', 'closure', 17, 'Check the raw files / USB have been handed over and are readable', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 14, null, null, null, null),
  ('poruwa', 'closure', 18, 'Send thank-you cards or messages to every guest', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 30, null, null, null, null),
  ('poruwa', 'closure', 19, 'Rate every vendor on 05 Vendors while it is still fresh', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 30, null, null, null, null),
  ('poruwa', 'closure', 20, 'Apply for certified copies of the marriage certificate', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 21, null, null, null, null),
  ('poruwa', 'closure', 21, 'Update NIC, passport and bank records if changing name', 'required', null, null, null, null, null, null, null, 'Week 2-4', null, null, null, null, null, null, null, null, null, null, 60, null, null, null, null),
  ('poruwa', 'closure', 22, 'RECONCILE the final wedding cost - fill in the box below', 'required', null, null, null, null, null, null, null, 'Month 2+', null, null, null, null, null, null, null, null, null, null, 45, null, null, null, null),
  ('poruwa', 'closure', 23, 'Close out any disputed invoice', 'required', null, null, null, null, null, null, null, 'Month 2+', null, null, null, null, null, null, null, null, null, null, 45, null, null, null, null),
  ('poruwa', 'closure', 24, 'Chase the album if it has not arrived', 'required', null, null, null, null, null, null, null, 'Month 2+', null, null, null, null, null, null, null, null, null, null, 90, null, null, null, null),
  ('poruwa', 'closure', 25, 'Write down what you would do differently (lessons box below)', 'required', null, null, null, null, null, null, null, 'Month 2+', null, null, null, null, null, null, null, null, null, null, 45, null, null, null, null),
  ('poruwa', 'lessons', 1, 'What went better than expected?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 2, 'What would you do differently?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 3, 'Which vendors would you recommend to a friend, and why?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 4, 'Which vendors would you not use again?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 5, 'What did you spend money on that was not worth it?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 6, 'What did you underestimate the cost of?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 7, 'What did you forget to plan for?', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'lessons', 8, 'Advice you would give a couple planning a Sri Lankan wedding:', 'required', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 1, 'Bride', 'required', null, null, null, null, null, null, null, null, 'Bride', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 2, 'Groom', 'required', null, null, null, null, null, null, null, null, 'Groom', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 3, 'Bride''s father', 'required', null, null, null, null, null, null, null, null, 'Bride''s father', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 4, 'Bride''s mother', 'required', null, null, null, null, null, null, null, null, 'Bride''s mother', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 5, 'Groom''s father', 'required', null, null, null, null, null, null, null, null, 'Groom''s father', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 6, 'Groom''s mother', 'required', null, null, null, null, null, null, null, null, 'Groom''s mother', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 7, 'Maid / Matron of Honour', 'required', null, null, null, null, null, null, null, null, 'Maid / Matron of Honour', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 8, 'Best Man', 'required', null, null, null, null, null, null, null, null, 'Best Man', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 9, 'Bridesmaid 1', 'required', null, null, null, null, null, null, null, null, 'Bridesmaid 1', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 10, 'Bridesmaid 2', 'required', null, null, null, null, null, null, null, null, 'Bridesmaid 2', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 11, 'Bridesmaid 3', 'required', null, null, null, null, null, null, null, null, 'Bridesmaid 3', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 12, 'Groomsman 1', 'required', null, null, null, null, null, null, null, null, 'Groomsman 1', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 13, 'Groomsman 2', 'required', null, null, null, null, null, null, null, null, 'Groomsman 2', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 14, 'Groomsman 3', 'required', null, null, null, null, null, null, null, null, 'Groomsman 3', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 15, 'Flower girl', 'required', null, null, null, null, null, null, null, null, 'Flower girl', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 16, 'Page boy', 'required', null, null, null, null, null, null, null, null, 'Page boy', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 17, 'Usher 1', 'required', null, null, null, null, null, null, null, null, 'Usher 1', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 18, 'Usher 2', 'required', null, null, null, null, null, null, null, null, 'Usher 2', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 19, 'Registration witness 1', 'required', null, null, null, null, null, null, null, null, 'Registration witness 1', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 20, 'Registration witness 2', 'required', null, null, null, null, null, null, null, null, 'Registration witness 2', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 21, 'Jayamangala Gatha singers', 'required', null, null, null, null, null, null, null, null, 'Jayamangala Gatha singers', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 22, 'Ring bearer', 'required', null, null, null, null, null, null, null, null, 'Ring bearer', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 23, 'Gift table attendant', 'required', null, null, null, null, null, null, null, null, 'Gift table attendant', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 24, 'Jewellery custodian (end of night)', 'required', null, null, null, null, null, null, null, null, 'Jewellery custodian (end of night)', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 25, 'Family representative - bride''s side', 'required', null, null, null, null, null, null, null, null, 'Family representative - bride''s side', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 26, 'Family representative - groom''s side', 'required', null, null, null, null, null, null, null, null, 'Family representative - groom''s side', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 27, 'Speech - speaker 1', 'required', null, null, null, null, null, null, null, null, 'Speech - speaker 1', 'groom', null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('poruwa', 'party', 28, 'Speech - speaker 2', 'required', null, null, null, null, null, null, null, null, 'Speech - speaker 2', 'bride', null, null, null, null, null, null, null, null, null, null, null, null, null);

-- =============================================================================
-- The wedding side: a link back to the template row
-- =============================================================================
-- Every seeded table in this schema carries source_template_id with a unique
-- index on (wedding_id, source_template_id). That is what makes re-seeding add
-- only what the template has gained instead of duplicating everything, and
-- nulls being distinct in a unique index is what lets a couple add their own
-- rows freely.
--
-- Added to the fourteen tables that now have content. music_cues is left alone:
-- it has no template content, and a column that can never be non-null is dead
-- schema rather than uniformity.
do $$
declare
  t text;
  tables text[] := array[
    'attire_items', 'jewellery_items', 'beauty_appointments', 'decor_items',
    'menu_items', 'cake_items', 'transport_legs', 'accommodations',
    'shot_list_items', 'procurement_items', 'wedding_party', 'closure_tasks',
    'lessons', 'contacts'
  ];
begin
  foreach t in array tables loop
    execute format($f$
      alter table %1$I
        add column if not exists source_template_id bigint
          references template.checklist_items (id) on delete set null,
        add column if not exists seq int;

      create unique index if not exists %1$s_template_uniq
        on %1$I (wedding_id, source_template_id);
    $f$, t);
  end loop;
end $$;

-- Two of these carry a date derived from the wedding date, so they need what
-- wedding_tasks has: the offset it came from, and a flag saying a human moved
-- it. Without them, moving the nekath re-dates the tasks and the registration
-- deadlines and silently leaves the facial course and the deposit chasing
-- where they were.
alter table beauty_appointments
  add column if not exists offset_days int,
  add column if not exists due_date_overridden boolean not null default false;

alter table closure_tasks
  add column if not exists offset_days int,
  add column if not exists due_date_overridden boolean not null default false;

-- ------------------------------------------------------- 1.7, extended again
create or replace function app.redate_wedding_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update wedding_tasks
     set due_date = case when new.wedding_date is null then null
                         else new.wedding_date + offset_days end
   where wedding_id = new.id and offset_days is not null and not due_date_overridden;

  update wedding_countdown_checks
     set due_date = case when new.wedding_date is null then null
                         else new.wedding_date + offset_days end
   where wedding_id = new.id and offset_days is not null and not due_date_overridden;

  update legal_requirements
     set due_date = case when new.wedding_date is null then null
                         else new.wedding_date + offset_days end
   where wedding_id = new.id and offset_days is not null and not due_date_overridden;

  -- Added with 1.3's checklist content. A facial course booked six weeks out
  -- has to move with the date, and so does chasing a deposit a week after.
  update beauty_appointments
     set on_date = case when new.wedding_date is null then null
                        else new.wedding_date + offset_days end
   where wedding_id = new.id and offset_days is not null and not due_date_overridden;

  update closure_tasks
     set target_date = case when new.wedding_date is null then null
                            else new.wedding_date + offset_days end
   where wedding_id = new.id and offset_days is not null and not due_date_overridden;

  return new;
end;
$$;

comment on function app.redate_wedding_plan() is
  'Ticket 1.7, extended by 6.5 and 1.3. Recomputes every date derived from '
  'offset_days when wedding_date changes, skipping rows a human has moved. '
  'Covers tasks, countdown checks, registration deadlines, beauty appointments '
  'and closure tasks.';

-- =============================================================================
-- Seeding the fourteen modules
-- =============================================================================
-- Its own function rather than fourteen more inserts inside seed_wedding, which
-- is already the longest thing in this schema. seed_wedding still decides WHAT
-- a new wedding starts with; this decides how each module's content maps onto
-- its table, which is a different question.
create or replace function app.seed_checklist_modules(
  p_wedding_id   uuid,
  p_locale       text,
  p_wedding_date date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  n       int;
begin
  insert into attire_items (wedding_id, source_template_id, seq, name,
                            applicability, subject, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.subject, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'attire'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into jewellery_items (wedding_id, source_template_id, seq, name,
                               applicability, subject, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.subject, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'jewellery'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into beauty_appointments (wedding_id, source_template_id, seq, name,
                                   applicability, subject, offset_days, on_date,
                                   sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.subject,
         t.offset_days,
         case when p_wedding_date is null or t.offset_days is null then null
              else p_wedding_date + t.offset_days end,
         t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'beauty'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into decor_items (wedding_id, source_template_id, seq, name,
                           applicability, area, qty, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.area, t.qty, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'decor'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into menu_items (wedding_id, source_template_id, seq, name,
                          applicability, course, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.course, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'menu'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into cake_items (wedding_id, source_template_id, seq, name,
                          applicability, tiers, servings, delivery_at, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.tiers, t.servings,
         t.at_time, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'cake'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into transport_legs (wedding_id, source_template_id, seq, name,
                              applicability, vehicle, pickup_at, arrive_by,
                              cost_minor, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.vehicle,
         t.at_time, t.until_time, coalesce(t.cost_minor, 0), t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'transport'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into accommodations (wedding_id, source_template_id, seq, name,
                              applicability, room_type, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.category, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'accommodation'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into shot_list_items (wedding_id, source_template_id, seq, name,
                               applicability, section, priority, people_needed,
                               location, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.section,
         t.priority, t.people_needed, t.location, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'shots'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into procurement_items (wedding_id, source_template_id, seq, name,
                                 applicability, container, category, qty,
                                 cost_minor, needed_on_day, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.container,
         t.category, t.qty, coalesce(t.cost_minor, 0),
         coalesce(t.needed_on_day, false), t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'procurement'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  -- Roles only. The name column is what each couple fills in, which is why the
  -- role is also written into `name`: until somebody is named, the role IS the
  -- row, and an empty name would fail the not-null column for no gain.
  insert into wedding_party (wedding_id, source_template_id, seq, name,
                             applicability, role, side, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.role, t.side, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'party'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into contacts (wedding_id, source_template_id, seq, name,
                        applicability, group_label, role, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.group_label,
         t.name, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'contacts'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into closure_tasks (wedding_id, source_template_id, seq, name,
                             applicability, window_label, offset_days,
                             target_date, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.window_label,
         t.offset_days,
         case when p_wedding_date is null or t.offset_days is null then null
              else p_wedding_date + t.offset_days end,
         t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'closure'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  insert into lessons (wedding_id, source_template_id, seq, name,
                       applicability, sort_order)
  select p_wedding_id, t.id, t.seq, t.name, t.applicability, t.seq
    from template.checklist_items t
   where t.locale = p_locale and t.module = 'lessons'
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_total := v_total + n;

  return v_total;
end;
$$;

comment on function app.seed_checklist_modules(uuid, text, date) is
  'Ticket 1.3. Maps template.checklist_items onto the fourteen module tables. '
  'Split out of seed_wedding, which decides WHAT a wedding starts with; this '
  'decides how each module''s content lands in its own columns.';

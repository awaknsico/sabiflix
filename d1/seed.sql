-- =============================================================================
-- SabiFlix — seed data (run AFTER 0001_init.sql)
-- Console: paste and run.   CLI: wrangler d1 execute sabiflix --file=d1/seed.sql
-- IDs are pre-generated UUID v7 literals (time-sortable).
-- =============================================================================

-- Accounts -------------------------------------------------------------------
INSERT INTO users (id, clerk_id, email, display_name, role, status, created_at) VALUES
  ('0190c0de-0000-7000-8000-000000000001', 'seed_admin',   'admin@sabiflix.app',   'SabiFlix Curator', 'admin',   'active', unixepoch()),
  ('0190c0de-0000-7000-8000-000000000002', 'seed_creator', 'creator@sabiflix.app', 'Amaka Films',      'creator', 'active', unixepoch()),
  ('0190c0de-0000-7000-8000-000000000003', 'seed_viewer',  'viewer@sabiflix.app',  'Tunde Viewer',     'user',    'active', unixepoch());

-- Catalog (10 films) -----------------------------------------------------------
INSERT INTO movies (id, title, alternative_titles, actors, year, country, language, category, synopsis, poster_url, is_active, curation_type, created_by, created_at, updated_at) VALUES
  ('0190c0de-1000-7000-8000-000000000001', 'Lagos Nights', '["Eko Nights"]', '["Mike Omoregbe","Amara Nwachukwu","Tunde Salami"]', 2023, 'Nigeria', 'English', 'feature', 'A weary taxi driver navigates one unforgettable night across Lagos, colliding with strangers whose stories reshape his understanding of home, ambition, and forgiveness.', '/posters/lagos-nights.png', 1, 'admin', '0190c0de-0000-7000-8000-000000000001', unixepoch(), unixepoch()),
  ('0190c0de-1000-7000-8000-000000000002', 'The Herdman''s Daughter', '[]', '["Bimbo Ademoye","Femi Adebayo"]', 2022, 'Nigeria', 'Yoruba', 'feature', 'When a cattle-ranching patriarch dies, his only daughter must defend her inheritance against scheming relatives and a drought that threatens everything.', '/posters/herdmans-daughter.png', 1, 'admin', '0190c0de-0000-7000-8000-000000000001', unixepoch(), unixepoch()),
  ('0190c0de-1000-7000-8000-000000000003', 'Sun of the Soil', '[]', '["Yaa Owusu","Kwame Asante"]', 2024, 'Ghana', 'Twi', 'documentary', 'Cocoa farming families in Ghana''s eastern hills confront a changing climate, fair-trade cooperatives, and the promise they made to the land.', '/posters/sun-of-the-soil.png', 1, 'admin', '0190c0de-0000-7000-8000-000000000001', unixepoch(), unixepoch()),
  ('0190c0de-1000-7000-8000-000000000004', 'Market Street', '[]', '["Adjetey Anang","Nana Mensah"]', 2023, 'Ghana', 'English', 'feature', 'A single mother and a struggling tailor cross paths in Accra''s busiest market, where every bargain hides a second story.', '/posters/market-street.png', 1, 'admin', '0190c0de-0000-7000-8000-000000000001', unixepoch(), unixepoch()),
  ('0190c0de-1000-7000-8000-000000000005', 'Ubuntu', '[]', '["Thuso Mbedu","Sello Maake"]', 2021, 'South Africa', 'Zulu', 'feature', 'Two brothers on opposite sides of a land dispute discover that forgiveness is the only inheritance their father left behind.', '/posters/ubuntu.png', 1, 'admin', '0190c0de-0000-7000-8000-000000000001', unixepoch(), unixepoch());

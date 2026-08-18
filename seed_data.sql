SET search_path TO public;
INSERT INTO spot_posts (body, category, latitude, longitude, location_hint, expires_at) VALUES
('Spotted: loose golden dog wandering near the playground. Friendly but nervous.', 'pets', 37.7749, -122.4194, 'Central park playground', NOW() + INTERVAL '5 hours'),
('Spotted: someone giving away a blue couch on the curb. Looks clean.', 'free', 37.7792, -122.4181, 'Oak & 3rd', NOW() + INTERVAL '12 hours'),
('Spotted: taco truck handing out free leftover rice bowls before closing.', 'food', 37.7715, -122.4230, 'Market Street corner', NOW() + INTERVAL '2 hours'),
('Spotted: heavy police activity blocking one lane. Use side streets.', 'safety', 37.7765, -122.4145, '3rd Street', NOW() + INTERVAL '1 hour');
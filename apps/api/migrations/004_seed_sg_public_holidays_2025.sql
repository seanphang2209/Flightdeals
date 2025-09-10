-- 004_seed_sg_public_holidays_2025.sql
-- Official Singapore public holidays for 2025 (MOM gazette)
-- Source: MOM press release “Public Holidays for 2025” (5 Aug 2024)

INSERT OR REPLACE INTO sg_holidays (date, name) VALUES
('2025-01-01', 'New Year''s Day'),
('2025-01-29', 'Chinese New Year (Day 1)'),
('2025-01-30', 'Chinese New Year (Day 2)'),
('2025-03-31', 'Hari Raya Puasa'),
('2025-04-18', 'Good Friday'),
('2025-05-01', 'Labour Day'),
('2025-05-12', 'Vesak Day'),
('2025-06-07', 'Hari Raya Haji'),
('2025-08-09', 'National Day'),
('2025-10-20', 'Deepavali'),
('2025-12-25', 'Christmas Day');



alter table public.profiles
 add column if not exists country text check (country ~ '^[A-Z]{2}$'),
 add column if not exists relationship_status text check (relationship_status in ('single','in_relationship','engaged','married','complicated')),
 add column if not exists living_in text check (char_length(living_in)<=80),
 add column if not exists hometown text check (char_length(hometown)<=80),
 add column if not exists education text check (char_length(education)<=120),
 add column if not exists work text check (char_length(work)<=120),
 add column if not exists birth_year int check (birth_year between 1900 and 2100),
 add column if not exists lat numeric(6,2) check (lat between -90 and 90),
 add column if not exists lng numeric(6,2) check (lng between -180 and 180);

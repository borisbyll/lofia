-- Remplacement de nb_pieces (ambigu) par nb_salons (salon/séjour)
-- nb_pieces est conservé pour compatibilité mais nb_salons est la valeur métier

alter table public.biens
  add column if not exists nb_salons int;

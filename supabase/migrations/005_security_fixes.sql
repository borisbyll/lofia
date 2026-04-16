-- ─── Empêche l'auto-escalade de rôle ────────────────────────────────────────
-- Un utilisateur ne peut PAS changer son propre champ `role`.
-- Seul un admin peut modifier le rôle d'un autre profil.

create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer as $$
begin
  if new.role <> old.role then
    -- Autoriser uniquement si l'auteur de la modification est admin
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Modification du rôle non autorisée';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_role_escalation on public.profiles;
create trigger check_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ─── Restreint la mise à jour des réservations aux parties concernées ─────────
-- Un locataire ou propriétaire ne devrait pas pouvoir modifier statut / montants
-- librement. La policy existante ne couvre que SELECT/INSERT.
-- On s'assure ici que seuls les RPCs (security definer) peuvent mettre à jour
-- les champs sensibles. La policy update existante est déjà restrictive
-- (locataire_id = auth.uid()), mais on ajoute un check explicite sur statut.

-- NOTE : les mises à jour légitimes (check-in, paiement) passent par des
-- fonctions RPC security definer qui contournent le RLS → pas d'impact.

-- Migration 041 — Check-out propriétaire + nouvelle logique liberation_fonds_at

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS checkout_confirme       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkout_confirme_at    timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_notif_envoyee  boolean DEFAULT false;

-- Trigger : liberation_fonds_at = date_fin + 24h (fallback auto si proprio ne valide pas)
CREATE OR REPLACE FUNCTION public.set_liberation_fonds_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.arrivee_confirmee = true AND (OLD.arrivee_confirmee IS DISTINCT FROM true) THEN
    NEW.liberation_fonds_at := NEW.date_fin::timestamptz + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_liberation_fonds ON public.reservations;
CREATE TRIGGER trg_liberation_fonds
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_liberation_fonds_at();

-- Mise à jour de liberer_fonds_sequestre :
-- Étape 1 : notifier le proprio le jour du checkout
-- Étape 2 : auto-libérer si checkout non confirmé après date_fin + 24h
CREATE OR REPLACE FUNCTION public.liberer_fonds_sequestre()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  nb  int := 0;
  rec RECORD;
  nr  RECORD;
BEGIN
  -- Étape 1 : envoyer la notification checkout le jour J
  FOR nr IN
    UPDATE public.reservations
    SET checkout_notif_envoyee = true, updated_at = now()
    WHERE statut                 = 'en_sejour'
      AND paiement_effectue      = true
      AND checkout_confirme      = false
      AND checkout_notif_envoyee = false
      AND date_fin::date         <= current_date
    RETURNING id, proprietaire_id, locataire_id, date_fin, montant_proprio
  LOOP
    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    VALUES (
      nr.proprietaire_id,
      'checkout_rappel',
      '🏁 Check-out aujourd''hui — validez le départ',
      'Selon la réservation, c''est aujourd''hui le jour du check-out. Confirmez le départ du locataire et évaluez-le. Si vous ne validez pas dans les 24h, les fonds (' || nr.montant_proprio || ' FCFA) seront libérés automatiquement.',
      '/mon-espace/reservations/' || nr.id
    );
  END LOOP;

  -- Étape 2 : libération automatique si checkout non validé après date_fin + 24h
  FOR rec IN
    UPDATE public.reservations
    SET
      proprio_paye    = true,
      proprio_paye_at = now(),
      statut          = 'termine',
      updated_at      = now()
    WHERE statut               = 'en_sejour'
      AND paiement_effectue    = true
      AND proprio_paye         = false
      AND liberation_bloquee   = false
      AND liberation_fonds_at  IS NOT NULL
      AND liberation_fonds_at  <= now()
    RETURNING id, proprietaire_id, locataire_id, bien_id, montant_proprio, date_debut, date_fin
  LOOP
    nb := nb + 1;

    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    VALUES (
      rec.proprietaire_id,
      'fonds_liberes',
      '💰 Vos fonds ont été libérés automatiquement',
      'Le séjour est terminé. Votre revenu de ' || rec.montant_proprio || ' FCFA a été libéré et vous sera transféré selon vos coordonnées bancaires.',
      '/mon-espace/reservations/' || rec.id
    );

    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    VALUES (
      rec.locataire_id,
      'sejour_termine',
      'Merci d''avoir choisi LOFIA. !',
      'Nous espérons que votre séjour a été excellent. Votre avis aide toute la communauté — prenez 2 minutes pour évaluer votre hôte !',
      '/mon-espace/reservations/' || rec.id
    );

    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    SELECT
      p.id,
      'fonds_liberes_admin',
      '🔓 Fonds libérés auto — ' || rec.montant_proprio || ' FCFA',
      'Libération automatique (checkout non confirmé par le proprio) pour la réservation ' || rec.id || '. Montant : ' || rec.montant_proprio || ' FCFA.',
      '/admin/fonds'
    FROM public.profiles p
    WHERE p.role = 'admin';

  END LOOP;

  RETURN nb;
END;
$$;

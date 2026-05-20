-- Migration 039 — Améliorer les notifications de libération de fonds
-- Inclut le montant exact, le lien vers la réservation, et notifie les admins

CREATE OR REPLACE FUNCTION public.liberer_fonds_sequestre()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  nb  int := 0;
  rec RECORD;
BEGIN
  -- Libérer les fonds des réservations éligibles
  FOR rec IN
    UPDATE public.reservations
    SET
      proprio_paye    = true,
      proprio_paye_at = now(),
      statut          = 'termine',
      updated_at      = now()
    WHERE statut             = 'en_sejour'
      AND paiement_effectue  = true
      AND proprio_paye       = false
      AND liberation_fonds_at IS NOT NULL
      AND liberation_fonds_at <= now()
    RETURNING id, proprietaire_id, locataire_id, bien_id, montant_proprio, date_debut, date_fin
  LOOP
    nb := nb + 1;

    -- Notification propriétaire — riche avec montant + lien
    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    SELECT
      rec.proprietaire_id,
      'fonds_liberes',
      '💰 Vos fonds ont été libérés !',
      'Le séjour est terminé et le check-in a été confirmé. Votre revenu de ' ||
        rec.montant_proprio || ' FCFA a été libéré et vous sera transféré selon vos coordonnées bancaires.',
      '/mon-espace/reservations/' || rec.id;

    -- Notification locataire — confirmer fin de séquestre
    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    SELECT
      rec.locataire_id,
      'sejour_termine',
      '🏁 Séjour terminé',
      'Votre séjour est terminé. Merci d''avoir utilisé LOFIA. N''oubliez pas de laisser un avis !',
      '/mon-espace/reservations/' || rec.id;

    -- Notification à tous les admins
    INSERT INTO public.notifications (user_id, type, titre, corps, lien)
    SELECT
      p.id,
      'fonds_liberes_admin',
      '🔓 Fonds libérés — ' || rec.montant_proprio || ' FCFA',
      'Libération automatique pour la réservation ' || rec.id || '. Montant proprio : ' || rec.montant_proprio || ' FCFA.',
      '/admin'
    FROM public.profiles p
    WHERE p.role = 'admin';

  END LOOP;

  RETURN nb;
END;
$$;

-- ── Module 1 — Disponibilités courte durée ──────────────────────────
-- Utilise la table `reservations` existante (pas de doublon)

CREATE TABLE IF NOT EXISTS public.disponibilites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id         UUID NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  type            TEXT NOT NULL DEFAULT 'reserve'
    CHECK (type IN ('reserve', 'bloque', 'disponible')),
  reservation_id  UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dispo_dates_coherentes CHECK (date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS idx_dispo_bien     ON public.disponibilites(bien_id);
CREATE INDEX IF NOT EXISTS idx_dispo_dates    ON public.disponibilites(date_debut, date_fin);

ALTER TABLE public.disponibilites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispo_select_all" ON public.disponibilites
  FOR SELECT USING (true);

CREATE POLICY "dispo_proprio_manage" ON public.disponibilites
  FOR ALL USING (
    (select auth.uid()) = (
      SELECT owner_id FROM public.biens WHERE id = bien_id
    )
  );

-- Colonnes de confort sur reservations (si absentes)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS motif_annulation TEXT,
  ADD COLUMN IF NOT EXISTS date_annulation  TIMESTAMPTZ;

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatPrix } from '@/lib/utils'

const S = StyleSheet.create({
  page:       { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.5 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #8B1A2E', paddingBottom: 12 },
  logo:       { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#8B1A2E' },
  logoSub:    { fontSize: 8, color: '#7a5c3a', marginTop: 2 },
  docTitle:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#8B1A2E', textAlign: 'center', marginBottom: 4 },
  numBox:     { backgroundColor: '#FAE8EC', padding: '6 12', borderRadius: 4, marginBottom: 20, textAlign: 'center' },
  numText:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#8B1A2E' },
  art:        { marginBottom: 14 },
  artTitle:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#8B1A2E', borderBottom: '1px solid #FAE8EC', paddingBottom: 3, marginBottom: 6 },
  row:        { flexDirection: 'row', marginBottom: 3 },
  label:      { width: 160, color: '#7a5c3a', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  val:        { flex: 1 },
  note:       { fontSize: 8.5, color: '#555', marginTop: 3 },
  bold:       { fontFamily: 'Helvetica-Bold' },
  sigRow:     { flexDirection: 'row', gap: 20, marginTop: 28 },
  sigBox:     { flex: 1, border: '1px solid #FAE8EC', borderRadius: 4, padding: 10 },
  sigTitle:   { fontFamily: 'Helvetica-Bold', color: '#8B1A2E', marginBottom: 6, fontSize: 10 },
  sigLine:    { borderBottom: '1px solid #ccc', marginTop: 20, marginBottom: 4 },
  sigMeta:    { fontSize: 7.5, color: '#888' },
  foot:       { position: 'absolute', bottom: 24, left: 48, right: 48, borderTop: '1px solid #FAE8EC', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footTxt:    { fontSize: 7.5, color: '#7a5c3a' },
})

function Champ({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.row}>
      <Text style={S.label}>{label} :</Text>
      <Text style={S.val}>{value}</Text>
    </View>
  )
}

export interface ContratLDData {
  numeroContrat:            string
  dateContrat:              string
  nomProprio:               string
  telProprio:               string
  nomLocataire:             string
  telLocataire:             string
  adresseBien:              string
  typeBien:                 string
  superficie:               number | null
  equipements:              string[]
  loyerMensuel:             number
  charges:                  number
  depotGarantie:            number
  dureeeMois:               number
  dateDebut:                string
  dateFin:                  string
  conditionsParticulieres?: string
  fraisDossier:             number
  dateSignLoc?:             string
  dateSignPro?:             string
  ipSignLoc?:               string
  ipSignPro?:               string
}

export function ContratLDPDF({ data }: { data: ContratLDData }) {
  const totalMensuel = data.loyerMensuel + data.charges

  return (
    <Document>
      <Page size="A4" style={S.page}>

        <View style={S.header}>
          <View><Text style={S.logo}>LOFIA.</Text><Text style={S.logoSub}>Immobilier Togo · lofia.vercel.app</Text></View>
          <Text style={{ fontSize: 9, color: '#7a5c3a', textAlign: 'right' }}>CONTRAT DE BAIL{'\n'}D&apos;HABITATION</Text>
        </View>

        <Text style={S.docTitle}>CONTRAT DE BAIL D&apos;HABITATION</Text>
        <View style={S.numBox}>
          <Text style={S.numText}>N° {data.numeroContrat}   ·   Établi le {data.dateContrat}</Text>
        </View>

        {/* Art. 1 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 1 — Les parties</Text>
          <Text style={[S.bold, { marginBottom: 3 }]}>Le Bailleur (Propriétaire)</Text>
          <Champ label="Nom complet" value={data.nomProprio} />
          <Champ label="Téléphone"  value={data.telProprio} />
          <Text style={[S.bold, { marginTop: 6, marginBottom: 3 }]}>Le Preneur (Locataire)</Text>
          <Champ label="Nom complet" value={data.nomLocataire} />
          <Champ label="Téléphone"  value={data.telLocataire} />
        </View>

        {/* Art. 2 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 2 — Désignation du bien</Text>
          <Champ label="Adresse"    value={data.adresseBien} />
          <Champ label="Type"       value={data.typeBien} />
          {data.superficie && <Champ label="Surface" value={`${data.superficie} m²`} />}
          {data.equipements?.length > 0 && <Champ label="Équipements" value={data.equipements.join(', ')} />}
        </View>

        {/* Art. 3 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 3 — Durée du bail</Text>
          <Champ label="Durée"      value={`${data.dureeeMois} mois`} />
          <Champ label="Date début" value={data.dateDebut} />
          <Champ label="Date fin"   value={data.dateFin} />
          <Text style={S.note}>Reconduction tacite si absence de résiliation 1 mois avant l&apos;échéance.</Text>
        </View>

        {/* Art. 4 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 4 — Loyer et charges</Text>
          <Champ label="Loyer mensuel"  value={formatPrix(data.loyerMensuel)} />
          <Champ label="Charges"        value={formatPrix(data.charges)} />
          <Champ label="Total mensuel"  value={formatPrix(totalMensuel)} />
          <Text style={S.note}>Payable le 5 de chaque mois. Mode : Espèces / Mobile Money / Virement.</Text>
        </View>

        {/* Art. 5 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 5 — Dépôt de garantie</Text>
          <Champ label="Montant" value={formatPrix(data.depotGarantie)} />
          <Text style={S.note}>Restituable dans les 30 jours suivant l&apos;état des lieux de sortie.</Text>
        </View>

        {/* Art. 6 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 6 — Frais de mise en relation LOFIA</Text>
          <Champ label="Frais dossier" value={`${formatPrix(data.fraisDossier)} (à la charge du bailleur)`} />
          <Text style={S.note}>Ce contrat a été généré et archivé par la plateforme LOFIA · lofia.vercel.app</Text>
        </View>

        {/* Art. 7 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 7 — Obligations du Bailleur</Text>
          <Text>• Délivrer le bien en bon état d&apos;usage et de réparation</Text>
          <Text>• Assurer la jouissance paisible du bien</Text>
          <Text>• Réaliser les réparations importantes (gros œuvre, toiture, installations)</Text>
        </View>

        {/* Art. 8 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 8 — Obligations du Preneur</Text>
          <Text>• Payer le loyer et les charges aux échéances convenues</Text>
          <Text>• User du bien en bon père de famille</Text>
          <Text>• Ne pas sous-louer sans accord écrit du Bailleur</Text>
          <Text>• Restituer le bien en bon état en fin de bail</Text>
        </View>

        {/* Art. 9 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 9 — Résiliation</Text>
          <Text>Préavis locataire : 1 mois. Préavis bailleur : 3 mois (hors faute grave du preneur).</Text>
        </View>

        {/* Conditions particulières */}
        {data.conditionsParticulieres && (
          <View style={S.art}>
            <Text style={S.artTitle}>Conditions particulières</Text>
            <Text>{data.conditionsParticulieres}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={S.sigRow}>
          {[
            { label: 'Le Bailleur',  nom: data.nomProprio,   date: data.dateSignPro, ip: data.ipSignPro },
            { label: 'Le Preneur',   nom: data.nomLocataire, date: data.dateSignLoc, ip: data.ipSignLoc },
          ].map(({ label, nom, date, ip }) => (
            <View key={label} style={S.sigBox}>
              <Text style={S.sigTitle}>{label}</Text>
              <Text style={{ marginBottom: 3 }}>{nom}</Text>
              {date
                ? <Text style={{ fontSize: 8.5, color: '#2D6A4F' }}>✓ Validé le {date}{ip ? `\nIP : ${ip}` : ''}</Text>
                : <View style={S.sigLine} />
              }
              <Text style={S.sigMeta}>Validé électroniquement via LOFIA</Text>
            </View>
          ))}
        </View>

        <View style={S.foot} fixed>
          <Text style={S.footTxt}>Contrat généré par LOFIA · lofia.vercel.app</Text>
          <Text style={S.footTxt}>contact@lofia.com · Lomé, Togo</Text>
        </View>

      </Page>
    </Document>
  )
}

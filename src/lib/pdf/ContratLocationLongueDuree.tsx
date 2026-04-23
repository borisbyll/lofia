import React from 'react'
import path from 'path'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

// Formatage FCFA sans espace insécable (Helvetica ne la contient pas → rendu en /)
function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}

const LOGO = path.join(process.cwd(), 'public/icons/icon-96x96.png')

const S = StyleSheet.create({
  page:       { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.5 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '2px solid #8B1A2E', paddingBottom: 12 },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg:    { width: 36, height: 36 },
  logoText:   { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#8B1A2E' },
  logoSub:    { fontSize: 7.5, color: '#7a5c3a', marginTop: 2 },
  contacts:   { fontSize: 7.5, color: '#7a5c3a', textAlign: 'right', lineHeight: 1.6 },
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

        {/* En-tête */}
        <View style={S.header}>
          <View>
            <View style={S.logoRow}>
              <Image src={LOGO} style={S.logoImg} />
              <Text style={S.logoText}>LOFIA.</Text>
            </View>
            <Text style={S.logoSub}>Plateforme immobiliere du Togo</Text>
          </View>
          <View>
            <Text style={S.contacts}>
              lofia.vercel.app{'\n'}
              contact@lofia.com{'\n'}
              +228 99 79 47 72{'\n'}
              Lome, Togo
            </Text>
          </View>
        </View>

        <Text style={S.docTitle}>CONTRAT DE BAIL D'HABITATION</Text>
        <View style={S.numBox}>
          <Text style={S.numText}>N° {data.numeroContrat}   ·   Etabli le {data.dateContrat}</Text>
        </View>

        {/* Art. 1 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 1 — Les parties</Text>
          <Text style={[S.bold, { marginBottom: 3 }]}>Le Bailleur (Proprietaire)</Text>
          <Champ label="Nom complet" value={data.nomProprio} />
          <Champ label="Telephone"   value={data.telProprio} />
          <Text style={[S.bold, { marginTop: 6, marginBottom: 3 }]}>Le Preneur (Locataire)</Text>
          <Champ label="Nom complet" value={data.nomLocataire} />
          <Champ label="Telephone"   value={data.telLocataire} />
        </View>

        {/* Art. 2 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 2 — Designation du bien</Text>
          <Champ label="Adresse"    value={data.adresseBien} />
          <Champ label="Type"       value={data.typeBien} />
          {data.superficie ? <Champ label="Surface" value={`${data.superficie} m2`} /> : null}
          {data.equipements?.length > 0 && <Champ label="Equipements" value={data.equipements.join(', ')} />}
        </View>

        {/* Art. 3 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 3 — Duree du bail</Text>
          <Champ label="Duree"      value={`${data.dureeeMois} mois`} />
          <Champ label="Date debut" value={data.dateDebut} />
          <Champ label="Date fin"   value={data.dateFin} />
          <Text style={S.note}>Reconduction tacite si absence de resiliation 1 mois avant l'echeance.</Text>
        </View>

        {/* Art. 4 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 4 — Loyer et charges</Text>
          <Champ label="Loyer mensuel"  value={fmt(data.loyerMensuel)} />
          <Champ label="Charges"        value={fmt(data.charges)} />
          <Champ label="Total mensuel"  value={fmt(totalMensuel)} />
          <Text style={S.note}>Payable le 5 de chaque mois. Mode : Especes / Mobile Money / Virement.</Text>
        </View>

        {/* Art. 5 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 5 — Depot de garantie</Text>
          <Champ label="Montant" value={fmt(data.depotGarantie)} />
          <Text style={S.note}>Restituable dans les 30 jours suivant l'etat des lieux de sortie.</Text>
        </View>

        {/* Art. 6 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 6 — Frais de mise en relation LOFIA</Text>
          <Champ label="Frais dossier" value={`${fmt(data.fraisDossier)} (a la charge du bailleur)`} />
          <Text style={S.note}>Ce contrat a ete genere et archive par la plateforme LOFIA · lofia.vercel.app</Text>
        </View>

        {/* Art. 7 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 7 — Obligations du Bailleur</Text>
          <Text>• Delivrer le bien en bon etat d'usage et de reparation</Text>
          <Text>• Assurer la jouissance paisible du bien</Text>
          <Text>• Realiser les reparations importantes (gros oeuvre, toiture, installations)</Text>
        </View>

        {/* Art. 8 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 8 — Obligations du Preneur</Text>
          <Text>• Payer le loyer et les charges aux echeances convenues</Text>
          <Text>• User du bien en bon pere de famille</Text>
          <Text>• Ne pas sous-louer sans accord ecrit du Bailleur</Text>
          <Text>• Restituer le bien en bon etat en fin de bail</Text>
        </View>

        {/* Art. 9 */}
        <View style={S.art}>
          <Text style={S.artTitle}>Article 9 — Resiliation</Text>
          <Text>Preavis locataire : 1 mois. Preavis bailleur : 3 mois (hors faute grave du preneur).</Text>
        </View>

        {/* Conditions particulieres */}
        {data.conditionsParticulieres && (
          <View style={S.art}>
            <Text style={S.artTitle}>Conditions particulieres</Text>
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
                ? <Text style={{ fontSize: 8.5, color: '#2D6A4F' }}>Valide le {date}{ip ? `\nIP : ${ip}` : ''}</Text>
                : <View style={S.sigLine} />
              }
              <Text style={S.sigMeta}>Valide electroniquement via LOFIA</Text>
            </View>
          ))}
        </View>

        {/* Pied de page */}
        <View style={S.foot} fixed>
          <Text style={S.footTxt}>Contrat genere par LOFIA · lofia.vercel.app</Text>
          <Text style={S.footTxt}>contact@lofia.com · +228 99 79 47 72 · Lome, Togo</Text>
        </View>

      </Page>
    </Document>
  )
}

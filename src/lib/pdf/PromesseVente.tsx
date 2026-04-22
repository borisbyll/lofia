import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatPrix } from '@/lib/utils'

const S = StyleSheet.create({
  page:     { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.5 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #8B1A2E', paddingBottom: 12 },
  logo:     { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#8B1A2E' },
  logoSub:  { fontSize: 8, color: '#7a5c3a', marginTop: 2 },
  title:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#8B1A2E', textAlign: 'center', marginBottom: 4 },
  numBox:   { backgroundColor: '#FAE8EC', padding: '6 12', borderRadius: 4, marginBottom: 20, textAlign: 'center' },
  numText:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#8B1A2E' },
  art:      { marginBottom: 14 },
  artTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#8B1A2E', borderBottom: '1px solid #FAE8EC', paddingBottom: 3, marginBottom: 6 },
  row:      { flexDirection: 'row', marginBottom: 3 },
  label:    { width: 160, color: '#7a5c3a', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  val:      { flex: 1 },
  note:     { fontSize: 8.5, color: '#555', marginTop: 3 },
  bold:     { fontFamily: 'Helvetica-Bold' },
  sigRow:   { flexDirection: 'row', gap: 20, marginTop: 28 },
  sigBox:   { flex: 1, border: '1px solid #FAE8EC', borderRadius: 4, padding: 10 },
  sigTitle: { fontFamily: 'Helvetica-Bold', color: '#8B1A2E', marginBottom: 6 },
  sigLine:  { borderBottom: '1px solid #ccc', marginTop: 20, marginBottom: 4 },
  sigMeta:  { fontSize: 7.5, color: '#888' },
  foot:     { position: 'absolute', bottom: 24, left: 48, right: 48, borderTop: '1px solid #FAE8EC', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footTxt:  { fontSize: 7.5, color: '#7a5c3a' },
})

function Champ({ label, value }: { label: string; value: string }) {
  return <View style={S.row}><Text style={S.label}>{label} :</Text><Text style={S.val}>{value}</Text></View>
}

export interface PromesseData {
  numeroPromesse:     string
  datePromesse:       string
  nomVendeur:         string
  telVendeur:         string
  nomAcheteur:        string
  telAcheteur:        string
  adresseBien:        string
  typeBien:           string
  superficie:         number | null
  prixVente:          number
  commissionLofia:    number
  conditions?:        string
  dateLimite?:        string
  dateSignVendeur?:   string
  dateSignAcheteur?:  string
}

export function PromesseVentePDF({ data }: { data: PromesseData }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>

        <View style={S.header}>
          <View><Text style={S.logo}>LOFIA.</Text><Text style={S.logoSub}>Immobilier Togo · lofia.vercel.app</Text></View>
          <Text style={{ fontSize: 9, color: '#7a5c3a', textAlign: 'right' }}>PROMESSE DE VENTE</Text>
        </View>

        <Text style={S.title}>PROMESSE DE VENTE</Text>
        <View style={S.numBox}><Text style={S.numText}>N° {data.numeroPromesse}   ·   Établie le {data.datePromesse}</Text></View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article 1 — Le Vendeur</Text>
          <Champ label="Nom complet" value={data.nomVendeur} />
          <Champ label="Téléphone"  value={data.telVendeur} />
        </View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article 2 — L&apos;Acheteur</Text>
          <Champ label="Nom complet" value={data.nomAcheteur} />
          <Champ label="Téléphone"  value={data.telAcheteur} />
        </View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article 3 — Bien concerné</Text>
          <Champ label="Adresse" value={data.adresseBien} />
          <Champ label="Type"    value={data.typeBien} />
          {data.superficie && <Champ label="Superficie" value={`${data.superficie} m²`} />}
        </View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article 4 — Prix de vente</Text>
          <Champ label="Prix convenu" value={formatPrix(data.prixVente)} />
          <Text style={S.note}>Les frais de notaire et d&apos;enregistrement (~10-13% du prix) sont à la charge de l&apos;acheteur.</Text>
        </View>

        {data.conditions && (
          <View style={S.art}>
            <Text style={S.artTitle}>Article 5 — Conditions suspensives</Text>
            <Text>{data.conditions}</Text>
          </View>
        )}

        <View style={S.art}>
          <Text style={S.artTitle}>Article {data.conditions ? '6' : '5'} — Délai de réalisation</Text>
          {data.dateLimite && <Champ label="Date limite" value={data.dateLimite} />}
          <Text style={S.note}>La vente devra être finalisée chez le notaire avant la date limite indiquée ci-dessus.</Text>
        </View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article {data.conditions ? '7' : '6'} — Frais LOFIA</Text>
          <Champ label="Commission" value={data.commissionLofia > 0 ? `${formatPrix(data.commissionLofia)} (à la charge du vendeur)` : 'Gratuit (offre de lancement)'} />
        </View>

        <View style={S.art}>
          <Text style={S.artTitle}>Article {data.conditions ? '8' : '7'} — Clause de dédit</Text>
          <Text>En cas de rétractation de l&apos;acheteur sans motif valable, celui-ci peut perdre tout acompte versé.</Text>
          <Text>En cas de rétractation du vendeur, il devra restituer le double de tout acompte reçu.</Text>
        </View>

        <View style={S.sigRow}>
          {[
            { label: 'Le Vendeur',  nom: data.nomVendeur,  date: data.dateSignVendeur },
            { label: 'L\'Acheteur', nom: data.nomAcheteur, date: data.dateSignAcheteur },
          ].map(({ label, nom, date }) => (
            <View key={label} style={S.sigBox}>
              <Text style={S.sigTitle}>{label}</Text>
              <Text style={{ marginBottom: 3 }}>{nom}</Text>
              {date
                ? <Text style={{ fontSize: 8.5, color: '#2D6A4F' }}>✓ Validé le {date}</Text>
                : <View style={S.sigLine} />
              }
              <Text style={S.sigMeta}>Validé électroniquement via LOFIA</Text>
            </View>
          ))}
        </View>

        <View style={S.foot} fixed>
          <Text style={S.footTxt}>Promesse de vente générée par LOFIA · lofia.vercel.app</Text>
          <Text style={S.footTxt}>contact@lofia.com · Lomé, Togo</Text>
        </View>
      </Page>
    </Document>
  )
}

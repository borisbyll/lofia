// Générateurs de références uniques LOFIA.
// Format : LOF-{MODULE}-{ANNÉE}-{4 chiffres aléatoires}

function randPart(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

const annee = () => new Date().getFullYear().toString()

export function genererRefLongueDuree():  string { return `LOF-LD-${annee()}-${randPart()}` }
export function genererRefVente():        string { return `LOF-VT-${annee()}-${randPart()}` }
export function genererRefContrat():      string { return `LOF-CT-${annee()}-${randPart()}` }
export function genererRefPromesse():     string { return `LOF-PV-${annee()}-${randPart()}` }
export function genererRefReservation():  string { return `LOF-CD-${annee()}-${randPart()}` }

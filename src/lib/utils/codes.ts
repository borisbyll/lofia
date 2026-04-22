const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I pour éviter confusion

function randomCode(len = 4): string {
  let code = ''
  for (let i = 0; i < len; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

export function genererCodeVisite(prefix = 'LOF'): string {
  return `${prefix}-${new Date().getFullYear()}-${randomCode()}`
}

export function genererNumeroContrat(prefix = 'LOF-LD'): string {
  return `${prefix}-${new Date().getFullYear()}-${randomCode(4)}`
}

export function genererNumeroPromesse(): string {
  return genererNumeroContrat('LOF-PV')
}

export function genererCodeVisiteVente(): string {
  return genererCodeVisite('LOF-VT')
}

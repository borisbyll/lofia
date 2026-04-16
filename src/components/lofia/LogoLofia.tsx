/**
 * LogoLofia — Composant logo officiel LOFIA.
 * À utiliser partout à la place du texte brut "LOFIA."
 *
 * variant="dark"  → texte bordeaux (sur fond clair)
 * variant="light" → texte blanc (sur fond bordeaux/sombre)
 */
export function LogoLofia({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light'
  className?: string
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#8B1A2E'

  return (
    <span
      className={`inline-flex items-center font-black tracking-tight select-none ${className}`}
      style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1 }}
      aria-label="LOFIA."
    >
      {/* L */}
      <span style={{ color: textColor }}>L</span>

      {/* O → cercle serrure */}
      <svg
        viewBox="0 0 100 100"
        className="inline-block"
        style={{
          width: '0.88em',
          height: '0.88em',
          margin: '0 0.03em',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="50" fill="#8B1A2E" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#D4A832" strokeWidth="5" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#D4A832" strokeWidth="1.5" />
        <circle cx="50" cy="37" r="11" fill="white" />
        <path d="M41,47 L59,47 L55,66 L45,66 Z" fill="white" />
      </svg>

      {/* FIA. */}
      <span style={{ color: textColor }}>FIA.</span>

      {/* Point vert */}
      <span
        style={{
          color: '#2D6A4F',
          fontSize: '0.42em',
          marginLeft: '0.12em',
          alignSelf: 'flex-end',
          marginBottom: '0.08em',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        ●
      </span>
    </span>
  )
}

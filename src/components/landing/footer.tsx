export function Footer() {
  return (
    <footer
      className="py-8"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <p
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Built by Eventry &middot; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}

export function Footer() {
  return (
    <footer
      className="border-t py-8"
      style={{ borderColor: 'var(--border-subtle)' }}
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

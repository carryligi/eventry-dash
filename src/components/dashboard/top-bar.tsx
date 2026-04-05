interface TopBarProps {
  title: string
  pingerActive?: boolean
  silentlyActive?: boolean
}

export function TopBar({ title, pingerActive, silentlyActive }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {pingerActive !== undefined && (
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: pingerActive ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${pingerActive ? 'rgba(48,209,88,0.18)' : 'rgba(255,255,255,0.06)'}`,
              color: pingerActive ? 'var(--success)' : 'var(--text-tertiary)',
            }}
          >
            <span
              className="inline-block size-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: pingerActive ? 'var(--success)' : 'var(--text-tertiary)' }}
            />
            Pinger {pingerActive ? 'Active' : 'Off'}
          </div>
        )}
        {silentlyActive !== undefined && (
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: silentlyActive ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${silentlyActive ? 'rgba(48,209,88,0.18)' : 'rgba(255,255,255,0.06)'}`,
              color: silentlyActive ? 'var(--success)' : 'var(--text-tertiary)',
            }}
          >
            <span
              className="inline-block size-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: silentlyActive ? 'var(--success)' : 'var(--text-tertiary)' }}
            />
            Silently {silentlyActive ? 'Active' : 'Off'}
          </div>
        )}
      </div>
    </div>
  )
}

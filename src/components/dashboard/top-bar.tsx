interface TopBarProps {
  title: string
  pingerActive?: boolean
  silentlyActive?: boolean
}

export function TopBar({ title, pingerActive, silentlyActive }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b relative"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)',
        }}
      />

      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {pingerActive !== undefined && (
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              background: pingerActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${pingerActive ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)'}`,
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
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              background: silentlyActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${silentlyActive ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)'}`,
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

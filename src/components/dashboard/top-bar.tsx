interface TopBarProps {
  title: string
  pingerActive?: boolean
  silentlyActive?: boolean
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        active
          ? 'bg-ev-success/8 border-ev-success/18 text-ev-success'
          : 'bg-white/4 border-white/6 text-ev-text-tertiary'
      }`}
    >
      <span
        className={`inline-block size-1.5 rounded-full mr-1.5 ${
          active ? 'bg-ev-success' : 'bg-ev-text-tertiary'
        }`}
      />
      {label} {active ? 'Active' : 'Off'}
    </div>
  )
}

export function TopBar({ title, pingerActive, silentlyActive }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-ev-border-subtle">
      <h1 className="text-xl font-medium tracking-tight text-ev-text-primary">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {pingerActive !== undefined && (
          <StatusBadge label="Pinger" active={pingerActive} />
        )}
        {silentlyActive !== undefined && (
          <StatusBadge label="Silently" active={silentlyActive} />
        )}
      </div>
    </div>
  )
}

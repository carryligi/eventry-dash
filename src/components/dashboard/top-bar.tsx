import { Badge } from '@/components/ui/badge'

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
      {/* Subtle bottom edge sheen */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.04) 30%, rgba(192,192,192,0.04) 70%, transparent 100%)',
        }}
      />

      <h1
        className="text-xl font-semibold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {pingerActive !== undefined && (
          <Badge
            variant={pingerActive ? 'default' : 'secondary'}
            className="text-xs"
          >
            {pingerActive ? (
              <>
                <span
                  className="inline-block size-1.5 rounded-full mr-1"
                  style={{ backgroundColor: 'var(--success)' }}
                />
                Pinger Active
              </>
            ) : (
              <>
                <span
                  className="inline-block size-1.5 rounded-full mr-1"
                  style={{ backgroundColor: 'var(--text-tertiary)' }}
                />
                Pinger Off
              </>
            )}
          </Badge>
        )}
        {silentlyActive !== undefined && (
          <Badge
            variant={silentlyActive ? 'default' : 'secondary'}
            className="text-xs"
          >
            {silentlyActive ? (
              <>
                <span
                  className="inline-block size-1.5 rounded-full mr-1"
                  style={{ backgroundColor: 'var(--success)' }}
                />
                Silently Active
              </>
            ) : (
              <>
                <span
                  className="inline-block size-1.5 rounded-full mr-1"
                  style={{ backgroundColor: 'var(--text-tertiary)' }}
                />
                Silently Off
              </>
            )}
          </Badge>
        )}
      </div>
    </div>
  )
}

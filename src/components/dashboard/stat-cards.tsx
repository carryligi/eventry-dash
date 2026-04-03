import { Tag, Activity, Zap, CalendarClock } from 'lucide-react'

interface StatCardsProps {
  keywordCount: number
  totalMatches: number
  pingerActive: boolean
  todayMatches: number
}

const stats = [
  {
    key: 'keywords',
    label: 'Keywords',
    icon: Tag,
    getValue: (p: StatCardsProps) => p.keywordCount,
    getSubtext: () => 'Tracked keywords',
  },
  {
    key: 'total',
    label: 'Total Matches',
    icon: Activity,
    getValue: (p: StatCardsProps) => p.totalMatches,
    getSubtext: () => 'All time',
  },
  {
    key: 'pinger',
    label: 'Pinger',
    icon: Zap,
    getValue: (p: StatCardsProps) => (p.pingerActive ? 'Active' : 'Off'),
    getSubtext: (p: StatCardsProps) =>
      p.pingerActive ? 'Monitoring events' : 'Not running',
  },
  {
    key: 'today',
    label: "Today's Matches",
    icon: CalendarClock,
    getValue: (p: StatCardsProps) => p.todayMatches,
    getSubtext: () => 'Since midnight',
  },
] as const

export function StatCards(props: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        const value = stat.getValue(props)
        const subtext = stat.getSubtext(props)
        const isPinger = stat.key === 'pinger'
        const isActive = isPinger && props.pingerActive

        return (
          <div
            key={stat.key}
            className="glass-card group relative overflow-hidden"
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: isActive
                  ? 'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent 100%)',
              }}
            />

            {/* Hover sheen */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)',
              }}
            />

            <div className="relative px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.label}
                </span>
                <div
                  className="flex items-center justify-center size-7 rounded-lg"
                  style={{
                    backgroundColor: isActive ? 'rgba(74,222,128,0.08)' : 'var(--bg-tertiary)',
                  }}
                >
                  <Icon
                    className="size-3.5"
                    style={{ color: isActive ? 'var(--success)' : 'var(--text-tertiary)' }}
                  />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                {isPinger ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{ backgroundColor: 'var(--success)', opacity: 0.4 }}
                        />
                      )}
                      <span
                        className="relative inline-flex size-2 rounded-full"
                        style={{ backgroundColor: isActive ? 'var(--success)' : 'var(--text-tertiary)' }}
                      />
                    </span>
                    <span
                      className="text-2xl font-semibold tracking-tight"
                      style={{ color: isActive ? 'var(--success)' : 'var(--text-primary)' }}
                    >
                      {value}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-semibold tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {value}
                  </span>
                )}
              </div>

              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {subtext}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

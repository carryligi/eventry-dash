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
            className="glass-card relative overflow-hidden"
          >
            <div className="px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium uppercase tracking-widest text-ev-text-tertiary">
                  {stat.label}
                </span>
                <div
                  className={`flex items-center justify-center size-7 rounded-lg ${
                    isActive ? 'bg-ev-success/8' : 'bg-ev-tertiary'
                  }`}
                >
                  <Icon
                    className={`size-3.5 ${
                      isActive ? 'text-ev-success' : 'text-ev-text-tertiary'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                {isPinger ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      {isActive && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-ev-success opacity-40" />
                      )}
                      <span
                        className={`relative inline-flex size-2 rounded-full ${
                          isActive ? 'bg-ev-success' : 'bg-ev-text-tertiary'
                        }`}
                      />
                    </span>
                    <span
                      className={`text-2xl font-medium tracking-tight ${
                        isActive ? 'text-ev-success' : 'text-ev-text-primary'
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-medium tracking-tight tabular-nums text-ev-text-primary">
                    {value}
                  </span>
                )}
              </div>

              <p className="text-xs mt-1.5 text-ev-text-tertiary">
                {subtext}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

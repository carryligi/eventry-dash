import { Tag, Bell, Zap } from 'lucide-react'

const features = [
  {
    icon: Tag,
    title: 'Keyword Monitoring',
    description:
      'Define keywords and track them across multiple Discord servers in real time. Never miss a relevant conversation.',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    description:
      'Get instant alerts the moment your keywords are mentioned. Configurable notification rules per keyword.',
  },
  {
    icon: Zap,
    title: 'Auto-Start Tasks',
    description:
      'Trigger automated actions when keywords fire. Start processes, send webhooks, or kick off workflows automatically.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-md">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Features
          </p>
          <h2
            className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Everything you need to stay ahead
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg sm:grid-cols-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          {features.map((feature) => (
            <div key={feature.title} className="glass-card flex h-full flex-col p-7 sm:p-8">
              <div
                className="glass-panel mb-5 flex h-9 w-9 items-center justify-center rounded-md"
              >
                <feature.icon
                  className="h-4 w-4"
                  style={{ color: 'var(--text-accent)' }}
                  strokeWidth={1.75}
                />
              </div>
              <h3
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

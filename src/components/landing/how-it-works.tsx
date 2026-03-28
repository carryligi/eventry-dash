'use client'

import { Reveal } from '@/components/shared/reveal'

const steps = [
  {
    number: '01',
    title: 'Set Keywords',
    description:
      'Add the keywords you care about and choose which Discord servers to monitor. Fine-tune with inclusion and exclusion rules.',
  },
  {
    number: '02',
    title: 'Get Notified',
    description:
      'Receive real-time push notifications when a keyword is detected. See the full message context, author, and channel.',
  },
  {
    number: '03',
    title: 'Auto-Start',
    description:
      'Attach automated actions to keywords. When a match fires, your configured tasks start instantly without manual intervention.',
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Divider line */}
      <div
        className="absolute left-6 right-6 top-0 mx-auto h-px max-w-6xl"
        style={{ backgroundColor: 'var(--border-subtle)' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mb-16 max-w-md">
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}
            >
              How it works
            </p>
            <h2
              className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Three steps. Zero friction.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.15}>
              <div className="relative">
                {/* Step number */}
                <span
                  className="mb-4 block font-mono text-xs font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {step.number}
                </span>

                {/* Connecting line for desktop */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute right-0 top-1 hidden h-px w-[calc(100%-3rem)] translate-x-full sm:block"
                    style={{ backgroundColor: 'var(--border-subtle)' }}
                    aria-hidden="true"
                  />
                )}

                <h3
                  className="mb-2 text-base font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

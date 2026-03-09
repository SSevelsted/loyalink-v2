import { Check, X } from 'lucide-react'

const criteria = [
  'Attracts clients who value the work',
  'Clients always pay full price',
  'Built-in referral system',
  'See exactly who keeps coming back',
  'Works passively — not just when you post',
]

const columns = [
  {
    name: 'Flash Sales',
    values: [false, false, false, false, false],
    highlight: false,
  },
  {
    name: 'Voucher Deals',
    values: [false, false, false, false, true],
    highlight: false,
  },
  {
    name: 'Social Hustle',
    values: [true, true, false, false, false],
    highlight: false,
  },
  {
    name: 'Loyalink',
    values: [true, true, true, true, true],
    highlight: true,
  },
]

export function Comparison() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Qatar Airways does it.<br />So does Revolut and Amex.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every premium brand runs a loyalty program — not because it&apos;s trendy, but because keeping a good client is far cheaper than finding a new one. The same logic applies to your studio.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-4 text-muted-foreground font-medium">Feature</th>
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className={`px-5 py-4 text-center font-semibold ${
                      col.highlight
                        ? 'text-primary bg-primary/5 border-l border-r border-primary/20'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, i) => (
                <tr key={criterion} className={i < criteria.length - 1 ? 'border-b border-border/20' : ''}>
                  <td className="px-5 py-4 text-foreground font-medium">{criterion}</td>
                  {columns.map((col) => (
                    <td
                      key={col.name}
                      className={`px-5 py-4 text-center ${
                        col.highlight ? 'bg-primary/5 border-l border-r border-primary/20' : ''
                      }`}
                    >
                      {col.values[i] ? (
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                          <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

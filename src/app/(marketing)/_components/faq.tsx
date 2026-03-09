import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    q: 'Do my customers need to download an app?',
    a: 'No. Loyalink passes go directly into Apple Wallet or Google Wallet — the pre-installed apps on every iPhone and Android. Customers scan a QR code with their camera and the pass is added in seconds. Zero app downloads required.',
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'You get full access to all features on your chosen plan for 14 days at no cost. We collect your payment details upfront to make activation seamless when the trial ends, but you will not be charged a single euro during the trial period.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'On day 15, your subscription begins and your card is charged for the monthly base fee plus any usage. We\'ll email you a reminder a few days before so there are no surprises. You can cancel any time before then.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your settings page with one click — no phone calls, no retention flows. Your program stays active until the end of the billing period and your customer data is exportable at any time.',
  },
  {
    q: 'How does cashback work — does it cost me money?',
    a: 'Cashback is funded entirely by you as a configurable percentage of each transaction (typically 3–10%). The key difference from a discount is that cashback can only be spent back at your studio, so the money stays in your ecosystem. Customers feel rewarded without you ever selling at a loss.',
  },
  {
    q: "What's the difference between Basic and Pro?",
    a: 'Basic is great for a single-location studio that wants wallet passes, cashback, and referrals. Pro adds multi-tier loyalty (Silver/Gold/VIP), automated push notifications, audience segmentation, the AI Story Generator, and support for up to 5 locations. Both plans include the full per-member usage pricing tiers.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="py-20 px-4 bg-muted/10">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Questions?<br />We&apos;ve got answers.
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border/40 bg-card/50 px-5 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

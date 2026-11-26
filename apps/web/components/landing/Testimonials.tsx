// ASSUMPTION: illustrative placeholder testimonials. Replace with real, attributed customer quotes before launch.
const QUOTES = [
  {
    quote: "It found $3k/month of wasted spend in an account I'd been running for a year. The creative suggestions alone were worth it.",
    name: "Agency owner",
    role: "Performance marketing agency",
  },
  {
    quote: "I send the PDF to clients every Monday. It reads like I spent hours on the audit.",
    name: "Freelance media buyer",
    role: "E-commerce & lead gen",
  },
  {
    quote: "Finally understood why our CPM doubled. Frequency was 5+ on retargeting. Fixed it the same day.",
    name: "Founder",
    role: "DTC skincare brand",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Testimonials</span>
          <h2 className="section-title mt-4">Loved by marketers who live in Ads Manager</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure key={q.name} className="card flex flex-col p-6">
              <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                {"★★★★★"}
              </div>
              <blockquote className="mt-4 flex-1 text-slate-700 dark:text-slate-300">&ldquo;{q.quote}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-semibold text-white">
                  {q.name[0]}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{q.name}</span>
                  <span className="block text-xs text-slate-500">{q.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

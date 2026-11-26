import { ChevronDown } from "lucide-react";

export const FAQS = [
  {
    q: "Do I need to connect my Meta ad account?",
    a: "No. You export a report from Ads Manager and upload the file. We never ask for your Meta login or access tokens.",
  },
  {
    q: "Which file formats are supported?",
    a: "CSV and XLSX exports from Meta Ads Manager (Export → Export table data). For the most complete analysis include delivery, spend, impressions, reach, clicks, landing page views, results, purchases and conversion value columns.",
  },
  {
    q: "Which columns do I need?",
    a: "At minimum: Campaign name, Amount spent and Impressions. Ad set name, Ad name, Day, Age, Gender and conversion columns unlock deeper creative, audience and trend analysis.",
  },
  {
    q: "Is my data secure?",
    a: "Files are sent over HTTPS, read once to calculate your metrics, and the original file is not kept. Only the aggregated numbers are saved so you can reopen the report, and you can delete a report at any time.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "The AI only reasons over the numbers in your file and shows the metrics behind each recommendation. Treat it like a sharp second opinion: verify big budget moves in Ads Manager.",
  },
  {
    q: "How do I pay, and can I cancel?",
    a: "Paid plans are billed monthly by card (Visa, Mastercard, Amex and more) through our secure payment provider. Your card details never touch our servers, and you can cancel anytime.",
  },
  { q: "Can I white-label reports for clients?", a: "Yes, on the Agency plan. Exports can carry your logo and colors." },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-28 dark:bg-slate-950/60">
      <div className="container max-w-3xl">
        <div className="text-center">
          <span className="eyebrow">FAQ</span>
          <h2 className="section-title mt-4">Questions, answered</h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 dark:text-white">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

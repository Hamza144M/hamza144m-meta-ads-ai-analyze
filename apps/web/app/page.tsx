import { AnalysisPreview } from "@/components/landing/AnalysisPreview";
import { FAQ, FAQS } from "@/components/landing/FAQ";
import { Features } from "@/components/landing/Features";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { Footer } from "@/components/ui/Footer";
import { PLANS } from "@/components/landing/Pricing";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { Navbar } from "@/components/ui/Navbar";

// Structured data so Google understands the product, its prices and the FAQ.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: String(p.price), priceCurrency: "USD" })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <AnalysisPreview />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

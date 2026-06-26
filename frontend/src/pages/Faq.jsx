import React from "react";
import { useApp } from "../context/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

export default function Faq() {
  const { t } = useApp();
  return (
    <div data-testid="faq-page" className="max-w-3xl mx-auto px-6 lg:px-10 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-[#E8704C] mb-6">{t.faq.eyebrow}</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight">{t.faq.title}</h1>
      <div className="mt-12">
        <Accordion type="single" collapsible className="w-full">
          {t.faq.items.map((it, i) => (
            <AccordionItem value={`item-${i}`} key={i} className="border-b border-[#EFE4D0]" data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="text-left font-display text-xl hover:no-underline">{it.q}</AccordionTrigger>
              <AccordionContent className="text-[#5C6680] leading-relaxed">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

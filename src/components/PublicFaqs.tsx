import * as React from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Faq = { q: string; a: string };

export default function PublicFaqs({
  faqs,
  title = "FAQs",
  expandAll = false,
}: {
  faqs: readonly Faq[];
  title?: string;
  expandAll?: boolean;
}) {
  const [open, setOpen] = React.useState<number[]>([]);
  const id = React.useId();
  const allOpen = open.length === faqs.length;

  return (
    <section aria-label={title} className="px-5 py-20">
      <div className="mx-auto grid max-w-[880px] gap-8 md:grid-cols-2">
        <h2 className="text-[34px] font-medium text-foreground">{title}</h2>
        <div className="min-w-0">
          {expandAll && (
            <Button
              variant="ghost"
              onClick={() => setOpen(allOpen ? [] : faqs.map((_, i) => i))}
              className="mb-2 ml-auto flex h-auto gap-2 rounded-none p-0 text-[15px] font-normal text-muted-foreground hover:bg-transparent"
            >
              {allOpen ? "Collapse all" : "Expand all"}
              <ChevronsUpDown className="size-4" />
            </Button>
          )}
          {faqs.map((faq, i) => {
            const isOpen = open.includes(i);
            return (
              <div key={faq.q} className="border-b border-gc-line">
                <Button
                  variant="ghost"
                  aria-expanded={isOpen}
                  aria-controls={`${id}-${i}`}
                  onClick={() => setOpen((current) => isOpen
                    ? current.filter((value) => value !== i)
                    : expandAll ? [...current, i] : [i])}
                  className="flex h-auto w-full justify-between gap-3 rounded-none px-0 py-5 text-left text-[15px] font-normal text-foreground hover:bg-transparent sm:text-[16px]"
                >
                  <span className="whitespace-nowrap">{faq.q}</span>
                  <X className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${isOpen ? "" : "rotate-45"}`} />
                </Button>
                <div
                  id={`${id}-${i}`}
                  aria-hidden={!isOpen}
                  className={`grid transition-all duration-300 motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"}`}
                >
                  <p className="overflow-hidden text-[15px] leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
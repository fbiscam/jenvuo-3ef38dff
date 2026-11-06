import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";

/* "Choose how to get started" — shared by /platform and the homepage (xAI-style cards). */

const pillDark =
  "flex h-9 w-full items-center justify-center rounded-full bg-foreground text-[14px] font-medium text-background transition hover:opacity-85";
const pillLight =
  "flex h-9 w-full items-center justify-center rounded-full bg-gc-pill text-[14px] font-medium text-foreground transition-colors hover:brightness-95";

function StartBuilding() {
  const { user } = useAuthUser();
  return (
    <Link to={user ? "/dashboard/models" : "/founding"} className={pillDark}>
      {user ? "Start Building" : "Apply now"}
    </Link>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3 border-t border-gc-line pt-6 text-[14px] leading-snug text-gc-ink">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gc-ink-muted" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, items, action }: { title: string; sub: string; items: string[]; action: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl bg-gc-surface p-7 sm:p-9">
      <h3 className="text-[22px] font-medium tracking-tight text-gc-ink">{title}</h3>
      <p className="mt-3 text-[15px] font-normal text-foreground">{sub}</p>
      <div className="flex-1">
        <Ticks items={items} />
      </div>
      <div className="mt-10">{action}</div>
    </div>
  );
}

export function GetStartedSection() {
  return (
    <section className="bg-background px-5">
      <div className="mx-auto max-w-7xl">
        <div className="border-t border-gc-line pb-20 pt-20 text-center sm:pt-24">
          <h2 className="text-[28px] font-medium tracking-tight text-gc-ink sm:text-[32px]">Choose how to get started</h2>
          <div className="mx-auto mt-12 grid w-full max-w-7xl gap-5 text-left md:grid-cols-2">
            <Card
              title="Build on your own"
              sub="Launch your AI-powered product with:"
              items={[
                "Access leading models through one API",
                "Simple pay-as-you-go pricing",
                "Works with the OpenAI SDK",
                "Build with our API docs and examples",
              ]}
              action={<StartBuilding />}
            />
            <Card
              title="Get extra support"
              sub="Hands-on help and custom needs for your team."
              items={[
                "Talk to our team about your product",
                "Get hands-on setup guidance",
                "Discuss volume and custom needs",
                "Billing support for teams",
              ]}
              action={<Link to="/contact" className={pillLight}>Contact Sales</Link>}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

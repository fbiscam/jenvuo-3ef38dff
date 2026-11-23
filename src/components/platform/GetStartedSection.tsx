import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { RevealWords } from "@/components/RevealWords";
import { useAuthUser } from "@/hooks/useAuthUser";

/* "Choose how to get started" — shared by /platform and the homepage (xAI-style cards). */

const pillDark =
  "flex h-9 w-full items-center justify-center rounded-full bg-foreground text-[14px] font-medium text-background transition hover:opacity-85";
const pillLight =
  "flex h-10 w-full items-center justify-center rounded-full border border-gc-line bg-transparent text-[14px] font-medium text-foreground transition-colors hover:bg-foreground/5";

function StartBuilding() {
  const { user } = useAuthUser();
  return (
    <Link to={user ? "/dashboard/models" : "/auth"} search={user ? undefined : ({ mode: "signup" } as never)} className={pillDark}>
      {user ? "Explore models" : "Sign up"}
    </Link>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3 border-t border-gc-line pt-6 text-[12px] leading-snug text-gc-ink min-[360px]:text-[13px] sm:text-[14px]">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-2 sm:gap-3">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gc-ink-muted" />
          <span className="whitespace-nowrap sm:whitespace-normal">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, items, action }: { title: string; sub: string; items: string[]; action: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-gc-surface p-5 sm:p-9">
      <h3 className="text-[22px] font-medium tracking-tight text-gc-ink">{title}</h3>
      <p className="mt-3 whitespace-nowrap text-[12px] font-normal text-foreground min-[360px]:text-[13px] sm:whitespace-normal sm:text-[15px]">{sub}</p>
      <div className="flex-1">
        <Ticks items={items} />
      </div>
      <div className="mt-10">{action}</div>
    </div>
  );
}

export function GetStartedSection() {
  return (
    <section className="bg-background">
      <div className="site-edge">
        <div className="border-t border-gc-line pb-20 pt-20 text-center sm:pt-24">
          <h2 className="text-[28px] font-medium tracking-tight text-gc-ink sm:text-[32px]"><RevealWords>Choose how to get started</RevealWords></h2>
          <div className="mx-auto mt-12 grid w-full max-w-7xl gap-5 text-left md:grid-cols-2">
            <Card
              title="Use API keys & Chat"
              sub="AI for code, images & everyday work."
              items={[
                "Leading models through one API",
                "Simple pay-as-you-go pricing",
                "Works with the OpenAI SDK",
                "Scripts, bot code, images & docs",
              ]}
              action={<StartBuilding />}
            />
            <Card
              title="Get extra support"
              sub="Setup help & custom team needs."
              items={[
                "Talk to our team about your API",
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

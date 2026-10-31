import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";

/* "Get started" — shared by /platform and the homepage. */

const SIGN_IN = "https://auth.jenvu.com/sign-in";
const pillDark =
  "inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-85";
const pillLight =
  "inline-flex items-center gap-1.5 rounded-full border border-gc-line bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";

function StartBuilding() {
  const { user } = useAuthUser();
  if (user) {
    return (
      <Link to="/dashboard/models" className={pillLight}>
        Start building <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    );
  }
  return (
    <a href={SIGN_IN} className={pillLight}>
      Start building <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3 text-[16px] leading-snug text-gc-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function GetStartedSection() {
  return (
    <section className="bg-background py-20 text-center">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">Get started</h2>
        <div className="mt-10 grid gap-6 text-left md:grid-cols-2">
          <div className="flex flex-col rounded-md border border-gc-line bg-background p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Partner with us on your AI plans</h3>
            <div className="flex-1">
              <Ticks
                items={[
                  "Talk to our team about your product",
                  "Get hands-on setup guidance",
                  "Discuss volume and custom needs",
                ]}
              />
            </div>
            <div className="mt-8">
              <Link to="/contact" className={pillDark}>Contact sales</Link>
            </div>
          </div>
          <div className="flex flex-col rounded-md border border-gc-line bg-background p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Build on your own</h3>
            <div className="flex-1">
              <Ticks
                items={[
                  "Access leading models through one API",
                  "Simple pay-as-you-go pricing",
                  "Works with the OpenAI SDK",
                  "Build with our API docs and examples",
                ]}
              />
            </div>
            <div className="mt-8">
              <StartBuilding />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

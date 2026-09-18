import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Sub-processors — QuePilot" };

const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Database, authentication, and (where used) file storage",
    data: "All account, project, and deliverable data; auth credentials (hashed)",
    location: "us-east-1 (AWS region)",
    link: "https://supabase.com/privacy",
  },
  {
    name: "Vercel",
    purpose: "Application hosting and edge middleware",
    data: "Request/response traffic in transit; no persistent data store of its own",
    location: "Global edge network (US-based company)",
    link: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Stripe",
    purpose: "Payment processing and subscription billing",
    data: "Billing email, plan/subscription status, payment method (Stripe holds full card details directly — QuePilot never receives them)",
    location: "US-based company, global processing infrastructure",
    link: "https://stripe.com/privacy",
  },
  {
    name: "OpenAI or Microsoft Azure OpenAI",
    purpose: "AI-generated deliverable drafting — whichever provider a given QuePilot deployment is configured to use (src/lib/ai/provider.ts)",
    data: "Project intake data sent as part of the generation prompt: customer name, industry, user count, licensing tier, geographic locations, and free-text compliance notes",
    location: "Depends on configured provider/region — confirm the specific deployment's terms before entering highly sensitive client information",
    link: "https://openai.com/policies/privacy-policy",
  },
  {
    name: "Sentry",
    purpose: "Application error tracking",
    data: "Not yet active in production — the SDK is wired into the codebase but no live DSN is configured, so no data currently flows to Sentry",
    location: "N/A — not yet active",
    link: "https://sentry.io/privacy/",
  },
];

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Sub-processors" lastUpdated="[DATE — fill in on publish]">
      <p>
        This is the detailed, current list referenced from our{" "}
        <a href="/privacy">Privacy Policy</a> (§4) and <a href="/dpa">Data Processing Agreement</a>{" "}
        (§6). A sub-processor is any third party we use that processes account or project data on
        our behalf to operate QuePilot.
      </p>

      <p>
        We&apos;ll update this page whenever a sub-processor is added or removed. [Insert the actual
        notice mechanism once one exists — e.g., &quot;customers on the Professional plan can
        subscribe to change notifications at…&quot; — this needs a real decision, not a placeholder
        promise.]
      </p>

      <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover">
              <th className="px-3 py-2 font-medium">Sub-processor</th>
              <th className="px-3 py-2 font-medium">Purpose</th>
              <th className="px-3 py-2 font-medium">Data processed</th>
              <th className="px-3 py-2 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((sp) => (
              <tr key={sp.name} className="border-b border-border last:border-0">
                <td className="break-words px-3 py-2 align-top font-medium">
                  <a href={sp.link} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {sp.name}
                  </a>
                </td>
                <td className="break-words px-3 py-2 align-top text-foreground/90">{sp.purpose}</td>
                <td className="break-words px-3 py-2 align-top text-foreground/90">{sp.data}</td>
                <td className="break-words px-3 py-2 align-top text-foreground/90">{sp.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        This list is generated from a direct read of the codebase&apos;s actual integrations
        (Supabase client usage, the Stripe SDK, `src/lib/ai/provider.ts`, and the Sentry SDK
        wiring) as of this document&apos;s last update, not from a compliance database — it will
        drift if a new integration is added without updating this page. Treat it as accurate as of
        the date above, not as a live system.
      </p>
    </LegalPage>
  );
}

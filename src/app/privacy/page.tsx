import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy — BravoPilot" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="[DATE — fill in on publish]">
      <p>
        This Privacy Policy explains what information BravoPilot (operated by
        <strong> [LEGAL ENTITY NAME]</strong>) collects, how it&apos;s used, and who it&apos;s shared
        with. It&apos;s written to describe what the product actually does today, not aspirationally.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address, and OAuth profile information if you sign in with Microsoft or Google.</li>
        <li>
          <strong>Project &amp; intake data:</strong> whatever you enter about a client engagement —
          customer name, industry, user counts, licensing tier, geographic locations, and free-text
          compliance notes. If you enter your own client&apos;s information here, you are responsible
          for having the right to do so.
        </li>
        <li><strong>Generated content:</strong> every deliverable BravoPilot generates or you edit, and its full version history.</li>
        <li><strong>Branding assets:</strong> firm name, accent color, and a logo URL you provide, used to stamp your exports.</li>
        <li><strong>Billing data:</strong> plan and subscription status. Payment card details are collected and stored by Stripe directly — we never receive or store your full card number.</li>
        <li><strong>Usage data:</strong> basic operational records (e.g., generation timestamps) used to enforce fair-use limits described below.</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To operate the core product: intake, AI-assisted drafting, editing, export, and team collaboration.</li>
        <li>To process payment and manage your subscription.</li>
        <li>To enforce a daily generation limit that exists purely to prevent runaway automated usage — it is not used to profile or restrict normal use.</li>
        <li>To maintain security and investigate misuse.</li>
      </ul>
      <p>We do not sell your information, and we do not use your project content to train our own models.</p>

      <h2>3. AI Processing — Where Your Content Actually Goes</h2>
      <p>
        Generating a deliverable sends your project data — including the compliance notes field and
        the knowledge-base reference content relevant to your selected services — to a third-party AI
        model provider (OpenAI or Microsoft Azure OpenAI, depending on how your BravoPilot deployment
        is configured) in order to produce the draft. <strong>We rely on that provider&apos;s own data
        handling and retention terms for what happens to your content once it reaches them</strong> —
        confirm the specific data-retention and training-use terms in effect for your deployment
        before entering highly sensitive client information. [Insert the specific zero-retention /
        enterprise-terms commitment once one is actually in place with the configured provider.]
      </p>

      <h2>4. Who We Share Information With</h2>
      <p>
        We use a small set of subprocessors to provide the service, and don&apos;t share your
        information with anyone beyond what&apos;s needed to run BravoPilot. The current, detailed
        list — what each one does, what data it touches, and where it&apos;s hosted — is maintained
        on our <a href="/subprocessors">Sub-processors</a> page rather than duplicated here, so it
        stays accurate as our infrastructure changes. A business customer needing a Data Processing
        Agreement covering these subprocessors can find one at <a href="/dpa">/dpa</a>.
      </p>
      <p>We may also disclose information if required by law or to protect the rights, safety, or property of BravoPilot or others.</p>

      <h2>5. Data Retention &amp; Deletion</h2>
      <p>
        We keep your data for as long as your account is active. Deleting your account from Settings
        is <strong>immediate and permanent</strong>: it removes every project, deliverable, deliverable
        version history, and branding setting associated with the account, for every teammate on it,
        and cannot be undone. There is currently no self-service data export beyond downloading
        individual generated deliverables — a bulk export tool is not yet built. If you need a full
        export of your account&apos;s data before deleting it, contact us first.
      </p>

      <h2>6. Data Security</h2>
      <p>
        Data is isolated per account at the database layer, and access to your account is scoped to
        the teammates you&apos;ve explicitly invited. Data is encrypted in transit. We do not
        currently offer multi-factor authentication as a user-facing feature. Security is an ongoing
        program, not a finished state — see our security page [link once published] for current
        practices.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, or delete your personal
        information, and to receive a copy of it. You can delete your own account data at any time;
        for anything else, contact <strong>[privacy/support email]</strong>.
      </p>

      <h2>8. Children</h2>
      <p>BravoPilot is a business tool and is not directed at, or intended for use by, children.</p>

      <h2>9. International Data Transfers</h2>
      <p>
        BravoPilot&apos;s infrastructure is hosted in a single region today ([region]). If you access
        the service from outside that region, your information will be transferred to and processed
        there. We do not currently offer region-specific or data-residency-controlled hosting.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>We&apos;ll post updates here with a new &quot;last updated&quot; date, and provide reasonable notice before a material change takes effect.</p>

      <h2>11. Contact</h2>
      <p>Questions about this Policy or your data: <strong>[privacy/support email]</strong>.</p>
    </LegalPage>
  );
}

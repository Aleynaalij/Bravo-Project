import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of Service — BravoPilot" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="[DATE — fill in on publish]">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern access to and use of BravoPilot, a service
        operated by <strong>[LEGAL ENTITY NAME]</strong> (&quot;BravoPilot,&quot; &quot;we,&quot;
        &quot;us&quot;). By creating an account or otherwise using BravoPilot, you agree to these
        Terms. If you&apos;re accepting on behalf of an organization, you&apos;re confirming you have
        authority to bind that organization.
      </p>

      <h2>1. What BravoPilot Does</h2>
      <p>
        BravoPilot helps Microsoft consulting professionals draft client deliverables — executive
        summaries, statements of work, design documents, and related artifacts — using AI models
        combined with a curated knowledge base. It is a drafting accelerator, not a substitute for
        professional judgment.
      </p>

      <h2>2. AI-Generated Content — Read This Before You Send Anything to a Client</h2>
      <ul>
        <li>
          Every deliverable BravoPilot generates is a <strong>first draft produced by an AI
          model</strong>, not certified compliance, legal, security, or architectural advice, and not
          reviewed by a subject-matter expert before it reaches you.
        </li>
        <li>
          You are solely responsible for reviewing, editing, and validating any generated content
          before relying on it or delivering it to a client. BravoPilot is not responsible for
          inaccuracies, omissions, or consequences that follow from unreviewed AI output.
        </li>
        <li>
          Knowledge base reference content is written to be generally useful and is not a substitute
          for a compliance professional&apos;s review of your specific client&apos;s situation.
        </li>
      </ul>

      <h2>3. Accounts &amp; Teams</h2>
      <ul>
        <li>You must provide accurate information and keep your login credentials secure.</li>
        <li>
          An account owner may invite teammates. Everyone invited to an account can view and edit
          every project on that account — there is currently no per-project permission boundary
          between teammates. Only the account owner can manage billing, invite or remove teammates,
          or delete the account.
        </li>
        <li>
          You&apos;re responsible for the activity of everyone you invite onto your account.
        </li>
      </ul>

      <h2>4. Subscriptions &amp; Billing</h2>
      <ul>
        <li>Paid plans are billed in advance on a recurring basis and processed by Stripe; we never see or store your full card number.</li>
        <li>You can cancel at any time from Billing; cancellation takes effect at the end of the current billing period unless stated otherwise at checkout.</li>
        <li>[Refund policy — fill in: e.g., no refunds for partial periods / pro-rated refunds within N days / etc.]</li>
        <li>We may change prices with notice before your next renewal.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use BravoPilot to generate unlawful, infringing, or deliberately deceptive content.</li>
        <li>Attempt to circumvent rate limits, usage safeguards, or account-scoping controls.</li>
        <li>Probe, scan, or attempt to access another account&apos;s data.</li>
        <li>Resell or provide third-party access to the service outside your own organization without our written consent.</li>
      </ul>

      <h2>6. Your Content</h2>
      <p>
        You retain ownership of the project information you enter and the deliverables BravoPilot
        generates for you. You grant us a license to process that content — including sending it to
        the AI model provider configured for your account — solely to provide and improve the
        service. See our <a href="/privacy">Privacy Policy</a> for how project data, including any
        client information you enter, is handled.
      </p>

      <h2>7. Third-Party Services</h2>
      <p>
        BravoPilot is built on and relies on third-party infrastructure to operate, including
        database/authentication hosting, application hosting, payment processing, and an AI model
        provider. A current list is in our <a href="/privacy">Privacy Policy</a>. Your use of
        BravoPilot is also subject to the acceptable-use terms of the AI model provider processing
        your requests.
      </p>

      <h2>8. Termination &amp; Deletion</h2>
      <p>
        You may delete your account at any time from Settings. <strong>Deletion is immediate and
        permanent</strong> — it removes every project, deliverable, and branding setting on the
        account for every teammate, and cannot be undone. We may suspend or terminate accounts that
        violate these Terms.
      </p>

      <h2>9. Disclaimers &amp; Limitation of Liability</h2>
      <p>
        BravoPilot is provided &quot;as is&quot; without warranties of any kind, express or implied.
        To the maximum extent permitted by law, [LEGAL ENTITY NAME] is not liable for indirect,
        incidental, or consequential damages, or for any decision made or action taken in reliance on
        AI-generated content. [Insert a liability cap tied to fees paid, reviewed by counsel.]
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of <strong>[STATE/COUNTRY]</strong>, without regard to
        conflict-of-laws principles. [Insert dispute-resolution/venue clause.]
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced with
        reasonable notice before they take effect. Continued use after changes take effect means you
        accept the updated Terms.
      </p>

      <h2>12. Contact</h2>
      <p>Questions about these Terms: <strong>[legal/support email]</strong>.</p>
    </LegalPage>
  );
}

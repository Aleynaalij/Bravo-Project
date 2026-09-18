import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Data Processing Agreement — QuePilot" };

export default function DpaPage() {
  return (
    <LegalPage title="Data Processing Agreement (DPA)" lastUpdated="[DATE — fill in on publish]">
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) supplements our{" "}
        <a href="/terms">Terms of Service</a> whenever a customer (&quot;Controller&quot;) has
        QuePilot (&quot;Processor,&quot; operated by <strong>[LEGAL ENTITY NAME]</strong>) process
        personal data on its behalf — most relevantly, any client information a consultant enters
        into a project&apos;s intake fields. It does not replace those Terms; where the two
        conflict on a data-protection matter, this DPA controls.
      </p>

      <h2>1. Scope &amp; Duration</h2>
      <p>
        This DPA applies for as long as QuePilot processes personal data on the Controller&apos;s
        behalf under the Terms — i.e., for the life of the Controller&apos;s account, ending when
        the account is deleted and any retained backups (see our{" "}
        <a href="/subprocessors">Sub-processors</a> page and internal backup procedure) are purged
        per their own retention schedule.
      </p>

      <h2>2. Subject Matter &amp; Nature of Processing</h2>
      <p>
        QuePilot processes personal data to the extent a Controller&apos;s own consultants enter
        it into project intake fields (customer name, industry, user counts, licensing tier,
        geographic locations, free-text compliance notes) and to the extent that data is included in
        AI-generated deliverable content derived from it. Processing consists of storage, display,
        editing, AI-assisted drafting (which sends the data to the configured AI provider — see §3
        below and our <a href="/privacy">Privacy Policy</a> §3), and export (DOCX/PDF/PPTX).
      </p>

      <h2>3. Categories of Data Subjects &amp; Personal Data</h2>
      <ul>
        <li>
          <strong>Data subjects:</strong> individuals whose information a Controller&apos;s
          consultants choose to enter — typically the Controller&apos;s own end clients&apos;
          personnel or organizational contacts, at the Controller&apos;s discretion. QuePilot has
          no visibility into who these individuals are beyond what&apos;s typed into free-text
          fields.
        </li>
        <li>
          <strong>Categories of data:</strong> whatever a consultant chooses to type — this is not a
          structured PII-collection form, so the realistic range spans from none (aggregate/company-
          level information only) to identifiable individual names or contact details if a consultant
          enters them in the compliance-notes field. <strong>The Controller controls what is
          entered</strong> and is responsible for having a lawful basis to enter it.
        </li>
      </ul>

      <h2>4. Processor Obligations</h2>
      <ul>
        <li>Process personal data only per the Controller&apos;s documented instructions (i.e., as configured and used through the product) or as required by law.</li>
        <li>Ensure personnel with access to Controller data are bound by confidentiality obligations. [Confirm this is formalized once the team is more than founders — an employment/contractor agreement clause, not currently a separate signed document.]</li>
        <li>Implement the technical and organizational security measures described in §5.</li>
        <li>Assist the Controller in responding to data subject rights requests (§7) and in meeting its own breach-notification obligations (§8).</li>
        <li>Delete or return personal data at the end of the relationship, per §9.</li>
      </ul>

      <h2>5. Security Measures</h2>
      <p>Current, real measures — this section describes what actually exists, not a target state:</p>
      <ul>
        <li>Per-account data isolation enforced at the database layer via Postgres Row-Level Security, applied consistently across every account-scoped table.</li>
        <li>Encryption in transit (TLS) for all traffic between the application, its database, and end users.</li>
        <li>An append-only audit log covering team and knowledge-base administrative changes.</li>
        <li>A Content-Security-Policy and standard security headers on every response.</li>
        <li>Optional user-enabled multi-factor authentication (TOTP).</li>
        <li>
          <strong>Not yet in place</strong> (tracked in <a href="https://github.com/Aleynaalij/Bravo-Project" target="_blank" rel="noreferrer">the project&apos;s own remediation tracking</a>, not hidden from this document): SOC 2 or ISO 27001 certification, a completed third-party penetration test, encryption at rest beyond what the underlying infrastructure providers apply by default, and SSO/SAML for enterprise identity federation.
        </li>
      </ul>

      <h2>6. Sub-processors</h2>
      <p>
        The Controller consents to QuePilot&apos;s use of the sub-processors listed on our{" "}
        <a href="/subprocessors">Sub-processors</a> page, which is the authoritative, current list —
        not duplicated here so it can be kept up to date in one place. [Insert the actual
        advance-notice mechanism for a new sub-processor once one exists — a real DPA typically
        gives the Controller a window to object before a new sub-processor is engaged; this needs a
        real process decision, not a placeholder promise.]
      </p>

      <h2>7. Data Subject Rights</h2>
      <p>
        QuePilot will provide reasonable assistance to the Controller in responding to a data
        subject&apos;s request to access, correct, or delete their personal data, to the extent
        that data is stored within a Controller&apos;s QuePilot account. In most cases the
        Controller can act directly — editing or deleting the relevant project data through the
        product itself is faster than routing the request through us.
      </p>

      <h2>8. Breach Notification</h2>
      <p>
        QuePilot will notify the Controller without undue delay after becoming aware of a
        personal data breach affecting the Controller&apos;s data, describing (to the extent then
        known) its nature, likely consequences, and the measures taken or proposed. [Insert a
        specific notification window — e.g., 72 hours — once agreed; this needs a real operational
        commitment behind it, not just a number copied from GDPR&apos;s own regulator-facing
        deadline.]
      </p>

      <h2>9. Deletion or Return of Data</h2>
      <p>
        On account deletion (self-service, from Settings), all project, deliverable, and branding
        data tied to the account is deleted immediately and permanently, per our{" "}
        <a href="/privacy">Privacy Policy</a> §5. This is genuinely irreversible on our end — there
        is no extended retention window or soft-delete today, so a Controller who wants an export
        before deleting needs to do so first (see that same section for current export
        limitations).
      </p>

      <h2>10. International Transfers</h2>
      <p>
        QuePilot&apos;s infrastructure is hosted in a single region today (see our{" "}
        <a href="/subprocessors">Sub-processors</a> page for the current region). [Insert Standard
        Contractual Clauses or another transfer mechanism if/when a Controller outside that
        region&apos;s adequacy framework requires one — not needed for the single-design-partner
        stage this product is at today, but a real requirement the moment an EU or other
        adequacy-relevant customer signs.]
      </p>

      <h2>11. Audit Rights</h2>
      <p>
        [Insert the actual audit mechanism once decided — a common SaaS-DPA approach is to offer a
        completed security questionnaire and/or a summary of the most recent penetration test in
        place of an on-site audit right, reserving a real audit right for cases the questionnaire
        doesn&apos;t resolve. Not decided yet; flagged rather than invented here.]
      </p>

      <h2>12. Liability</h2>
      <p>
        Liability under this DPA is subject to the limitations and exclusions set out in the{" "}
        <a href="/terms">Terms of Service</a> §9. [Confirm with counsel whether a data-protection
        carve-out to that general liability cap is needed — common in DPAs, not yet decided here.]
      </p>

      <h2>13. Contact</h2>
      <p>Data protection questions or requests under this DPA: <strong>[privacy/DPO contact email]</strong>.</p>
    </LegalPage>
  );
}

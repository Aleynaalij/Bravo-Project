import type { DeliverableType, ServiceType } from "@/lib/domain/enums";
import type { DeliverableContent } from "@/lib/validation/deliverable";

// Fictional project used only by /demo — nothing here is stored or
// generated live; it exists to teach the real workflow hands-on without
// needing a real Azure OpenAI call or a real database row. Keep this
// content realistic (the same bar as the actual Knowledge Base/prompt
// content), not filler — it's the first impression a new consultant gets
// of what the tool actually produces.

export const DEMO_PROJECT = {
  customerName: "Contoso Federal Services",
  industry: "Government",
  userCount: 250,
  licensingTier: "M365 E5",
  geographicLocations: ["United States"],
  complianceNotes: "FedRAMP Moderate; NIST 800-53 Rev 5",
};

export const DEMO_INITIAL_SERVICES: ServiceType[] = ["dlp", "retention", "cloud_migration"];

// Only these 3 have canned content — deliberately a small, focused subset
// (2 "Core" docs + 1 service-specific "Design" doc) rather than trying to
// hand-write realistic content for all 18 catalog types. The demo's
// generate step still uses the real DELIVERABLE_REQUIRES_SERVICE gating
// against this candidate list, so unchecking a service here correctly
// removes the matching deliverable — same behavior as the real app.
export const DEMO_CANDIDATE_DELIVERABLES = [
  "executive_summary",
  "statement_of_work",
  "dlp_design",
] as const satisfies readonly DeliverableType[];

export const DEMO_CONTENT: Record<(typeof DEMO_CANDIDATE_DELIVERABLES)[number], DeliverableContent> = {
  executive_summary: {
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "Contoso Federal Services has engaged [Your Firm] to strengthen data protection controls across Microsoft 365 and to plan the migration of its remaining on-premises Exchange environment to Exchange Online, ahead of a FedRAMP Moderate authorization renewal.",
        ],
      },
      {
        heading: "Business Drivers & Objectives",
        paragraphs: [
          "The engagement is driven by two converging needs: closing a data loss prevention gap identified in the agency's most recent internal security assessment, and retiring a legacy on-premises Exchange environment that is approaching end of extended support.",
          "Both workstreams must be delivered in a way that satisfies FedRAMP Moderate and NIST 800-53 Rev 5 control expectations, not as a commercial-grade rollout with compliance addressed afterward.",
        ],
      },
      {
        heading: "Scope Summary",
        paragraphs: [
          "This engagement covers three workstreams: Data Loss Prevention policy design and rollout across email and endpoints, a Retention Strategy for records management aligned to federal records schedules, and a phased Cloud Migration plan for the remaining on-premises mailboxes.",
        ],
      },
      {
        heading: "Key Recommendations",
        paragraphs: [
          "Deploy DLP policies in simulation mode first, tuned against real traffic for 2–4 weeks before enforcement, to avoid disrupting legitimate mission workflows.",
          "Sequence the Exchange Online migration in pilot-then-department waves rather than a single cutover, given the environment's size and the coexistence requirements a federal tenant type introduces.",
        ],
      },
      {
        heading: "Expected Outcomes",
        paragraphs: [
          "A documented, auditable DLP posture suitable for the upcoming FedRAMP assessment; a defensible records retention schedule; and a fully migrated, supported email environment with no extended-support legacy infrastructure remaining.",
        ],
      },
      {
        heading: "Next Steps",
        paragraphs: [
          "Review and approve the attached Statement of Work, confirm the pilot migration batch membership, and schedule the DLP simulation-mode kickoff for the following sprint.",
        ],
      },
    ],
  },
  statement_of_work: {
    sections: [
      {
        heading: "Project Overview",
        paragraphs: [
          "[Your Firm] will deliver Data Loss Prevention policy design, a Retention Strategy, and a phased Cloud Migration plan for Contoso Federal Services' Microsoft 365 environment.",
        ],
      },
      {
        heading: "Objectives",
        paragraphs: [
          "Close the DLP gap identified in the agency's internal security assessment and align data handling controls to NIST 800-53 Rev 5 ahead of the FedRAMP Moderate authorization renewal. Retire the legacy on-premises Exchange environment before its extended support window ends.",
        ],
      },
      {
        heading: "Scope of Work",
        paragraphs: [
          "DLP: Assess current data exfiltration risk across email and endpoints, design DLP policies for U.S.-based locations, deploy in simulation mode, tune based on results, and enable enforcement.",
          "Retention: Assess current records management practices, propose a retention label taxonomy aligned to applicable federal records schedules, and configure retention policies across Exchange and SharePoint.",
          "Cloud Migration: Assess the current on-premises Exchange environment, plan migration waves by department, execute a pilot migration, validate, and complete cutover in scheduled batches.",
        ],
      },
      {
        heading: "Deliverables",
        paragraphs: [
          "DLP Design document; Retention Strategy document; Cloud Migration Plan; a NIST 800-53 control-mapping summary for the DLP and retention workstreams specifically.",
        ],
      },
      {
        heading: "Roles & Responsibilities",
        paragraphs: [
          "[Your Firm]: solution design, configuration, and migration execution. Contoso Federal Services: pilot user nomination, business-unit sign-off on retention categories, and change-freeze coordination during cutover windows.",
        ],
      },
      {
        heading: "Timeline & Milestones",
        paragraphs: [
          "[Placeholder — to be finalized with the customer]: DLP simulation kickoff, pilot migration batch, DLP enforcement go-live, full migration cutover.",
        ],
      },
      {
        heading: "Assumptions & Exclusions",
        paragraphs: [
          "This engagement assumes a GCC High or equivalent authorized tenant type given the FedRAMP Moderate requirement; a commercial tenant would require re-scoping. Services not selected for this engagement (Sensitivity Labels, eDiscovery, SharePoint, App Modernization, Analytics/AI) are explicitly out of scope.",
        ],
      },
      {
        heading: "Acceptance Criteria",
        paragraphs: [
          "DLP policies operating in enforcement mode with a documented false-positive rate under 5% for two consecutive weeks; retention policies active across in-scope locations; 100% of in-scope mailboxes successfully migrated with zero data-loss tickets during the validation window.",
        ],
      },
    ],
  },
  dlp_design: {
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "This DLP Design covers Exchange Online mail flow and Windows endpoint devices for Contoso Federal Services, targeting the exfiltration risk identified in the agency's internal security assessment.",
        ],
      },
      {
        heading: "Current State Assessment",
        paragraphs: [
          "No DLP policies currently exist in the tenant. Sensitive content (personally identifiable information and controlled unclassified information) is not currently monitored in outbound email or on endpoint devices.",
        ],
      },
      {
        heading: "DLP Policy Design by Location",
        paragraphs: [
          "Exchange: a policy targeting outbound mail to external recipients, scoped to U.S.-based mail users, matching PII and CUI-pattern sensitive information types.",
          "Endpoint devices: a policy restricting copy of matched content to removable USB storage and unauthorized cloud storage applications, scoped to the same U.S.-based user population.",
        ],
      },
      {
        heading: "Sensitive Information Types & Classifiers",
        paragraphs: [
          "Built-in U.S. Social Security Number and U.S. bank account number sensitive information types, combined with a custom keyword classifier for CUI markings, to reduce false positives versus relying on a generic PII classifier alone.",
        ],
      },
      {
        heading: "Enforcement Tiers & Rollout Approach",
        paragraphs: [
          "Weeks 1–4: simulation mode (no policy tips, no blocking) to establish a false-positive baseline. Weeks 5–6: test with notifications (policy tips shown, no blocking) for the pilot department. Week 7 onward: full enforcement, expanded tenant-wide once the pilot's false-positive rate is confirmed under 5%.",
        ],
      },
      {
        heading: "Incident Response Workflow",
        paragraphs: [
          "DLP alerts route to the security operations team's existing incident queue; a triage SLA of one business day applies to high-severity matches (CUI markings) and three business days to standard PII matches.",
        ],
      },
      {
        heading: "Testing & Validation Plan",
        paragraphs: [
          "Send test messages containing mock SSN and CUI-marked content to an external recipient during simulation mode; confirm detection in the DLP alert dashboard within expected latency before proceeding to the notification tier.",
        ],
      },
      {
        heading: "Assumptions & Constraints",
        paragraphs: [
          "Assumes the tenant is GCC High or an equivalent authorized environment given the FedRAMP Moderate requirement — commercial-tenant DLP admin center features and API endpoints differ and are not assumed available.",
        ],
      },
    ],
  },
};

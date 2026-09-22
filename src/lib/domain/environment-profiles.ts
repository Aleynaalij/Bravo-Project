// The five Microsoft 365/Azure tenant deployment types a script or
// generated solution might need to target. Hardcoded, not a DB table —
// unlike coding_standards (private per account), the actual difference
// between these five environments (which Graph endpoint, which auth
// methods are viable, which compliance frameworks apply) is static
// Microsoft platform knowledge that doesn't vary per QuePilot customer,
// the same reasoning src/lib/domain/labels.ts already uses for hardcoded
// service-type reference data instead of a table.
//
// Today this is genuinely new structured data — GCC/GCC High/DoD context
// exists extensively elsewhere in this app only as free-text prose in
// knowledge_base_entries content and prompt_templates instructions (e.g.
// "state tenant-type implications (e.g., GCC High vs. commercial)"), never
// as an enum, DB column, or form field.
export const ENVIRONMENT_PROFILES = ["commercial", "gcc", "gcc_high", "dod", "azure_government"] as const;

export type EnvironmentProfile = (typeof ENVIRONMENT_PROFILES)[number];

export const ENVIRONMENT_PROFILE_LABELS: Record<EnvironmentProfile, string> = {
  commercial: "Commercial",
  gcc: "GCC",
  gcc_high: "GCC High",
  dod: "DoD",
  azure_government: "Azure Government",
};

export interface EnvironmentProfileMeta {
  graphBaseUrl: string;
  authGuidance: string;
  complianceNotes: string;
}

// Consumed by Code Creator's prompt assembly (src/lib/automation/creator.ts)
// to inject the right endpoint/auth guidance, and by its requirements form
// to decide which fields are even relevant for the chosen environment.
// First-draft platform guidance, same caveat as every KB entry in this app
// (docs/PRD.md §10) — not reviewed by a compliance/technical SME, verify
// against current Microsoft documentation before relying on it for a real
// federal engagement.
export const ENVIRONMENT_PROFILE_META: Record<EnvironmentProfile, EnvironmentProfileMeta> = {
  commercial: {
    graphBaseUrl: "https://graph.microsoft.com",
    authGuidance: "Standard Entra ID app registration — certificate or client-secret auth, or interactive/device-code auth for user-delegated scenarios.",
    complianceNotes: "No federal compliance framework implied by the environment itself.",
  },
  gcc: {
    graphBaseUrl: "https://graph.microsoft.com",
    authGuidance: "Same commercial Graph endpoint and auth model as Commercial — GCC is a compliance/licensing boundary, not a separate cloud instance.",
    complianceNotes: "Typically paired with FedRAMP Moderate / DFARS requirements — confirm the customer's actual authorization level rather than assuming from \"GCC\" alone.",
  },
  gcc_high: {
    graphBaseUrl: "https://graph.microsoft.us",
    authGuidance: "Certificate-based app-only auth is strongly preferred over client-secret or interactive auth for unattended scripts in GCC High — verify current guidance before assuming full auth-method parity with Commercial.",
    complianceNotes: "Typically paired with FedRAMP High / DFARS / ITAR-adjacent requirements — feature parity with Commercial has historically lagged for some Graph capabilities, confirm before committing a deliverable to a specific capability.",
  },
  dod: {
    graphBaseUrl: "https://dod-graph.microsoft.us",
    authGuidance: "Certificate-based app-only auth; expect the strictest auth/network posture of the five profiles — confirm current DoD IL4/IL5 guidance before assuming parity with GCC High.",
    complianceNotes: "DoD Impact Level 4/5 — the most restrictive profile here; feature availability should be confirmed against the current Microsoft 365 Government service description, not assumed from GCC High.",
  },
  azure_government: {
    graphBaseUrl: "https://graph.microsoft.us",
    authGuidance: "Same general auth model as GCC High for Graph calls; Azure resource management calls (ARM/Bicep/Terraform) target Azure Government's own management endpoints, not the commercial Azure Resource Manager endpoint.",
    complianceNotes: "Distinct from GCC High/DoD in scope — Azure Government covers infrastructure/IaaS/PaaS resources, not the Microsoft 365 workloads the other profiles focus on. Relevant mainly for Terraform/Bicep/ARM-template scripts rather than Graph/PowerShell M365 scripts.",
  },
};

import type { ServiceType } from "@/lib/domain/enums";
import type { ProjectRow } from "./service";

// Maps DB rows (snake_case) to the camelCase shape defined in
// docs/openapi.yaml's Project schema.
export function toProjectDTO(row: ProjectRow, services: ServiceType[] = []) {
  return {
    id: row.id,
    accountId: row.account_id,
    customerName: row.customer_name,
    industry: row.industry,
    userCount: row.user_count,
    licensingTier: row.licensing_tier,
    geographicLocations: row.geographic_locations,
    complianceNotes: row.compliance_notes,
    servicesInScope: services,
    status: row.status,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

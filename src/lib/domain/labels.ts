import type { DeliverableType, ServiceType } from "./enums";

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  executive_summary: "Executive Summary",
  statement_of_work: "Statement of Work",
  high_level_design: "High-Level Design",
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  dlp: "Data Loss Prevention (DLP)",
  retention: "Retention Policies / Records Management",
  sensitivity_labels: "Sensitivity Labels",
  data_lifecycle_management: "Data Lifecycle Management",
  insider_risk_management: "Insider Risk Management",
  ediscovery: "eDiscovery",
  information_protection: "Information Protection",
  communication_compliance: "Communication Compliance",
};

export const INDUSTRY_OPTIONS = [
  "Healthcare",
  "Finance",
  "Government",
  "Defense",
  "Legal",
  "Insurance",
  "Technology",
  "Other",
] as const;

export const LICENSING_TIER_OPTIONS = [
  "M365 E3",
  "M365 E5",
  "Microsoft 365 Business Premium",
  "Office 365 E3",
  "Office 365 E5",
  "Other",
] as const;

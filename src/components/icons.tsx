"use client";

// Curated re-exports from @fluentui/react-icons — Microsoft's own Fluent 2
// icon set, the same family used across Learn/M365 admin centers/Purview
// itself. Named exports verified to exist in the installed package version
// before use here; picked for direct semantic fit rather than
// closest-available-name guessing.
//
// "use client" here (not just in the leaf components that render these)
// because the icons' internal Griffel styling hook isn't safe to invoke in
// a Server Component — re-exporting through a "use client" barrel file is
// the standard fix, discovered by actually rendering these in a preview
// route rather than assuming Server Component compatibility.
export {
  ShieldTaskRegular as DlpIcon,
  ArchiveRegular as RetentionIcon,
  TagLockRegular as SensitivityLabelsIcon,
  DatabaseArrowRightRegular as DataLifecycleIcon,
  PersonWarningRegular as InsiderRiskIcon,
  DocumentSearchRegular as EdiscoveryIcon,
  LockClosedRegular as InformationProtectionIcon,
  ChatWarningRegular as CommunicationComplianceIcon,
  ClipboardCheckmarkRegular as CoreDeliverableIcon,
  FlowchartRegular as DesignDeliverableIcon,
  ArrowRepeatAllRegular as ProcessDeliverableIcon,
  CertificateRegular as ComplianceDeliverableIcon,
  WindowConsoleRegular as AutomationDeliverableIcon,
  DocumentTableRegular as DocxIcon,
  DocumentPdfRegular as PdfIcon,
  SlideTextRegular as PptxIcon,
  SparkleRegular as SparkleIcon,
  BuildingGovernmentRegular as ProjectIcon,
  CloudArrowUpRegular as CloudMigrationIcon,
  RocketRegular as AppModernizationIcon,
  LibraryRegular as SharePointIcon,
  DataTrendingRegular as AnalyticsAiIcon,
} from "@fluentui/react-icons";

import type { ServiceType } from "@/lib/domain/enums";
import type { PracticeArea } from "@/lib/domain/labels";
import type { ComponentType, SVGProps } from "react";
import {
  ShieldTaskRegular,
  ArchiveRegular,
  TagLockRegular,
  DatabaseArrowRightRegular,
  PersonWarningRegular,
  DocumentSearchRegular,
  LockClosedRegular,
  ChatWarningRegular,
  CloudArrowUpRegular,
  RocketRegular,
  LibraryRegular,
  DataTrendingRegular,
} from "@fluentui/react-icons";

export const PRACTICE_AREA_ICONS: Record<PracticeArea, ComponentType<SVGProps<SVGSVGElement>>> = {
  data_security_compliance: ShieldTaskRegular,
  cloud_migration: CloudArrowUpRegular,
  app_modernization: RocketRegular,
  sharepoint: LibraryRegular,
  analytics_ai: DataTrendingRegular,
};

export const SERVICE_ICONS: Record<ServiceType, ComponentType<SVGProps<SVGSVGElement>>> = {
  dlp: ShieldTaskRegular,
  retention: ArchiveRegular,
  sensitivity_labels: TagLockRegular,
  data_lifecycle_management: DatabaseArrowRightRegular,
  insider_risk_management: PersonWarningRegular,
  ediscovery: DocumentSearchRegular,
  information_protection: LockClosedRegular,
  communication_compliance: ChatWarningRegular,
  cloud_migration: CloudArrowUpRegular,
  app_modernization: RocketRegular,
  sharepoint: LibraryRegular,
  analytics_ai: DataTrendingRegular,
};

// A Server Component must not destructure SERVICE_ICONS and render the
// resulting function reference itself — in practice that resolves to
// undefined (a Turbopack/RSC client-boundary quirk with object-valued
// exports from a "use client" module, confirmed by rendering it in a
// throwaway preview route). Looking the icon up *inside* an already
// "use client" component like this one is safe; Server Components should
// render <ServiceIcon service={...} /> instead of doing the lookup
// themselves.
export function ServiceIcon({ service, className }: { service: ServiceType; className?: string }) {
  const Icon = SERVICE_ICONS[service];
  return <Icon className={className} />;
}

export function PracticeAreaIcon({
  area,
  className,
}: {
  area: PracticeArea;
  className?: string;
}) {
  const Icon = PRACTICE_AREA_ICONS[area];
  return <Icon className={className} />;
}

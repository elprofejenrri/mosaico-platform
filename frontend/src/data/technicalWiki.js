export const technicalWikiSections = [
  {
    id: "roadmap",
    title: "Platform Roadmap",
    summary: "The source of truth for moving MOSAICO from MVP to production platform.",
    docs: [
      { id: "platform-roadmap", title: "Platform Roadmap", path: "docs/PLATFORM_ROADMAP.md", status: "Active", owner: "Product + Engineering" },
      { id: "phase-1-execution-plan", title: "Phase 1 Execution Plan", path: "docs/PHASE_1_EXECUTION_PLAN.md", status: "Active", owner: "Engineering" },
      { id: "product-documentation", title: "Product Documentation", path: "docs/PRODUCT_DOCUMENTATION.md", status: "Reference", owner: "Product" },
      { id: "ux-interaction-standards", title: "UX Interaction Standards", path: "docs/UX_INTERACTION_STANDARDS.md", status: "Active", owner: "Product + UX" },
      { id: "teacher-calendar-workspace", title: "Teacher Calendar Workspace", path: "docs/TEACHER_CALENDAR_WORKSPACE.md", status: "Active", owner: "Product + Engineering" },
      { id: "rbac-admin-module", title: "RBAC Admin Module", path: "docs/RBAC_ADMIN_MODULE.md", status: "Active", owner: "Security + Engineering" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture And Operations",
    summary: "How the frontend, backend, database, auth, storage, and deployment pieces fit together.",
    docs: [
      { id: "architecture", title: "Architecture", path: "docs/ARCHITECTURE.md", status: "Reference", owner: "Engineering" },
      { id: "deployment-guide", title: "Deployment Guide", path: "docs/DEPLOYMENT_GUIDE.md", status: "Reference", owner: "Engineering" },
      { id: "operations-runbook", title: "Operations Runbook", path: "docs/OPERATIONS_RUNBOOK.md", status: "Reference", owner: "Operations" },
      { id: "troubleshooting", title: "Troubleshooting", path: "docs/TROUBLESHOOTING.md", status: "Reference", owner: "Support" },
    ],
  },
  {
    id: "data",
    title: "Data And API",
    summary: "Database schema, standardization, backfill/audit workflow, and API contracts.",
    docs: [
      { id: "database-schema", title: "Database Schema", path: "docs/DATABASE_SCHEMA.md", status: "Active", owner: "Engineering" },
      { id: "database-standardization-plan", title: "Database Standardization Plan", path: "docs/DATABASE_STANDARDIZATION_PLAN.md", status: "Active", owner: "Engineering" },
      { id: "phase-1-backfill-audit", title: "Phase 1 Backfill Audit", path: "backend/backfill_standardization_phase1.sql", status: "Operational", owner: "Engineering" },
      { id: "api-reference", title: "API Reference", path: "docs/API_REFERENCE.md", status: "Reference", owner: "Engineering" },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    summary: "Environment variables and safe production configuration expectations.",
    docs: [
      { id: "environment-variables", title: "Environment Variables", path: "docs/ENVIRONMENT_VARIABLES.md", status: "Reference", owner: "Engineering" },
      { id: "backend-env-example", title: "Backend Env Example", path: "backend/.env.example", status: "Template", owner: "Engineering" },
      { id: "technical-wiki", title: "Technical Wiki", path: "docs/TECHNICAL_WIKI.md", status: "Active", owner: "Engineering" },
    ],
  },
];

export const technicalWikiPrinciples = [
  "Every platform change must update or create documentation.",
  "Every production release updates the Markdown and in-app histories together.",
  "Production safety comes before validating constraints or deleting historical records.",
  "Privileged platform documentation is visible only to technical roles.",
  "Roadmap phases should ship in small, auditable changes.",
];

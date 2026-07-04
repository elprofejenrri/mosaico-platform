export const technicalWikiSections = [
  {
    id: "roadmap",
    title: "Platform Roadmap",
    summary: "The source of truth for moving MOSAICO from MVP to production platform.",
    docs: [
      { title: "Platform Roadmap", path: "docs/PLATFORM_ROADMAP.md", status: "Active", owner: "Product + Engineering" },
      { title: "Phase 1 Execution Plan", path: "docs/PHASE_1_EXECUTION_PLAN.md", status: "Active", owner: "Engineering" },
      { title: "Product Documentation", path: "docs/PRODUCT_DOCUMENTATION.md", status: "Reference", owner: "Product" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture And Operations",
    summary: "How the frontend, backend, database, auth, storage, and deployment pieces fit together.",
    docs: [
      { title: "Architecture", path: "docs/ARCHITECTURE.md", status: "Reference", owner: "Engineering" },
      { title: "Deployment Guide", path: "docs/DEPLOYMENT_GUIDE.md", status: "Reference", owner: "Engineering" },
      { title: "Operations Runbook", path: "docs/OPERATIONS_RUNBOOK.md", status: "Reference", owner: "Operations" },
      { title: "Troubleshooting", path: "docs/TROUBLESHOOTING.md", status: "Reference", owner: "Support" },
    ],
  },
  {
    id: "data",
    title: "Data And API",
    summary: "Database schema, standardization, backfill/audit workflow, and API contracts.",
    docs: [
      { title: "Database Schema", path: "docs/DATABASE_SCHEMA.md", status: "Active", owner: "Engineering" },
      { title: "Database Standardization Plan", path: "docs/DATABASE_STANDARDIZATION_PLAN.md", status: "Active", owner: "Engineering" },
      { title: "Phase 1 Backfill Audit", path: "backend/backfill_standardization_phase1.sql", status: "Operational", owner: "Engineering" },
      { title: "API Reference", path: "docs/API_REFERENCE.md", status: "Reference", owner: "Engineering" },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    summary: "Environment variables and safe production configuration expectations.",
    docs: [
      { title: "Environment Variables", path: "docs/ENVIRONMENT_VARIABLES.md", status: "Reference", owner: "Engineering" },
      { title: "Backend Env Example", path: "backend/.env.example", status: "Template", owner: "Engineering" },
    ],
  },
];

export const technicalWikiPrinciples = [
  "Every platform change must update or create documentation.",
  "Production safety comes before validating constraints or deleting historical records.",
  "Privileged platform documentation is visible only to technical roles.",
  "Roadmap phases should ship in small, auditable changes.",
];

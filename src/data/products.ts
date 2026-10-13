export type ProductCategory =
  | "Health & Safety"
  | "HR & Workforce"
  | "Operations & Admin";

export type ProductDefinition = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  priceMonthlyZar: number;
  /** Display helper — derived from ZAR at catalog FX rate */
  priceMonthlyUsd: number;
  features: string[];
  hasPdfExport: boolean;
  hasSignatures: boolean;
  hasDateReminders: boolean;
};

/**
 * Full Delano Solutions catalog.
 * All apps rent for R1,000/mo. USD shown at catalog FX rate for international buyers.
 */
export const PRODUCTS: ProductDefinition[] = [
  // —— Health & Safety ——
  {
    slug: "permit-to-work",
    name: "Permit to Work",
    tagline: "Contractor risk gatekeeper with live photo evidence.",
    description:
      "Managers send a titled secure link. Contractors capture work-area and safety-equipment photos, complete the job with a final completion shot, then managers close the permit and auto-generate a compliance PDF.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Live photo uploads (area, PPE, completion)",
      "Manager approve & close workflow",
      "Auto compliance PDF",
      "WhatsApp contractor links",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "toolbox-talks",
    name: "Toolbox Talks",
    tagline: "One universal link. Signed attendance register in minutes.",
    description:
      "Drop a single link into the staff WhatsApp group. Employees read or watch the week's safety material, then sign with name, surname, and an on-screen signature. Pull the signed compliance register instantly.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Universal staff WhatsApp link",
      "Digital on-screen signatures",
      "Completion tracking dashboard",
      "Branded signed register PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "site-visitor",
    name: "Site Visitor",
    tagline: "Touchless front-gate registration with WhatsApp protocol push.",
    description:
      "Visitors scan a static QR, enter details, and instantly receive safety, security, and estate rules via WhatsApp — with a legal delivery archive.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Static gate QR code",
      "Auto WhatsApp protocol push",
      "Legal delivery record",
      "Visitor ledger export",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: false,
  },
  {
    slug: "near-miss-whisperer",
    name: "Near-Miss Whisperer",
    tagline: "Anonymous hazard reporting without fear of blame.",
    description:
      "Print a QR poster and workers report near misses, hazards and unsafe acts from their phone with photos — anonymous by default. The safety team rates the risk, assigns a corrective action with a due date, closes it out with after photos, and the reporter follows progress on a private tracking page.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Printable QR poster, anonymous reporting with photos",
      "Risk rating, responsible person and due dates",
      "Close-out with after photos and overdue tracking",
      "Private tracking page and WhatsApp feedback to reporters",
      "Trend dashboard, CSV export and register PDF",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "contractor-safety-file",
    name: "Contractors Safety File Portal",
    tagline: "Subcontractor onboarding with expiry blocking.",
    description:
      "Pick exactly which of 40+ safety file documents each contractor must submit — COIDA, liability, appointments, risk assessments, medicals, training and more. Contractors upload through a secure link; expiries are tracked and lapsed files are blocked.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "40+ document checklist, chosen per contractor",
      "Multiple files per item (PDF, photo, Word, Excel)",
      "Expiry tracking & Blocked status",
      "View, download or export the full file as ZIP",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "ohsa-mock-auditor",
    name: "OHSA Statutory Mock-Auditor",
    tagline: "Full health & safety audit with Yes/No answers and photo proof.",
    description:
      "A complete OHS Act audit — appointments, risk assessments, training, inspection registers and a site walk-through. Answer Yes, No or N/A, attach photos and notes, and get a findings report PDF.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Full OHS audit checklist",
      "Photo evidence per question",
      "Compliance % and findings list",
      "Audit report PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },

  // —— HR & Workforce ——
  {
    slug: "leave-planner",
    name: "Leave Planner",
    tagline: "Company leave planner with automatic accrual and WhatsApp approvals.",
    description:
      "Load your employees and their balances once — annual leave accrues every month, approved leave is deducted automatically (weekends and public holidays skipped), cancelled leave goes back on the balance, and every approval or decline goes to the employee on WhatsApp.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Employee import with opening balances",
      "Automatic accrual & deduction",
      "Team planner calendar",
      "WhatsApp approvals",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "discipline-log",
    name: "Discipline Log",
    tagline: "Progressive discipline with camera evidence for CCMA-ready files.",
    description:
      "Open a case with photo evidence and a back-dated incident time, pick the offence from a South African disciplinary code, and get a suggested sanction based on the employee's active warnings. Schedule hearings with a proper notice, issue the outcome, and have the employee sign on screen or from a WhatsApp link — or record a witnessed refusal. Warnings expire automatically and every case rolls into a CCMA-ready record.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "30-offence SA disciplinary code with suggested sanctions",
      "Warnings that expire (3 / 6 / 12 months, adjustable)",
      "Hearing notice with employee rights and acknowledgement",
      "Employee signs on screen or via WhatsApp; witnessed refusal",
      "Appeals, warning letters and full CCMA record PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },
  {
    slug: "onboard-docs",
    name: "Onboard Docs",
    tagline: "New-hire pack on their phone: details, bank, documents, signed consent.",
    description:
      "Pick which documents you need and WhatsApp the new hire a secure link. They fill in their personal details (the SA ID number is checked and fills in date of birth), emergency contact and bank details, photograph their documents and sign a POPIA declaration. You review, send it back for fixes or approve it, add them to Leave Planner in one click, and download a payroll info sheet or the full personnel file.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Choose the documents per hire, plus your own extras",
      "SA ID validation, emergency contact and tax number",
      "Encrypted personal and bank details, with every view logged",
      "Review, request changes, approve and add to Leave Planner",
      "Payroll info sheet PDF and personnel file ZIP",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "contract-sentinel",
    name: "Contract Sentinel",
    tagline: "One signature stamped across every page of the contract PDF.",
    description:
      "Start from ready-made South African contracts and policies, write your own with fill-in fields, or upload your existing PDF. Send it to one person or your whole team on WhatsApp. Each employee reads it on their phone and signs once; their signature is stamped on every page, the company countersigns if needed, and a signing certificate with the document fingerprint, time and IP address is added to the PDF.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "8 SA templates: employment contracts, NDA, POPIA, code of conduct and more",
      "Upload your own PDF contract, or write templates with fill-in fields",
      "Send to the whole team at once; WhatsApp links and reminders",
      "Sign once, stamped on every page; company countersignature",
      "Signing certificate, signed-PDF archive and CSV register",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "equipment-issuer",
    name: "Equipment Issuer",
    tagline: "Issue tools and gear with immediate on-screen custody signature.",
    description:
      "Log laptops, tools, keys, or specialised equipment against a worker who signs to accept legal custody and accountability.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Asset issue log",
      "On-screen custody signature",
      "Assignee history",
      "Custody PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },
  {
    slug: "equipment-handback",
    name: "Equipment Handback",
    tagline: "Return inventory with damage photos and condition notes.",
    description:
      "Supervisors inspect returned items, log fresh damage with inline photos, and check assets back into active inventory.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Condition inspection",
      "Inline damage photo log",
      "Inventory check-in",
      "Handback PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },
  {
    slug: "loan-deductible-ledger",
    name: "Loan & Incident Deductible Ledger",
    tagline: "Advances and damage AODs with payslip-ready consent.",
    description:
      "Generate Acknowledgment of Debt documents for advances, plus incident deductibles with photo proof and employee signature consent before payroll.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "AOD generation & signature",
      "Incident deductible sub-log",
      "Photo proof",
      "Payroll consent trail",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },

  // —— Operations & Admin ——
  {
    slug: "job-card-internal",
    name: "Job Card Pro — Internal",
    tagline: "Maintenance queue, downtime, and spare parts from store.",
    description:
      "Floor staff scan broken machinery into the maintenance queue. Track mechanic scheduling, machine downtime, and internal spare-part costs.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Machine scan → work order",
      "Downtime tracking",
      "Internal parts costing",
      "Maintenance queue",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "job-card-field",
    name: "Job Card Pro — Field Service",
    tagline: "Mobile hours, parts, and client sign-off on delivery.",
    description:
      "Field technicians log hours and billable parts on-site, then turn the screen for a structural client signature to expedite invoicing.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Mobile job cards",
      "On-site parts billing",
      "Client HTML5 signature",
      "Invoice-ready PDF",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "workshop-consumables",
    name: "Workshop Consumable Stock Manager",
    tagline: "High-churn stock with auto reorder requisitions.",
    description:
      "Scan out grinding discs, rods, gloves, and bits. When reorder thresholds break, shortages bundle into an automated requisition sheet.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Scan-out logging",
      "Reorder thresholds",
      "Auto requisition sheet",
      "Usage history",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "pretrip-handover",
    name: "Pre-Trip & Handover Smart Log",
    tagline: "Vehicle QR walk-around, km log, and dual-signoff handover.",
    description:
      "Operators scan dash QR codes for pre-trip checks and starting kilometres. Shift swaps require dual sign-off and up to four exterior panel photos. Mileage mismatches auto-alert fleet and open Job Card tickets.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Dash-mounted vehicle QR",
      "Walk-around checklist + km log",
      "Dual-signoff handover photos",
      "Mileage variance → Job Card alert",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "meter-variance",
    name: "Municipal Meter Variance Monitor",
    tagline: "Catch silent leaks before the R20k–R80k municipal bill.",
    description:
      "Log weekly water/electric readings (or smart-meter APIs). Cron compares usage velocity to baselines and WhatsApps maintenance when spikes exceed threshold without occupancy change.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Weekly meter logging",
      "Baseline velocity alerts",
      "Emergency WhatsApp / SMS",
      "Usage trend dashboard",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "digital-ob",
    name: "Immutable Digital OB Bot",
    tagline: "Untampered occurrence book with GPS and wake-up checks.",
    description:
      "Guards tap OB categories with immutable timestamps and GPS. Silent gaps over 60 minutes trigger WhatsApp wake-ups to the guard and control room — insurer-ready timelines.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Quick-tap OB categories",
      "Immutable time + GPS",
      "60-min wake-up checks",
      "Insurance export trail",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "fit-for-duty",
    name: "Fit-for-Duty Standby Gate",
    tagline: "30-second fatigue screen before the shift unlocks.",
    description:
      "Wall QR triggers a randomised touch-reaction test plus PPE checkpoints. Failures or skipped checks lock digital task routing and alert the foreman for a manual safety check.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    priceMonthlyUsd: 54,
    features: [
      "Entry QR fatigue screen",
      "Reaction + PPE checkpoints",
      "VERIFIED_READY state gate",
      "Foreman priority alerts",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: false,
  },
];

/** Approximate USD for R1,000 (catalog rate ~R18.50/USD). */
export const ZAR_PER_USD = 18.5;
export const RENT_ZAR = 1000;
export const RENT_USD = Math.round((RENT_ZAR / ZAR_PER_USD) * 100) / 100; // ~54

export function formatRentLabel() {
  return `R${RENT_ZAR.toLocaleString("en-ZA")}/mo (≈ $${RENT_USD} USD)`;
}

export function getProduct(slug: string): ProductDefinition | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function productsByCategory() {
  const map = new Map<ProductCategory, ProductDefinition[]>();
  for (const p of PRODUCTS) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }
  return map;
}

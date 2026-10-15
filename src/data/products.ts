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
  features: string[];
  hasPdfExport: boolean;
  hasSignatures: boolean;
  hasDateReminders: boolean;
};

/**
 * Full TaskCrate catalog.
 * All apps rent for R1,000/mo.
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
      "Visitors scan the gate code, enter who they are and who they are visiting, photograph themselves, and sign the site rules. Arrival and departure times stay on the book, which downloads as Excel.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    features: [
      "Name, company, host, vehicle and purpose",
      "Photo and signature of the site rules",
      "Arrival and departure times",
      "Excel visitor register",
    ],
    hasPdfExport: true,
    hasSignatures: true,
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
      "Keep a register of laptops, tools, radios, keys and PPE with asset tags, serial numbers and replacement values. Issue one item or a whole kit to a worker, who signs the custody terms on your device or on their own phone via WhatsApp. Set return dates, see who holds what and what is overdue, and pull a custody PDF or a full asset history at any time.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "Equipment register with tags, serials and values; Excel/CSV import",
      "Issue a full kit under one custody document",
      "Sign on screen, or send a WhatsApp signing link",
      "Return dates, overdue list and reminders",
      "Who-holds-what by person, asset cards and custody PDFs",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "equipment-handback",
    name: "Equipment Handback",
    tagline: "Return inventory with damage photos and condition notes.",
    description:
      "Check a worker's equipment back in with a proper inspection: condition against how it went out, a checklist, damage photos and repair cost. Decide per item whether it goes back into store, off for repair or is written off; both the worker and the inspector sign, and damage can be passed to the Loan & Deductible Ledger for the worker's written consent.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "Inspection against issue condition, with checklist",
      "Damage photos and repair or replacement cost",
      "Back to store, repair queue or write-off",
      "Worker and inspector sign; handback PDF",
      "Raise deductibles in the Loan & Deductible Ledger",
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
      "Open an internal job card with a photo, the fault, and a comment. The technician records the work, and both sides sign before the card closes.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Photo when the card is opened",
      "Comments on both sides",
      "Names and signatures",
      "Parts, hours, and downtime",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "job-card-field",
    name: "Job Card Pro — Field Service",
    tagline: "Mobile hours, parts, and client sign-off on delivery.",
    description:
      "Open a field job card with a photo and a comment. The technician logs the work on site, and the client signs the other side before the card closes.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Photo when the card is opened",
      "Comments on both sides",
      "Technician and client signatures",
      "Parts and hours on site",
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
      "Sign consumables out with both signatures: the person who takes them and the person who logs the amount. Receipts, returns, and stock counts stay on the register.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Sign-out with both signatures",
      "Who took it and who logged it",
      "Receipts, returns, and stock counts",
      "Reorder when stock runs low",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "pretrip-handover",
    name: "Pre-Trip & Handover Smart Log",
    tagline: "Vehicle QR walk-around, km log, and dual-signoff handover.",
    description:
      "Drivers scan the dash code, photograph each side, complete the checks, and sign with the date and time. A handover needs both drivers' signatures. A fault or a kilometre gap opens a job card.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Photos of each side",
      "Signature with date and time",
      "Handover signed by both drivers",
      "Kilometre log and a job card on a fault",
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
      "Each reading keeps a photo of the meter, the reader's name and signature, and the date and time. A spike against the baseline is flagged for a signed check. Download the meter log as a PDF.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Photo of the meter",
      "Reader's name and signature with the date and time",
      "Variance flag and a signed check",
      "PDF of the meter log",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "digital-ob",
    name: "Immutable Digital OB Bot",
    tagline: "Untampered occurrence book with GPS and wake-up checks.",
    description:
      "Guards file each occurrence with a photo, their name and signature, and the time. A shift handover is signed by both guards. Filed entries stay as they were signed, and the book downloads as a PDF.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Photo, name, and signature on every entry",
      "Time and GPS locked when it is filed",
      "Shift handover signed by both guards",
      "PDF of the occurrence book",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "fit-for-duty",
    name: "Fit-for-Duty Standby Gate",
    tagline: "30-second fatigue screen before the shift unlocks.",
    description:
      "At the gate the worker answers the PPE checks, adds a photo, signs that they are fit to start, and completes the reaction test. The time and result stay on the register, which downloads as Excel.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Name, employee number, photo and signature",
      "PPE checks and reaction test",
      "Time of the check",
      "Excel register of every result",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },
];

export const RENT_ZAR = 1000;

export function formatRentLabel() {
  return `R${RENT_ZAR.toLocaleString("en-ZA")}/mo`;
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

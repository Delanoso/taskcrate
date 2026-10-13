export type SandboxStep = {
  id: string;
  label: string;
  detail?: string;
};

export type ProductSandbox = {
  screenTitle: string;
  subtitle: string;
  steps: SandboxStep[];
  successTitle: string;
  successBody: string;
};

const SERVER: Record<string, ProductSandbox> = {
  "permit-to-work": {
    screenTitle: "Permit to Work",
    subtitle: "Contractor phone view",
    steps: [
      { id: "area", label: "Snap work area", detail: "Live camera · bay 3" },
      { id: "ppe", label: "Snap safety gear", detail: "Extinguisher + harness" },
      { id: "send", label: "Submit for approval" },
    ],
    successTitle: "State Transition Success",
    successBody: "Permit moved Sent → Submitted. Manager notified.",
  },
  "toolbox-talks": {
    screenTitle: "Toolbox Talk",
    subtitle: "Staff WhatsApp link",
    steps: [
      { id: "read", label: "Read this week’s talk" },
      { id: "sign", label: "Sign attendance", detail: "Name + on-screen signature" },
    ],
    successTitle: "State Transition Success",
    successBody: "Attendance locked. Register PDF ready for download.",
  },
  "site-visitor": {
    screenTitle: "Gate check-in",
    subtitle: "Visitor QR",
    steps: [
      { id: "details", label: "Enter name & purpose" },
      { id: "wa", label: "Receive WhatsApp protocols" },
    ],
    successTitle: "State Transition Success",
    successBody: "Visitor archived · protocol delivery logged.",
  },
  "near-miss-whisperer": {
    screenTitle: "Near-miss board",
    subtitle: "Anonymous report",
    steps: [
      { id: "scan", label: "Scan the QR poster" },
      { id: "photo", label: "Take hazard photo" },
      { id: "send", label: "Submit anonymously" },
    ],
    successTitle: "Report NM-00001 received",
    successBody: "Safety team assigns an action · reporter tracks progress privately.",
  },
  "contractor-safety-file": {
    screenTitle: "Safety file",
    subtitle: "Contractor upload",
    steps: [
      { id: "coida", label: "Upload COIDA letter" },
      { id: "done", label: "Mark file complete" },
    ],
    successTitle: "State Transition Success",
    successBody: "Status Pending → Active. Expiry tracking on.",
  },
  "ohsa-mock-auditor": {
    screenTitle: "OHSA walkthrough",
    subtitle: "Safety rep wizard",
    steps: [
      { id: "exit", label: "Emergency exits clear? Yes + photo" },
      { id: "score", label: "Complete audit" },
    ],
    successTitle: "State Transition Success",
    successBody: "Audit completed · compliance 92% · findings report ready.",
  },
  "leave-planner": {
    screenTitle: "Leave request",
    subtitle: "Employee link",
    steps: [
      { id: "dates", label: "Pick leave dates" },
      { id: "send", label: "Submit for level rules" },
    ],
    successTitle: "State Transition Success",
    successBody: "Request Pending → routed by level policy.",
  },
  "discipline-log": {
    screenTitle: "Discipline log",
    subtitle: "Manager camera",
    steps: [
      { id: "scan", label: "Scan written warning" },
      { id: "save", label: "Save chronological entry" },
    ],
    successTitle: "State Transition Success",
    successBody: "Stage Written filed with back-dated timestamp.",
  },
  "onboard-docs": {
    screenTitle: "Onboard vault",
    subtitle: "New hire phone",
    steps: [
      { id: "id", label: "Fill in details + photograph documents" },
      { id: "bank", label: "Bank details + sign consent" },
    ],
    successTitle: "State Transition Success",
    successBody: "Pack submitted → HR reviews and approves.",
  },
  "contract-sentinel": {
    screenTitle: "Contract sign",
    subtitle: "HTML5 pad",
    steps: [
      { id: "read", label: "Read contract pages" },
      { id: "sign", label: "Sign once · stamp all pages" },
    ],
    successTitle: "State Transition Success",
    successBody: "Signature stamped on every page · PDF ready.",
  },
  "equipment-issuer": {
    screenTitle: "Issue equipment",
    subtitle: "Custody signature",
    steps: [
      { id: "pick", label: "Select laptop / tool" },
      { id: "sign", label: "Worker signs custody" },
    ],
    successTitle: "State Transition Success",
    successBody: "Item Available → Issued with legal custody.",
  },
  "equipment-handback": {
    screenTitle: "Handback",
    subtitle: "Return inspection",
    steps: [
      { id: "photo", label: "Log damage photo" },
      { id: "in", label: "Check into inventory" },
    ],
    successTitle: "State Transition Success",
    successBody: "Item Issued → Available. Condition noted.",
  },
  "loan-deductible-ledger": {
    screenTitle: "AOD consent",
    subtitle: "Employee sign",
    steps: [
      { id: "read", label: "Review amount due" },
      { id: "sign", label: "Sign payslip consent" },
    ],
    successTitle: "State Transition Success",
    successBody: "AOD Pending → Signed for payroll.",
  },
  "job-card-internal": {
    screenTitle: "Internal job",
    subtitle: "Maintenance queue",
    steps: [
      { id: "scan", label: "Scan broken machine" },
      { id: "close", label: "Close with parts cost" },
    ],
    successTitle: "State Transition Success",
    successBody: "Job Open → Done. Downtime + parts logged.",
  },
  "job-card-field": {
    screenTitle: "Field job card",
    subtitle: "Client sign-off",
    steps: [
      { id: "hours", label: "Log hours + parts" },
      { id: "sign", label: "Client signs on screen" },
    ],
    successTitle: "State Transition Success",
    successBody: "Job Done · invoice-ready PDF queued.",
  },
  "workshop-consumables": {
    screenTitle: "Scan out stock",
    subtitle: "Consumables",
    steps: [
      { id: "out", label: "Scan out grinding discs" },
      { id: "req", label: "Hit reorder threshold" },
    ],
    successTitle: "State Transition Success",
    successBody: "Shortage bundled into requisition sheet.",
  },
  "pretrip-handover": {
    screenTitle: "Pre-trip check",
    subtitle: "Dash QR",
    steps: [
      { id: "walk", label: "Complete walk-around" },
      { id: "km", label: "Log starting km + photos" },
    ],
    successTitle: "State Transition Success",
    successBody: "Trip logged. Variance auto-opens Job Card if needed.",
  },
  "meter-variance": {
    screenTitle: "Meter reading",
    subtitle: "Estate clerk",
    steps: [
      { id: "read", label: "Enter weekly reading" },
      { id: "alert", label: "Run variance check" },
    ],
    successTitle: "State Transition Success",
    successBody: "Spike detected · WhatsApp alert fired.",
  },
  "digital-ob": {
    screenTitle: "Digital OB",
    subtitle: "Guard PWA",
    steps: [
      { id: "patrol", label: "Tap Patrol Started" },
      { id: "gps", label: "Lock GPS + timestamp" },
    ],
    successTitle: "State Transition Success",
    successBody: "Immutable OB entry written. Wake timer reset.",
  },
  "fit-for-duty": {
    screenTitle: "Fit-for-duty",
    subtitle: "Entry QR",
    steps: [
      { id: "ppe", label: "Confirm PPE" },
      { id: "tap", label: "Pass reaction tap" },
    ],
    successTitle: "State Transition Success",
    successBody: "State → VERIFIED_READY. Task routing unlocked.",
  },
};

const FALLBACK: ProductSandbox = {
  screenTitle: "Delano app",
  subtitle: "Interactive demo",
  steps: [
    { id: "a", label: "Tap primary action" },
    { id: "b", label: "Confirm" },
  ],
  successTitle: "State Transition Success",
  successBody: "Demo state advanced successfully.",
};

export function getSandbox(slug: string): ProductSandbox {
  return SERVER[slug] ?? FALLBACK;
}

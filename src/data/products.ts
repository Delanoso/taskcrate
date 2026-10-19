export type ProductCategory =
  | "Health & Safety"
  | "HR & Workforce"
  | "Operations & Admin";

export type ProductDefinition = {
  slug: string;
  name: string;
  tagline: string;
  /** The problem a buyer recognises before they read the features. */
  solves: string;
  description: string;
  category: ProductCategory;
  priceMonthlyZar: number;
  features: string[];
  hasPdfExport: boolean;
  hasSignatures: boolean;
  hasDateReminders: boolean;
};

/**
 * Full TaskCrate catalog. Each app states the problem it solves.
 * All apps rent for R1,000/mo.
 */
export const PRODUCTS: ProductDefinition[] = [
  // —— Health & Safety ——
  {
    slug: "permit-to-work",
    name: "Permit to Work",
    tagline: "No work starts until the permit, the photos, and the close-out are on file.",
    solves: "A contractor starts work with a verbal go-ahead. When the inspector asks for the permit, the photos of the area and the PPE are missing.",
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
    tagline: "A signed register of who was in the toolbox talk.",
    solves: "The talk happened, but the attendance sheet is a paper page in someone's bakkie. You cannot prove who was there.",
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
    tagline: "Who came through the gate, who they visited, and when they left.",
    solves: "The visitor book is paper. People forget to sign out, and after an incident you cannot show who was on site.",
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
    tagline: "Hazards get reported, rated, and closed with photos.",
    solves: "Workers see a hazard and say nothing, because a near miss with their name on it can be used against them. The hazard stays until someone is hurt.",
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
    tagline: "A contractor cannot work with an expired safety file.",
    solves: "The subcontractor arrives with a file in a folder. COIDA, medicals, or insurance expired last month, and you only find out when the client audits the site.",
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
    tagline: "Find the gaps in the safety file before the inspector does.",
    solves: "Appointments, risk assessments, and inspection registers are assumed to be in order. The first time they are checked is when the Department of Employment and Labour is already on site.",
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
  {
    slug: "accident-report",
    name: "Accident and Injury Report",
    tagline: "A signed accident report with the time, the place, and the photos.",
    solves: "An injury is written in a notebook. There is no photo, no witness signature, and nothing you can hand to the safety file or the insurer.",
    description:
      "File each accident with the time, the place, what happened, the injury, photos, and the names of the people there. The person who files it signs, and the injured person and a witness can sign too. Download the report as a PDF and the register as Excel.",
    category: "Health & Safety",
    priceMonthlyZar: 1000,
    features: [
      "Time, place, and what the person was doing",
      "Injury, treatment, and photos",
      "Signatures of the reporter, the injured person, and a witness",
      "PDF of the report and Excel of the register",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },

  // —— HR & Workforce ——
  {
    slug: "leave-planner",
    name: "Leave Planner",
    tagline: "Leave balances that update themselves, with the approval on record.",
    solves: "Leave lives in a spreadsheet. Weekends get deducted, a cancelled day never goes back on the balance, and the approval was a WhatsApp message that cannot be found.",
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
    tagline: "Warnings, hearings, and outcomes that stand up later.",
    solves: "A warning was verbal. The hearing had no written notice. When the matter reaches the CCMA, the file is rebuilt from memory.",
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
    tagline: "A new hire's file, completed on their phone before they start.",
    solves: "ID copies, bank details, and signed forms arrive as WhatsApp photos. Payroll starts late because the pack is still incomplete.",
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
    tagline: "Contracts signed on every page, with proof of what was signed.",
    solves: "A contract is emailed as a Word file. One signature sits on the last page, and you cannot show which version the person actually signed.",
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
    tagline: "Every tool that leaves the store has a name and a signature on it.",
    solves: "Radios, laptops, and tools leave the store with no record. When something is missing, nobody can say who had it.",
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
    tagline: "Returns inspected, photographed, and signed by both sides.",
    solves: "Gear comes back damaged and the argument starts later. There is no photo of the condition, and no signed decision to repair or write it off.",
    description:
      "Check a worker's equipment back in with a proper inspection: condition against how it went out, a checklist, damage photos and repair cost. Decide per item whether it goes back into store, off for repair or is written off; both the worker and the inspector sign, and damage can be passed to the AOD Book for the worker's written consent.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "Inspection against issue condition, with checklist",
      "Damage photos and repair or replacement cost",
      "Back to store, repair queue or write-off",
      "Worker and inspector sign; handback PDF",
      "Raise deductibles in the AOD Book",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: false,
  },
  {
    slug: "loan-deductible-ledger",
    name: "Loan & Incident Deductible AOD Book",
    tagline: "Advances and damage costs, agreed in writing before they hit the payslip.",
    solves: "An advance or a damage cost is deducted from pay with no signed acknowledgment. The employee disputes it, and there is no document.",
    description:
      "Write an acknowledgment of debt for any reason: salary advances, loans, purchases, payments made for the employee, fines, damage or loss, or reasons you add yourself. Set the instalments, send it on WhatsApp to sign on the employee's phone (or sign on your device), then track every repayment against the schedule. Salary deductions flow into Payroll, and the BCEA section 34 rules for damage and loss are built in.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "12 built-in reasons plus your own: payment, purchase, advance, damage…",
      "Instalment plan with schedule, arrears and balance",
      "Employee signs on their phone; the company countersigns",
      "Salary deductions go into Payroll, or a monthly list to send",
      "BCEA s34 wording and the quarter-of-pay limit for damage",
      "Signed AOD with statement PDF, Excel register",
    ],
    hasPdfExport: true,
    hasSignatures: true,
    hasDateReminders: true,
  },
  {
    slug: "payroll",
    name: "Payroll",
    tagline: "PAYE, UIF, and the payslip, worked out from the people you already loaded.",
    solves: "Tax and UIF are calculated in a spreadsheet every month. A payslip is typed by hand, and a new employee means starting the sums again.",
    description:
      "Save the PAYE, UIF and levy details, then load each person or bring the whole list in from Excel. Each month the run works out PAYE, UIF and the levy from the SARS tables. Download a payslip PDF, or Excel of the people and every pay run.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "PAYE, UIF and SDL saved once",
      "Add people one by one or from Excel",
      "Tax, UIF and the medical credit worked out each month",
      "Payslip PDF",
      "Excel of the people and of every pay run",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },
  {
    slug: "training-tickets",
    name: "Training and Tickets",
    tagline: "See which tickets expire before the site turns the person away.",
    solves: "A forklift licence or a first aid certificate expires. Nobody notices until the client or the site stops that person from working.",
    description:
      "Keep each person's forklift licence, first aid certificate, driving permit, and the other tickets the site asks for. Store the photo of the card, the certificate number, and the expiry. Tickets due in the next 30 days stay on the list. Load people one by one or from Excel, and download the matrix as Excel.",
    category: "HR & Workforce",
    priceMonthlyZar: 1000,
    features: [
      "Photo of the card, certificate number, and provider",
      "Issued and expiry dates",
      "Due and expired tickets on the list",
      "Add one person or import Excel, and download the matrix",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
  },

  // —— Operations & Admin ——
  {
    slug: "job-card-internal",
    name: "Job Card Pro — Internal",
    tagline: "Workshop jobs with a photo, the hours, and both signatures.",
    solves: "A machine is down and the work is described in a WhatsApp message. There is no photo of the fault, no parts list, and no signature that the job was finished.",
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
    tagline: "Field work the client signs before the technician leaves.",
    solves: "The technician leaves site and the client later says the work was not done. There is no photo and no signature on the job card.",
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
    tagline: "Consumables signed out by the person who took them.",
    solves: "Oil, gloves, and discs disappear from the store. Stock is counted at month end and the shortage has no name on it.",
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
    tagline: "A signed walk-around, the kilometres, and the vehicle's papers.",
    solves: "A bakkie leaves with no walk-around and no kilometre reading. The licence disc, insurance, or roadworthy has already expired, and the damage is found on the next driver's shift.",
    description:
      "Each vehicle keeps its licence disc, insurance, and roadworthy certificate, with the expiry on the file. Drivers scan the dash code, photograph each side, complete the checks, and sign with the date and time. A handover needs both drivers' signatures. A fault or a kilometre gap opens a job card.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Licence disc, insurance, and roadworthy dates",
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
    tagline: "A meter reading with a photo, before the municipal bill arrives.",
    solves: "A leak or a faulty meter runs all month. The first warning is a municipal bill that is several times the normal amount.",
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
    tagline: "An occurrence book that stays as it was signed.",
    solves: "The occurrence book is a paper book. Entries can be rewritten, a shift handover is a scribble, and a missed wake-up check has no time on it.",
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
    tagline: "A signed fit-for-duty check before the shift starts.",
    solves: "A tired or unequipped worker starts the shift. After an incident there is no record of the PPE check, the photo, or the reaction test.",
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
  {
    slug: "site-attendance",
    name: "Site Attendance",
    tagline: "Who is on site, with the time they arrived and left.",
    solves: "Clock times are written in a book at the gate. At the end of the day you still cannot say who is on site, and the times can be filled in later.",
    description:
      "Put a link at the gate. Each person clocks in and out with their name, a photo, and a signature. The time is saved when they send it. The office sees who is still on site, and the month downloads as Excel.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Clock in and clock out at the gate",
      "Name, photo, and signature",
      "Time saved when it is sent",
      "Who is still on site, and an Excel register",
    ],
    hasPdfExport: false,
    hasSignatures: true,
    hasDateReminders: false,
  },
  {
    slug: "quotations",
    name: "Quotations and Invoicing",
    tagline: "Quotes and tax invoices, with paid and unpaid on the same book.",
    solves: "Quotes are rebuilt in Word for every job. VAT is calculated by hand, a quote never becomes the invoice, and nobody can say which invoices are still unpaid.",
    description:
      "Set up the company, bank account and VAT once. Start from a template, pick the currency, and download the quotation or tax invoice as a PDF. Turn a quotation into an invoice and mark it paid or unpaid. The full book downloads as Excel.",
    category: "Operations & Admin",
    priceMonthlyZar: 1000,
    features: [
      "Company, bank and VAT saved once",
      "Templates for services, goods, call-outs and retainers",
      "Choose the currency on each document",
      "PDF of the quote or invoice",
      "Mark invoices paid or unpaid, and download the book as Excel",
    ],
    hasPdfExport: true,
    hasSignatures: false,
    hasDateReminders: true,
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

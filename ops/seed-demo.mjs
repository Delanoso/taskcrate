import Database from "better-sqlite3";

const url = process.env.DATABASE_URL || "";
const file = url.replace(/^file:/, "");
if (!file.endsWith("production.db")) {
  console.error("Refusing to seed. Set DATABASE_URL to the production database.");
  process.exit(1);
}

const db = new Database(file);
const now = new Date().toISOString();
const periodEnd = "2027-10-19T00:00:00.000Z";
const hash = "$2b$10$DQq48npctvFbPHUsl0tHzuYs0qabgolagNdogo/TnBZ8zsG2Sew8W";

const existing = db.prepare("SELECT id FROM Organization WHERE slug = ?").get("taskcrate-demo");
if (existing) {
  console.log("Demo company already exists.");
  process.exit(0);
}

const slugs = [
  "permit-to-work", "toolbox-talks", "site-visitor", "near-miss-whisperer", "accident-report", "ohsa-mock-auditor", "contractor-safety-file",
  "onboard-docs", "leave-planner", "training-tickets", "payroll", "loan-deductible-ledger", "discipline-log", "contract-sentinel", "equipment-issuer", "equipment-handback",
  "site-attendance", "fit-for-duty", "job-card-internal", "workshop-consumables", "pretrip-handover", "job-card-field", "quotations", "bills-to-pay", "meter-variance", "digital-ob",
];

const lines = JSON.stringify([{ description: "Replace hydraulic pump on the workshop press", quantity: 1, unit: "job", unitPriceCents: 1850000 }]);

const tx = db.transaction(() => {
  db.prepare(`INSERT INTO Organization (id, name, slug, trialNote, trialNoticeSent, trialReminderSent, trialFinalReminderSent, trialEndedEmailSent, winbackStage, createdAt, updatedAt)
    VALUES ('demo_org', 'TaskCrate Demo', 'taskcrate-demo', 'Sample company for sales calls. Not a paying customer.', 1, 1, 1, 1, 2, ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO OrganizationBranding (id, organizationId, displayName, primaryColor, accentColor)
    VALUES ('demo_brand', 'demo_org', 'TaskCrate Demo', '#1e3a5f', '#0ea5e9')`).run();
  db.prepare(`INSERT INTO User (id, email, passwordHash, fullName, platformAdmin, sessionVersion, mustSetPassword, createdAt, updatedAt)
    VALUES ('demo_user', 'demo@taskcrate.co.za', ?, 'Demo Owner', 0, 0, 0, ?, ?)`).run(hash, now, now);
  db.prepare(`INSERT INTO Membership (id, userId, organizationId, role, createdAt)
    VALUES ('demo_member', 'demo_user', 'demo_org', 'OWNER', ?)`).run(now);
  db.prepare(`INSERT INTO TermsAcceptance (id, userId, version, acceptedAt) VALUES ('demo_terms', 'demo_user', '2026-10-12-v1', ?)`).run(now);

  const sub = db.prepare(`INSERT INTO Subscription (id, organizationId, productSlug, status, currentPeriodEnd, createdAt, updatedAt) VALUES (?, 'demo_org', ?, 'active', ?, ?, ?)`);
  const ack = db.prepare(`INSERT INTO IpNoticeAcknowledgement (id, userId, productSlug, version, acknowledgedAt) VALUES (?, 'demo_user', ?, '2026-10-12-v1', ?)`);
  for (const slug of slugs) {
    sub.run(`demo_sub_${slug}`, slug, periodEnd, now, now);
    ack.run(`demo_ack_${slug}`, slug, now);
  }

  db.prepare(`INSERT INTO Person (id, organizationId, fullName, employeeNumber, phone, email, idNumber, jobTitle, active, createdAt)
    VALUES ('demo_person', 'demo_org', 'Thabo Mokoena', 'EMP001', '0820000001', 'thabo@example.co.za', '8001015800085', 'Artisan', 1, ?)`).run(now);
  db.prepare(`INSERT INTO LeaveEmployee (id, organizationId, publicToken, fullName, employeeNumber, phone, level, startDate, annualDays, balanceDate, openingAnnual, active, createdAt)
    VALUES ('demo_leave', 'demo_org', 'demo_leave_token', 'Thabo Mokoena', 'EMP001', '0820000001', 'Staff', '2024-03-01T00:00:00.000Z', 15, '2026-10-01T00:00:00.000Z', 8, 1, ?)`).run(now);

  db.prepare(`INSERT INTO PayrollProfile (id, organizationId, payeNumber, uifNumber, paySdl, payDay, monthlyHours, overtimeMultiplier, updatedAt)
    VALUES ('demo_payroll_profile', 'demo_org', '7123456789', 'U12345678', 0, 25, 173, 1.5, ?)`).run(now);
  db.prepare(`INSERT INTO PayrollEmployee (id, organizationId, fullName, employeeNumber, idNumber, jobTitle, email, phone, bankName, accountNumber, branchCode, accountType, monthlySalaryCents, allowanceCents, pensionCents, employerPensionCents, medicalMember, medicalDependants, medicalDeductionCents, paysUif, active, createdAt, updatedAt)
    VALUES ('demo_payroll_emp', 'demo_org', 'Thabo Mokoena', 'EMP001', '8001015800085', 'Artisan', 'thabo@example.co.za', '0820000001', 'FNB', '62000000001', '250655', 'Cheque', 1800000, 0, 0, 0, 0, 0, 0, 1, 1, ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO PayrollRun (id, organizationId, period, payDate, status, finalisedAt, createdAt)
    VALUES ('demo_run', 'demo_org', '2026-09', '2026-09-25', 'FINALISED', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO PayrollLine (id, runId, employeeId, fullName, employeeNumber, idNumber, jobTitle, bankName, accountNumber, branchCode, basicCents, allowanceCents, onceOffCents, overtimeHours, overtimeCents, pensionCents, employerPensionCents, grossCents, taxableMonthlyCents, payeCents, uifEmployeeCents, uifEmployerCents, sdlCents, medicalCreditCents, medicalDeductionCents, otherDeductionCents, netCents, employerCostCents, note)
    VALUES ('demo_line', 'demo_run', 'demo_payroll_emp', 'Thabo Mokoena', 'EMP001', '8001015800085', 'Artisan', 'FNB', '62000000001', '250655', 1800000, 0, 0, 6, 93600, 0, 0, 1893600, 1893600, 214000, 17700, 17700, 0, 0, 0, 0, 1661900, 1911300, 'Sample payslip. Figures are an example, not a tax opinion.')`).run();

  db.prepare(`INSERT INTO BillingProfile (id, organizationId, legalName, tradingName, vatRegistered, vatPercent, address, email, phone, bankName, accountName, accountNumber, branchCode, accountType, defaultCurrency, paymentTermsDays, quoteValidDays, updatedAt)
    VALUES ('demo_bill_profile', 'demo_org', 'TaskCrate Demo (Pty) Ltd', 'TaskCrate Demo', 0, 15, '14 Workshop Road, Johannesburg', 'demo@taskcrate.co.za', '0110000000', 'FNB', 'TaskCrate Demo', '62000000099', '250655', 'Cheque', 'ZAR', 30, 14, ?)`).run(now);
  db.prepare(`INSERT INTO BillingClient (id, organizationId, name, email, phone, createdAt)
    VALUES ('demo_client', 'demo_org', 'North Plant Maintenance', 'accounts@northplant.example', '0110001111', ?)`).run(now);
  db.prepare(`INSERT INTO BillingDocument (id, organizationId, kind, number, status, currency, chargeVat, vatPercent, clientName, clientEmail, clientPhone, issueDate, dueDate, linesJson, subtotalCents, vatCents, totalCents, publicToken, createdAt, updatedAt)
    VALUES ('demo_quote', 'demo_org', 'QUOTE', 'QT-DEMO-001', 'SENT', 'ZAR', 0, 0, 'North Plant Maintenance', 'accounts@northplant.example', '0110001111', '2026-10-10', '2026-11-30', ?, 1850000, 0, 1850000, 'demo_quote_token', ?, ?)`).run(lines, now, now);
  db.prepare(`INSERT INTO BillingDocument (id, organizationId, kind, number, status, currency, chargeVat, vatPercent, clientName, clientEmail, clientPhone, issueDate, dueDate, linesJson, subtotalCents, vatCents, totalCents, paidOn, paymentMethod, paymentReference, sourceQuoteId, publicToken, createdAt, updatedAt)
    VALUES ('demo_invoice', 'demo_org', 'INVOICE', 'INV-DEMO-001', 'PAID', 'ZAR', 0, 0, 'North Plant Maintenance', 'accounts@northplant.example', '0110001111', '2026-09-02', '2026-09-30', ?, 1850000, 0, 1850000, '2026-09-28', 'EFT', 'NP-8841', 'demo_quote', 'demo_invoice_token', ?, ?)`).run(lines, now, now);

  db.prepare(`INSERT INTO JobCard (id, organizationId, mode, jobNumber, title, location, priority, publicToken, description, status, mechanicName, hoursWorked, partsCost, clientName, completedAt, quoteDocumentId, createdAt, updatedAt)
    VALUES ('demo_job', 'demo_org', 'internal', 'JC-DEMO-001', 'Workshop press will not build pressure', 'Workshop bay 2', 'normal', 'demo_job_token', 'Hydraulic pump leaking at the seal.', 'done', 'Thabo Mokoena', 6, 2400, 'North Plant Maintenance', ?, 'demo_quote', ?, ?)`).run(now, now, now);

  db.prepare(`INSERT INTO StockItem (id, organizationId, name, sku, unit, location, supplier, quantity, reorderAt, publicToken, createdAt)
    VALUES ('demo_stock', 'demo_org', 'Cutting discs 115 mm', 'DISC-115', 'each', 'Cage A', 'Bearing Suppliers', 48, 10, 'demo_stock_token', ?)`).run(now);
  db.prepare(`INSERT INTO Vehicle (id, organizationId, name, regNumber, make, licenceDiscExpires, insuranceExpires, roadworthyExpires, publicToken, createdAt)
    VALUES ('demo_vehicle', 'demo_org', 'Workshop bakkie', 'CA 123-456', 'Toyota Hilux', '2027-08-01', '2027-08-01', '2027-08-01', 'demo_vehicle_token', ?)`).run(now);
  db.prepare(`INSERT INTO SupplierBill (id, organizationId, supplierName, reference, amountCents, dueOn, status, note, paidOn, createdAt)
    VALUES ('demo_supplier_bill', 'demo_org', 'Bearing Suppliers', 'BS-4412', 246000, '2026-09-30', 'paid', 'Cutting discs for the workshop.', '2026-09-29', ?)`).run(now);
  db.prepare(`INSERT INTO TrainingTicket (id, organizationId, fullName, employeeNumber, ticketType, certificateNumber, provider, issuedOn, expiresOn, note, createdAt, updatedAt)
    VALUES ('demo_ticket', 'demo_org', 'Thabo Mokoena', 'EMP001', 'Forklift licence', 'FL-20911', 'Site Skills', '2026-04-01', '2027-04-01', 'Sample ticket, still valid.', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO AttendanceSite (id, organizationId, name, location, publicToken, createdAt)
    VALUES ('demo_gate', 'demo_org', 'Main gate', 'Johannesburg workshop', 'demo_gate_token', ?)`).run(now);
});

tx();
console.log("Demo company ready.");

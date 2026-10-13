/**
 * Starter templates. Text format: "# " starts a heading, "- " a bullet, blank lines split paragraphs.
 * {{field}} placeholders are filled in when the document is sent.
 */

export const STANDARD_FIELDS = [
  { key: "employee_name", label: "Employee name" },
  { key: "employee_number", label: "Employee number" },
  { key: "job_title", label: "Job title" },
  { key: "company", label: "Company name" },
  { key: "date", label: "Date sent" },
] as const;
export const STANDARD_KEYS: string[] = STANDARD_FIELDS.map((f) => f.key);

export const CATEGORIES = [
  { key: "contract", label: "Contract" },
  { key: "policy", label: "Policy" },
  { key: "other", label: "Other" },
] as const;

export type LibraryTemplate = { slug: string; name: string; category: "contract" | "policy" | "other"; requireCountersign: boolean; dueDays: number | null; bodyText: string };

export const CONTRACT_LIBRARY: LibraryTemplate[] = [
  {
    slug: "permanent-employment",
    name: "Permanent employment contract",
    category: "contract",
    requireCountersign: true,
    dueDays: 7,
    bodyText: `This contract of employment is entered into between {{company}} ("the Employer") and {{employee_name}} ("the Employee"), employee number {{employee_number}}.

# 1. Position and commencement
The Employee is appointed as {{job_title}} with effect from {{start_date}}. The first {{probation_months}} months are a probation period during which performance and suitability will be assessed in line with the Code of Good Practice: Dismissal.

# 2. Place of work
The Employee's main place of work is {{workplace}}. The Employer may require the Employee to work at other sites when operationally required.

# 3. Remuneration
The Employee will be paid a gross salary of R{{salary}} per month, on or before the last working day of each month, by electronic transfer. Statutory deductions (PAYE, UIF) and any deductions agreed to in writing will be made.

# 4. Working hours
Ordinary hours of work are {{working_hours}}, not exceeding 45 hours per week. Overtime is worked only by agreement and is paid or compensated in terms of the Basic Conditions of Employment Act.

# 5. Leave
- Annual leave: 15 working days per annual leave cycle, accrued at 1.25 days per month.
- Sick leave: 30 days in every 36-month cycle (1 day per 26 days worked during the first 6 months).
- Family responsibility leave: 3 days per year.
- Maternity and parental leave in terms of the BCEA.

# 6. Duties and conduct
The Employee will carry out all reasonable instructions, comply with the Employer's policies, disciplinary code and health and safety rules, and devote their working time to the Employer's business.

# 7. Confidentiality
The Employee may not disclose any confidential information of the Employer during or after employment.

# 8. Termination
After probation, either party may terminate this contract by giving {{notice_period}} written notice, or as provided in section 37 of the BCEA. Nothing prevents summary dismissal for serious misconduct after a fair procedure.

# 9. General
This contract is the entire agreement between the parties. Any change must be in writing and signed by both parties. The Employee confirms that they have read and understood this contract and received a copy.`,
  },
  {
    slug: "fixed-term-employment",
    name: "Fixed-term employment contract",
    category: "contract",
    requireCountersign: true,
    dueDays: 7,
    bodyText: `This fixed-term contract is entered into between {{company}} ("the Employer") and {{employee_name}} ("the Employee").

# 1. Appointment and duration
The Employee is appointed as {{job_title}} from {{start_date}} until {{end_date}}, when this contract ends automatically without notice.

# 2. Reason for fixed term
This contract is for a fixed term because: {{fixed_term_reason}}. The Employee acknowledges that there is no expectation of permanent employment or renewal unless agreed in writing.

# 3. Remuneration
The Employee will be paid R{{salary}} per month (or pro rata for a part month), less statutory deductions.

# 4. Hours, leave and conduct
Ordinary hours are {{working_hours}}. Leave accrues in terms of the Basic Conditions of Employment Act. The Employee must comply with all workplace rules, policies and safety procedures.

# 5. Early termination
Either party may end this contract before the end date by giving one week's written notice during the first 6 months and two weeks thereafter, or summarily for serious misconduct after a fair procedure.

# 6. General
This contract is the entire agreement between the parties. The Employee confirms that they have read and understood this contract.`,
  },
  {
    slug: "confidentiality",
    name: "Confidentiality and non-disclosure agreement",
    category: "contract",
    requireCountersign: false,
    dueDays: 7,
    bodyText: `I, {{employee_name}}, employed as {{job_title}} by {{company}}, agree as follows.

# Confidential information
"Confidential information" means any information about the company, its clients, suppliers, pricing, tenders, processes, software, employees and finances that is not publicly available, in any form.

# My undertakings
- I will use confidential information only to perform my duties.
- I will not disclose it to anyone outside the company, or to colleagues who do not need it, without written permission.
- I will not copy, photograph, email to personal accounts or remove confidential information from company premises or systems.
- I will return all company documents, devices and data when my employment ends, or earlier on request.

# Duration
These obligations apply during my employment and continue after it ends.

# Breach
I understand that a breach may lead to disciplinary action, including dismissal, and that the company may claim damages or apply for an interdict.`,
  },
  {
    slug: "popia-consent",
    name: "POPIA employee consent",
    category: "policy",
    requireCountersign: false,
    dueDays: 7,
    bodyText: `# Processing of employee personal information
{{company}} ("the company") processes personal information of {{employee_name}} in terms of the Protection of Personal Information Act 4 of 2013 (POPIA).

# What we process and why
We process your identity and contact details, banking and tax details, qualifications, performance and disciplinary records, leave and health information you provide, and biometric or CCTV records where used on site. We use it to manage your employment, pay you, meet our tax, labour, health and safety and other legal obligations, and protect our premises and people.

# Who we share it with
Only where necessary: SARS, the Department of Employment and Labour, UIF, pension and medical aid funds, payroll providers, auditors, insurers and our IT service providers, all bound by confidentiality.

# Your rights
You may ask to see the information we hold about you, ask us to correct it, and object to processing that is not required by law. Complaints can be made to our Information Officer or to the Information Regulator.

# Consent
I confirm that I have read this notice and consent to the processing of my personal information as described.`,
  },
  {
    slug: "code-of-conduct",
    name: "Code of conduct and disciplinary code acknowledgement",
    category: "policy",
    requireCountersign: false,
    dueDays: 7,
    bodyText: `I, {{employee_name}}, confirm that I have received, read and understood the code of conduct and disciplinary code of {{company}}.

# I understand that
- I must arrive on time, follow reasonable instructions and treat colleagues, clients and the public with respect.
- Being under the influence of alcohol or drugs at work, theft, fraud, violence, harassment and wilful damage to property are serious offences that may lead to dismissal on a first offence.
- Warnings remain valid for the period set out in the disciplinary code.
- I have the right to a fair hearing, to be represented by a fellow employee or shop steward, and to appeal.

I agree to comply with the code of conduct and the disciplinary code as amended from time to time.`,
  },
  {
    slug: "health-safety-induction",
    name: "Health and safety induction acknowledgement",
    category: "policy",
    requireCountersign: false,
    dueDays: 3,
    bodyText: `I, {{employee_name}} ({{job_title}}), confirm that I received a health and safety induction from {{company}} on or before {{date}}.

# The induction covered
- Site rules, emergency exits, assembly points and evacuation procedure.
- Hazards and risks of my work and the controls in place.
- The personal protective equipment I must wear and how to look after it.
- How to report incidents, near misses and unsafe conditions.
- First aid facilities and the names of first aiders and safety representatives.

# My duties under section 14 of the OHS Act
I will take reasonable care of my own health and safety and that of others, follow all safety instructions and procedures, use the PPE provided, report unsafe conditions and incidents immediately, and not interfere with or misuse safety equipment.`,
  },
  {
    slug: "vehicle-policy",
    name: "Company vehicle and fuel card policy",
    category: "policy",
    requireCountersign: false,
    dueDays: 7,
    bodyText: `I, {{employee_name}}, acknowledge the vehicle and fuel card rules of {{company}}.

# Use of vehicles
- Only authorised drivers with a valid licence (and PrDP where required) may drive company vehicles.
- I will complete the pre-trip inspection before every trip and report defects immediately.
- Vehicles are for business use only unless written permission is given. No unauthorised passengers.
- I will obey all traffic laws. Traffic fines incurred while I drive are my responsibility.
- Zero tolerance: no driving under the influence of alcohol or drugs, and no handheld cellphone use while driving.

# Fuel cards
- The fuel card may only be used for the vehicle it is issued to. I will keep slips and record the odometer reading.
- Misuse of a fuel card is treated as theft.

# Damage and accidents
Accidents must be reported immediately. Where damage results from negligence or breach of this policy, I may be held liable for the insurance excess, subject to a fair procedure and my written consent to any deduction.`,
  },
  {
    slug: "it-cellphone-policy",
    name: "Cellphone, email and internet use policy",
    category: "policy",
    requireCountersign: false,
    dueDays: 7,
    bodyText: `I, {{employee_name}}, acknowledge the electronic communications policy of {{company}}.

- Company cellphones, laptops, email and internet are provided for business purposes. Reasonable personal use is allowed if it does not interfere with work.
- I will keep passwords private, lock devices when unattended and report lost or stolen devices immediately.
- I will not access, store or send offensive, illegal or pirated material, or install unauthorised software.
- I will not post confidential information or comments that could harm the company's reputation on social media.
- I understand that company systems may be monitored in line with the law, and that I have no expectation of privacy in company accounts.
- Devices must be returned in good condition when my employment ends. Loss or damage through negligence may be recovered from me with my written consent.`,
  },
];

const FIELD = /\{\{\s*([a-z0-9_]{1,40})\s*\}\}/gi;

/** Placeholder keys used in a text, in order of first use. */
export function mergeKeys(text: string) {
  const keys: string[] = [];
  for (const m of text.matchAll(FIELD)) {
    const k = m[1].toLowerCase();
    if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}

export const fieldLabel = (key: string) => STANDARD_FIELDS.find((f) => f.key === key)?.label ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function fillMerge(text: string, values: Record<string, string | null | undefined>) {
  return text.replace(FIELD, (all, k: string) => {
    const v = values[k.toLowerCase()];
    return v && v.trim() ? v.trim() : "_______________";
  });
}

export type Block = { type: "heading" | "bullet" | "paragraph"; text: string };

/** Splits template text into headings, bullets and paragraphs for the signer page and the PDF. */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
    para = [];
  };
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("# ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(2).trim() });
    } else if (/^[-*•]\s+/.test(line)) {
      flush();
      blocks.push({ type: "bullet", text: line.replace(/^[-*•]\s+/, "") });
    } else para.push(line);
  }
  flush();
  return blocks;
}

export const STATUS_LABEL: Record<string, string> = {
  sent: "Sent",
  viewed: "Opened",
  awaiting_countersign: "Awaiting countersign",
  completed: "Completed",
  signed: "Completed",
  declined: "Declined",
  voided: "Voided",
};

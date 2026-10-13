/** Basic health & safety audit. Question ids are "<subsection>.<letter>" — never reorder existing questions. */

export type AuditSubsection = { id: string; title: string; questions: string[] };
export type AuditSection = { id: string; title: string; subsections: AuditSubsection[] };

export const AUDIT_SECTIONS: AuditSection[] = [
  {
    id: "1",
    title: "Management structures & contractors",
    subsections: [
      {
        id: "1.1.1",
        title: "Policies",
        questions: [
          "Is there a health and safety policy?",
          "Does the policy define risk, safety and health aspects?",
          "Is there an environmental policy?",
          "Is there an alcohol and drug policy?",
          "Is there a smoking policy?",
          "Are the policies signed off by the CEO?",
          "Are the policies reviewed annually?",
          "Are the policies displayed where staff gather?",
        ],
      },
      {
        id: "1.1.2",
        title: "Designations and appointments",
        questions: [
          "Has a board resolution been adopted stating the name and position of the person designated by the board to ensure the company complies with relevant legislation?",
          "Has a Section 16(2) assignee been appointed?",
          "Are the duties clearly stated in the written appointment or a signed job description?",
          "Is the relevant training available?",
          "Has a part-time or full-time health and safety officer been appointed?",
          "Are a sufficient number of first aiders appointed?",
          "Are a sufficient number of fire fighters appointed?",
          "Is a fire marshal appointed?",
          "Is a first aid marshal appointed?",
          "Has an environmental and pollution coordinator been appointed?",
          "Are all lifting machine operators appointed?",
          "Is a registered LMI appointed for all lifting machines, equipment and tackle?",
          "Are a sufficient number of SHE representatives appointed?",
          "Were the SHE representatives elected through a nomination process, and is the process documented?",
          "Was there consultation with employee representatives (union agreement)?",
          "Is a SHE committee chairperson appointed?",
          "Are SHE committee members appointed?",
          "Is a person appointed for incident investigations?",
          "Is a work permit controller appointed?",
          "Is a competent electrician appointed?",
          "Is a portable electrical equipment inspector appointed?",
          "Is a ladder inspector appointed?",
          "Is a person appointed for gas cutting and welding equipment?",
          "Is a person appointed for air compressors?",
        ],
      },
      {
        id: "1.2.1",
        title: "Control of contractors and service providers",
        questions: [
          "Are documented health and safety specifications available for all subcontractors?",
          "Did permanent (full-time on site) contractors submit a detailed SHE file?",
          "Have all contractors been identified and listed with name, type of work, contact numbers and responsible persons?",
          "Are written Section 37(2) agreements in place?",
          "Are SHE files of permanent contractors in place?",
          "Have all staff and contractors gone through induction, and is proof available?",
          "Do contractors use control systems such as permits to work?",
          "Are contractor files audited at least annually?",
          "Do contractors have third-party liability insurance?",
          "Are all contractors registered for COID, and are copies of their Letters of Good Standing available?",
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Risk management, legal & systems",
    subsections: [
      {
        id: "2.1.1",
        title: "Risk assessment team and participation",
        questions: [
          "Are employees as well as management involved in the risk assessment process?",
          "Is an occupational health practitioner involved in the health risk assessment?",
          "Are risk assessments reviewed annually, or when processes change or new risks occur?",
        ],
      },
      {
        id: "2.1.2",
        title: "Documented risk assessments",
        questions: [
          "Is there a system used to identify all processes?",
          "Are all safety, health and environmental risks considered?",
          "Was a baseline risk assessment performed for the entire property?",
          "Are risk assessments conducted based on processes?",
          "Are pre-task risk assessments (HIRA) performed before processes are started?",
          "Is there a risk profile showing the process-based risk assessments?",
        ],
      },
      {
        id: "2.1.3",
        title: "Hazardous substances",
        questions: [
          "Is a master list available, accompanied by MSDS sheets and TREM cards?",
          "Are compatibility studies performed where different chemicals are stored?",
          "Are storage areas identified and segregated from staff?",
          "Are vehicles transporting hazardous goods identified, and are TREM cards and MSDS sheets available?",
        ],
      },
      {
        id: "2.1.4",
        title: "Environmental impact",
        questions: [
          "Have sources of potential disturbances been identified?",
          "Have legislative requirements been identified (national and local)?",
          "Have operational impacts been considered (emissions, surface water, soil, etc.)?",
        ],
      },
      {
        id: "2.2.1",
        title: "Access to relevant legislation",
        questions: [
          "Have legal requirements been identified?",
          "Is legal documentation accessible?",
          "Is a system in place to keep documents up to date?",
        ],
      },
      {
        id: "2.2.2",
        title: "Legal and by-law notices and certification",
        questions: [
          "Has a flammable liquids certificate been obtained for flammable stores or fuel tanks?",
          "If assessed as a major hazard installation, is the site registered as one?",
          "Where applicable, are food safety systems implemented, audits performed and certification available?",
          "Where pharmaceuticals are stored or handled, is the site MCC compliant and are certificates available?",
          "Is a copy of the certificate of occupancy available?",
          "Are waste disposal manifests and certificates available for hazardous waste generated on site?",
          "Are electrical certificates of compliance available for all installations?",
        ],
      },
      {
        id: "2.2.3",
        title: "Compensation for Occupational Injuries and Diseases (COID)",
        questions: [
          "Is a current Letter of Good Standing available on file?",
          "Are the relevant incident and accident forms available?",
          "Is a system in place to speed up the finalisation of claims?",
          "Are records of claims, costs and annual contributions verified, and is the cost of incidents communicated to management?",
        ],
      },
      {
        id: "2.3.1",
        title: "SHE management protocols",
        questions: [
          "Has a SHE management system been identified that best suits the requirements of the site?",
          "Are standards documented, practical and relevant?",
          "Are the standards endorsed and approved by the compliance department?",
          "Are relevant employees trained to use the standards?",
          "Are the standards in line with the physical processes?",
          "Is the system accessible to the employees concerned?",
        ],
      },
      {
        id: "2.3.2",
        title: "Safe work procedures",
        questions: [
          "Has a critical task summary been drafted from the risk profile, identifying the level of risk of each SOP?",
          "Are SOPs clear, and do they set out each process step by step?",
          "Is there a list of staff defining the tasks performed per person, and is it updated at least annually?",
        ],
      },
      {
        id: "2.3.3",
        title: "Job observations",
        questions: [
          "Is there a summary of all personnel indicating the tasks they perform?",
          "Is there a schedule of planned task observations covering all personnel, updated twice a year?",
          "Are planned task observations signed by the employee and supervisor?",
        ],
      },
      {
        id: "2.3.4",
        title: "Plant maintenance systems",
        questions: [
          "Are all plant and critical machinery identified and listed?",
          "Is there a detailed maintenance schedule for all machinery?",
          "Do job cards and service reports reflect the schedule?",
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Health, training & communication",
    subsections: [
      {
        id: "3.1.1",
        title: "Job profiles",
        questions: [
          "Is there a standard man-job specification?",
          "Were job specifications completed and sent to the medical practitioner?",
          "When staff are sent for medicals, are they measured against the man-job specifications?",
        ],
      },
      {
        id: "3.1.2",
        title: "Medical examinations",
        questions: [
          "Are entry medicals done according to specifications and requirements?",
          "Is a medical surveillance programme in place?",
          "Is a system in place to ensure periodic medicals are performed?",
          "Do employees undergo exit medicals?",
        ],
      },
      {
        id: "3.2.1",
        title: "Induction training",
        questions: [
          "Is a documented induction module in place and relevant to the operation?",
          "Are attendance registers available?",
          "Is there a process in place to induct visitors and contractors?",
          "Is induction refresher training done annually?",
        ],
      },
      {
        id: "3.2.2",
        title: "Training needs analysis",
        questions: [
          "Is there a training needs analysis, and is the training matrix aligned per person?",
          "Is the needs analysis evaluated twice a year?",
          "Is all training documented, and is proof available?",
        ],
      },
      {
        id: "3.2.3",
        title: "Task-specific (legal) training — is current training in place for:",
        questions: [
          "Crane operators",
          "Vehicle drivers (advanced driving)",
          "MHE (forklift) operators",
          "First aiders",
          "Fire fighters",
          "Scaffold erectors and inspectors",
          "OHS Act legal training",
          "Health and safety representatives",
        ],
      },
      {
        id: "3.3.1",
        title: "Awareness",
        questions: [
          "Are campaigns implemented to increase awareness?",
          "Are monthly safety talks held with staff?",
          "Are safety topics issued or posted on notice boards?",
        ],
      },
      {
        id: "3.3.2",
        title: "Notice boards and communication",
        questions: [
          "Is there a dedicated notice board for health and safety?",
          "Are emergency personnel displayed on the board?",
          "Are organograms, emergency procedures, policies and notices posted on the board?",
        ],
      },
      {
        id: "3.4.1",
        title: "SHE committees",
        questions: [
          "Are SHE meetings held monthly?",
          "Are relevant topics being discussed?",
          "Are the meetings minuted and sent to committee members?",
          "Are actions identified and target dates set?",
          "Are the minutes signed by the chairperson and placed on file?",
        ],
      },
      {
        id: "3.5.1",
        title: "Material and purchase specifications",
        questions: [
          "Are details available for stored hazardous chemical substances (HCS)?",
          "Are processes in place to eliminate the purchase of dangerous goods where possible?",
        ],
      },
      {
        id: "3.5.2",
        title: "Quarantine procedures",
        questions: [
          "Is there a detailed quarantine procedure for spoiled products?",
          "Are quarantine areas identified and clearly marked?",
        ],
      },
      {
        id: "3.6.1",
        title: "Document control system",
        questions: [
          "Is a documented health and safety plan summarised with revision numbers?",
          "Are all documents numbered with a document number?",
          "Does the system comply with QA document control requirements?",
        ],
      },
      {
        id: "3.6.2",
        title: "Change control",
        questions: [
          "Is a documented system available to track changes?",
          "Is a system implemented to ensure only current documents are circulated?",
          "Are all documents reviewed on time as indicated?",
        ],
      },
      {
        id: "3.7.1",
        title: "Emergency procedures",
        questions: [
          "Do formal procedures cover all emergency events?",
          "Are emergency contact details available (SAPS, emergency services, medical)?",
          "Is there an audible alarm or PA system?",
          "Are emergency evacuation drills held every 6 months?",
          "Are the procedures reviewed regularly?",
        ],
      },
      {
        id: "3.7.2",
        title: "Emergency equipment",
        questions: [
          "Has the fire department visited the site and signed off?",
          "Are there adequate first aid boxes and fire equipment?",
          "Are maintenance schedules in place, and are service certificates available?",
          "Where sprinkler valves, tanks or pumps are installed, have they been serviced and tested?",
          "Are supplier credentials available for valves and pumps?",
          "Is spill response equipment available?",
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Monitoring, incidents & inspections",
    subsections: [
      {
        id: "4.1.1",
        title: "Measurement system",
        questions: [
          "Are statistical reports produced, and does the system identify trends?",
          "Does it allow comparison against previous performance?",
          "Does it include the cost of injuries and an analysis of claims?",
        ],
      },
      {
        id: "4.1.2",
        title: "Reporting formats",
        questions: [
          "Is there an incident management system, and are accidents recorded on it and sent to head office?",
          "Are the legal documents available for each incident?",
          "Do management reports include SHE performance?",
        ],
      },
      {
        id: "4.2.1",
        title: "Incident investigation procedures",
        questions: [
          "Are all legal requirements addressed?",
          "Are registers and WCL documents available?",
          "Are investigations effective and concluded?",
          "Are near-miss and damage investigations being done?",
          "Is awareness training done on past incidents?",
        ],
      },
      {
        id: "4.2.2",
        title: "Recording procedures",
        questions: [
          "Are incident recalls created, and are employees trained on them?",
          "Are graphic displays of statistical data posted for employees, with a copy on file?",
        ],
      },
      {
        id: "4.2.3",
        title: "Non-conformance",
        questions: [
          "Is a system used to document SHE issues (CAPA)?",
          "Are procedures followed to close out reports?",
        ],
      },
      {
        id: "4.3.1",
        title: "Physical inspections",
        questions: [
          "Are formal inspection checklists available?",
          "Are health and safety representative inspections available?",
          "Are inspections documented and on file?",
        ],
      },
      {
        id: "4.3.2",
        title: "System audits",
        questions: [
          "Are internal audit formats available?",
          "Are external audits available?",
          "Are reports circulated to the CEO or stakeholders?",
          "Are corrective actions, responsible persons and completion dates recorded?",
          "Is a record kept of the job requisitions raised?",
        ],
      },
      {
        id: "4.3.3",
        title: "Inspection register control",
        questions: [
          "Have items requiring control inspections been identified?",
          "Are inspections available for each item?",
          "Are registers signed and dated by the appointed inspector?",
          "Are inspection intervals set as per regulations?",
          "Are all registers controlled documents with review dates?",
        ],
      },
      {
        id: "4.4.1",
        title: "Inspection registers — is a current register kept for:",
        questions: [
          "Stacking",
          "Racking structures",
          "Lighting",
          "Emergency lights",
          "Earth leakage units",
          "Electrical DB boards",
          "Buildings",
          "Ventilation",
          "Fire equipment",
          "First aid boxes",
          "Flameproof equipment",
          "Diesel bowsers",
          "Hazardous chemical substances",
          "Gas welding and cutting equipment",
          "Hand tools",
          "Hydraulic equipment and fittings",
          "Ladders, stairs and walkways",
          "Lifting machines and equipment",
          "Pre-start lifting equipment checks",
          "Safety harnesses",
          "Personal protective equipment",
          "Portable electrical equipment",
          "Pressure vessels",
          "Scaffolding",
          "Toilets and kitchens",
          "Generators (weekly / monthly)",
          "Lockout for maintenance",
          "Waste and refuse",
          "Sprinkler valves",
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Site inspection",
    subsections: [
      {
        id: "5.1",
        title: "Access control and site security",
        questions: [
          "Is there adequate fencing and gate access control?",
          "Is a security threat analysis available?",
          "Are controls appropriate for the risks identified?",
          "Is sign-in and access controlled at the main gate?",
        ],
      },
      {
        id: "5.2",
        title: "Amenities and facilities",
        questions: [
          "Are adequate facilities available for the number of staff?",
          "Are toilet facilities marked (male / female)?",
          "Are showers, lockers and benches provided and in good order where needed?",
          "Is deep cleaning done regularly, and are records available?",
          "Where kitchens are used, are all utensils safe and sanitised?",
          "Are food handlers wearing the correct PPE?",
          "Are kitchens and canteens clean and tidy?",
        ],
      },
      {
        id: "5.3",
        title: "Waste management",
        questions: [
          "Are waste bins provided for all types of waste?",
          "Are waste bins labelled for the different types of waste?",
          "Are waste areas neat and tidy?",
          "Are liquid waste products prevented from entering the stormwater drains?",
          "Are waste manifests or disposal certificates available for hazardous and toxic waste?",
          "Is there a waste disposal schedule, and is it followed?",
        ],
      },
      {
        id: "5.4",
        title: "Housekeeping",
        questions: [
          "Are rubbish bins used?",
          "Are storage areas for produce identified, and is stock securely stacked?",
          "Are storage areas for chemicals identified, and are chemicals securely stacked?",
          "Are day-to-day storage areas identified and securely stacked?",
          "Are tool and equipment storage areas identified and securely stacked?",
          "Are waste areas demarcated or identified?",
          "Are workstations and platforms clean and free of obstructions?",
          "Are work areas free from slip and trip hazards?",
          "Are work areas adequate for their intended purpose?",
        ],
      },
      {
        id: "5.5",
        title: "Safety signs",
        questions: [
          "Are signs placed in strategic locations and maintained?",
          "Are employees aware of the meaning and function of the signs?",
          "Is there a board showing the signs and their meanings?",
        ],
      },
      {
        id: "5.6",
        title: "Colour coding",
        questions: [
          "Is a colour coding reference board available and displayed?",
          "Are employees aware of the colour meanings and functions?",
        ],
      },
      {
        id: "5.7",
        title: "Machinery",
        questions: [
          "Is the general condition of machinery acceptable?",
          "Are controls labelled and maintained?",
          "Are all guards fitted and regularly inspected?",
          "Are lockout controls available and used?",
          "Are operators competent, and is proof available?",
        ],
      },
      {
        id: "5.8",
        title: "Lifting equipment",
        questions: [
          "Are daily inspection checklists completed by operators?",
          "Are faults identified and reported?",
          "Do operators have medicals, and are copies available?",
          "Are safety devices fitted (reverse beeper, emergency stop, ID lights)?",
          "Are safe working loads marked where relevant?",
          "Are all machines load tested annually and inspected every 6 months by a registered LMI?",
        ],
      },
      {
        id: "5.9",
        title: "Lifting gear",
        questions: [
          "Is all lifting gear identified and on a register?",
          "Are safe working loads marked on the gear?",
          "Is the general visual condition of the equipment acceptable?",
          "Are man-cage areas clear of personnel and demarcated?",
          "Are all man cages listed on a register?",
          "Are all man cages approved by the Department of Employment and Labour?",
        ],
      },
      {
        id: "5.10",
        title: "Electrical",
        questions: [
          "Is an earth leakage certificate available for all installations?",
          "Is infrared (thermographic) testing done on all DB boards?",
          "Are all cords protected, covers closed, spacers positioned and waterproof switches used?",
          "Are there no exposed cables?",
          "Do the DB boards comply with electrical safety standards?",
          "Where transformers are installed, is entry prohibited, are signs displayed and are records available?",
          "Are all portable electrical equipment and tools on a register and inspected?",
          "Are all lights in working order and inspected?",
          "Is a certificate of compliance available for all installations?",
        ],
      },
      {
        id: "5.11",
        title: "Compressed air",
        questions: [
          "Are all hoses and gauges suitable for the task?",
          "Are all air compressors pressure tested by an approved AIA?",
          "Are all fitted gauges correct, showing the maximum working pressure (MWP)?",
          "Are all hoses free of damage, perishing and joins?",
        ],
      },
      {
        id: "5.12",
        title: "Gas and diesel bowsers",
        questions: [
          "Are the stored quantities displayed in the area?",
          "Is a drain system available?",
          "Is the relevant signage displayed?",
          "Are filling points and above-ground diesel tanks bunded, with a separator system in place?",
          "Do gas storage facilities prohibit entry, and are the correct signs displayed?",
          "Are full and empty cylinders separated?",
          "Are full cylinders chained to a fixed structure to prevent them falling over?",
        ],
      },
      {
        id: "5.13",
        title: "Scaffolding",
        questions: [
          "Are scaffolding designs and registers up to date?",
          "Are handrails, mid-rails and toe boards fitted?",
          "Is adequate access available (ladder access every 4 m maximum)?",
          "Is the structure secured vertically and horizontally?",
          "Are all platforms fully boarded?",
          "Are scaffold tags fitted at all access points?",
          "Is a scaffolding inspector appointed, with proof of training?",
        ],
      },
      {
        id: "5.14",
        title: "Battery charging stations",
        questions: [
          "Are battery stations well ventilated, with extractors installed?",
          "Is PPE issued and used when topping up battery water?",
          "Are drainage facilities installed for run-off when washing or draining batteries?",
          "Does the drainage system comply with local by-laws?",
          "Are redundant batteries disposed of correctly?",
        ],
      },
      {
        id: "5.15",
        title: "Racking systems",
        questions: [
          "Are all uprights protected with barriers?",
          "Are safety pins inserted in all horizontal beams?",
          "Is the racking system free of damage?",
          "Is damage reported and immediate action taken?",
        ],
      },
      {
        id: "5.16",
        title: "Sprinkler systems",
        questions: [
          "Is the pump house locked and entry prohibited?",
          "Are the main valves available and shown on a layout drawing?",
          "Are inline sprinklers free from damage?",
          "Is the system free of leaks?",
          "Do the gauges show the correct pressure?",
          "Are the valves locked in the open position with a chain and lock?",
        ],
      },
      {
        id: "5.17",
        title: "Hand tools and home-made tools",
        questions: [
          "Are design specifications and drawings available for purpose-made tools?",
          "Are all tools listed on an inventory?",
          "Are tools inspected monthly, and is proof available?",
          "Are tools in good overall condition?",
        ],
      },
      {
        id: "5.18",
        title: "Ladders (fixed and portable)",
        questions: [
          "Are all ladders numbered?",
          "Are portable ladders fitted with guide ropes or anti-slip devices?",
          "Are ladders, catwalks and landings in good overall condition?",
        ],
      },
      {
        id: "5.19",
        title: "Employee conduct",
        questions: [
          "Do only authorised operators operate equipment?",
          "Is fall protection used?",
          "Is horseplay prohibited?",
          "Do employees appear confident in their tasks?",
          "Are the correct tools available and used correctly for all tasks?",
          "Is adequate PPE used for specific tasks?",
        ],
      },
      {
        id: "5.20",
        title: "Smoking area",
        questions: [
          "Has a smoking area been identified?",
          "Is the correct signage displayed, including a helpline number?",
          "Is a suitable flameproof ashtray available?",
          "Are cigarette ends and other waste disposed of in the ashtray?",
          "Do staff use the dedicated smoking area?",
        ],
      },
    ],
  },
];

export type AuditQuestion = {
  id: string;
  letter: string;
  text: string;
  sectionId: string;
  subsectionId: string;
  subsectionTitle: string;
};

const letter = (i: number) => (i < 26 ? String.fromCharCode(97 + i) : `${String.fromCharCode(97 + Math.floor(i / 26) - 1)}${String.fromCharCode(97 + (i % 26))}`);

export const AUDIT_QUESTIONS: AuditQuestion[] = AUDIT_SECTIONS.flatMap((s) =>
  s.subsections.flatMap((sub) =>
    sub.questions.map((text, i) => ({
      id: `${sub.id}.${letter(i)}`,
      letter: letter(i),
      text,
      sectionId: s.id,
      subsectionId: sub.id,
      subsectionTitle: sub.title,
    })),
  ),
);

export const AUDIT_QUESTION_IDS = new Set(AUDIT_QUESTIONS.map((q) => q.id));

export type AuditAnswer = "yes" | "no" | "na";

export const MAX_PHOTOS_PER_QUESTION = 4;

export function auditSummary(answers: { questionId: string; answer: string | null }[]) {
  let yes = 0;
  let no = 0;
  let na = 0;
  for (const a of answers) {
    if (!AUDIT_QUESTION_IDS.has(a.questionId)) continue;
    if (a.answer === "yes") yes++;
    else if (a.answer === "no") no++;
    else if (a.answer === "na") na++;
  }
  const total = AUDIT_QUESTIONS.length;
  const answered = yes + no + na;
  const compliance = yes + no ? Math.round((yes / (yes + no)) * 1000) / 10 : null;
  return { yes, no, na, answered, total, compliance };
}

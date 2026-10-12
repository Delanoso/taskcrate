import type { TalkExtras } from "../types";

export const CONSTRUCTION_EXTRAS: Record<string, TalkExtras> = {
  "working-at-heights": {
    why: "Serious falls often happen from 2–3 m — not the tall buildings, but the 'quick job' on a roof or platform.",
    dos: ["Have a fall protection plan", "Use edge protection or a harness", "Check the area below is barricaded"],
    donts: ["Don't work at height alone", "Don't lean over unprotected edges", "Don't work on fragile roofs without boards"],
  },
  "ladder-safety": {
    why: "Ladders cause many falls because they are used for jobs that need a scaffold or platform.",
    dos: ["Set the ladder at 1-in-4", "Tie it off or have it held", "Extend 1 m above the landing"],
    donts: ["Don't stand on the top three rungs", "Don't use metal ladders near power", "Don't carry heavy loads up"],
  },
  "fall-arrest-harness": {
    why: "A harness clipped to a weak point or worn loose can fail exactly when you fall.",
    dos: ["Inspect the harness before every use", "Anchor above your head", "Fit leg straps snugly"],
    donts: ["Don't tie off to handrails or pipes", "Don't use a harness that has arrested a fall", "Don't work without a rescue plan"],
  },
  scaffolding: {
    why: "Scaffold collapses and falls from scaffolds often come from missing boards, rails or ties that someone removed.",
    dos: ["Check the scaffold tag before climbing", "Use the ladder access", "Keep platforms clear"],
    donts: ["Don't alter scaffolds yourself", "Don't climb the outside frame", "Don't overload platforms"],
  },
  excavations: {
    why: "A cubic metre of soil weighs over a tonne — even a partial collapse can crush or suffocate a worker.",
    dos: ["Shore or slope trenches deeper than 1.5 m", "Keep spoil 1 m from the edge", "Use a ladder to get in and out"],
    donts: ["Don't enter an unsupported trench", "Don't park plant near the edge", "Don't dig without service drawings"],
  },
  "falling-objects": {
    why: "A spanner dropped from 10 m hits with the force of a hammer blow — a hard hat may not be enough.",
    dos: ["Use toe boards and tool lanyards", "Barricade below work areas", "Wear your hard hat"],
    donts: ["Don't throw tools or materials down", "Don't leave loose items on edges", "Don't walk under suspended loads"],
  },
  "cranes-and-lifting": {
    why: "Lifting failures drop tonnes of steel in a second — the exclusion zone is there for a reason.",
    dos: ["Check slings and hooks before lifting", "Use tag lines to control loads", "Follow the signaller's instructions"],
    donts: ["Don't stand under a load", "Don't lift over people", "Don't lift in strong wind"],
  },
  "concrete-and-cement": {
    why: "Kneeling in wet concrete for an hour can cause burns that need skin grafts — and you won't feel it at first.",
    dos: ["Wear waterproof gloves and boots", "Wash skin quickly after contact", "Wear goggles when mixing"],
    donts: ["Don't kneel in wet concrete without protection", "Don't let cement get inside boots", "Don't wipe eyes with dusty hands"],
  },
  "site-access": {
    why: "People walking through plant routes or near open edges get hurt — safe access routes keep them out of the danger zone.",
    dos: ["Use the marked access routes", "Sign in at the gate", "Report blocked routes"],
    donts: ["Don't take shortcuts across the site", "Don't walk behind moving plant", "Don't enter barricaded zones"],
  },
  "sun-and-heat-on-site": {
    why: "Heat stroke can kill — the confusion it causes means victims often don't realise they're in trouble.",
    dos: ["Drink water every 15–20 minutes", "Wear a brim and sunscreen", "Watch your teammates for signs"],
    donts: ["Don't wait until you're thirsty", "Don't work shirtless", "Don't ignore dizziness or headache"],
  },
};

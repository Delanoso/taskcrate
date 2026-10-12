import type { TalkExtras } from "../types";

export const WAREHOUSE_EXTRAS: Record<string, TalkExtras> = {
  "forklift-pre-use": {
    why: "A leaking hydraulic hose or failing brakes found at 07:00 is a repair — found mid-lift it's an accident.",
    dos: ["Complete the checklist every shift", "Test brakes, horn and lights", "Tag out a faulty forklift"],
    donts: ["Don't skip the check when busy", "Don't drive a machine with known faults", "Don't sign a check you didn't do"],
  },
  "forklift-pedestrians": {
    why: "Forklift pedestrian accidents usually happen in the blind spot — the driver never saw the person.",
    dos: ["Use marked walkways", "Make eye contact with the driver", "Wear your hi-vis"],
    donts: ["Don't walk behind a reversing forklift", "Don't stand under raised forks", "Don't take shortcuts through aisles"],
  },
  "forklift-loads": {
    why: "A forklift loaded past its rated capacity can tip forward in a second, and the driver is thrown or trapped.",
    dos: ["Check the load chart", "Travel with forks low and tilted back", "Drive down ramps in reverse when loaded"],
    donts: ["Don't carry people on the forks", "Don't turn on slopes", "Don't lift unstable or unwrapped loads"],
  },
  "racking-safety": {
    why: "One bent upright weakens the whole bay — when racking fails it can drag neighbouring bays down too.",
    dos: ["Report every racking strike", "Respect load limit signs", "Place pallets squarely on beams"],
    donts: ["Don't climb racking", "Don't keep loading a damaged bay", "Don't remove beam locks"],
  },
  "stacking-storage": {
    why: "Stock stacked too high or crooked falls on people — and boxes in front of exits can trap staff in a fire.",
    dos: ["Put heavy items low", "Stack in an interlocking pattern", "Keep 1 m clear below sprinklers and lights"],
    donts: ["Don't stack damaged boxes", "Don't block exits or fire equipment", "Don't stack higher than allowed"],
  },
  "loading-docks": {
    why: "A truck pulling off while a forklift is inside the trailer drops the forklift and driver off the dock.",
    dos: ["Chock wheels or use dock locks", "Hold the keys until loading is done", "Check the trailer floor first"],
    donts: ["Don't stand between the truck and dock", "Don't drive onto an unsecured trailer", "Don't jump off the dock edge"],
  },
  "pallet-jacks": {
    why: "A loaded pallet jack weighs tonnes — rolling it over a foot or losing it on a slope causes crush injuries.",
    dos: ["Push rather than pull where possible", "Lower forks when parked", "Wear safety boots"],
    donts: ["Don't ride on a pallet jack", "Don't use them on steep slopes", "Don't exceed the rated load"],
  },
  "box-cutters": {
    why: "A slip of the blade while cutting towards yourself can sever a tendon — and hands take months to heal.",
    dos: ["Use self-retracting blades", "Cut away from your body", "Wear cut-resistant gloves"],
    donts: ["Don't use blunt blades", "Don't leave open knives on shelves", "Don't use a knife as a screwdriver or pry bar"],
  },
  "ladders-in-store": {
    why: "Even a short fall from a stepladder onto concrete can cause a serious head injury.",
    dos: ["Use the platform ladder or step stool", "Keep three points of contact", "Carry items in a bag or hand them up"],
    donts: ["Don't climb shelves or racking", "Don't overreach sideways", "Don't stand on the top step"],
  },
  "warehouse-traffic-plan": {
    why: "Vehicles and people sharing the same space without rules is the most common setting for warehouse fatalities.",
    dos: ["Follow the floor markings", "Obey speed limits", "Use the horn at blind corners"],
    donts: ["Don't park in walkways", "Don't leave the walkway without looking", "Don't remove mirrors or barriers"],
  },
};

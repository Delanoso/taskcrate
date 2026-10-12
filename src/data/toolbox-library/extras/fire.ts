import type { TalkExtras } from "../types";

export const FIRE_EXTRAS: Record<string, TalkExtras> = {
  "fire-extinguishers": {
    why: "A small fire can fill a room with smoke in under 3 minutes — knowing PASS means acting in seconds.",
    dos: ["Pull, Aim, Squeeze, Sweep", "Keep your back to an exit", "Report used extinguishers"],
    donts: ["Don't fight a fire bigger than a bin", "Don't put an empty extinguisher back", "Don't let smoke block your way out"],
  },
  "fire-classes": {
    why: "Water on an oil or electrical fire can spread flames or electrocute the person holding the hose.",
    dos: ["Read the extinguisher label", "Use CO2 on electrical fires", "Use foam or powder on fuel fires"],
    donts: ["Don't use water on electrical fires", "Don't use water on burning oil", "Don't guess — check the label"],
  },
  evacuation: {
    why: "People who stop to collect belongings or use lifts are the ones who get trapped.",
    dos: ["Know two ways out", "Go straight to the assembly point", "Help visitors and others"],
    donts: ["Don't use lifts", "Don't go back for belongings", "Don't leave the assembly point until told"],
  },
  "hot-work": {
    why: "Sparks can travel 10 m and smoulder unseen for hours — many fires start after the welder has gone home.",
    dos: ["Get a hot work permit", "Clear or cover flammables", "Do a fire watch afterwards"],
    donts: ["Don't do hot work near fuel or paint", "Don't skip the fire watch", "Don't work without an extinguisher nearby"],
  },
  "flammable-storage": {
    why: "Petrol vapour can travel along the floor to an ignition source and flash back to the container.",
    dos: ["Use approved, labelled containers", "Store in a ventilated flammable store", "Keep minimum quantities at the workstation"],
    donts: ["Don't store fuel in cool drink bottles", "Don't keep flammables near heat or sparks", "Don't leave lids off"],
  },
  "smoking-areas": {
    why: "A cigarette flicked into a skip or dry grass can smoulder for hours before a fire breaks out.",
    dos: ["Smoke only in marked areas", "Use the bins provided", "Make sure butts are out"],
    donts: ["Don't smoke near fuel or gas", "Don't throw butts into bins or grass", "Don't smoke in vehicles or stores"],
  },
  "fire-equipment-access": {
    why: "Moving a pallet to reach an extinguisher wastes the minute in which the fire could have been stopped.",
    dos: ["Keep 1 m clear around fire equipment", "Report missing or used equipment", "Know where the nearest one is"],
    donts: ["Don't hang things on hose reels", "Don't block extinguishers with stock", "Don't remove signs"],
  },
  "fire-drills": {
    why: "Under stress people freeze or panic — a practised route becomes automatic.",
    dos: ["Take every drill seriously", "Use the nearest safe exit", "Report to your warden"],
    donts: ["Don't ignore the alarm", "Don't stop to finish your work", "Don't wander off from the assembly point"],
  },
  "lpg-gas-leaks": {
    why: "Leaked LPG sinks and pools — when it finds a spark, it can explode with devastating force.",
    dos: ["Check for the smell of gas", "Turn off the cylinder valve if safe", "Ventilate and evacuate"],
    donts: ["Don't switch lights or phones on near a leak", "Don't store cylinders below ground", "Don't use a flame to test for leaks"],
  },
  "emergency-numbers": {
    why: "Searching for a number during an emergency wastes the minutes that save lives.",
    dos: ["Save 112 and 10177 in your phone", "Know the site address to give", "Know who your first aider is"],
    donts: ["Don't assume someone else called", "Don't hang up until told to", "Don't block the road for the ambulance"],
  },
};

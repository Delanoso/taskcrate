import type { TalkExtras } from "../types";

export const WORKSHOP_EXTRAS: Record<string, TalkExtras> = {
  "angle-grinders": {
    why: "A cutting disc that shatters at full speed sends fragments out like shrapnel — face, neck and eye injuries are common.",
    dos: ["Check the disc rating matches the grinder", "Keep the guard on and use both hands", "Wear a face shield over safety glasses"],
    donts: ["Don't use a cutting disc for grinding", "Don't put it down while still spinning", "Don't remove the guard for 'better access'"],
  },
  "welding-safety": {
    why: "Arc eye feels like sand in your eyes for days, and welding fumes damage lungs over years — both are preventable.",
    dos: ["Use screens to protect others", "Extract fumes at the source", "Keep a fire extinguisher at the bay"],
    donts: ["Don't weld near flammables", "Don't look at the arc without a filter", "Don't weld on drums that held fuel"],
  },
  "machine-guarding": {
    why: "Moving parts can pull in a glove or sleeve faster than you can react — guards are often the only thing in between.",
    dos: ["Check guards before starting", "Use LOTO before clearing jams", "Report missing or broken guards"],
    donts: ["Don't remove or bypass guards", "Don't reach in while it's running", "Don't wear loose clothing near rotating parts"],
  },
  "hand-tools": {
    why: "A mushroomed chisel head or a cracked hammer handle can send metal fragments flying or slip and gash a hand.",
    dos: ["Use the right tool for the job", "Inspect tools before use", "Cut away from your body"],
    donts: ["Don't use screwdrivers as chisels", "Don't use cheater bars on spanners", "Don't carry sharp tools in your pockets"],
  },
  "compressed-air": {
    why: "Air at workshop pressure can drive dirt into your eyes or skin — and blowing it at someone as a joke has killed people.",
    dos: ["Use safety nozzles and low pressure", "Wear eye protection", "Check hoses and couplings"],
    donts: ["Don't clean clothes or skin with air", "Don't point an air hose at anyone", "Don't kink hoses to stop the flow"],
  },
  "lathe-and-drill": {
    why: "A glove caught on a spinning chuck wraps the hand and arm in before the machine can be stopped.",
    dos: ["Remove the chuck key every time", "Clamp the work piece", "Tie back hair and roll up sleeves"],
    donts: ["Don't wear gloves near rotating spindles", "Don't hold work by hand when drilling", "Don't clear swarf with your fingers"],
  },
  "workshop-housekeeping": {
    why: "Oil on the floor plus a stray spark from a grinder is how many workshop fires begin.",
    dos: ["Wipe up oil spills immediately", "Put oily rags in a closed metal bin", "Keep the area around machines clear"],
    donts: ["Don't leave offcuts on the floor", "Don't store junk in walkways", "Don't let swarf pile up"],
  },
  "jacks-and-stands": {
    why: "A vehicle that slipped off a jack crushes whoever is underneath — there is no time to get out.",
    dos: ["Use axle stands on firm, level ground", "Chock the wheels", "Check the stand's rating"],
    donts: ["Don't go under a car on a jack alone", "Don't use bricks or blocks as stands", "Don't overload the jack"],
  },
  "eye-protection": {
    why: "Most eye injuries at work happen to people who were not wearing eye protection — or wore the wrong type.",
    dos: ["Wear glasses whenever tools are running", "Use goggles for chemicals and dust", "Know where the eyewash station is"],
    donts: ["Don't rub an eye with something in it", "Don't wear scratched lenses", "Don't lift your visor to 'see better'"],
  },
  "gas-cylinders": {
    why: "If a cylinder falls and the valve snaps, it can shoot off with enough force to go through a wall.",
    dos: ["Chain cylinders upright", "Fit valve caps when not in use", "Check hoses and flashback arrestors"],
    donts: ["Don't roll or drop cylinders", "Don't use oil or grease on oxygen fittings", "Don't store full and empty cylinders mixed"],
  },
};

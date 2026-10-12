import type { TalkExtras } from "../types";

export const ELECTRICAL_EXTRAS: Record<string, TalkExtras> = {
  "electrical-basics": {
    why: "Ordinary 230 V household power kills — current through the chest can stop the heart in a fraction of a second.",
    dos: ["Treat every wire as live", "Leave electrical work to qualified people", "Keep electrical gear dry"],
    donts: ["Don't touch switches with wet hands", "Don't open panels you're not authorised to", "Don't use damaged equipment"],
  },
  "lockout-tagout": {
    why: "Someone switching a machine back on while another worker is inside it is one of the most horrific workplace accidents.",
    dos: ["Isolate, lock, tag and test", "Keep your own key", "Try to start it to prove it's dead"],
    donts: ["Don't rely on the stop button", "Don't remove someone else's lock", "Don't share a lock with others"],
  },
  "extension-leads": {
    why: "A coiled lead under heavy load overheats and can melt — a daisy-chain of adaptors is a common fire cause.",
    dos: ["Inspect leads before use", "Uncoil drums fully under load", "Route leads away from traffic"],
    donts: ["Don't daisy-chain adaptors", "Don't repair leads with tape", "Don't run leads through water or doors"],
  },
  "portable-power-tools": {
    why: "A damaged cable on a drill can make the whole tool live — and the kickback can also cause a fall.",
    dos: ["Check plugs, cables and guards", "Unplug before changing bits or blades", "Use a tool with an earth leakage"],
    donts: ["Don't carry tools by the cable", "Don't use them in the rain", "Don't remove tool guards"],
  },
  "overhead-power-lines": {
    why: "You don't need to touch an overhead line — high voltage can jump across a gap to a tipper bed or ladder.",
    dos: ["Look up before raising anything", "Keep the safe distance for the voltage", "Use a spotter near lines"],
    donts: ["Don't raise tipper beds under lines", "Don't use aluminium ladders near lines", "Don't touch a vehicle that contacted a line"],
  },
  "earth-leakage": {
    why: "An earth leakage trips in milliseconds — without one, a faulty tool can kill before you can let go.",
    dos: ["Test the trip button monthly", "Report units that keep tripping", "Use a plug-in unit on sites"],
    donts: ["Don't bypass a tripping unit", "Don't keep resetting without finding the fault", "Don't rely on it as your only protection"],
  },
  "distribution-boards": {
    why: "An open DB is an arc-flash and shock risk — blocked access slows down isolation in an emergency.",
    dos: ["Keep DB doors closed and locked", "Label all circuits", "Keep 1 m clear in front"],
    donts: ["Don't store things against the DB", "Don't leave covers off", "Don't let unqualified staff work inside"],
  },
  "generators-load-shedding": {
    why: "A generator connected without a changeover switch can back-feed and electrocute a technician working on the grid.",
    dos: ["Use a proper changeover switch", "Run generators outdoors", "Refuel only when it's cool"],
    donts: ["Don't plug a generator into a wall socket", "Don't run it in closed rooms", "Don't refuel while running"],
  },
  "battery-charging": {
    why: "Hydrogen from charging batteries can collect under roofs — a single spark can cause an explosion.",
    dos: ["Charge in a ventilated area", "Wear goggles and gloves for acid", "Switch off before disconnecting"],
    donts: ["Don't smoke near charging areas", "Don't put tools across terminals", "Don't overfill with water"],
  },
  "electric-shock-response": {
    why: "Grabbing someone stuck to a live circuit makes you part of the circuit — there are then two victims.",
    dos: ["Switch off at the source first", "Call for help and start CPR if trained", "Get medical care even if they seem fine"],
    donts: ["Don't touch the victim while power is on", "Don't use anything metal or wet", "Don't move them unless in danger"],
  },
};

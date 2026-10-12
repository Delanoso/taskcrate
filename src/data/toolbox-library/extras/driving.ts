import type { TalkExtras } from "../types";

export const DRIVING_EXTRAS: Record<string, TalkExtras> = {
  "pre-trip-inspection": {
    why: "A tyre blowout or brake failure on a loaded truck at 80 km/h rarely ends with only the driver hurt.",
    dos: ["Walk around the vehicle every trip", "Check tyres, lights, brakes and fluids", "Record and report defects"],
    donts: ["Don't drive with a known defect", "Don't tick the sheet without checking", "Don't ignore warning lights"],
  },
  "fatigue-driving": {
    why: "Nodding off for 4 seconds at 80 km/h means travelling nearly 90 m with nobody steering.",
    dos: ["Rest every 2 hours or 200 km", "Get proper sleep before long trips", "Pull over when you start yawning"],
    donts: ["Don't rely on energy drinks", "Don't push on to 'just finish the trip'", "Don't drive after a night shift without rest"],
  },
  "following-distance": {
    why: "Rear-end collisions are among the most common truck crashes — almost all come from following too close.",
    dos: ["Keep at least 4 seconds behind", "Add more time in rain or at night", "Leave space when stopping in traffic"],
    donts: ["Don't tailgate slow vehicles", "Don't cut in front of other trucks", "Don't speed up when someone overtakes"],
  },
  "load-securing": {
    why: "A load that shifts can roll the truck on a bend — or land on the road and on the car behind.",
    dos: ["Use the right straps and enough of them", "Re-check straps after the first stop", "Spread weight evenly"],
    donts: ["Don't use frayed straps", "Don't overload the vehicle", "Don't leave the yard without checking the load"],
  },
  reversing: {
    why: "Blind spots behind a truck are big enough to hide a person — reversing incidents are often fatal.",
    dos: ["Use a banksman wherever possible", "Get out and look if unsure", "Reverse slowly with alarms working"],
    donts: ["Don't reverse if you can avoid it", "Don't rely only on mirrors", "Don't let people walk behind the truck"],
  },
  "defensive-driving": {
    why: "Most crashes involve someone else's mistake — defensive drivers leave enough room to survive it.",
    dos: ["Scan far ahead and in mirrors", "Expect others to pull out", "Keep an escape route"],
    donts: ["Don't drive angry", "Don't race amber lights", "Don't assume others have seen you"],
  },
  "night-and-rain": {
    why: "In rain your stopping distance can double, and at night pedestrians in dark clothing appear very late.",
    dos: ["Slow down and increase following distance", "Keep lights and windows clean", "Watch for pedestrians and animals"],
    donts: ["Don't use bright lights into oncoming traffic", "Don't brake hard in the wet", "Don't drive through flooded roads"],
  },
  seatbelts: {
    why: "In a crash without a belt you keep moving at the vehicle's speed — into the steering wheel, windscreen or road.",
    dos: ["Buckle up before you move", "Make sure passengers buckle up", "Report broken belts"],
    donts: ["Don't wear the belt under your arm", "Don't drive 'just around the yard' unbelted", "Don't disable belt alarms"],
  },
  "vehicle-handover": {
    why: "If damage isn't recorded at handover, the next driver gets blamed — and the fault may not get fixed.",
    dos: ["Inspect with the previous driver", "Take photos of damage", "Sign the handover sheet"],
    donts: ["Don't accept the keys without checking", "Don't hide damage you caused", "Don't hand over without reporting faults"],
  },
  "hijacking-awareness": {
    why: "Truck hijackings in South Africa are often planned — the driver's life matters far more than the load.",
    dos: ["Vary routes and stop times", "Keep doors locked and windows up", "Comply if confronted — then report"],
    donts: ["Don't stop for strangers or 'officials' in unmarked cars", "Don't discuss loads or routes", "Don't resist an armed attacker"],
  },
};

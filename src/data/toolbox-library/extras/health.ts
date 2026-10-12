import type { TalkExtras } from "../types";

export const HEALTH_EXTRAS: Record<string, TalkExtras> = {
  hydration: {
    why: "Losing just 2% of your body water slows reactions and judgement — like working after a sleepless night.",
    dos: ["Drink water regularly, not just at breaks", "Check your urine colour — pale is good", "Drink more in heat and hard work"],
    donts: ["Don't wait until you're thirsty", "Don't rely on sugary or energy drinks", "Don't skip water to avoid toilet breaks"],
  },
  "fatigue-at-work": {
    why: "Being awake for 18 hours affects you about as much as being over the legal alcohol limit.",
    dos: ["Get 7–8 hours of sleep", "Take your breaks", "Tell your supervisor if you're exhausted"],
    donts: ["Don't do critical tasks when exhausted", "Don't stack overtime without rest", "Don't hide fatigue"],
  },
  "alcohol-and-drugs": {
    why: "Alcohol from last night can still be in your blood in the morning — and slows reactions around machines and vehicles.",
    dos: ["Come to work sober and fit", "Tell your supervisor about medication that causes drowsiness", "Ask for help if you're struggling"],
    donts: ["Don't drink on breaks", "Don't cover for someone under the influence", "Don't operate machinery after drinking"],
  },
  "hearing-protection": {
    why: "If you need to shout to be heard one metre away, the noise is damaging your hearing — permanently.",
    dos: ["Wear protection in noise zones", "Roll and insert plugs properly", "Get your hearing tested"],
    donts: ["Don't remove muffs 'just for a minute'", "Don't reuse dirty disposable plugs", "Don't use music earphones as protection"],
  },
  "first-aid": {
    why: "The first few minutes after an injury decide the outcome — a trained first aider is often closer than an ambulance.",
    dos: ["Know who the first aiders are", "Know where the first aid box is", "Use gloves when treating wounds"],
    donts: ["Don't move someone with a head or back injury", "Don't use an empty first aid box", "Don't give medication you aren't trained to give"],
  },
  "mental-wellbeing": {
    why: "Someone dealing with stress or grief is more likely to make mistakes — and may be hiding it.",
    dos: ["Check in on your teammates", "Talk to someone you trust", "Use the support services available"],
    donts: ["Don't laugh off someone's struggle", "Don't bottle it up", "Don't work on high-risk tasks when you can't focus"],
  },
  "hand-hygiene": {
    why: "Germs spread from hands to shared tools, door handles and food — one sick person can take out a team.",
    dos: ["Wash hands before eating", "Wash after using the toilet", "Use sanitiser when there's no water"],
    donts: ["Don't eat in work areas", "Don't skip washing after handling chemicals", "Don't share cups or bottles"],
  },
  "skin-protection": {
    why: "Dermatitis starts as dry, cracked skin and can become so bad that people can't do their jobs any more.",
    dos: ["Wear the right gloves", "Use barrier cream", "Wash and moisturise after work"],
    donts: ["Don't clean hands with solvents or fuel", "Don't ignore rashes", "Don't wear gloves with holes"],
  },
  "dust-and-silica": {
    why: "Silica dust scars the lungs — silicosis has no cure and can show up years after the exposure.",
    dos: ["Cut wet or use extraction", "Wear a fitted dust mask", "Clean up with vacuum or water"],
    donts: ["Don't sweep dry dust", "Don't blow dust off with air", "Don't wear a mask with a beard in the way"],
  },
  "cold-weather": {
    why: "Cold hands lose grip and feeling, and cold muscles strain easily — early winter shifts see more slips and sprains.",
    dos: ["Wear layers and a warm hat", "Warm up before physical work", "Take warm drinks on breaks"],
    donts: ["Don't use gas heaters indoors without ventilation", "Don't stay in cold stores too long", "Don't ignore numb fingers"],
  },
};

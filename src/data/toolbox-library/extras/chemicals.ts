import type { TalkExtras } from "../types";

export const CHEMICALS_EXTRAS: Record<string, TalkExtras> = {
  "sds-sheets": {
    why: "When someone is splashed, the SDS tells the first aider and the doctor exactly what to do.",
    dos: ["Read the SDS before using a new product", "Know where the SDS file is", "Take the SDS to hospital with the patient"],
    donts: ["Don't use products without an SDS", "Don't rely on memory", "Don't ignore the PPE section"],
  },
  "chemical-labels": {
    why: "An unlabelled bottle of clear liquid could be water — or acid. People have been seriously hurt by guessing.",
    dos: ["Read the pictograms before use", "Label every decanted container", "Report damaged labels"],
    donts: ["Don't use unlabelled containers", "Don't use food or drink bottles", "Don't remove labels"],
  },
  "chemical-ppe": {
    why: "Some chemicals soak straight through the wrong glove — you're more exposed than with no glove at all.",
    dos: ["Check the SDS for the right glove", "Wear goggles for splashes", "Inspect PPE before use"],
    donts: ["Don't use torn or old gloves", "Don't touch your face with dirty gloves", "Don't take contaminated PPE home"],
  },
  spills: {
    why: "A spill that runs into a drain can poison water supplies and bring heavy fines.",
    dos: ["Stop the source if safe", "Contain with the spill kit", "Report every spill"],
    donts: ["Don't wash spills into drains", "Don't clean up without PPE", "Don't leave a spill unattended"],
  },
  "mixing-chemicals": {
    why: "Mixing bleach with an ammonia or acid cleaner releases toxic gas — people have collapsed in small rooms.",
    dos: ["Use one product at a time", "Rinse between products", "Ventilate the area"],
    donts: ["Don't mix bleach with other cleaners", "Don't 'boost' a product by adding another", "Don't pour chemicals into unknown containers"],
  },
  "chemical-storage": {
    why: "Acids stored next to alkalis or oxidisers next to fuel can react violently if they leak.",
    dos: ["Separate incompatible chemicals", "Store on bunded shelves", "Keep containers closed"],
    donts: ["Don't store chemicals above eye level", "Don't store with food", "Don't overcrowd the store"],
  },
  "fumes-and-ventilation": {
    why: "Solvent fumes in a closed room can make you dizzy, confused and unconscious — often without warning.",
    dos: ["Open doors and windows", "Use extraction fans", "Take fresh air breaks"],
    donts: ["Don't work in closed rooms with solvents", "Don't run engines indoors", "Don't ignore headaches or dizziness"],
  },
  "diesel-and-fuel": {
    why: "Diesel soaked into clothes irritates skin, and a fuel spill near a hot engine can ignite.",
    dos: ["Refuel with the engine off", "Use drip trays", "Wear gloves when handling fuel"],
    donts: ["Don't siphon fuel by mouth", "Don't smoke near refuelling", "Don't let fuel run into drains"],
  },
  "asbestos-awareness": {
    why: "Breathing asbestos fibres can cause cancer decades later — there is no safe level of exposure.",
    dos: ["Stop work if you suspect asbestos", "Report it to your supervisor", "Leave removal to licensed contractors"],
    donts: ["Don't drill, cut or break old roof sheets", "Don't sweep up suspected debris", "Don't carry on 'carefully'"],
  },
  "confined-spaces": {
    why: "In confined space deaths, more than half the victims are people who went in to rescue someone.",
    dos: ["Get a permit and test the air", "Have a standby person outside", "Have a rescue plan"],
    donts: ["Don't enter without testing", "Don't go in after a collapsed person", "Don't use petrol engines near the entry"],
  },
};

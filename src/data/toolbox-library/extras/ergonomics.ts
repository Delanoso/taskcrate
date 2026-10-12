import type { TalkExtras } from "../types";

export const ERGONOMICS_EXTRAS: Record<string, TalkExtras> = {
  "safe-lifting": {
    why: "One bad lift can cause a back injury that lasts for years — and backs rarely heal completely.",
    dos: ["Bend your knees, keep your back straight", "Keep the load close to your body", "Plan your route first"],
    donts: ["Don't twist while lifting", "Don't lift above shoulder height", "Don't jerk the load"],
  },
  "team-lifting": {
    why: "When two people lift out of step, one of them suddenly takes the full weight.",
    dos: ["Agree who gives the commands", "Lift and lower together", "Pair people of similar height"],
    donts: ["Don't let go without warning", "Don't team lift when equipment is available", "Don't rush the move"],
  },
  "pushing-pulling": {
    why: "Pulling a heavy trolley strains shoulders and back far more than pushing it.",
    dos: ["Push rather than pull", "Keep wheels maintained", "Use both hands"],
    donts: ["Don't overload trolleys", "Don't push loads you can't see over", "Don't push on slopes without help"],
  },
  "repetitive-strain": {
    why: "Repetitive strain injuries build up slowly and quietly — by the time it hurts, damage is done.",
    dos: ["Take short micro-breaks", "Rotate tasks if possible", "Report early pain or tingling"],
    donts: ["Don't grip tools harder than needed", "Don't work through numbness", "Don't ignore pain that keeps coming back"],
  },
  "posture-at-workbench": {
    why: "Bending over a low bench for hours causes the neck and back pain many people think is 'just age'.",
    dos: ["Adjust the bench to elbow height", "Use anti-fatigue mats", "Change position often"],
    donts: ["Don't hunch over your work", "Don't stand in one spot all day", "Don't reach repeatedly overhead"],
  },
  "office-ergonomics": {
    why: "A badly set-up desk causes neck, back and wrist problems that can lead to time off.",
    dos: ["Top of the screen at eye level", "Feet flat, back supported", "Look away from the screen every 20 minutes"],
    donts: ["Don't work from a laptop on your lap", "Don't sit for hours without moving", "Don't cradle the phone on your shoulder"],
  },
  stretching: {
    why: "Cold muscles tear more easily — a few minutes of stretching reduces sprains and strains.",
    dos: ["Stretch before your shift", "Stretch gently and hold for 15 seconds", "Stretch after long periods in one position"],
    donts: ["Don't bounce while stretching", "Don't stretch through sharp pain", "Don't skip it when it's cold"],
  },
  "carrying-on-stairs": {
    why: "Carrying a load blocks your view of the steps and stops you holding the rail — a recipe for a bad fall.",
    dos: ["Keep one hand on the rail", "Make more trips with smaller loads", "Use a lift or hoist if available"],
    donts: ["Don't carry loads that block your view", "Don't rush on stairs", "Don't carry heavy loads alone on stairs"],
  },
  "sitting-in-vehicles": {
    why: "Sitting and vibration for hours compresses the spine — jumping down from the cab adds the injury.",
    dos: ["Adjust your seat and mirrors", "Stretch at every stop", "Climb down facing the cab"],
    donts: ["Don't jump down from the cab", "Don't lift right after a long drive", "Don't drive with your wallet in your back pocket"],
  },
  "know-your-limits": {
    why: "Pushing through pain to finish the job often turns a strain into a long-term injury.",
    dos: ["Ask for help with heavy loads", "Use mechanical aids", "Report pain early"],
    donts: ["Don't show off with heavy lifts", "Don't hide an injury", "Don't keep going when something hurts"],
  },
};

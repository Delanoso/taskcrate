import type { TalkExtras } from "../types";

export const GENERAL_EXTRAS: Record<string, TalkExtras> = {
  "hazard-spotting": {
    why: "A loose handrail everyone walked past for weeks finally gave way — the worker who fell was off for three months.",
    dos: ["Do a 30-second scan before every task", "Point hazards out to new staff", "Use the near-miss system"],
    donts: ["Don't assume it's someone else's job", "Don't get used to a hazard", "Don't step over it and walk on"],
  },
  "right-to-refuse": {
    why: "Many fatal incidents start with someone who felt uneasy but carried on because they didn't want to hold up the job.",
    dos: ["Stop and explain the danger calmly", "Suggest a safer way to do it", "Report it if you are pressured"],
    donts: ["Don't use it to dodge normal work", "Don't walk away without telling anyone", "Don't restart until it's fixed"],
  },
  "near-miss-reporting": {
    why: "A pallet that fell 'without hurting anyone' on Monday fell on someone's foot on Friday — the same racking, the same cause.",
    dos: ["Report what happened, not who", "Include where, when and how", "Suggest a fix if you have one"],
    donts: ["Don't hide it to protect the stats", "Don't wait until the end of the week", "Don't mock people who report"],
  },
  "ppe-basics": {
    why: "Safety boots are only uncomfortable until the day a gas cylinder rolls over your foot.",
    dos: ["Check the task's PPE before starting", "Inspect it before every shift", "Ask for the right size"],
    donts: ["Don't modify or cut PPE", "Don't share hard hats or ear plugs", "Don't wear it 'nearly' — wear it properly"],
  },
  housekeeping: {
    why: "Untidy work areas cause trips, block escape routes and feed fires — in a fire, a blocked exit costs lives.",
    dos: ["Clean as you go", "Keep exits and fire points clear", "Return tools after use"],
    donts: ["Don't leave offcuts on the floor", "Don't stack things in walkways", "Don't leave spills for the next shift"],
  },
  "slips-trips-falls": {
    why: "A slip on a wet floor can mean a broken wrist, a cracked skull or months off work — from a puddle nobody cleaned.",
    dos: ["Clean or cordon off spills at once", "Hold the handrail", "Wear grippy safety footwear"],
    donts: ["Don't run on site", "Don't carry loads that block your view", "Don't route cables across walkways"],
  },
  "mobile-phones": {
    why: "Looking at a phone for 3 seconds while walking past a forklift route is enough to step into its path.",
    dos: ["Stop in a safe spot to use your phone", "Keep it in your pocket while working", "Let calls go to voicemail when busy"],
    donts: ["Don't text while walking in work areas", "Don't wear earphones on site", "Don't film unsafe acts instead of stopping them"],
  },
  "signs-and-barricades": {
    why: "Barricades are often all that stands between a worker and an open trench, a live cable or an overhead lift.",
    dos: ["Read signs at every new area", "Report damaged or missing signs", "Use the correct route around barriers"],
    donts: ["Don't duck under tape", "Don't move barricades for convenience", "Don't ignore signs you see every day"],
  },
  "reporting-injuries": {
    why: "A 'small' cut that wasn't reported got infected — without a record, the COIDA claim was much harder to prove.",
    dos: ["Report injuries the same day", "Get first aid and log it", "Report pain that shows up later"],
    donts: ["Don't treat yourself and keep quiet", "Don't let fear of blame stop you", "Don't wait until it gets worse"],
  },
  "visitors-and-contractors": {
    why: "Visitors don't know where the forklifts drive or where the assembly point is — in an emergency they depend on us.",
    dos: ["Sign in every visitor", "Escort them in operational areas", "Tell them the emergency procedure"],
    donts: ["Don't let contractors start without a permit", "Don't leave visitors alone in work areas", "Don't skip the briefing because 'they've been here before'"],
  },
};

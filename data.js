import "./engine.js";

// ---------- layout ----------
export const W = 800;
export const H = 600;
export const SKY_H = 360;
export const PIER_Y = 430;
export const PIER_X_MIN = 70;
export const PIER_X_MAX = 660;
export const SHOP_X = 130;
export const FISH_X = 650;
export const ZONE_RANGE = 65;
export const PLAYER_SPEED = 180;
export const BOBBER_X = FISH_X + 50;
export const BOBBER_Y = 385;

// ---------- pacing ----------
export const DAY_NIGHT_CYCLE = 90; // seconds for one full day/night loop
export const BITE_WAIT = [0.5, 1.3]; // seconds before a bite after casting
export const LEGEND_WINDOW = 0.45;
export const COOLDOWN = 0.4;

// ---------- palette ----------
export const C = {
  daySkyTop: rgb(150, 205, 235),
  daySky: rgb(191, 227, 240),
  daySkyLow: rgb(232, 244, 246),
  nightSkyTop: rgb(24, 28, 58),
  nightSky: rgb(58, 66, 102),
  nightSkyLow: rgb(92, 88, 132),
  duskGlow: rgb(255, 184, 160),
  daySea: rgb(163, 214, 214),
  daySeaDeep: rgb(110, 176, 196),
  nightSea: rgb(42, 52, 84),
  nightSeaDeep: rgb(22, 28, 54),
  seaFoam: rgb(240, 252, 252),
  sun: rgb(255, 224, 168),
  sunCore: rgb(255, 246, 214),
  moon: rgb(214, 222, 242),
  moonShade: rgb(184, 194, 222),
  star: rgb(255, 250, 230),
  cloud: rgb(255, 255, 255),
  cloudShade: rgb(222, 232, 244),
  cloudNight: rgb(86, 94, 134),
  hillFar: rgb(176, 206, 222),
  hillNear: rgb(146, 190, 196),
  hillNightFar: rgb(52, 58, 94),
  hillNightNear: rgb(40, 48, 80),
  fog: rgb(245, 245, 248),
  bird: rgb(90, 96, 120),

  pierWood: rgb(214, 182, 140),
  pierWoodLight: rgb(232, 204, 164),
  pierWoodDark: rgb(186, 150, 110),
  pierOutline: rgb(176, 140, 102),
  pierPost: rgb(160, 122, 90),
  pierPostDark: rgb(128, 96, 72),
  nail: rgb(140, 110, 90),
  rope: rgb(222, 196, 150),

  stallBody: rgb(247, 205, 200),
  stallBodyDark: rgb(232, 184, 180),
  stallRoof: rgb(224, 150, 150),
  stallStripe: rgb(255, 244, 236),
  stallOutline: rgb(196, 120, 120),
  signBoard: rgb(255, 238, 214),

  playerBody: rgb(255, 179, 166),
  playerBodyDark: rgb(236, 150, 140),
  playerSkin: rgb(255, 224, 204),
  playerSkinShade: rgb(244, 200, 180),
  playerOutline: rgb(150, 100, 96),
  playerHair: rgb(130, 90, 80),
  playerHat: rgb(255, 222, 140),
  playerHatDark: rgb(236, 190, 110),
  playerHatBand: rgb(150, 200, 196),
  playerScarf: rgb(150, 212, 196),
  playerScarfDark: rgb(116, 184, 170),
  playerPants: rgb(126, 150, 196),
  playerBoot: rgb(110, 96, 120),
  playerEye: rgb(60, 48, 64),
  blush: rgb(255, 150, 160),
  rod: rgb(150, 111, 89),
  rodGrip: rgb(96, 76, 70),
  reel: rgb(200, 206, 220),
  line: rgb(255, 255, 255),

  bobber: rgb(255, 140, 140),
  legendBobber: rgb(255, 205, 90),
  bobberOutline: rgb(255, 255, 255),

  lampGlow: rgb(255, 220, 150),
  lampMetal: rgb(100, 96, 116),

  fishBlue: rgb(140, 178, 220),
  fishShadow: rgb(60, 90, 110),

  title: rgb(70, 60, 80),
  subtitle: rgb(100, 90, 110),
  hudText: rgb(60, 55, 70),
  hudHint: rgb(90, 85, 100),
  goldText: rgb(199, 145, 45),
  gold: rgb(255, 208, 96),
  goldLight: rgb(255, 238, 170),
  goodText: rgb(85, 145, 95),
  badText: rgb(180, 100, 100),

  panelBg: rgb(255, 246, 238),
  panelOutline: rgb(220, 195, 170),
  panelText: rgb(80, 70, 90),
  panelTitle: rgb(60, 50, 70),
  panelHint: rgb(120, 110, 130),
  panelHeader: rgb(248, 196, 186),
  shadow: rgb(40, 36, 60),

  winSkyTop: rgb(255, 214, 170),
  winSkyHigh: rgb(250, 170, 170),
  winSea: rgb(255, 190, 180),
  winSeaDeep: rgb(226, 150, 170),

  rain: rgb(214, 226, 240),
  rainSkyTop: rgb(120, 130, 150),
  rainSkyLow: rgb(170, 178, 190),
  rainCloud: rgb(150, 156, 172),
  rainCloudShade: rgb(110, 116, 136),
  rainSea: rgb(110, 140, 150),
  flash: rgb(255, 255, 240),
};

// ---------- rods ----------
// window: seconds to react to a bite (also widens tug timing)
// power:  size of the reel zone and how fast it reels in
// luck:   pulls the catch toward rarer fish
export const RODS = [
  { name: "Twig Rod", cost: 0, tiers: [0], window: 0.9, power: 1.0, luck: 0, tint: rgb(150, 111, 89), desc: "Grandma's old twig.\nIt listens." },
  { name: "Bamboo Rod", cost: 30, tiers: [0, 1], window: 0.85, power: 1.15, luck: 0.05, tint: rgb(170, 190, 120), desc: "Light and springy.\nA solid first upgrade." },
  { name: "Swift Rod", cost: 70, tiers: [0, 1], window: 1.25, power: 0.9, luck: 0, tint: rgb(120, 200, 200), desc: "Very forgiving timing.\nGreat for tugs." },
  { name: "Iron Rod", cost: 120, tiers: [0, 1, 2], window: 0.8, power: 1.8, luck: 0.05, tint: rgb(140, 146, 170), desc: "Heavy. Wins any\ntug-of-war with a lure." },
  { name: "Clover Rod", cost: 180, tiers: [0, 1, 2], window: 0.9, power: 1.1, luck: 0.45, tint: rgb(120, 190, 130), desc: "Rare fish seem to\nlike it. Nobody knows why." },
  { name: "Storm Rod", cost: 260, tiers: [0, 1, 2, 3], window: 0.8, power: 1.5, luck: 0.15, rainLuck: 0.6, tint: rgb(110, 140, 200), desc: "Hums when it rains.\nMuch luckier in storms." },
  { name: "Master Rod", cost: 380, tiers: [0, 1, 2, 3], window: 0.85, power: 1.9, luck: 0.3, tint: rgb(180, 120, 200), desc: "A true angler's rod.\nStrong in every way." },
  { name: "Legend Rod", cost: 600, tiers: [0, 1, 2, 3], window: 0.75, power: 2.0, luck: 0.35, legendChance: 0.2, tint: rgb(230, 170, 60), desc: "The only rod the\nLegend will answer." },
];

// ---------- techniques ----------
export const TECHNIQUES = [
  { id: "float", name: "Float", unlock: 1, valueMult: 1.0, luck: 0, desc: "Tap SPACE the moment it bites." },
  { id: "lure", name: "Lure", unlock: 2, valueMult: 1.3, luck: 0.35, desc: "Hook it, then HOLD SPACE to keep the fish in the zone." },
  { id: "deep", name: "Deep Line", unlock: 4, valueMult: 1.6, luck: 0.3, desc: "Hold SPACE to charge a long cast, then tap on every tug." },
];

// ---------- skills ----------
export const SKILL_MAX = 5;
export const SKILLS = [
  { id: "reflex", name: "Reflex", desc: "+10% bite & tug timing" },
  { id: "strength", name: "Strength", desc: "bigger reel zone, faster reel" },
  { id: "luck", name: "Luck", desc: "rarer fish, +6% coins" },
  { id: "patience", name: "Patience", desc: "fish bite 10% sooner" },
];
export function xpToNext(level) {
  return 20 + level * 25;
}

// ---------- fish ----------
export const FISH_WEIGHTS = [50, 30, 15, 5];
export const FISH_SPECIES = [
  { name: "Minnow", tier: 0, base: 4, size: [5, 10], emoji: "🐟", col: rgb(190, 206, 214), fin: rgb(150, 170, 186) },
  { name: "Sardine", tier: 0, base: 5, size: [12, 20], emoji: "🐟", col: rgb(170, 196, 214), fin: rgb(140, 166, 190) },
  { name: "Pond Perch", tier: 0, base: 6, size: [15, 28], emoji: "🐟", col: rgb(206, 214, 150), fin: rgb(170, 180, 110) },
  { name: "Mackerel", tier: 1, base: 12, size: [25, 45], emoji: "🐟", col: rgb(140, 190, 200), fin: rgb(90, 140, 160) },
  { name: "Clownfish", tier: 1, base: 14, size: [8, 14], emoji: "🐠", col: rgb(255, 170, 110), fin: rgb(250, 236, 226) },
  { name: "Sea Bream", tier: 1, base: 16, size: [25, 40], emoji: "🐠", col: rgb(255, 186, 170), fin: rgb(236, 140, 130) },
  { name: "Pufferfish", tier: 2, base: 30, size: [15, 35], emoji: "🐡", col: rgb(240, 220, 150), fin: rgb(210, 180, 110) },
  { name: "Moon Jelly", tier: 2, base: 42, size: [20, 40], emoji: "🌙", col: rgb(210, 200, 250), fin: rgb(170, 160, 230), cond: "night" },
  { name: "Storm Eel", tier: 2, base: 45, size: [60, 120], emoji: "⚡", col: rgb(150, 170, 200), fin: rgb(250, 220, 120), cond: "rain" },
  { name: "Swordfish", tier: 3, base: 70, size: [120, 250], emoji: "🐟", col: rgb(120, 150, 210), fin: rgb(90, 110, 180) },
  { name: "Manta Ray", tier: 3, base: 78, size: [150, 300], emoji: "🐟", col: rgb(110, 120, 150), fin: rgb(210, 214, 230) },
  { name: "Thunder Shark", tier: 3, base: 110, size: [200, 350], emoji: "🦈", col: rgb(170, 160, 220), fin: rgb(255, 220, 110), cond: "rain" },
];
export const TIER_NAMES = ["common", "uncommon", "rare", "epic", "legend"];

// ---------- story ----------
export const STORY_OPENING = [
  { art: "letter", text: "The summer Grandma passed away, a letter arrived at your door. It had no stamp, only a little drawing of a fish." },
  { art: "rod", text: "\"{name}, the old pier is yours now. So is my rod. It's only a twig, but it listens.\"" },
  { art: "legend", text: "\"Everyone on this coast has heard of the Legend God Fish. I saw it once when I was young, shining gold in the rain.\"" },
  { art: "pier", text: "\"It won't come to just anyone. Learn the water. Learn patience. Find a rod the Legend will answer.\"" },
  { art: "letter", text: "\"And when you finally meet it, you'll know what to do. With love, Grandma.\"" },
];
export const STORY_ENDING = [
  { art: "taut", text: "The line goes tight. Rain hisses on the water, and the whole sea seems to hold its breath." },
  { art: "rise", text: "Gold scales rise out of the deep. It's the Legend God Fish, just like Grandma wrote." },
  { art: "eyes", text: "It looks at you with old, patient eyes. It's heavier than any fish you've caught, but lighter than you expected." },
  { art: "choice", text: "Grandma said you'd know what to do. What will you do?", choice: true },
];
export const EPILOGUES = {
  free: {
    title: "Legend swim free",
    lead: "{name} let the",
    text: "Some say it still circles the old pier on rainy nights,\nwaiting for the next patient soul. Grandma would smile.",
  },
  keep: {
    title: "Legend God Fish!",
    lead: "{name} caught the",
    text: "It hangs above the tackle shop now, shining gold.\nPeople come from every coast just to see it.",
  },
};

// ---------- shared state (persists across scenes) ----------
export const state = {};
export function resetState() {
  Object.assign(state, {
    playerName: "",
    money: 0,
    rodIndex: 0,
    ownedRods: [0],
    caughtCount: 0,
    gameStartTime: 0,
    level: 1,
    xp: 0,
    skillPoints: 0,
    skills: { reflex: 0, strength: 0, luck: 0, patience: 0 },
    technique: 0,
    journal: {}, // species name -> best size (cm)
  });
}
resetState();
state.playerName = "Noob";

// rain: current intensity 0..1, eased toward target
export const weather = { rain: 0, target: 0, nextChange: 0, flash: 0 };

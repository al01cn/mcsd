export type SoundTranslateValue = string | readonly string[];
export type SoundTranslateMap = Record<string, SoundTranslateValue>;

export const sounds_translate_key: SoundTranslateMap = {
  minecraft: "Minecraft",

  block: "方块",
  entity: "实体",
  player: "玩家",
  item: "物品",
  ambient: "环境",
  music: "音乐",
  ui: "界面",
  weather: "天气",
  voice: "语音",
  record: "唱片",
  particle: "粒子",
  event: "事件",
  random: "随机",
  hostile: "敌对",
  neutral: "中立",
  passive: "被动",

  use: ["使用", "操作"],
  work: ["工作", "劳作"],
  click: "点击",
  press: "按下",
  release: "松开",
  activate: "激活",
  deactivate: ["停用", "取消激活"],
  insert: ["放入", "插入"],
  remove: ["移除", "取出"],
  take: ["拿取", "取出"],
  put: ["放入", "放置"],
  lock: "上锁",
  unlock: "解锁",
  loop: "循环",
  exit: "退出",

  hurt: "受伤",
  death: "死亡",
  attack: "攻击",
  shoot: "射击",
  hit: "击中",
  break: "破坏",
  place: "放置",
  open: "打开",
  close: "关闭",
  step: "脚步",
  fall: "摔落",
  jump: "跳跃",
  land: "落地",
  swim: "游泳",
  splash: "飞溅",
  drink: "饮用",
  eat: "进食",
  levelup: "升级",
  explode: "爆炸",
  thunder: "雷声",
  rain: "雨声",
  burn: "燃烧",
  extinguish: "熄灭",
  ignite: "点燃",
  charge: "蓄力",
  roar: "咆哮",
  growl: "低吼",
  scream: "尖叫",
  cry: "哭喊",
  laugh: "笑声",
  breathe: "呼吸",
  snore: "打鼾",

  arrow: "箭",
  bow: "弓",
  crossbow: "弩",
  trident: "三叉戟",
  shield: "盾",

  note: "音符",
  note_block: "音符盒",
  harp: "竖琴",
  bell: "铃声",
  bass: "贝斯",
  hat: "踩镲",
  snare: "军鼓",
  chime: "风铃",
  flute: "长笛",
  guitar: "吉他",
  xylophone: "木琴",
  iron_xylophone: "铁木琴",
  cow_bell: "牛铃",
  didgeridoo: "迪吉里杜管",
  bit: "比特音色",
  banjo: "班卓琴",
  pling: "叮咚",

  door: "门",
  trapdoor: "活板门",
  gate: "栅栏门",
  chest: "箱子",
  barrel: "木桶",
  anvil: "铁砧",
  furnace: "熔炉",
  brewing: "酿造",
  enchant: "附魔",
  enchantment: "附魔",
  enchantment_table: "附魔台",
  smithing: "锻造",
  smithing_table: "锻造台",
  grindstone: "砂轮",
  beehive: "蜂箱",
  beacon: "信标",
  piston: "活塞",
  dispenser: "发射器",
  dropper: "投掷器",
  lever: "拉杆",
  button: "按钮",
  pressure_plate: "压力板",

  stone: "石头",
  wood: "木头",
  wooden: "木质",
  metal: "金属",
  glass: "玻璃",
  sand: "沙子",
  gravel: "沙砾",
  dirt: "泥土",
  grass: "草方块",
  snow: "雪",
  ice: "冰",
  wool: "羊毛",
  slime: "史莱姆",
  honey: "蜂蜜",

  lava: "岩浆",
  water: "水",
  fire: "火",
  wind: "风",

  villager: "村民",
  armorer: "盔甲匠",
  butcher: "屠夫",
  cartographer: "制图师",
  cleric: ["牧师", "祭司"],
  farmer: "农民",
  fisherman: "渔夫",
  fletcher: "制箭师",
  leatherworker: "皮匠",
  librarian: "图书管理员",
  mason: "石匠",
  shepherd: "牧羊人",
  toolsmith: "工具匠",
  weaponsmith: "武器匠",
  zombie: "僵尸",
  skeleton: "骷髅",
  creeper: "苦力怕",
  spider: "蜘蛛",
  enderman: "末影人",
  blaze: "烈焰人",
  witch: "女巫",
  pig: "猪",
  cow: "牛",
  sheep: "羊",
  chicken: "鸡",
  horse: "马",
  cat: "猫",
  wolf: "狼",
  fox: "狐狸",
  bee: "蜜蜂",
  golem: "傀儡",

  armor: "护甲",
  equip: "装备",
  breakage: "损坏",

  bone_meal: "骨粉",
  dye: "染料",
  flintandsteel: "打火石",
  firecharge: "火焰弹",
  glow_ink_sac: "荧光墨囊",
};

function asTranslations(value: SoundTranslateValue | undefined): string[] {
  if (!value) return [];
  return typeof value === "string" ? [value] : Array.from(value).filter(Boolean);
}

function buildJoinedVariants(parts: string[][], limit: number): string[] {
  let acc: string[] = [""];
  for (const options of parts) {
    const next: string[] = [];
    const safeOptions = options.length ? options : [""];
    for (const prefix of acc) {
      for (const opt of safeOptions) {
        next.push(prefix + opt);
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    acc = next.length ? next : acc;
    if (acc.length >= limit) break;
  }
  return acc.filter(Boolean);
}

function translateTokenVariantsZh(token: string, limit: number): string[] {
  const direct = asTranslations(sounds_translate_key[token]);
  if (direct.length) return direct.slice(0, limit);

  if (!token.includes("_")) return [];

  const parts = token.split("_").filter(Boolean);
  if (!parts.length) return [];

  const perPart = parts.map((p) => {
    const options = asTranslations(sounds_translate_key[p]);
    return options.length ? options : [p];
  });

  const joined = buildJoinedVariants(perPart, limit);
  return joined.length ? joined : [];
}

export function translateSoundTokenZh(token: string): string {
  const variants = translateTokenVariantsZh(token, 3);
  if (variants.length) return variants.join("/");
  return token;
}

export function translateSoundEventKeyZh(key: string): string {
  const tokens = key
    .trim()
    .replace(/[:]/g, ".")
    .split(/[.]/g)
    .filter(Boolean);

  if (!tokens.length) return "";

  return tokens.map((t) => translateSoundTokenZh(t)).join("·");
}

function translateSoundEventKeyZhVariants(key: string, limit: number): string[] {
  const tokens = key
    .trim()
    .replace(/[:]/g, ".")
    .split(/[.]/g)
    .filter(Boolean);

  if (!tokens.length) return [];

  const perToken = tokens.map((t) => {
    const v = translateTokenVariantsZh(t, 3);
    return v.length ? v : [t];
  });

  const joined = buildJoinedVariants(perToken.map((arr) => arr.map((v) => `${v}·`)), limit)
    .map((s) => s.replace(/·$/g, ""))
    .filter(Boolean);

  return joined.length ? joined : [];
}

function normalizeSoundSearchText(value: string): string {
  return value.toLowerCase().replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");
}

export function buildSoundEventSearchText(key: string): string {
  const zh = translateSoundEventKeyZh(key);
  const zhVariants = translateSoundEventKeyZhVariants(key, 20);
  const loose = key.replace(/[:._]+/g, " ");
  return [key, loose, zh, ...zhVariants].filter(Boolean).join(" ");
}

export function fuzzyMatchSoundEventKey(key: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const haystack = buildSoundEventSearchText(key);
  const haystackLower = haystack.toLowerCase();
  const haystackNormalized = normalizeSoundSearchText(haystackLower);

  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const partLower = part.toLowerCase();
    if (haystackLower.includes(partLower)) return true;

    const partNormalized = normalizeSoundSearchText(partLower);
    if (!partNormalized) return true;
    if (haystackNormalized.includes(partNormalized)) return true;

    let i = 0;
    for (const ch of partNormalized) {
      const next = haystackNormalized.indexOf(ch, i);
      if (next < 0) return false;
      i = next + 1;
    }
    return true;
  });
}

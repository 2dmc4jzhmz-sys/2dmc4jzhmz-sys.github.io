/** 掉落系统：稀有度、物品定义、三选一 */
import { createRng } from '../core/rng.js';

export const RARITY = {
  common: { name: '普通', color: '#9aa4b2', weight: 62 },
  rare: { name: '稀有', color: '#5b8cff', weight: 26 },
  epic: { name: '史诗', color: '#b06bff', weight: 9 },
  legend: { name: '传说', color: '#ffb020', weight: 3 },
};

export const ITEMS = {
  charm: { name: '暴击护符', icon: '🎯', desc: '每 3 连对额外触发一次暴击', kind: 'passive' },
  shield: { name: '护心镜', icon: '🛡️', desc: '每局首次答错不扣血', kind: 'passive' },
  potion: { name: '回血药', icon: '🧪', desc: '立即恢复 25 点体力', kind: 'use' },
  lens: { name: '词根透镜', icon: '🔍', desc: '本局新词记忆强度 +1 档', kind: 'passive' },
  coin: { name: '金币袋', icon: '💰', desc: '获得 30 金币', kind: 'use' },
  map: { name: '残缺地图', icon: '🗺️', desc: '本局多看到 1 个后续节点', kind: 'passive' },
  shard: { name: '词卡碎片', icon: '🧩', desc: '收集后可在图鉴查看', kind: 'collect' },
};

export function rollRarity(rng) {
  return rng.weighted(Object.entries(RARITY).map(([k, v]) => [k, v.weight]));
}

export function rollDrop(rng, count = 1) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(rng);
    const pool = Object.keys(ITEMS).filter((k) => {
      if (rarity === 'legend') return k === 'lens' || k === 'shard';
      if (rarity === 'epic') return k === 'charm' || k === 'map' || k === 'lens';
      if (rarity === 'rare') return k === 'shield' || k === 'potion' || k === 'coin';
      return k === 'coin' || k === 'potion' || k === 'shard';
    });
    const key = pool[Math.floor(rng.next() * pool.length)] || 'coin';
    out.push({ key, ...ITEMS[key], rarity });
  }
  return out;
}

/** 宝箱：三选一 */
export function chestChoices(rng) {
  const all = rng.shuffle(Object.keys(ITEMS).filter((k) => k !== 'shard')).slice(0, 3);
  return all.map((k) => ({ key: k, ...ITEMS[k], rarity: k === 'lens' ? 'epic' : 'rare' }));
}

export const EVENTS = [
  {
    id: 'stranger',
    title: '路边的旅人',
    text: '一个背着旧包的人拦住你，说他能"让单词记得更牢"，但要收 20 金币。',
    choices: [
      { label: '给他 20 金币', effect: 'pay20', hint: '随机获得一件道具' },
      { label: '不理他继续走', effect: 'nothing', hint: '安全' },
      { label: '抢他的包', effect: 'risk', hint: '有概率拿到金币，也可能掉血' },
    ],
  },
  {
    id: 'fountain',
    title: '沉默的喷泉',
    text: '泉水很清。水底沉着几枚硬币，旁边牌子写着"投一枚，换一句真话"。',
    choices: [
      { label: '投一枚硬币', effect: 'pay5', hint: '本局答对伤害 +2' },
      { label: '直接喝一口', effect: 'heal15', hint: '回 15 点体力' },
      { label: '离开', effect: 'nothing', hint: '什么都不发生' },
    ],
  },
  {
    id: 'merchant',
    title: '夜市的摊子',
    text: '摊主把三样东西摊在布上，说"今天只换不卖"。',
    choices: [
      { label: '用体力换道具', effect: 'hp4item', hint: '掉 10 点体力，拿一件道具' },
      { label: '用金币换血', effect: 'gold4hp', hint: '花 20 金币，回 30 体力' },
      { label: '看看就走', effect: 'nothing', hint: '无变化' },
    ],
  },
];

export function rollEvent(rng) {
  return rng.pick(EVENTS);
}

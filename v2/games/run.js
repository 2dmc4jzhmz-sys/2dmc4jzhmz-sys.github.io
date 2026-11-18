/**
 * 每日副本：地图生成 + 推进 + 结算。
 * 纯逻辑，不碰 DOM —— 可在 node 下直接跑，见 tools/test-run.mjs
 */
import { createRng } from '../core/rng.js';
import { buildQuestions } from './questions.js';
import { rollDrop, chestChoices, rollEvent, ITEMS } from './drops.js';
import { review } from '../core/srs.js';

const TYPES = {
  normal: { name: '游荡词兽', need: 6, dmg: 12, icon: '🐾' },
  elite: { name: '词序守卫', need: 8, dmg: 14, icon: '🗿' },
  boss: { name: '遗忘之喉', need: 10, dmg: 16, icon: '👁️' },
};

const NAMES = {
  normal: ['游荡词兽', '错拼小妖', '模糊影子', '断句虫'],
  elite: ['词序守卫', '重音石像', '语法荆棘'],
  boss: ['遗忘之喉', '沉默判官'],
};

const LAYER_PLAN = [
  ['normal', 'normal', 'normal', 'event'],
  ['normal', 'elite', 'chest', 'event'],
  ['rest', 'normal', 'elite', 'boss'],
];

const DROP_AFTER = { normal: 1, elite: 2, boss: 3 };

export function generateMap({ seed, lang }) {
  const rng = createRng(`${seed}:${lang}:map`);
  const nodes = LAYER_PLAN.flatMap((layer, li) =>
    layer.map((type, ni) => {
      const base = TYPES[type];
      return {
        id: `n${li}-${ni}`,
        layer: li + 1,
        type,
        icon: base ? base.icon : type === 'chest' ? '🎁' : type === 'rest' ? '🔥' : '❓',
        name: base ? rng.pick(NAMES[type]) : type === 'chest' ? '遗落的箱子' : type === 'rest' ? '余烬篝火' : '未知的路口',
        need: base ? base.need : 0,
        dmg: base ? base.dmg : 0,
        cleared: false,
      };
    })
  );
  return nodes;
}

export class Run {
  constructor({ seed, lang, pool, words, hp = 100, dailyNew = 12, cap = 1 }) {
    this.seed = seed;
    this.lang = lang;
    this.pool = pool;
    this.words = words;
    this.nodes = generateMap({ seed, lang });
    this.idx = 0;
    this.maxHp = hp;
    this.hp = hp;
    this.gold = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.drops = [];
    this.log = [];
    this.finished = false;
    this.win = false;
    this.shieldUsed = false;
    this.hasShield = false;
    this.bonusDmg = 0;
    this.dailyNew = dailyNew;
    this.cap = cap;
    this._questions = null;
    this._qi = 0;
    this.battle = null;
    this._rng = createRng(`${seed}:${lang}:run`);
  }

  get node() {
    return this.nodes[this.idx] || null;
  }

  get progress() {
    return { idx: this.idx, total: this.nodes.length };
  }

  /** 进入当前节点，返回需要渲染的形态 */
  enter() {
    const node = this.node;
    if (!node) return { kind: 'end', win: this.win };
    if (!this._questions) {
      const need = this.nodes
        .filter((n) => TYPES[n.type])
        .reduce((s, n) => s + n.need + 3, 0);
      this._questions = buildQuestions({
        pool: this.pool,
        words: this.words,
        need,
        seed: `${this.seed}:${this.lang}:q`,
        dailyNew: this.dailyNew,
      });
    }
    if (TYPES[node.type]) {
      if (this.battle && this.battle.node === node && !this.battle.over) {
        return { kind: 'battle', node, battle: this.battle };
      }
      this.battle = {
        node,
        hits: 0,
        need: node.need,
        misses: 0,
        over: false,
        cleared: false,
        question: this._nextQuestion(),
      };
      return { kind: 'battle', node, battle: this.battle };
    }
    if (node.type === 'chest') {
      return { kind: 'chest', node, choices: chestChoices(this._rng.derive('chest' + this.idx)) };
    }
    if (node.type === 'rest') {
      return { kind: 'rest', node };
    }
    const ev = rollEvent(this._rng.derive('ev' + this.idx));
    return { kind: 'event', node, event: ev };
  }

  _nextQuestion() {
    const q = this._questions[this._qi % this._questions.length];
    this._qi++;
    return { ...q, n: this._qi };
  }

  /** 答题。返回结果供动画使用 */
  answer(choice) {
    const b = this.battle;
    if (!b || b.over) return null;
    const q = b.question;
    const correct = choice === q.answer;

    // 记录记忆状态：答错只降一档，不归零；失败也不倒扣（见 finish）
    review(this.words, q.key, correct);

    let damage = 0;
    if (correct) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      damage = 10 + this.bonusDmg + (this.combo >= 3 ? 5 : 0);
      b.hits++;
    } else {
      this.combo = 0;
      let hurt = b.node.dmg;
      if (this.hasShield && !this.shieldUsed) {
        this.shieldUsed = true;
        hurt = 0;
        this.log.push('护心镜替你挡下了这一下');
      }
      this.hp = Math.max(0, this.hp - hurt);
    }

    if (b.hits >= b.need) {
      b.over = true;
      b.cleared = true;
      const count = DROP_AFTER[b.node.type] || 1;
      const got = rollDrop(this._rng.derive('drop' + this.idx), count);
      this.drops.push(...got);
      this.gold += 10 + b.node.layer * 5;
      this.log.push(`${b.node.name} 倒下了`);
    } else if (this.hp <= 0) {
      b.over = true;
      this.finished = true;
      this.win = false;
    } else {
      b.question = this._nextQuestion();
    }

    return {
      correct,
      correctIndex: q.answer,
      damage,
      hits: b.hits,
      need: b.need,
      hp: this.hp,
      over: b.over,
      cleared: b.cleared,
      key: q.key,
      word: q.w,
    };
  }

  /** 事件、宝箱、休息的选择 */
  choose(action, payload) {
    const node = this.node;
    const rng = this._rng.derive('act' + this.idx);
    let text = '';

    if (node.type === 'chest') {
      const item = payload;
      this.drops.push({ ...ITEMS[item], key: item, rarity: 'rare' });
      this._applyItem(item);
      text = `拿到了 ${ITEMS[item].name}`;
    } else if (node.type === 'rest') {
      if (action === 'heal') {
        this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.3));
        text = '你在火边坐了一会儿，体力恢复了';
      } else {
        this.bonusDmg += 2;
        text = '你把一块烧红的木炭收进袋子，攻击变强了';
      }
    } else if (node.type === 'event') {
      switch (action) {
        case 'pay20':
          if (this.gold >= 20) {
            this.gold -= 20;
            const got = rollDrop(rng, 1)[0];
            this.drops.push(got);
            this._applyItem(got.key);
            text = `旅人塞给你一件东西：${got.name}`;
          } else text = '你翻遍口袋，金币不够。旅人笑了笑走了。';
          break;
        case 'pay5':
          this.gold = Math.max(0, this.gold - 5);
          this.bonusDmg += 2;
          text = '水面荡开一圈，你觉得手里的词更沉了一点。';
          break;
        case 'risk':
          if (rng.chance(0.5)) {
            this.gold += 40;
            text = '包里是 40 金币。他没有追上来。';
          } else {
            this.hp = Math.max(0, this.hp - 20);
            text = '他抽出短棍打在你肩上，你只抢到几枚硬币。';
          }
          break;
        case 'heal15':
          this.hp = Math.min(this.maxHp, this.hp + 15);
          text = '水很凉，也很甜。';
          break;
        case 'hp4item': {
          this.hp = Math.max(1, this.hp - 10);
          const got = rollDrop(rng, 1)[0];
          this.drops.push(got);
          this._applyItem(got.key);
          text = `摊主挑了一件给你：${got.name}`;
          break;
        }
        case 'gold4hp':
          if (this.gold >= 20) {
            this.gold -= 20;
            this.hp = Math.min(this.maxHp, this.hp + 30);
            text = '他数了数金币，把药汤推到你面前。';
          } else text = '你数了数金币，不够。';
          break;
        default:
          text = '你什么也没做，继续往前。';
      }
    }

    node.cleared = true;
    this.log.push(text);
    return { text, hp: this.hp, gold: this.gold };
  }

  _applyItem(key) {
    if (key === 'potion') this.hp = Math.min(this.maxHp, this.hp + 25);
    if (key === 'coin') this.gold += 30;
    if (key === 'shield') this.hasShield = true;
    if (key === 'charm') this.bonusDmg += 1;
    if (key === 'lens') this.bonusDmg += 2;
  }

  /** 当前节点打完，进入下一节点 */
  advance() {
    if (this.node) this.node.cleared = true;
    this.idx++;
    this.battle = null;
    if (this.idx >= this.nodes.length) {
      this.finished = true;
      this.win = this.hp > 0;
      return { done: true, win: this.win };
    }
    return { done: false, node: this.node };
  }

  /** 当前节点是否已结束（战斗胜利 / 事件已选） */
  get nodeResolved() {
    const n = this.node;
    if (!n) return true;
    if (TYPES[n.type]) return !!(this.battle && this.battle.over && this.battle.cleared);
    return !!n.cleared;
  }

  result() {
    return {
      win: this.win,
      hp: this.hp,
      maxHp: this.maxHp,
      gold: this.gold,
      drops: this.drops,
      maxCombo: this.maxCombo,
      cleared: this.nodes.filter((n) => n.cleared).length,
      total: this.nodes.length,
      log: this.log,
    };
  }
}

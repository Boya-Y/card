// 卡牌配置表（可自行增删改）
// 注意：仅使用字段 id, name, cost, type, damage, block，其他字段可按需扩展

export const CARD_DEFS = {
  strike: { id: 'strike', name: '打击', cost: 1, type: 'attack', damage: 6, desc: '造成 6 点伤害' },
  defend: { id: 'defend', name: '防御', cost: 1, type: 'skill', block: 5, desc: '获得 5 点格挡' },
  heavy_strike: { id: 'heavy_strike', name: '重击', cost: 1, type: 'attack', damage: 10, desc: '造成 10 点伤害' },
  iron_defense: { id: 'iron_defense', name: '厚甲', cost: 1, type: 'skill', block: 8, desc: '获得 8 点格挡' },
  smite: { id: 'smite', name: '惩击', cost: 2, type: 'attack', damage: 14, desc: '造成 14 点伤害' },
  bulwark: { id: 'bulwark', name: '坚壁', cost: 2, type: 'skill', block: 12, desc: '获得 12 点格挡' },
  quick_jab: { id: 'quick_jab', name: '快刺', cost: 0, type: 'attack', damage: 5, desc: '造成 5 点伤害（0 费）' },
};

// 初始牌组（按 id 列表配置）
export const STARTING_DECK = [
  'strike','strike','strike','strike','strike',
  'defend','defend','defend','defend','defend',
];

// 奖励卡池（可用重复做权重）
export const REWARD_POOL = [
  'strike','defend','heavy_strike','iron_defense','smite','bulwark','quick_jab'
];

export function createCardById(id){
  const def = CARD_DEFS[id];
  if(!def) throw new Error(`未知卡牌: ${id}`);
  return { ...def };
}

export function makeDeckFromIds(ids){
  return ids.map(id => createCardById(id));
}
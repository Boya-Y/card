// 遗物配置与工具
// 字段：id, name, desc, energyPlus, drawPlus, healAfterBattlePlus, maxHpPlus

export const RELIC_DEFS = {
  healing_stone: { id: 'healing_stone', name: '治疗石', desc: '每场战后额外恢复 3 点生命', healAfterBattlePlus: 3 },
  small_idol:    { id: 'small_idol',    name: '小雕像', desc: '最大生命 +10', maxHpPlus: 10 },
  study_notes:   { id: 'study_notes',   name: '研习笔记', desc: '每回合额外抽 1 张牌', drawPlus: 1 },
  core_battery:  { id: 'core_battery',  name: '核心电池', desc: '每回合能量 +1', energyPlus: 1 },
  ancient_core:  { id: 'ancient_core',  name: '远古核心', desc: '每回合能量 +1、抽牌 +1', energyPlus: 1, drawPlus: 1 },
  royal_crown:   { id: 'royal_crown',   name: '王冠', desc: '最大生命 +20', maxHpPlus: 20 },
};

export const RELIC_POOL_NORMAL = [ 'healing_stone', 'small_idol', 'study_notes' ];
export const RELIC_POOL_BOSS   = [ 'core_battery', 'ancient_core', 'royal_crown' ];

export function createRelicById(id){
  const def = RELIC_DEFS[id];
  if (!def) throw new Error(`未知遗物: ${id}`);
  return { ...def };
}
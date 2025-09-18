// 玩家与敌人配置表（可按需扩展）

export const PLAYER_CONFIG = {
  maxHp: 80,
  startEnergy: 3,
  drawPerTurn: 5,
  healAfterBattle: 6, // 战后治疗
};

// 敌人表：可配置每个关卡的敌人
export const ENEMY_CONFIG = {
  normal1: { id: 'normal1', name: '史莱姆', hp: 50, maxHp: 50, ai: 'basic' },
  normal2: { id: 'normal2', name: '史莱姆', hp: 60, maxHp: 60, ai: 'basic' },
  elite1:  { id: 'elite1',  name: '精英史莱姆', hp: 90, maxHp: 90, ai: 'basic' },
  boss1:   { id: 'boss1',   name: '史莱姆王', hp: 160, maxHp: 160, ai: 'basic' },
};

export function makeEnemy(def){
  return { name: def.name, hp: def.hp, maxHp: def.maxHp, block: 0, intent: null, ai: def.ai };
}
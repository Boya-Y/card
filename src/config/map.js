// 简单地图配置：由多个层级节点构成，每个节点为一个事件类型
// type: 'fight' | 'rest' | 'shop' | 'elite' | 'boss'

export const MAP_LAYERS = [
  // 1-5：普通关为主，穿插休息/商店
  [ { id:'L1-A', type:'fight', enemy:'normal1' } ],
  [ { id:'L2-A', type:'fight', enemy:'normal2' }, { id:'L2-B', type:'rest' } ],
  [ { id:'L3-A', type:'fight', enemy:'normal1' }, { id:'L3-B', type:'shop' } ],
  [ { id:'L4-A', type:'fight', enemy:'normal2' } ],
  [ { id:'L5-A', type:'rest' }, { id:'L5-B', type:'fight', enemy:'normal1' } ],
  // 6-10：加入精英、更多商店
  [ { id:'L6-A', type:'elite', enemy:'elite1' } ],
  [ { id:'L7-A', type:'fight', enemy:'normal2' }, { id:'L7-B', type:'shop' } ],
  [ { id:'L8-A', type:'fight', enemy:'normal1' } ],
  [ { id:'L9-A', type:'rest' }, { id:'L9-B', type:'fight', enemy:'normal2' } ],
  [ { id:'L10-A', type:'elite', enemy:'elite1' } ],
  // 11-14：冲刺阶段
  [ { id:'L11-A', type:'fight', enemy:'normal2' } ],
  [ { id:'L12-A', type:'shop' } ],
  [ { id:'L13-A', type:'fight', enemy:'normal1' } ],
  [ { id:'L14-A', type:'elite', enemy:'elite1' } ],
  // 15：Boss
  [ { id:'L15-A', type:'boss', enemy:'boss1' } ],
];

export function getLayerCount(){ return MAP_LAYERS.length; }
export function getNodesOfLayer(layer){ return MAP_LAYERS[layer] || []; }
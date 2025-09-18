// 简单地图配置：由多个层级节点构成，每个节点为一个事件类型
// type: 'fight' | 'rest' | 'shop'（当前先实现 fight 与 rest）

export const MAP_LAYERS = [
  [ { id:'L1-A', type:'fight', enemy:'normal1' }, { id:'L1-B', type:'rest' } ],
  [ { id:'L2-A', type:'fight', enemy:'normal2' }, { id:'L2-B', type:'fight', enemy:'normal1' } ],
  [ { id:'L3-A', type:'fight', enemy:'elite1' } ]
];

export function getLayerCount(){ return MAP_LAYERS.length; }
export function getNodesOfLayer(layer){ return MAP_LAYERS[layer] || []; }
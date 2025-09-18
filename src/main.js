import { CARD_DEFS, STARTING_DECK, REWARD_POOL, createCardById, makeDeckFromIds } from './config/cards.js'
import { PLAYER_CONFIG, ENEMY_CONFIG, makeEnemy } from './config/entities.js'
import { MAP_LAYERS, getLayerCount, getNodesOfLayer } from './config/map.js'
import { RELIC_DEFS, RELIC_POOL_NORMAL, RELIC_POOL_BOSS, createRelicById } from './config/relics.js'

// 全局状态（竖屏版）
const state = {
  energy: PLAYER_CONFIG.startEnergy,
  turn: 1,
  player: { hp: PLAYER_CONFIG.maxHp, maxHp: PLAYER_CONFIG.maxHp, block: 0 },
  enemy: { name: '史莱姆', hp: 60, maxHp: 60, block: 0, intent: null },
  drawPile: [],
  discardPile: [],
  hand: [],
  deck: [], // 永久牌组（战斗开始用于生成抽牌堆）
  inReward: false,
  inMap: true,
  layerIndex: 0,
  totalLayers: getLayerCount(),
  currentEnemyId: null,
  // 新增：金币、遗物、统计、当前节点类型、是否刚赢得战斗、加成缓存与商店状态
  gold: 100,
  relics: [], // 数组：{id,name,...}
  stats: { enemies: 0, cards: 0, relics: 0 },
  currentNodeType: null,
  justWonBattle: false,
  bonus: { energyPlus: 0, drawPlus: 0, healPlus: 0, maxHpPlus: 0 },
  shop: null,
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function log(msg) {
  const el = document.getElementById('log');
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function updateHUD() {
  document.getElementById('player-hp').textContent = state.player.hp;
  document.getElementById('player-maxhp').textContent = state.player.maxHp;
  document.getElementById('player-block').textContent = state.player.block;
  document.getElementById('enemy-name').textContent = state.enemy.name || '-';
  document.getElementById('enemy-hp').textContent = state.enemy.hp ?? '-';
  document.getElementById('enemy-maxhp').textContent = state.enemy.maxHp ?? '-';
  document.getElementById('enemy-block').textContent = state.enemy.block ?? '-';
  document.getElementById('enemy-intent').textContent = state.enemy.intent ? state.enemy.intent.label : '未知';
  document.getElementById('energy').textContent = state.energy;
  document.getElementById('draw-count').textContent = state.drawPile.length;
  document.getElementById('discard-count').textContent = state.discardPile.length;
  const goldEl = document.getElementById('gold');
  if (goldEl) goldEl.textContent = state.gold;
  const p = document.getElementById('progress');
  if (p) p.textContent = `第 ${Math.min(state.layerIndex + 1, state.totalLayers)} / ${state.totalLayers} 层`;
}

function draw(n) {
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      log('洗牌');
    }
    const card = state.drawPile.pop();
    state.hand.push(card);
  }
  renderHand();
  updateHUD();
}

function updateHandWrapVisibility(){
  const wrap = document.getElementById('hand-wrap');
  const hint = document.getElementById('hand-hint');
  if (!wrap) return;
  const show = !state.inMap && !state.inReward && !isBattleOver();
  wrap.style.display = show ? 'block' : 'none';
  // 仅在进入战斗且已有手牌，且未看过提示时显示
  if (hint) {
    const canShowHint = show && state.hand && state.hand.length > 0 && !localStorage.getItem('handHintSeen');
    hint.style.display = canShowHint ? 'block' : 'none';
  }
}

// 飘字工具
function floatOver(selector, text, cls = '') {
  const arena = document.querySelector('.arena');
  const target = document.querySelector(selector);
  if (!arena || !target) return;
  const aRect = arena.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${Math.round(tRect.left - aRect.left + tRect.width/2 - 10)}px`;
  el.style.top = `${Math.round(tRect.top - aRect.top)}px`;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// 返回造成的实际伤害与消耗的格挡
function dealDamage(target, amount) {
  const t = target;
  let remaining = amount;
  let blockUsed = 0;
  if (t.block > 0) {
    blockUsed = Math.min(t.block, remaining);
    t.block -= blockUsed;
    remaining -= blockUsed;
  }
  let hpLoss = 0;
  if (remaining > 0) {
    const before = t.hp;
    t.hp = Math.max(0, t.hp - remaining);
    hpLoss = before - t.hp;
  }
  return { hp: hpLoss, block: blockUsed };
}

function gainBlock(target, amount) {
  target.block += amount;
  return amount;
}

function playCard(handIndex) {
  if (state.inReward || isBattleOver() || state.inMap) return;
  const card = state.hand[handIndex];
  if (!card) return;
  if (state.energy < card.cost) return;
  state.energy -= card.cost;

  if (card.type === 'attack') {
    const result = dealDamage(state.enemy, card.damage);
    floatOver('.enemy-panel', `-${result.hp}`, 'float-dmg');
    if (result.block) floatOver('.enemy-panel', `护盾 -${result.block}`, 'float-block');
    log(`你对${state.enemy.name}造成了 ${card.damage} 点潜在伤害（实际伤害 ${result.hp}）`);
  } else if (card.type === 'skill') {
    const block = gainBlock(state.player, card.block || 0);
    floatOver('.player-panel', `+${block}`, 'float-block');
    log(`你获得了 ${block} 点格挡`);
  }

  // 从手牌移到弃牌
  const [played] = state.hand.splice(handIndex, 1);
  state.discardPile.push(played);

  renderHand();
  updateHUD();

  // 检查胜负
  checkWinLose();
}

function enemyChooseIntent() {
  // 简单 AI：80% 攻击（打你 8-12），20% 蓄力（获得 6 格挡）
  const r = Math.random();
  if (r < 0.8) {
    const dmg = 8 + Math.floor(Math.random() * 5);
    state.enemy.intent = { type: 'attack', value: dmg, label: `攻击 ${dmg}` };
  } else {
    state.enemy.intent = { type: 'block', value: 6, label: '格挡 6' };
  }
}

function startPlayerTurn() {
  state.turn += 1;
  state.energy = PLAYER_CONFIG.startEnergy + (state.bonus?.energyPlus || 0);
  state.player.block = 0; // 回合开始清空玩家格挡
  const targetDraw = (PLAYER_CONFIG.drawPerTurn + (state.bonus?.drawPlus || 0));
  draw(Math.max(0, targetDraw - state.hand.length)); // 补到配置张数
  enemyChooseIntent();
  log(`回合 ${state.turn} 开始`);
  updateHUD();
  document.getElementById('end-turn').disabled = false || state.inReward || state.inMap;
}

function endPlayerTurn() {
  if (state.inReward || state.inMap) return;
  document.getElementById('end-turn').disabled = true;
  // 手牌弃置
  state.discardPile.push(...state.hand);
  state.hand = [];

  // 敌人行动
  if (state.enemy.intent?.type === 'attack') {
    const res = dealDamage(state.player, state.enemy.intent.value);
    floatOver('.player-panel', `-${res.hp}`, 'float-dmg');
    if (res.block) floatOver('.player-panel', `护盾 -${res.block}`, 'float-block');
    log(`${state.enemy.name} 对你造成了 ${res.hp} 实际伤害`);
  } else if (state.enemy.intent?.type === 'block') {
    const b = gainBlock(state.enemy, state.enemy.intent.value);
    floatOver('.enemy-panel', `+${b}`, 'float-block');
    log(`${state.enemy.name} 获得了 ${b} 点格挡`);
  }

  // 回合结束清空敌人格挡
  state.enemy.block = 0;

  const over = checkWinLose();
  if (!over) {
    setTimeout(startPlayerTurn, 300);
  }
  updateHUD();
}

function isBattleOver() {
  return state.player.hp <= 0 || state.enemy.hp <= 0 || state.inReward;
}

function renderHand() {
  const handEl = document.getElementById('hand');
  handEl.innerHTML = '';
  state.hand.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card';

    const title = document.createElement('h3');
    title.textContent = card.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>费用: ${card.cost}</span><span>${card.type === 'attack' ? `伤害 ${card.damage}` : `格挡 ${card.block || 0}`}</span>`;

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = card.desc;

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '打出';
    btn.disabled = state.energy < card.cost || state.inReward || isBattleOver() || state.inMap;
    btn.onclick = () => playCard(idx);

    el.appendChild(title);
    el.appendChild(meta);
    el.appendChild(desc);
    el.appendChild(btn);
    handEl.appendChild(el);
  });
}
function checkWinLose() {
  if (state.enemy.hp <= 0) {
    document.getElementById('end-turn').disabled = true;
    updateHandWrapVisibility();
    onBattleVictory();
    return true;
  }
  if (state.player.hp <= 0) {
    log('你失败了…');
    document.getElementById('end-turn').disabled = true;
    document.getElementById('restart').style.display = 'inline-block';
    updateHandWrapVisibility();
    return true;
  }
  return false;
}

// -------------- 地图系统 --------------
function renderMap() {
  const mapEl = document.getElementById('map');
  mapEl.innerHTML = '';
  const nodes = getNodesOfLayer(state.layerIndex);
  const row = document.createElement('div');
  row.className = 'map-row';
  nodes.forEach((node) => {
    const btn = document.createElement('button');
    btn.className = 'node ' + (node.type || '');
    const labelMap = { fight: '战斗', rest: '休息', shop: '商店', elite: '精英', boss: 'Boss' };
    btn.textContent = labelMap[node.type] || node.type;
    btn.onclick = () => onMapNodeSelect(node);
    row.appendChild(btn);
  });
  mapEl.appendChild(row);
}

function onMapNodeSelect(node) {
  if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
    state.currentEnemyId = node.enemy;
    state.currentNodeType = node.type;
    exitMap();
    startBattle();
  } else if (node.type === 'rest') {
    const heal = Math.floor(state.player.maxHp * 0.2);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    log(`你在休息点恢复了 ${heal} 点生命`);
    goToNextLayer();
  } else if (node.type === 'shop') {
    openShop();
  }
}

function enterMap() {
  state.inMap = true;
  document.getElementById('map').style.display = 'block';
  document.getElementById('hand').style.display = ''; // 由 hand-wrap 统一控制
  document.getElementById('end-turn').disabled = true;
  updateHandWrapVisibility();
  renderMap();
  updateHUD();
}

function exitMap() {
  state.inMap = false;
  document.getElementById('map').style.display = 'none';
  document.getElementById('hand').style.display = '';
  updateHandWrapVisibility();
  updateHUD();
}

function goToNextLayer() {
  state.layerIndex += 1;
  if (state.layerIndex >= state.totalLayers) {
    // 冒险完成
    closeReward();
    log('通关！你击败了所有敌人！');
    openVictory();
    return;
  }
  // 战后治疗（如果刚刚从战斗获胜）
  if (state.justWonBattle){
    const heal = (PLAYER_CONFIG.healAfterBattle || 0) + (state.bonus?.healPlus || 0);
    if (heal > 0){
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      log(`战后恢复 ${state.player.hp - before} 点生命`);
    }
    state.justWonBattle = false;
  }
  closeReward();
  enterMap();
}

// -------------- 战斗系统 --------------
function enemyFromCurrentNode() {
  const id = state.currentEnemyId;
  const def = ENEMY_CONFIG[id];
  if (!def) {
    // 兜底为普通史莱姆
    return { name: '史莱姆', hp: 60, maxHp: 60, block: 0, intent: null };
  }
  return makeEnemy(def);
}

function startBattle() {
  state.turn = 0;
  state.energy = PLAYER_CONFIG.startEnergy + (state.bonus?.energyPlus || 0);
  state.player.block = 0;
  state.enemy = enemyFromCurrentNode();
  state.drawPile = shuffle(state.deck.slice());
  state.discardPile = [];
  state.hand = [];
  updateHUD();
  renderHand();
  updateHandWrapVisibility();
  log(`第 ${state.layerIndex + 1} 层的战斗开始！`);
  startPlayerTurn();
}

function openReward(isFinalLayer = false) {
  state.inReward = true;
  updateHandWrapVisibility();
  const modal = document.getElementById('reward-modal');
  const optionsEl = document.getElementById('reward-options');
  optionsEl.innerHTML = '';
  const options = pickRewardOptions(3);

  options.forEach((card) => {
    const c = document.createElement('div');
    c.className = 'reward-card';

    const title = document.createElement('h3');
    title.textContent = card.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>费用: ${card.cost}</span><span>${card.type === 'attack' ? `伤害 ${card.damage}` : `格挡 ${card.block || 0}`}</span>`;
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = card.desc;

    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = '选择';
    btn.onclick = () => {
      addCardToDeck(card);
      goToNextLayer();
    };

    c.appendChild(title);
    c.appendChild(meta);
    c.appendChild(desc);
    c.appendChild(btn);
    optionsEl.appendChild(c);
  });

  modal.classList.remove('hidden');
  updateHUD();
}

function closeReward() {
  const modal = document.getElementById('reward-modal');
  modal.classList.add('hidden');
  state.inReward = false;
  updateHandWrapVisibility();
  updateHUD();
}

function pickRewardOptions(n) {
  const pool = REWARD_POOL.slice();
  shuffle(pool);
  return pool.slice(0, n).map(id => createCardById(id));
}

function addCardToDeck(card) {
  state.deck.push({ ...card });
  state.stats.cards += 1;
  log(`加入牌组：${card.name}`);
}

// -------------- 冒险初始化与重开 --------------
function setupRun() {
  // 初始化一次冒险
  state.deck = makeDeckFromIds(STARTING_DECK);
  state.layerIndex = 0;
  state.totalLayers = getLayerCount();
  state.player = { hp: PLAYER_CONFIG.maxHp, maxHp: PLAYER_CONFIG.maxHp, block: 0 };
  state.inReward = false;
  state.gold = 100;
  state.relics = [];
  state.stats = { enemies: 0, cards: 0, relics: 0 };
  state.currentNodeType = null;
  state.justWonBattle = false;
  state.bonus = { energyPlus: 0, drawPlus: 0, healPlus: 0, maxHpPlus: 0 };
  recalcBonuses();
  document.getElementById('log').innerHTML = '';
  document.getElementById('restart').style.display = 'none';
  enterMap();
}

function restart() {
  setupRun();
}

// 绑定按钮
window.addEventListener('DOMContentLoaded', () => {
  if (window.__uiInitDone) return;
  window.__uiInitDone = true;
  document.getElementById('end-turn').addEventListener('click', endPlayerTurn);
  document.getElementById('restart').addEventListener('click', restart);
  const skipBtn = document.getElementById('skip-reward');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      goToNextLayer();
    });
  }
  // 商店关闭与遗物/胜利确认
  const closeShopBtn = document.getElementById('close-shop');
  if (closeShopBtn) closeShopBtn.addEventListener('click', closeShop);
  const shopModal = document.getElementById('shop-modal');
  if (shopModal){
    const backdrop = shopModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeShop);
  }
  const closeRelicBtn = document.getElementById('close-relic');
  if (closeRelicBtn) closeRelicBtn.addEventListener('click', acceptRelic);
  const relicModal = document.getElementById('relic-modal');
  if (relicModal){
    const backdrop = relicModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', acceptRelic);
  }
  const closeVictoryBtn = document.getElementById('close-victory');
  if (closeVictoryBtn) closeVictoryBtn.addEventListener('click', closeVictory);
  const victoryModal = document.getElementById('victory-modal');
  if (victoryModal){
    const backdrop = victoryModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeVictory);
  }
  
  setupRun();
  const hand = document.getElementById('hand');
  if (hand) {
    hand.addEventListener('scroll', updateHandScrollHints, { passive: true });
  }
  // 牌库入口与关闭
  const deckLink = document.getElementById('deck-link');
  if (deckLink) deckLink.addEventListener('click', openDeckModal);
  const closeDeckBtn = document.getElementById('close-deck');
  if (closeDeckBtn) closeDeckBtn.addEventListener('click', closeDeckModal);
  const deckModal = document.getElementById('deck-modal');
  if (deckModal) {
    const backdrop = deckModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeDeckModal);
  }
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeDeckModal();
  });
  // 初始根据本地标记设置提示可见性
  if (localStorage.getItem('handHintSeen')) {
    const wrap = document.getElementById('hand-wrap');
    if (wrap) wrap.classList.add('scrolled');
    const hint = document.getElementById('hand-hint');
    if (hint) hint.style.display = 'none';
  }
  requestAnimationFrame(updateHandScrollHints);
  updateHandWrapVisibility();
});

// 牌库弹窗逻辑
function renderDeckList(){
  const list = document.getElementById('deck-list');
  if (!list) return;
  list.innerHTML = '';
  state.deck.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'card';
    const title = document.createElement('h3');
    title.textContent = card.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>费用: ${card.cost}</span><span>${card.type === 'attack' ? `伤害 ${card.damage}` : `格挡 ${card.block || 0}`}</span>`;
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = card.desc;
    el.appendChild(title);
    el.appendChild(meta);
    el.appendChild(desc);
    list.appendChild(el);
  });
}
function openDeckModal(){
  const modal = document.getElementById('deck-modal');
  if (!modal) return;
  renderDeckList();
  modal.classList.remove('hidden');
}
function closeDeckModal(){
  const modal = document.getElementById('deck-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

// 新增：战斗胜利流程（精英/ Boss 掉落遗物 + 选牌奖励）
function onBattleVictory(){
  state.stats.enemies += 1;
  state.justWonBattle = true;
  if (state.currentNodeType === 'elite') {
    openRelicReward('elite');
  } else if (state.currentNodeType === 'boss') {
    openRelicReward('boss');
  } else {
    log('战斗胜利！请选择一张卡作为奖励');
    openReward(false);
  }
}

function openRelicReward(kind){
  const pool = kind === 'boss' ? RELIC_POOL_BOSS.slice() : RELIC_POOL_NORMAL.slice();
  // 过滤已拥有的，尽量不重复；若全部拥有则仍可重复
  const owned = new Set(state.relics.map(r=>r.id));
  const available = pool.filter(id => !owned.has(id));
  const pickPool = available.length>0 ? available : pool;
  const id = pickPool[Math.floor(Math.random() * pickPool.length)];
  const relic = createRelicById(id);
  state._pendingRelic = relic;
  const modal = document.getElementById('relic-modal');
  const info = document.getElementById('relic-info');
  if (info) info.innerHTML = `<div class="relic-name"><strong>${relic.name}</strong></div><div class="relic-desc">${relic.desc}</div>`;
  if (modal) modal.classList.remove('hidden');
}

function acceptRelic(){
  if (!state._pendingRelic) return;
  addRelic(state._pendingRelic);
  state._pendingRelic = null;
  const modal = document.getElementById('relic-modal');
  if (modal) modal.classList.add('hidden');
  log('获得遗物！');
  // 继续进入选牌奖励（最终层也同样给牌）
  openReward(state.layerIndex >= state.totalLayers - 1);
}

function addRelic(relic){
  // 若已拥有同ID，允许叠加仅对数值型加成有效（此处简单相加）
  state.relics.push(relic);
  state.stats.relics += 1;
  recalcBonuses();
  // 立即应用最大生命加成
  const plus = relic.maxHpPlus || 0;
  if (plus){
    state.player.maxHp += plus;
    state.player.hp += plus;
  }
  updateHUD();
}

function recalcBonuses(){
  const sum = (k)=> state.relics.reduce((acc,r)=> acc + (r[k]||0), 0);
  state.bonus = {
    energyPlus: sum('energyPlus'),
    drawPlus: sum('drawPlus'),
    healPlus: sum('healAfterBattlePlus'),
    maxHpPlus: sum('maxHpPlus'),
  };
}

// 商店
function openShop(){
  // 生成商品：3张牌、2个遗物
  const cardIds = [...REWARD_POOL];
  shuffle(cardIds);
  const cards = cardIds.slice(0,3).map(id=>createCardById(id));
  const relicPool = [...RELIC_POOL_NORMAL];
  shuffle(relicPool);
  const relicIds = relicPool.slice(0,2);
  state.shop = { cards, relicIds, prices: new Map() };
  // 定价
  cards.forEach(c=> state.shop.prices.set(c.id, 75));
  relicIds.forEach(id=> state.shop.prices.set(id, 120));

  const list = document.getElementById('shop-list');
  if (list) {
    const render = ()=>{
      list.innerHTML = '';
      const sec1 = document.createElement('div');
      const h1 = document.createElement('h3'); h1.textContent = '卡牌'; sec1.appendChild(h1);
      const cardWrap = document.createElement('div'); cardWrap.className = 'shop-sec';
      state.shop.cards.forEach(card => {
        const price = state.shop.prices.get(card.id);
        const el = document.createElement('div'); el.className = 'shop-item card-item';
        el.innerHTML = `<div class="title">${card.name}</div><div class="meta">费用 ${card.cost} · ${card.type==='attack'?`伤害 ${card.damage}`:`格挡 ${card.block||0}`}</div><div class="desc">${card.desc}</div><div class="price">价格：<strong>${price}</strong></div>`;
        const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = '购买';
        btn.disabled = state.gold < price;
        btn.onclick = ()=>{
          if (state.gold < price) return;
          state.gold -= price;
          addCardToDeck(card);
          log(`购买卡牌：${card.name}（-${price} 金币）`);
          // 从商店移除该卡牌并删除定价，避免重复购买
          const idx = state.shop.cards.indexOf(card);
          if (idx >= 0) state.shop.cards.splice(idx, 1);
          state.shop.prices.delete(card.id);
          updateHUD();
          render();
        };
        el.appendChild(btn);
        cardWrap.appendChild(el);
      });
      sec1.appendChild(cardWrap);
      list.appendChild(sec1);

      const sec2 = document.createElement('div');
      const h2 = document.createElement('h3'); h2.textContent = '遗物'; sec2.appendChild(h2);
      const relicWrap = document.createElement('div'); relicWrap.className = 'shop-sec';
      state.shop.relicIds.forEach(id => {
        const relic = createRelicById(id);
        const price = state.shop.prices.get(id);
        const owned = state.relics.some(r=>r.id===id);
        const el = document.createElement('div'); el.className = 'shop-item relic-item';
        el.innerHTML = `<div class="title">${relic.name}</div><div class="desc">${relic.desc}</div><div class="price">价格：<strong>${price}</strong></div>`;
        const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = owned ? '已拥有' : '购买';
        btn.disabled = owned || state.gold < price;
        btn.onclick = ()=>{
          if (owned || state.gold < price) return;
          state.gold -= price;
          addRelic(relic);
          log(`购买遗物：${relic.name}（-${price} 金币）`);
          // 从商店移除该遗物并删除定价，避免重复购买
          const idx = state.shop.relicIds.findIndex(rid => rid === id);
          if (idx >= 0) state.shop.relicIds.splice(idx, 1);
          state.shop.prices.delete(id);
          updateHUD();
          render();
        };
        el.appendChild(btn);
        relicWrap.appendChild(el);
      });
      sec2.appendChild(relicWrap);
      list.appendChild(sec2);
    };
    render();
  }
  const modal = document.getElementById('shop-modal');
  if (modal) modal.classList.remove('hidden');
}
function closeShop(){
  const modal = document.getElementById('shop-modal');
  if (modal) modal.classList.add('hidden');
  state.shop = null;
  goToNextLayer();
}

// 胜利面板
function openVictory(){
  const m = document.getElementById('victory-modal');
  if (!m) return;
  document.getElementById('stat-enemies').textContent = state.stats.enemies;
  document.getElementById('stat-cards').textContent = state.stats.cards;
  document.getElementById('stat-relics').textContent = state.stats.relics;
  m.classList.remove('hidden');
}
function closeVictory(){
  const m = document.getElementById('victory-modal');
  if (m) m.classList.add('hidden');
  document.getElementById('restart').style.display = 'inline-block';
}

function updateHandScrollHints(){
  const wrap = document.getElementById('hand-wrap');
  const hand = document.getElementById('hand');
  const leftFade = document.querySelector('.hand-fade.left');
  const rightFade = document.querySelector('.hand-fade.right');
  const hint = document.getElementById('hand-hint');
  if (!wrap || !hand) return;
  const maxScroll = hand.scrollWidth - hand.clientWidth;
  const atLeft = hand.scrollLeft <= 2;
  const atRight = hand.scrollLeft >= maxScroll - 2;
  if (leftFade) leftFade.style.opacity = atLeft ? '0' : '1';
  if (rightFade) rightFade.style.opacity = atRight ? '0' : '1';
  // 首次滑动：添加 .scrolled，并写入本地标记，后续不再显示提示
  if (hint && !localStorage.getItem('handHintSeen')) {
    if (hand.scrollLeft > 4) {
      wrap.classList.add('scrolled');
      localStorage.setItem('handHintSeen','1');
      // 直接隐藏提示（在 CSS 已用 display:none 处理）
      hint.style.display = 'none';
    }
  }
}

// 在 renderHand 之后刷新提示和可见性
const _renderHand = renderHand;
renderHand = function(){
  _renderHand();
  requestAnimationFrame(() => {
    updateHandScrollHints();
    updateHandWrapVisibility();
  });
}
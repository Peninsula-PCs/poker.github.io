/* ═══════════════════════════════════════════
   Lunch Break Poker — App Logic
   ═══════════════════════════════════════════ */

// ── STATE ────────────────────────────────────
let state = {
  players: [],
  pot: 0,
  currentStage: 0,
  smallBlind: 10,
  bigBlind: 20,
  highestBet: 0,
  selectedWinner: null,
};

const STAGES = ['Pre-Flop', 'Flop', 'Turn', 'River', 'Showdown'];
const STAGE_DESC = [
  'Pre-Flop Betting',
  'Flop · 3 Cards Shown',
  'Turn · 4th Card Shown',
  'River · 5th Card Shown',
  'Showdown · Award the Pot',
];

// ── SETUP ────────────────────────────────────
document.getElementById('num-players').addEventListener('input', updateNameInputs);

function updateNameInputs() {
  const n = Math.min(9, Math.max(2, parseInt(document.getElementById('num-players').value) || 4));
  const container = document.getElementById('player-names-container');
  const existing = [...container.querySelectorAll('input')].map(i => i.value);
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.className = 'player-name-input';
    inp.placeholder = `Player ${i + 1}`;
    inp.value = existing[i] || '';
    inp.type = 'text';
    container.appendChild(inp);
  }
}

function startSession() {
  const n = parseInt(document.getElementById('num-players').value);
  const cash = parseInt(document.getElementById('starting-cash').value);
  const sb = parseInt(document.getElementById('small-blind').value);
  const bb = parseInt(document.getElementById('big-blind').value);
  const names = [...document.querySelectorAll('.player-name-input')]
    .map((inp, i) => inp.value.trim() || `Player ${i + 1}`);

  state.players = names.map(name => ({
    name,
    stack: cash,
    currentBet: 0,
    pendingBet: 0,
    folded: false,
    allIn: false,
  }));

  state.pot = 0;
  state.currentStage = 0;
  state.smallBlind = sb;
  state.bigBlind = bb;
  state.highestBet = bb;
  state.selectedWinner = null;

  postBlinds();

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';
  renderGame();
}

function postBlinds() {
  // Fixed positions — no rotating dealer
  const sbIdx = 0;
  const bbIdx = 1;
  const sbAmt = Math.min(state.smallBlind, state.players[sbIdx].stack);
  const bbAmt = Math.min(state.bigBlind, state.players[bbIdx].stack);

  state.players[sbIdx].stack -= sbAmt;
  state.players[sbIdx].currentBet = sbAmt;
  state.players[bbIdx].stack -= bbAmt;
  state.players[bbIdx].currentBet = bbAmt;
  state.pot += sbAmt + bbAmt;
  state.highestBet = bbAmt;
}

// ── RENDER ───────────────────────────────────
function renderGame() {
  STAGES.forEach((s, i) => {
    const pill = document.getElementById(`pill-${i}`);
    pill.className = 'stage-pill' +
      (i === state.currentStage ? ' active' : i < state.currentStage ? ' done' : '');
  });

  document.getElementById('stage-badge').textContent = STAGES[state.currentStage];
  document.getElementById('pot-value').textContent = state.pot.toLocaleString();
  document.getElementById('round-title').textContent = STAGE_DESC[state.currentStage];

  const btn = document.getElementById('next-stage-btn');
  if (state.currentStage === 4) {
    btn.textContent = '🏆 Award Pot';
    btn.onclick = openWinnerModal;
  } else {
    btn.textContent = 'Next Stage →';
    btn.onclick = nextStage;
  }

  renderPlayers();
}

function renderPlayers() {
  const grid = document.getElementById('players-grid');
  grid.innerHTML = '';

  state.players.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.folded ? ' folded' : '');

    const betDiff = state.highestBet - p.currentBet;
    const canCheck = betDiff === 0;
    const canMatch = betDiff > 0 && betDiff <= p.stack;
    const isShowdown = state.currentStage === 4;

    let actionsHTML = '';
    if (p.folded) {
      actionsHTML = `<div class="player-actions"><div class="folded-label">✗ Folded</div></div>`;
    } else if (!isShowdown) {
      actionsHTML = `
        <div class="player-actions">
          <div class="bet-row">
            <button class="btn-adj" onclick="adjustBet(${i}, -100)">−100</button>
            <button class="btn-adj" onclick="adjustBet(${i}, -50)">−50</button>
            <div class="bet-amount-display">£<span id="pending-${i}">${p.pendingBet}</span></div>
            <button class="btn-adj" onclick="adjustBet(${i}, 50)">+50</button>
            <button class="btn-adj" onclick="adjustBet(${i}, 100)">+100</button>
          </div>
          <div class="action-row">
            ${canCheck ? `<button class="btn-check" onclick="doCheck(${i})">Check</button>` : ''}
            ${canMatch ? `<button class="btn-match" onclick="doMatch(${i})">Match £${betDiff.toLocaleString()}</button>` : ''}
            <button class="btn-bet" onclick="doBet(${i})">Bet/Raise</button>
            <button class="btn-allin" onclick="doAllIn(${i})">All-In</button>
            <button class="btn-fold" onclick="doFold(${i})">Fold</button>
          </div>
        </div>`;
    }

    card.innerHTML = `
      <div class="player-inner">
        <div class="player-info">
          <div class="player-name-display">${p.name}</div>
          <div class="player-stack"><span class="currency-sm">£</span>${p.stack.toLocaleString()}</div>
          <div class="player-bet-info">
            ${p.currentBet > 0 ? `Bet: <span>£${p.currentBet.toLocaleString()}</span>` : 'No bet'}
            ${p.allIn ? '<br><span style="color:#e67e22">ALL IN</span>' : ''}
          </div>
        </div>
        ${actionsHTML}
      </div>`;

    grid.appendChild(card);
  });
}

// ── BETTING ACTIONS ──────────────────────────
function adjustBet(i, delta) {
  const p = state.players[i];
  p.pendingBet = Math.max(0, Math.min(p.stack, (p.pendingBet || 0) + delta));
  const el = document.getElementById(`pending-${i}`);
  if (el) el.textContent = p.pendingBet.toLocaleString();
}

function doBet(i) {
  const p = state.players[i];
  if (!p.pendingBet || p.pendingBet <= 0) {
    alert('Set an amount first!');
    return;
  }
  const totalBet = p.currentBet + p.pendingBet;
  state.pot += p.pendingBet;
  p.stack -= p.pendingBet;
  p.currentBet = totalBet;
  if (totalBet > state.highestBet) state.highestBet = totalBet;
  p.pendingBet = 0;
  renderGame();
}

function doCheck(i) {
  renderGame();
}

function doMatch(i) {
  const p = state.players[i];
  const diff = Math.min(state.highestBet - p.currentBet, p.stack);
  p.stack -= diff;
  p.currentBet += diff;
  state.pot += diff;
  p.pendingBet = 0;
  renderGame();
}

function doAllIn(i) {
  const p = state.players[i];
  state.pot += p.stack;
  p.currentBet += p.stack;
  if (p.currentBet > state.highestBet) state.highestBet = p.currentBet;
  p.stack = 0;
  p.allIn = true;
  p.pendingBet = 0;
  renderGame();
}

function doFold(i) {
  state.players[i].folded = true;
  state.players[i].pendingBet = 0;

  const active = state.players.filter(p => !p.folded);
  if (active.length === 1) {
    // Last player standing — auto award
    state.selectedWinner = state.players.indexOf(active[0]);
    confirmWinner();
    return;
  }
  renderGame();
}

// ── STAGE NAVIGATION ─────────────────────────
function nextStage() {
  if (state.currentStage >= 4) return;
  state.players.forEach(p => { p.currentBet = 0; p.pendingBet = 0; });
  state.highestBet = 0;
  state.currentStage++;
  renderGame();
}

// ── WINNER FLOW ──────────────────────────────
function openWinnerModal() {
  state.selectedWinner = null;
  document.getElementById('winner-pot-display').textContent = `£${state.pot.toLocaleString()}`;

  const grid = document.getElementById('winner-grid');
  grid.innerHTML = '';
  state.players.forEach((p, i) => {
    if (p.folded) return;
    const btn = document.createElement('button');
    btn.className = 'winner-btn';
    btn.textContent = p.name;
    btn.onclick = () => {
      document.querySelectorAll('.winner-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedWinner = i;
      document.getElementById('confirm-winner-btn').disabled = false;
    };
    grid.appendChild(btn);
  });

  document.getElementById('confirm-winner-btn').disabled = true;
  document.getElementById('winner-modal').classList.add('show');
}

function closeWinnerModal() {
  document.getElementById('winner-modal').classList.remove('show');
}

function confirmWinner() {
  if (state.selectedWinner === null) return;
  closeWinnerModal();

  const winner = state.players[state.selectedWinner];
  winner.stack += state.pot;

  document.getElementById('win-name-display').textContent = `🎉 ${winner.name}`;
  document.getElementById('win-amount-display').textContent = `Wins £${state.pot.toLocaleString()}!`;
  document.getElementById('win-modal').classList.add('show');
}

function nextHand() {
  document.getElementById('win-modal').classList.remove('show');

  state.pot = 0;
  state.currentStage = 0;
  state.highestBet = state.bigBlind;
  state.selectedWinner = null;

  state.players.forEach(p => {
    p.currentBet = 0;
    p.pendingBet = 0;
    p.folded = false;
    p.allIn = false;
  });

  // Remove busted players
  state.players = state.players.filter(p => p.stack > 0);

  if (state.players.length < 2) {
    alert(`${state.players[0]?.name || 'Nobody'} is the last one standing! Session over.`);
    location.reload();
    return;
  }

  postBlinds();
  renderGame();
}

function confirmEndSession() {
  if (confirm('End the session? All stacks will be cleared.')) {
    location.reload();
  }
}

// ── INIT ─────────────────────────────────────
updateNameInputs();

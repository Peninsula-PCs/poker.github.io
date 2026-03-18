
let state = {
  players: [],
  pot: 0,
  currentStage: 0,
  minBet: 100,
  highestBet: 0,
  raiserIndex: null,   // index of the player who last raised (null = no raise yet)
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
  const cash = parseInt(document.getElementById('starting-cash').value);
  const minBet = parseInt(document.getElementById('min-bet').value) || 100;
  const names = [...document.querySelectorAll('.player-name-input')]
    .map((inp, i) => inp.value.trim() || `Player ${i + 1}`);

  state.players = names.map(name => ({
    name,
    stack: cash,
    currentBet: 0,
    pendingBet: 0,
    folded: false,
    allIn: false,
    acted: false,    // has this player acted this betting round?
    hasRaised: false, // has this player raised this betting round?
  }));

  state.pot = 0;
  state.currentStage = 0;
  state.minBet = minBet;
  state.highestBet = 0;
  state.raiserIndex = null;
  state.selectedWinner = null;

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';
  renderGame();
}

// ── ROUND COMPLETE CHECK ──────────────────────
// Round is done when every active (non-folded, non-allIn) player has acted
// AND all active players have the same currentBet (or are all-in)
function checkRoundComplete() {
  const active = state.players.filter(p => !p.folded);

  // If only one player left, that's handled by doFold
  if (active.length <= 1) return;

  // Everyone who can still act must have acted
  const canAct = active.filter(p => !p.allIn);
  const allActed = canAct.every(p => p.acted);
  if (!allActed) return;

  // All active players must be at the same bet level (or all-in)
  const maxBet = Math.max(...active.map(p => p.currentBet));
  const allEqual = canAct.every(p => p.currentBet === maxBet);
  if (!allEqual) return;

  // Round is complete — advance stage
  advanceStage();
}

function advanceStage() {
  if (state.currentStage >= 4) return;

  // Reset per-round state
  state.players.forEach(p => {
    p.currentBet = 0;
    p.pendingBet = 0;
    p.acted = false;
    p.hasRaised = false;
  });
  state.highestBet = 0;
  state.raiserIndex = null;
  state.currentStage++;

  if (state.currentStage === 4) {
    // Auto-open showdown
    renderGame();
    openWinnerModal();
  } else {
    renderGame();
  }
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

  renderStatus();
  renderPlayers();
}

function renderStatus() {
  const statusEl = document.getElementById('round-status');
  if (state.currentStage === 4) { statusEl.innerHTML = ''; return; }

  const active = state.players.filter(p => !p.folded && !p.allIn);
  const waiting = active.filter(p => !p.acted);
  const done = active.filter(p => p.acted);

  if (waiting.length === 0) {
    statusEl.innerHTML = `<span class="status-done">✓ All done</span>`;
  } else {
    statusEl.innerHTML = `<span class="status-waiting">${waiting.length} player${waiting.length > 1 ? 's' : ''} to act</span>`;
  }
}

function renderPlayers() {
  const grid = document.getElementById('players-grid');
  grid.innerHTML = '';
  const isShowdown = state.currentStage === 4;

  state.players.forEach((p, i) => {
    const card = document.createElement('div');
    const betDiff = state.highestBet - p.currentBet;
    const canCheck = betDiff === 0 && !p.allIn;
    const canMatch = betDiff > 0 && betDiff <= p.stack;
    // Can only raise if: no one has raised yet, OR this player hasn't raised yet this round
    // (raiserIndex tracks who last raised; a player can't raise again after the raiser acts)
    const canRaise = !p.hasRaised && (state.raiserIndex === null || state.raiserIndex !== i);

    let statusLabel = '';
    if (p.folded) {
      statusLabel = 'folded';
    } else if (p.allIn) {
      statusLabel = 'allin';
    } else if (p.acted) {
      statusLabel = 'acted';
    }

    card.className = 'player-card' + (p.folded ? ' folded' : '') + (p.acted && !p.folded && !p.allIn ? ' player-acted' : '');

    let actionsHTML = '';
    if (p.folded) {
      actionsHTML = `<div class="player-actions"><div class="folded-label">✗ Folded</div></div>`;
    } else if (p.allIn) {
      actionsHTML = `<div class="player-actions"><div class="folded-label" style="color:#e67e22">ALL IN</div></div>`;
    } else if (p.acted && !isShowdown) {
      // Show a "acted" state — they can still change their mind if no one has re-raised
      // but we keep it simple: show a "✓ Acted" with an undo option
      actionsHTML = `
        <div class="player-actions">
          <div class="acted-label">✓ ${p.currentBet > 0 ? `Bet £${p.currentBet.toLocaleString()}` : 'Checked'}</div>
          <div class="action-row">
            <button class="btn-undo" onclick="undoAction(${i})">Undo</button>
          </div>
        </div>`;
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
            ${canRaise ? `<button class="btn-bet" onclick="doBet(${i})">Bet/Raise</button>` : ''}
            <button class="btn-allin" onclick="doAllIn(${i})">All-In</button>
            <button class="btn-fold" onclick="doFold(${i})">Fold</button>
          </div>
          <div class="min-bet-hint">Min bet: £${state.minBet.toLocaleString()}</div>
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
  // Must reach at least minBet total, or minBet above the current high
  const minRequired = state.highestBet > 0
    ? state.highestBet + state.minBet
    : state.minBet;

  if (totalBet < minRequired) {
    alert(`Minimum raise is £${state.minBet.toLocaleString()}. You need a total bet of at least £${minRequired.toLocaleString()}.`);
    return;
  }

  state.pot += p.pendingBet;
  p.stack -= p.pendingBet;
  p.currentBet = totalBet;
  if (totalBet > state.highestBet) state.highestBet = totalBet;
  p.pendingBet = 0;
  p.acted = true;
  p.hasRaised = true;
  state.raiserIndex = i;

  // Everyone else who already acted but hasn't matched the new raise
  // needs to act again (except the raiser themselves)
  state.players.forEach((other, j) => {
    if (j !== i && !other.folded && !other.allIn && other.currentBet < state.highestBet) {
      other.acted = false;
    }
  });

  renderGame();
  checkRoundComplete();
}

function doCheck(i) {
  const p = state.players[i];
  if (state.highestBet > p.currentBet) {
    alert(`You can't check — there's a bet of £${state.highestBet.toLocaleString()} to match.`);
    return;
  }
  p.acted = true;
  p.pendingBet = 0;
  renderGame();
  checkRoundComplete();
}

function doMatch(i) {
  const p = state.players[i];
  const diff = Math.min(state.highestBet - p.currentBet, p.stack);
  p.stack -= diff;
  p.currentBet += diff;
  state.pot += diff;
  p.pendingBet = 0;
  p.acted = true;
  p.hasRaised = true;
  renderGame();
  checkRoundComplete();
}

function doAllIn(i) {
  const p = state.players[i];
  const amount = p.stack;
  state.pot += amount;
  p.currentBet += amount;
  if (p.currentBet > state.highestBet) {
    state.highestBet = p.currentBet;
    state.raiserIndex = i;
    // Others need to act again to match
    state.players.forEach((other, j) => {
      if (j !== i && !other.folded && !other.allIn && other.currentBet < state.highestBet) {
        other.acted = false;
      }
    });
  }
  p.stack = 0;
  p.allIn = true;
  p.acted = true;
  p.pendingBet = 0;
  renderGame();
  checkRoundComplete();
}

function doFold(i) {
  state.players[i].folded = true;
  state.players[i].acted = true;
  state.players[i].pendingBet = 0;

  const active = state.players.filter(p => !p.folded);
  if (active.length === 1) {
    state.selectedWinner = state.players.indexOf(active[0]);
    confirmWinner();
    return;
  }
  renderGame();
  checkRoundComplete();
}

// Undo a player's action in the current round (before stage advances)
function undoAction(i) {
  const p = state.players[i];

  // Refund their bet back to pending
  if (p.currentBet > 0) {
    p.stack += p.currentBet;
    state.pot -= p.currentBet;
    p.pendingBet = p.currentBet;
    p.currentBet = 0;
  }

  p.acted = false;

  // If this player was the raiser, unset that
  if (state.raiserIndex === i) {
    state.raiserIndex = null;
    p.hasRaised = false;
    // Recalculate highestBet from remaining bets
    state.highestBet = Math.max(0, ...state.players.map(pl => pl.currentBet));
  }

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
  state.highestBet = 0;
  state.raiserIndex = null;
  state.selectedWinner = null;

  state.players.forEach(p => {
    p.currentBet = 0;
    p.pendingBet = 0;
    p.folded = false;
    p.allIn = false;
    p.acted = false;
    p.hasRaised = false;
  });

  // Remove busted players
  state.players = state.players.filter(p => p.stack > 0);

  if (state.players.length < 2) {
    alert(`${state.players[0]?.name || 'Nobody'} is the last one standing! Session over.`);
    location.reload();
    return;
  }

  renderGame();
}

function confirmEndSession() {
  if (confirm('End the session? All stacks will be cleared.')) {
    location.reload();
  }
}

// ── INIT ─────────────────────────────────────
updateNameInputs();

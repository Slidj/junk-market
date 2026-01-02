const tg = window.Telegram.WebApp;
tg.expand(); 

// --- CONFIG ---
let balance = 1000;
const SYMBOL_WEIGHTS = { '🍒': 50, '🍋': 40, '🍇': 30, '🍊': 25, '🔔': 15, '7️⃣': 5, '💎': 2 };
const WILD_SYMBOL = '💎'; 
const SYMBOLS_KEYS = Object.keys(SYMBOL_WEIGHTS);
const PAYOUTS = { 3: 5, 4: 20, 5: 100 };

// --- UI ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
if (tg.initDataUnsafe?.user) usernameEl.innerText = tg.initDataUnsafe.user.first_name;

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = Math.floor(balance); // Цілі числа
    balanceEl.style.transform = 'scale(1.3)';
    balanceEl.style.color = amount >= 0 ? '#4ade80' : '#f87171';
    setTimeout(() => { balanceEl.style.transform = 'scale(1)'; balanceEl.style.color = '#ffd700'; }, 300);
}

function getRandomSymbol() {
    let totalWeight = 0;
    for (let sym in SYMBOL_WEIGHTS) totalWeight += SYMBOL_WEIGHTS[sym];
    let randomNum = Math.random() * totalWeight;
    for (let sym in SYMBOL_WEIGHTS) {
        if (randomNum < SYMBOL_WEIGHTS[sym]) return sym;
        randomNum -= SYMBOL_WEIGHTS[sym];
    }
    return '🍒';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.querySelectorAll('.status-text').forEach(e => e.innerText = '');
    
    if(screenId === 'screen-matrix') drawActiveLines();
    if(screenId === 'screen-mines') initMinesUI();
}

// ==============================
// GAME 1: CLASSIC SLOTS
// ==============================
function setSlotBet(amount) {
    document.getElementById('slot-bet-input').value = amount;
    tg.HapticFeedback.selectionChanged();
}
function spinSlots() {
    const bet = parseInt(document.getElementById('slot-bet-input').value);
    const msg = document.getElementById('slot-msg');
    if (balance < bet) { msg.innerText = "❌ НЕМАЄ КОШТІВ"; return; }

    updateBalance(-bet);
    msg.innerText = "КРУТИМО...";
    document.querySelectorAll('.reel').forEach(el => el.classList.remove('win-glow'));
    tg.HapticFeedback.impactOccurred('medium');

    const reels = [1, 2, 3, 4, 5];
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning');
        reel.dataset.interval = setInterval(() => { reel.querySelector('.reel-strip').innerText = getRandomSymbol(); }, 80);
    });

    let finalResult = [];
    reels.forEach((i, index) => {
        setTimeout(() => {
            const reel = document.getElementById(`reel${i}`);
            clearInterval(reel.dataset.interval);
            reel.classList.remove('is-spinning');
            const symbol = getRandomSymbol();
            reel.querySelector('.reel-strip').innerText = symbol;
            finalResult.push(symbol);
            tg.HapticFeedback.impactOccurred('light');
            if (index === 4) checkWinBothWays(finalResult, bet);
        }, 500 + (index * 350));
    });
}
function checkWinBothWays(result, bet) {
    const msg = document.getElementById('slot-msg');
    const leftWin = calculateMatch(result);
    const rightWin = calculateMatch([...result].reverse());
    let totalWin = 0;
    let winningReels = new Set(); 

    if (leftWin.count >= 3) {
        let mult = PAYOUTS[leftWin.count] || 0;
        if (['7️⃣', '💎'].includes(leftWin.symbol)) mult *= 2;
        totalWin += bet * mult;
        for(let i=1; i<=leftWin.count; i++) winningReels.add(i);
    }
    if (rightWin.count >= 3 && leftWin.count !== 5) {
        let mult = PAYOUTS[rightWin.count] || 0;
        if (['7️⃣', '💎'].includes(rightWin.symbol)) mult *= 2;
        totalWin += bet * mult;
        for(let i=0; i<rightWin.count; i++) winningReels.add(5 - i);
    }
    if (totalWin > 0) {
        updateBalance(totalWin);
        msg.innerHTML = `🎉 ВИГРАШ! <span style="color:#4ade80">+${totalWin}</span>`;
        tg.HapticFeedback.notificationOccurred('success');
        winningReels.forEach(idx => document.getElementById(`reel${idx}`).classList.add('win-glow'));
    } else { msg.innerText = "СПРОБУЙ ЩЕ РАЗ"; }
}
function calculateMatch(line) {
    let first = line[0], count = 1, effective = first;
    for (let i = 1; i < line.length; i++) {
        const current = line[i];
        if (current === effective || current === WILD_SYMBOL || effective === WILD_SYMBOL) {
            count++;
            if (effective === WILD_SYMBOL && current !== WILD_SYMBOL) effective = current;
        } else { break; }
    }
    return { count, symbol: effective };
}

// ==============================
// GAME 2: MEGA GRID
// ==============================
const PAYLINES = { 1: [0,0,0,0,0], 2: [1,1,1,1,1], 3: [2,2,2,2,2], 4: [0,1,2,1,0], 5: [0,1,2,2,2] };
const LINE_COLORS = { 1: '#ef4444', 2: '#a855f7', 3: '#3b82f6', 4: '#eab308', 5: '#22c55e' };
let activeLines = [1]; 

function toggleLine(id) {
    const btn = document.getElementById(`lbtn-${id}`);
    const idx = activeLines.indexOf(id);
    if (idx > -1) { if(activeLines.length>1) { activeLines.splice(idx, 1); btn.classList.remove('active'); } }
    else { activeLines.push(id); btn.classList.add('active'); }
    updateMatrixBetDisplay(); drawActiveLines();
}
function updateMatrixBetDisplay() {
    const bet = parseInt(document.getElementById('matrix-bet-input').value) || 0;
    document.getElementById('active-lines-count').innerText = activeLines.length;
    document.getElementById('total-matrix-bet').innerText = activeLines.length * bet;
}
function drawActiveLines() {
    const svg = document.getElementById('lines-svg');
    svg.innerHTML = '';
    const rowY = [16.6, 50, 83.3], colX = [10, 30, 50, 70, 90];
    activeLines.forEach(id => {
        let d = `M ${colX[0]},${rowY[PAYLINES[id][0]]}`;
        for(let i=1; i<5; i++) d += ` L ${colX[i]},${rowY[PAYLINES[id][i]]}`;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", d); p.setAttribute("stroke", LINE_COLORS[id]); p.setAttribute("class", "payline-path");
        svg.appendChild(p);
    });
}
function spinMatrix() {
    const betPerLine = parseInt(document.getElementById('matrix-bet-input').value) || 0;
    const totalBet = activeLines.length * betPerLine;
    const msg = document.getElementById('matrix-msg');
    if (balance < totalBet) { msg.innerText = "❌ НЕМАЄ КОШТІВ"; return; }
    
    updateBalance(-totalBet);
    msg.innerText = "КРУТИМО...";
    document.querySelectorAll('.sym').forEach(el => el.classList.remove('win-cell'));
    document.getElementById('lines-svg').style.opacity = '0.2';
    
    for(let r=0; r<3; r++) setTimeout(() => {
        for(let c=1; c<=5; c++) document.getElementById(`m-col${c}`).children[r].classList.add('row-spinning');
    }, r * 150);

    let res = [];
    for(let c=0; c<5; c++) {
        let col = []; for(let r=0; r<3; r++) col.push(getRandomSymbol());
        res.push(col);
    }
    for(let i=0; i<5; i++) setTimeout(() => {
        const colEl = document.getElementById(`m-col${i+1}`);
        for(let r=0; r<3; r++) {
            colEl.children[r].classList.remove('row-spinning');
            colEl.children[r].innerText = res[i][r];
        }
        tg.HapticFeedback.impactOccurred('light');
        if(i === 4) { document.getElementById('lines-svg').style.opacity = '1'; checkMatrixWin(res, betPerLine); }
    }, 1000 + (i * 200));
}
function checkMatrixWin(matrix, bet) {
    let total = 0, coords = [];
    activeLines.forEach(id => {
        let line = []; for(let c=0; c<5; c++) line.push(matrix[c][PAYLINES[id][c]]);
        const lWin = calculateMatch(line), rWin = calculateMatch([...line].reverse());
        let lW = 0;
        if(lWin.count >= 3) {
            let m = PAYOUTS[lWin.count]; if(['7️⃣','💎'].includes(lWin.symbol)) m*=3;
            lW += bet * m; for(let c=0; c<lWin.count; c++) coords.push({c:c, r:PAYLINES[id][c]});
        }
        if(rWin.count >= 3 && lWin.count !== 5) {
            let m = PAYOUTS[rWin.count]; if(['7️⃣','💎'].includes(rWin.symbol)) m*=3;
            lW += bet * m; for(let c=0; c<rWin.count; c++) coords.push({c:4-c, r:PAYLINES[id][4-c]});
        }
        total += lW;
    });
    if(total>0) {
        updateBalance(total);
        document.getElementById('matrix-msg').innerHTML = `🎉 ВИГРАШ! <span style="color:#4ade80">+${total}</span>`;
        tg.HapticFeedback.notificationOccurred('success');
        coords.forEach(p => document.getElementById(`m-col${p.c+1}`).children[p.r].classList.add('win-cell'));
    } else { document.getElementById('matrix-msg').innerText = "ПУСТО..."; }
}

// ==============================
// GAME 3: CYBER MINES
// ==============================
let minesActive = false;
let minesBet = 0;
let minesMap = []; // 0 = gem, 1 = bomb
let minesRevealed = 0;
let currentMultiplier = 1.0;

function initMinesUI() {
    const grid = document.getElementById('mines-grid');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.onclick = () => clickMine(i);
        cell.id = `mine-${i}`;
        grid.appendChild(cell);
    }
    document.getElementById('mines-controls-start').style.display = 'block';
    document.getElementById('mines-controls-cashout').style.display = 'none';
    minesActive = false;
}

function startMines() {
    const bet = parseInt(document.getElementById('mines-bet-input').value);
    if(balance < bet) { document.getElementById('mines-msg').innerText = "❌ НЕМАЄ КОШТІВ"; return; }
    
    updateBalance(-bet);
    minesBet = bet;
    minesActive = true;
    minesRevealed = 0;
    currentMultiplier = 1.0;
    
    // Генеруємо міни (3 міни, 22 діаманти)
    minesMap = Array(22).fill(0).concat(Array(3).fill(1));
    minesMap.sort(() => Math.random() - 0.5); // Перемішуємо

    // Скидаємо UI
    initMinesUI();
    document.getElementById('mines-controls-start').style.display = 'none';
    document.getElementById('mines-controls-cashout').style.display = 'block';
    updateMinesInfo();
    document.getElementById('mines-msg').innerText = "Відкривай клітинки...";
}

function clickMine(index) {
    if(!minesActive) return;
    const cell = document.getElementById(`mine-${index}`);
    if(cell.classList.contains('revealed')) return;

    cell.classList.add('revealed');
    
    if(minesMap[index] === 1) {
        // БОМБА
        cell.classList.add('bomb');
        cell.innerText = '💣';
        tg.HapticFeedback.notificationOccurred('error');
        gameOverMines(false);
    } else {
        // ДІАМАНТ
        cell.classList.add('gem');
        cell.innerText = '💎';
        tg.HapticFeedback.impactOccurred('medium');
        minesRevealed++;
        // Множник росте
        currentMultiplier *= 1.15; // +15% за кожен крок
        updateMinesInfo();
        
        if(minesRevealed === 22) gameOverMines(true); // Відкрив усе
    }
}

function updateMinesInfo() {
    const win = Math.floor(minesBet * currentMultiplier);
    document.getElementById('mines-current-mult').innerText = currentMultiplier.toFixed(2);
    document.getElementById('mines-cashout-val').innerText = win;
}

function cashoutMines() {
    if(!minesActive) return;
    const win = Math.floor(minesBet * currentMultiplier);
    updateBalance(win);
    document.getElementById('mines-msg').innerText = `💰 ЗАБРАВ: ${win}`;
    tg.HapticFeedback.notificationOccurred('success');
    gameOverMines(true);
}

function gameOverMines(win) {
    minesActive = false;
    document.getElementById('mines-controls-start').style.display = 'block';
    document.getElementById('mines-controls-cashout').style.display = 'none';
    
    // Показуємо всі міни
    minesMap.forEach((val, i) => {
        const cell = document.getElementById(`mine-${i}`);
        if(!cell.classList.contains('revealed')) {
            cell.classList.add('revealed');
            if(val === 1) { cell.innerText = '💣'; cell.style.opacity = '0.5'; }
            else { cell.innerText = '💎'; cell.style.opacity = '0.2'; }
        }
    });

    if(!win) document.getElementById('mines-msg').innerText = "💥 БАБАХ! СТАВКА ЗГОРІЛА";
}

function exitMines() {
    if(minesActive) {
        // Якщо виходить під час гри - автоматичний кешаут (або програш, як вирішиш. Тут кешаут для добра)
        cashoutMines(); 
    }
    showScreen('screen-lobby');
}

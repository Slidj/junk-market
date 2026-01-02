const tg = window.Telegram.WebApp;
tg.expand(); 

// --- CONFIG ---
let balance = 1000;

// СИМВОЛИ ТА ЇХ ВАГА (ШАНС ВИПАДІННЯ)
// Чим більше число, тим частіше падає.
const SYMBOL_WEIGHTS = {
    '🍒': 50,  // Дуже часто
    '🍋': 40,
    '🍇': 30,
    '🍊': 25,
    '🔔': 15,  // Середньо
    '7️⃣': 5,   // Рідко
    '💎': 2    // Дуже рідко (Wild)
};

const WILD_SYMBOL = '💎'; 
const SYMBOLS_KEYS = Object.keys(SYMBOL_WEIGHTS);

// Таблиця виплат (трохи підняв, бо виграти тепер важче)
const PAYOUTS = { 3: 5, 4: 20, 5: 100 };

// --- ГЕНЕРАТОР ЗВАЖЕНОГО ВИПАДКОВОГО ЧИСЛА ---
// Це серце "жадібності" автомату
function getRandomSymbol() {
    // 1. Рахуємо загальну вагу (сума всіх чисел)
    let totalWeight = 0;
    for (let sym in SYMBOL_WEIGHTS) {
        totalWeight += SYMBOL_WEIGHTS[sym];
    }

    // 2. Викидаємо випадкове число від 0 до totalWeight
    let randomNum = Math.random() * totalWeight;

    // 3. Знаходимо, якому символу воно належить
    for (let sym in SYMBOL_WEIGHTS) {
        if (randomNum < SYMBOL_WEIGHTS[sym]) {
            return sym;
        }
        randomNum -= SYMBOL_WEIGHTS[sym];
    }
    return '🍒'; // На всяк випадок
}


// --- UI ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
if (tg.initDataUnsafe?.user) usernameEl.innerText = tg.initDataUnsafe.user.first_name;

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    balanceEl.style.transform = 'scale(1.3)';
    balanceEl.style.color = amount >= 0 ? '#4ade80' : '#f87171';
    setTimeout(() => {
        balanceEl.style.transform = 'scale(1)';
        balanceEl.style.color = '#ffd700';
    }, 300);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.getElementById('slot-msg').innerText = '';
    document.getElementById('matrix-msg').innerText = '';
    
    if(screenId === 'screen-matrix') {
        drawActiveLines(); 
    }
}

// ==============================
// GAME 1: CLASSIC SLOTS
// ==============================
function setSlotBet(amount) {
    document.getElementById('slot-bet-input').value = amount;
    tg.HapticFeedback.selectionChanged();
}

function spinSlots() {
    const betInput = document.getElementById('slot-bet-input');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');
    
    if (balance < bet) {
        msg.innerText = "❌ НЕМАЄ КОШТІВ"; return;
    }

    updateBalance(-bet);
    msg.innerText = "УДАЧІ...";
    document.querySelectorAll('.reel').forEach(el => el.classList.remove('win-glow'));
    tg.HapticFeedback.impactOccurred('medium');

    const reels = [1, 2, 3, 4, 5];
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning');
        // Візуально крутимо (тут можна просто рандом, це лише ефект)
        reel.dataset.interval = setInterval(() => {
             reel.querySelector('.reel-strip').innerText = SYMBOLS_KEYS[Math.floor(Math.random() * SYMBOLS_KEYS.length)];
        }, 80);
    });

    let finalResult = [];
    reels.forEach((i, index) => {
        setTimeout(() => {
            const reel = document.getElementById(`reel${i}`);
            clearInterval(reel.dataset.interval);
            reel.classList.remove('is-spinning');
            
            // ВИКОРИСТОВУЄМО НОВИЙ ГЕНЕРАТОР
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
        winningReels.forEach(idx => {
            document.getElementById(`reel${idx}`).classList.add('win-glow');
        });
    } else {
        msg.innerText = "СПРОБУЙ ЩЕ РАЗ";
    }
}

// ==============================
// GAME 2: MEGA GRID (VISUAL LINES + MANUAL BET)
// ==============================

const PAYLINES = {
    1: [0, 0, 0, 0, 0], // TOP
    2: [1, 1, 1, 1, 1], // MID
    3: [2, 2, 2, 2, 2], // BOT
    4: [0, 1, 2, 1, 0], // ZIG
    5: [0, 1, 2, 2, 2]  // COMBO
};

const LINE_COLORS = { 1: '#ef4444', 2: '#a855f7', 3: '#3b82f6', 4: '#eab308', 5: '#22c55e' };

let activeLines = [1]; 

function toggleLine(lineId) {
    const btn = document.getElementById(`lbtn-${lineId}`);
    const index = activeLines.indexOf(lineId);
    if (index > -1) {
        if (activeLines.length > 1) {
            activeLines.splice(index, 1);
            btn.classList.remove('active');
        }
    } else {
        activeLines.push(lineId);
        btn.classList.add('active');
    }
    tg.HapticFeedback.selectionChanged();
    updateMatrixBetDisplay();
    drawActiveLines(); 
}

function updateMatrixBetDisplay() {
    const betInput = document.getElementById('matrix-bet-input');
    const betPerLine = parseInt(betInput.value) || 0;
    const totalBet = activeLines.length * betPerLine;
    
    document.getElementById('active-lines-count').innerText = activeLines.length;
    document.getElementById('total-matrix-bet').innerText = totalBet;
}

function drawActiveLines() {
    const svg = document.getElementById('lines-svg');
    svg.innerHTML = ''; 

    const rowY = [16.6, 50, 83.3];
    const colX = [10, 30, 50, 70, 90];

    activeLines.forEach(id => {
        const pattern = PAYLINES[id];
        let pathData = `M ${colX[0]},${rowY[pattern[0]]}`;
        for(let i=1; i<5; i++) {
            pathData += ` L ${colX[i]},${rowY[pattern[i]]}`;
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("stroke", LINE_COLORS[id]);
        path.setAttribute("class", "payline-path");
        svg.appendChild(path);
    });
}

function spinMatrix() {
    const betInput = document.getElementById('matrix-bet-input');
    const betPerLine = parseInt(betInput.value) || 0;
    const totalBet = activeLines.length * betPerLine;
    const msg = document.getElementById('matrix-msg');
    
    if (balance < totalBet) {
        msg.innerText = "❌ НЕМАЄ КОШТІВ"; return;
    }

    updateBalance(-totalBet);
    msg.innerText = "КРУТИМО...";
    document.querySelectorAll('.sym').forEach(el => el.classList.remove('win-cell'));
    document.getElementById('lines-svg').style.opacity = '0.2';
    
    tg.HapticFeedback.impactOccurred('medium');

    // Анімація спіну
    for(let r=0; r<3; r++) { 
        setTimeout(() => {
            for(let c=1; c<=5; c++) { 
                 const col = document.getElementById(`m-col${c}`);
                 const cell = col.children[r];
                 cell.classList.add('row-spinning');
            }
        }, r * 150); 
    }

    // Генерація результату з ВАГОЮ
    let resultMatrix = []; 
    for(let c=0; c<5; c++) {
        let col = [];
        // ВИКОРИСТОВУЄМО getRandomSymbol()
        for(let r=0; r<3; r++) col.push(getRandomSymbol());
        resultMatrix.push(col);
    }

    // Зупинка
    for(let i=0; i<5; i++) {
        setTimeout(() => {
            const colEl = document.getElementById(`m-col${i+1}`);
            for(let r=0; r<3; r++) {
                colEl.children[r].classList.remove('row-spinning');
                colEl.children[r].innerText = resultMatrix[i][r];
            }
            tg.HapticFeedback.impactOccurred('light');

            if(i === 4) {
                document.getElementById('lines-svg').style.opacity = '1';
                checkMatrixWin(resultMatrix, betPerLine);
            }
        }, 1000 + (i * 200));
    }
}

function checkMatrixWin(matrix, betPerLine) {
    let totalWin = 0;
    let winningCoords = []; 

    activeLines.forEach(lineId => {
        const pattern = PAYLINES[lineId];
        let lineSymbols = [];
        for(let col=0; col<5; col++) lineSymbols.push(matrix[col][pattern[col]]);

        const matchLeft = calculateMatch(lineSymbols);
        const matchRight = calculateMatch([...lineSymbols].reverse());
        let lineWin = 0;
        
        // Збільшив множники, бо виграти тепер важче
        if (matchLeft.count >= 3) {
            let mult = PAYOUTS[matchLeft.count] || 0;
            if (['7️⃣', '💎'].includes(matchLeft.symbol)) mult *= 3; // x3 за сімки
            lineWin += betPerLine * mult;
            for(let c=0; c<matchLeft.count; c++) winningCoords.push({c: c, r: pattern[c]});
        }
        
        if (matchRight.count >= 3 && matchLeft.count !== 5) {
            let mult = PAYOUTS[matchRight.count] || 0;
            if (['7️⃣', '💎'].includes(matchRight.symbol)) mult *= 3;
            lineWin += betPerLine * mult;
            for(let c=0; c<matchRight.count; c++) winningCoords.push({c: 4-c, r: pattern[4-c]});
        }
        totalWin += lineWin;
    });

    const msg = document.getElementById('matrix-msg');
    if (totalWin > 0) {
        updateBalance(totalWin);
        msg.innerHTML = `🎉 ВИГРАШ! <span style="color:#4ade80">+${totalWin}</span>`;
        tg.HapticFeedback.notificationOccurred('success');
        winningCoords.forEach(coord => {
            document.getElementById(`m-col${coord.c + 1}`).children[coord.r].classList.add('win-cell');
        });
    } else {
        msg.innerText = "ПУСТО...";
    }
}

function calculateMatch(line) {
    let first = line[0];
    let count = 1;
    let effective = first; 
    for (let i = 1; i < line.length; i++) {
        const current = line[i];
        if (current === effective || current === WILD_SYMBOL || effective === WILD_SYMBOL) {
            count++;
            if (effective === WILD_SYMBOL && current !== WILD_SYMBOL) effective = current;
        } else { break; }
    }
    return { count, symbol: effective };
}

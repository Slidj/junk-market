const tg = window.Telegram.WebApp;
tg.expand(); 

// --- НАЛАШТУВАННЯ ---
let balance = 1000;
const symbols = ['🍒', '🍋', '🍇', '🍊', '🔔', '7️⃣', '💎']; 
const WILD_SYMBOL = '💎'; 

const PAYOUTS = {
    3: 2,   
    4: 8,  
    5: 50   
};

// --- UI ЕЛЕМЕНТИ ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = tg.initDataUnsafe.user.first_name;
}

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
    
    // Очистка повідомлень
    document.getElementById('slot-msg').innerText = '';
    document.getElementById('matrix-msg').innerText = '';
    
    tg.HapticFeedback.selectionChanged();
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
        msg.innerText = "❌ НЕМАЄ КОШТІВ";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "УДАЧІ...";
    document.querySelectorAll('.reel').forEach(el => el.classList.remove('win-glow'));
    tg.HapticFeedback.impactOccurred('medium');

    const reels = [1, 2, 3, 4, 5];
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning');
        reel.dataset.interval = setInterval(() => {
             reel.querySelector('.reel-strip').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        }, 80);
    });

    let finalResult = [];
    reels.forEach((i, index) => {
        const delay = 500 + (index * 350); 
        setTimeout(() => {
            const reel = document.getElementById(`reel${i}`);
            clearInterval(reel.dataset.interval);
            reel.classList.remove('is-spinning');
            
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            reel.querySelector('.reel-strip').innerText = symbol;
            finalResult.push(symbol);
            
            tg.HapticFeedback.impactOccurred('light');

            if (index === 4) {
                checkWinBothWays(finalResult, bet);
            }
        }, delay);
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
// GAME 2: MEGA GRID (5x3)
// ==============================

// Лінії: 0=верх, 1=серед, 2=низ
const PAYLINES = {
    1: [0, 0, 0, 0, 0], // TOP
    2: [1, 1, 1, 1, 1], // MID
    3: [2, 2, 2, 2, 2], // BOT
    4: [0, 1, 2, 1, 0], // ZIG-ZAG
    5: [0, 1, 2, 2, 2]  // COMBO
};

let activeLines = [1]; 
let betPerLine = 10;   

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
}

function updateMatrixBetDisplay() {
    const totalBet = activeLines.length * betPerLine;
    document.getElementById('active-lines-count').innerText = activeLines.length;
    document.getElementById('total-matrix-bet').innerText = totalBet;
}

function spinMatrix() {
    const totalBet = activeLines.length * betPerLine;
    const msg = document.getElementById('matrix-msg');
    
    if (balance < totalBet) {
        msg.innerText = "❌ НЕМАЄ КОШТІВ";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-totalBet);
    msg.innerText = "КРУТИМО...";
    document.querySelectorAll('.sym').forEach(el => el.classList.remove('win-cell'));
    tg.HapticFeedback.impactOccurred('medium');

    for(let i=1; i<=5; i++) {
        document.getElementById(`m-col${i}`).classList.add('col-spinning');
    }

    // Генеруємо результат (5 колонок по 3 рядки)
    let resultMatrix = []; 
    for(let c=0; c<5; c++) {
        let col = [];
        for(let r=0; r<3; r++) {
            col.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        resultMatrix.push(col);
    }

    // Зупинка
    for(let i=0; i<5; i++) {
        setTimeout(() => {
            const colEl = document.getElementById(`m-col${i+1}`);
            colEl.classList.remove('col-spinning');
            
            const children = colEl.children;
            children[0].innerText = resultMatrix[i][0];
            children[1].innerText = resultMatrix[i][1];
            children[2].innerText = resultMatrix[i][2];
            
            tg.HapticFeedback.impactOccurred('light');

            if(i === 4) {
                checkMatrixWin(resultMatrix);
            }
        }, 500 + (i * 200));
    }
}

function checkMatrixWin(matrix) {
    let totalWin = 0;
    let winningCoords = []; 

    activeLines.forEach(lineId => {
        const pattern = PAYLINES[lineId];
        let lineSymbols = [];
        for(let col=0; col<5; col++) {
            const row = pattern[col];
            lineSymbols.push(matrix[col][row]);
        }

        const matchLeft = calculateMatch(lineSymbols);
        const matchRight = calculateMatch([...lineSymbols].reverse());
        
        let lineWin = 0;
        
        // Зліва
        if (matchLeft.count >= 3) {
            let mult = PAYOUTS[matchLeft.count] || 0;
            if (['7️⃣', '💎'].includes(matchLeft.symbol)) mult *= 2;
            lineWin += betPerLine * mult;
            for(let c=0; c<matchLeft.count; c++) winningCoords.push({c: c, r: pattern[c]});
        }
        
        // Справа
        if (matchRight.count >= 3 && matchLeft.count !== 5) {
            let mult = PAYOUTS[matchRight.count] || 0;
            if (['7️⃣', '💎'].includes(matchRight.symbol)) mult *= 2;
            lineWin += betPerLine * mult;
            for(let c=0; c<matchRight.count; c++) {
                let realCol = 4 - c;
                winningCoords.push({c: realCol, r: pattern[realCol]});
            }
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
        msg.innerText = "СПРОБУЙ ЩЕ...";
    }
}

// Хелпер для пошуку збігів
function calculateMatch(line) {
    let first = line[0];
    let count = 1;
    let effective = first; 
    for (let i = 1; i < line.length; i++) {
        const current = line[i];
        if (current === effective || current === WILD_SYMBOL || effective === WILD_SYMBOL) {
            count++;
            if (effective === WILD_SYMBOL && current !== WILD_SYMBOL) {
                effective = current;
            }
        } else {
            break; 
        }
    }
    return { count, symbol: effective };
}

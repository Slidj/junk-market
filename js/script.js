const tg = window.Telegram.WebApp;
tg.expand(); 

// --- НАЛАШТУВАННЯ ---
let balance = 1000;
const symbols = ['🍒', '🍋', '🍇', '🍊', '🔔', '7️⃣', '💎']; 
const WILD_SYMBOL = '💎'; 

// Коефіцієнти (зменшив трохи за 3, бо тепер виграшів буде вдвічі більше)
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

// --- БАЛАНС ---
function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    
    // Анімація
    balanceEl.style.transform = 'scale(1.3)';
    balanceEl.style.color = amount >= 0 ? '#4ade80' : '#f87171';
    setTimeout(() => {
        balanceEl.style.transform = 'scale(1)';
        balanceEl.style.color = '#ffd700';
    }, 300);
}

// --- НАВІГАЦІЯ ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    tg.HapticFeedback.selectionChanged();
}

// ==============================
// ЛОГІКА СЛОТІВ (WIN BOTH WAYS)
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
        msg.style.color = "#ff4444";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "УДАЧІ...";
    msg.style.color = "#888";
    
    // Очищення ефектів
    document.querySelectorAll('.reel').forEach(el => el.classList.remove('win-glow'));

    tg.HapticFeedback.impactOccurred('medium');

    // Анімація спіну
    const reels = [1, 2, 3, 4, 5];
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning');
        
        reel.dataset.interval = setInterval(() => {
             reel.querySelector('.reel-strip').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        }, 80);
    });

    // Зупинка
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

// --- ГОЛОВНА ЛОГІКА: РАХУЄМО ЗЛІВА І СПРАВА ---
function checkWinBothWays(result, bet) {
    const msg = document.getElementById('slot-msg');
    
    // 1. Рахуємо зліва направо (Normal)
    const leftWin = calculateMatch(result);
    
    // 2. Рахуємо справа наліво (Reverse)
    // [...result] створює копію, щоб не перевертати оригінал
    const rightWin = calculateMatch([...result].reverse());

    let totalWin = 0;
    let winningReels = new Set(); // Використовуємо Set, щоб індекси не дублювались

    // Обробка Лівого виграшу
    if (leftWin.count >= 3) {
        let mult = PAYOUTS[leftWin.count] || 0;
        if (['7️⃣', '💎'].includes(leftWin.symbol)) mult *= 2;
        totalWin += bet * mult;
        
        // Додаємо індекси барабанів (1, 2, 3...)
        for(let i=1; i<=leftWin.count; i++) winningReels.add(i);
    }

    // Обробка Правого виграшу
    // Важливо: Якщо 5 однакових, ми не хочемо платити двічі, якщо це не задумано.
    // Але для "кайфу" гравця нехай платить двічі (Left + Right), це буде Jackpot!
    if (rightWin.count >= 3) {
        // Якщо це 5 символів, ми вже порахували це зліва. 
        // Щоб не було x100, ігноруємо 5-ку справа, якщо зліва вже є 5-ка.
        if (leftWin.count !== 5) {
            let mult = PAYOUTS[rightWin.count] || 0;
            if (['7️⃣', '💎'].includes(rightWin.symbol)) mult *= 2;
            totalWin += bet * mult;

            // Додаємо індекси барабанів (рахуючи з кінця: 5, 4, 3...)
            for(let i=0; i<rightWin.count; i++) winningReels.add(5 - i);
        }
    }

    if (totalWin > 0) {
        updateBalance(totalWin);
        msg.innerHTML = `🎉 ВИГРАШ! <span style="color:#4ade80">+${totalWin}</span>`;
        msg.style.color = "#ffd700";
        tg.HapticFeedback.notificationOccurred('success');

        // Підсвічуємо всі виграшні барабани
        winningReels.forEach(idx => {
            document.getElementById(`reel${idx}`).classList.add('win-glow');
        });

    } else {
        msg.innerText = "СПРОБУЙ ЩЕ РАЗ";
        msg.style.color = "#555";
    }
}

// Допоміжна функція: рахує співпадіння в масиві з початку
function calculateMatch(line) {
    let first = line[0];
    let count = 1;
    let effective = first; // Ефективний символ (якщо перший Wild)

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

// ==============================
// ЛОГІКА РУЛЕТКИ (Без змін)
// ==============================

let currentRouletteBet = null;

function setRouletteBet(color) {
    currentRouletteBet = color;
    const target = document.getElementById('r-bet-target');
    target.innerText = color.toUpperCase();
    
    if(color === 'red') target.style.color = '#ef4444';
    if(color === 'black') target.style.color = '#9ca3af';
    if(color === 'green') target.style.color = '#22c55e';
    
    tg.HapticFeedback.selectionChanged();
}

function spinRoulette() {
    const bet = 50; 
    const msg = document.getElementById('roulette-msg');
    const wheel = document.getElementById('wheel');

    if (!currentRouletteBet) {
        msg.innerText = "ОБЕРІТЬ КОЛІР!"; 
        tg.HapticFeedback.notificationOccurred('warning');
        return;
    }
    if (balance < bet) {
        msg.innerText = "НЕМАЄ КОШТІВ"; 
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "КРУТИМО...";
    
    const randomRot = 1800 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${randomRot}deg)`;

    setTimeout(() => {
        const rand = Math.random();
        let resultColor = 'black'; 
        if (rand < 0.05) resultColor = 'green'; 
        else if (rand < 0.52) resultColor = 'red'; 

        if (resultColor === currentRouletteBet) {
            const mult = resultColor === 'green' ? 14 : 2;
            const win = bet * mult;
            updateBalance(win);
            msg.innerHTML = `ВИПАЛО ${resultColor.toUpperCase()}! <span style="color:#4ade80">+${win}</span>`;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            msg.innerText = `ВИПАЛО ${resultColor.toUpperCase()}. ПРОГРАШ.`;
            tg.HapticFeedback.impactOccurred('heavy');
        }
        
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            setTimeout(() => wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)', 50);
        }, 2000);

    }, 4000);
}

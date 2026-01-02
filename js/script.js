const tg = window.Telegram.WebApp;
tg.expand(); 

// --- НАЛАШТУВАННЯ ---
let balance = 1000;
const symbols = ['🍒', '🍋', '🍇', '🍊', '🔔', '7️⃣', '💎']; 
const WILD_SYMBOL = '💎'; // Символ, який замінює всі інші

// Коефіцієнти виграшу (за 3, 4 та 5 символів)
const PAYOUTS = {
    3: 2,   // x2 за 3 символи
    4: 10,  // x10 за 4 символи
    5: 50   // x50 за 5 символів
};

// --- UI ЕЛЕМЕНТИ ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');

// Підтягуємо ім'я з Телеграм
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = tg.initDataUnsafe.user.first_name;
}

// --- ФУНКЦІЇ БАЛАНСУ ---
function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    
    // Анімація зміни балансу
    balanceEl.style.transform = 'scale(1.3)';
    balanceEl.style.color = amount >= 0 ? '#4ade80' : '#f87171'; // Зелений або червоний
    
    setTimeout(() => {
        balanceEl.style.transform = 'scale(1)';
        balanceEl.style.color = '#ffd700'; // Повертаємо золотий
    }, 300);
}

// --- НАВІГАЦІЯ ---
function showScreen(screenId) {
    // Ховаємо всі екрани
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Показуємо потрібний
    document.getElementById(screenId).classList.add('active');
    
    // Скидаємо повідомлення
    document.getElementById('slot-msg').innerText = '';
    document.getElementById('roulette-msg').innerText = '';
    
    tg.HapticFeedback.selectionChanged();
}

// ==============================
// ЛОГІКА СЛОТІВ
// ==============================

function setSlotBet(amount) {
    document.getElementById('slot-bet-input').value = amount;
    tg.HapticFeedback.selectionChanged();
}

function spinSlots() {
    const betInput = document.getElementById('slot-bet-input');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');
    const reels = [1, 2, 3, 4, 5]; // Індекси барабанів
    
    // 1. Перевірка балансу
    if (balance < bet) {
        msg.innerText = "❌ НЕМАЄ КОШТІВ";
        msg.style.color = "#ff4444";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    // 2. Списання ставки
    updateBalance(-bet);
    msg.innerText = "УДАЧІ...";
    msg.style.color = "#aaa";
    
    // Очищаємо попередні ефекти перемоги
    document.querySelectorAll('.reel').forEach(el => el.classList.remove('win-glow'));

    tg.HapticFeedback.impactOccurred('medium');

    // 3. Запуск анімації (крутимо)
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning');
        
        // Швидка зміна символів для візуального ефекту
        reel.dataset.interval = setInterval(() => {
             reel.querySelector('.reel-strip').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        }, 80);
    });

    // 4. Зупинка барабанів та генерація результату
    let finalResult = [];
    
    reels.forEach((i, index) => {
        // Кожен наступний барабан зупиняється пізніше (ефект хвилі)
        const delay = 500 + (index * 400); 
        
        setTimeout(() => {
            const reel = document.getElementById(`reel${i}`);
            clearInterval(reel.dataset.interval); // Стоп мерехтінню
            reel.classList.remove('is-spinning'); // Стоп анімації блюру
            
            // === ГЕНЕРАЦІЯ СИМВОЛУ ===
            // Тут ми визначаємо, що випало на цьому барабані
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            reel.querySelector('.reel-strip').innerText = symbol;
            finalResult.push(symbol);
            
            tg.HapticFeedback.impactOccurred('light'); // Стукіт

            // Якщо це останній барабан, перевіряємо виграш
            if (index === 4) {
                checkWin(finalResult, bet);
            }
        }, delay);
    });
}

function checkWin(result, bet) {
    const msg = document.getElementById('slot-msg');
    
    // Логіка: Шукаємо збіги зліва направо
    // Wild (💎) замінює будь-який символ
    
    let firstSymbol = result[0];
    let matchCount = 1;
    let effectiveSymbol = firstSymbol; // Символ, який ми намагаємось зібрати

    // Якщо перший символ Wild, то "ефективний" символ визначиться пізніше
    // Наприклад: [💎, 🍒, ...] -> Ефективний стає 🍒
    
    for (let i = 1; i < result.length; i++) {
        const current = result[i];
        
        if (current === effectiveSymbol || current === WILD_SYMBOL || effectiveSymbol === WILD_SYMBOL) {
            matchCount++;
            
            // Якщо ми "сиділи" на Wild, а тепер випав звичайний символ, фіксуємо його
            if (effectiveSymbol === WILD_SYMBOL && current !== WILD_SYMBOL) {
                effectiveSymbol = current;
            }
        } else {
            break; // Ланцюжок перервався
        }
    }

    // Розрахунок виграшу
    if (matchCount >= 3) {
        let multiplier = PAYOUTS[matchCount];
        
        // Бонус: Якщо символ - 7️⃣ або 💎, множник подвоюється
        if (effectiveSymbol === '7️⃣' || effectiveSymbol === '💎') {
            multiplier *= 2;
        }

        const winAmount = bet * multiplier;
        updateBalance(winAmount);
        
        msg.innerHTML = `🎉 ВИГРАШ! x${multiplier} <span style="color:#4ade80">+${winAmount}</span>`;
        msg.style.color = "#ffd700";
        tg.HapticFeedback.notificationOccurred('success');

        // Підсвічуємо виграшні барабани
        for(let i=1; i<=matchCount; i++) {
            document.getElementById(`reel${i}`).classList.add('win-glow');
        }

    } else {
        msg.innerText = "СПРОБУЙ ЩЕ РАЗ";
        msg.style.color = "#555";
    }
}

// ==============================
// ЛОГІКА РУЛЕТКИ
// ==============================

let currentRouletteBet = null;

function setRouletteBet(color) {
    currentRouletteBet = color;
    const target = document.getElementById('r-bet-target');
    target.innerText = color.toUpperCase();
    
    // Фарбуємо текст вибору
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
        msg.style.color = "orange";
        tg.HapticFeedback.notificationOccurred('warning');
        return;
    }
    if (balance < bet) {
        msg.innerText = "НЕМАЄ КОШТІВ"; 
        msg.style.color = "red";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "КРУТИМО...";
    msg.style.color = "#aaa";
    
    // Випадковий кут (мінімум 5 обертів)
    const randomRot = 1800 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${randomRot}deg)`;

    setTimeout(() => {
        // Логіка визначення кольору (імітація шансів)
        const rand = Math.random();
        let resultColor = 'black'; // ~47.5%
        if (rand < 0.05) resultColor = 'green'; // 5%
        else if (rand < 0.52) resultColor = 'red'; // ~47.5%

        // Перевірка перемоги
        if (resultColor === currentRouletteBet) {
            const mult = resultColor === 'green' ? 14 : 2;
            const win = bet * mult;
            updateBalance(win);
            msg.innerHTML = `ВИПАЛО ${resultColor.toUpperCase()}! <span style="color:#4ade80">+${win}</span>`;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            msg.innerText = `ВИПАЛО ${resultColor.toUpperCase()}. ПРОГРАШ.`;
            msg.style.color = "#ff4444";
            tg.HapticFeedback.impactOccurred('heavy');
        }
        
        // Скидання колеса без анімації (щоб можна було крутити знову)
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            // Відновлюємо анімацію через мить
            setTimeout(() => wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)', 50);
        }, 2000);

    }, 4000);
}

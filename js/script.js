const tg = window.Telegram.WebApp;
tg.expand(); 

// --- Config ---
let balance = 1000;
const reelCount = 5;
// Символи: Wild=💎, High=7️⃣/🔔, Low=Фрукти
const symbols = ['🍒', '🍋', '🍇', '🍊', '🔔', '7️⃣', '💎']; 
const WILD = '💎';

// --- UI Elements ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
if (tg.initDataUnsafe?.user) usernameEl.innerText = tg.initDataUnsafe.user.first_name;

// --- Helper Functions ---
function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    
    // Анімація балансу
    const color = amount >= 0 ? '#00d4ff' : '#ff007f';
    balanceEl.style.color = color;
    balanceEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
        balanceEl.style.color = '#ffd700';
        balanceEl.style.transform = 'scale(1)';
    }, 300);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    tg.HapticFeedback.selectionChanged();
}

// --- SLOTS LOGIC (5 REELS) ---
function setSlotBet(amount) {
    document.getElementById('slot-bet-input').value = amount;
}

function spinSlots() {
    const betInput = document.getElementById('slot-bet-input');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');
    
    if (balance < bet) {
        msg.innerText = "❌ Недостатньо коштів!";
        msg.style.color = 'red';
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "Удачі...";
    msg.style.color = 'white';
    tg.HapticFeedback.impactOccurred('medium');

    // Очистити попередні ефекти виграшу
    document.querySelectorAll('.reel-strip').forEach(el => el.classList.remove('win-pulse'));

    // Запуск анімації
    const reels = [];
    for(let i=1; i<=reelCount; i++) {
        const el = document.getElementById(`reel${i}`);
        el.classList.add('blur-anim');
        reels.push(el);
    }

    // Зупинка барабанів по черзі
    let completedReels = 0;
    const finalSymbols = [];

    reels.forEach((el, index) => {
        const delay = 500 + (index * 200); // Кожен наступний зупиняється пізніше
        setTimeout(() => {
            el.classList.remove('blur-anim');
            const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
            el.innerText = randomSym;
            finalSymbols.push(randomSym);
            
            tg.HapticFeedback.impactOccurred('light'); // Тік при зупинці

            completedReels++;
            if (completedReels === reelCount) {
                checkWin(finalSymbols, bet);
            }
        }, delay);
    });
}

function checkWin(resultArray, bet) {
    // Логіка: Перевіряємо зліва направо підряд
    // Wild (💎) замінює будь-що.
    
    const firstSym = resultArray[0];
    let matchCount = 1;
    let currentSymbol = firstSym; // Символ, який ми трекаємо (може змінитись якщо перший був Wild)

    for (let i = 1; i < resultArray.length; i++) {
        const sym = resultArray[i];
        
        if (currentSymbol === WILD && sym !== WILD) {
            // Якщо ми почали з Wild, то перший нормальний символ стає нашим таргетом
            currentSymbol = sym;
            matchCount++;
        } else if (sym === currentSymbol || sym === WILD) {
            matchCount++;
        } else {
            break; // Ланцюжок перервано
        }
    }

    const msg = document.getElementById('slot-msg');
    
    if (matchCount >= 3) {
        let multiplier = 0;
        // Проста таблиця виплат
        if (matchCount === 3) multiplier = 2;
        if (matchCount === 4) multiplier = 5;
        if (matchCount === 5) multiplier = 20; // Джекпот
        
        // Бонус за круті символи
        if (currentSymbol === '7️⃣') multiplier *= 2;
        if (currentSymbol === '💎') multiplier *= 5; // Чистий джекпот з діамантів

        const win = bet * multiplier;
        updateBalance(win);
        
        msg.innerHTML = `🎉 ВИГРАШ x${multiplier}! <span style="color:#00ff00">+${win}</span>`;
        tg.HapticFeedback.notificationOccurred('success');
        
        // Підсвітити виграшні барабани
        for(let i=1; i<=matchCount; i++) {
            document.getElementById(`reel${i}`).classList.add('win-pulse');
        }
    } else {
        msg.innerText = "Спробуй ще...";
        msg.style.color = '#aaa';
    }
}

// --- ROULETTE LOGIC ---
let currentRouletteBet = null;

function setRouletteBet(color) {
    currentRouletteBet = color;
    document.getElementById('r-bet-target').innerText = color.toUpperCase();
    document.getElementById('r-bet-target').className = color; // для стилю
    tg.HapticFeedback.selectionChanged();
}

function spinRoulette() {
    const bet = 50; 
    const msg = document.getElementById('roulette-msg');
    const wheel = document.getElementById('wheel');

    if (!currentRouletteBet) {
        msg.innerText = "Оберіть колір!"; return;
    }
    if (balance < bet) {
        msg.innerText = "Мало монет!"; return;
    }

    updateBalance(-bet);
    msg.innerText = "";
    
    // Крутимо
    const randomRot = 1800 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${randomRot}deg)`;

    setTimeout(() => {
        // Визначаємо результат
        const rand = Math.random();
        let color = 'black';
        if (rand < 0.05) color = 'green';
        else if (rand < 0.52) color = 'red';

        if (color === currentRouletteBet) {
            const mult = color === 'green' ? 14 : 2;
            const win = bet * mult;
            updateBalance(win);
            msg.innerText = `WIN ${color.toUpperCase()}! +${win}`;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            msg.innerText = `Випало ${color.toUpperCase()}`;
            tg.HapticFeedback.notificationOccurred('warning');
        }
        
        // Скидання без анімації
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            setTimeout(() => wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)', 50);
        }, 2000);

    }, 4000);
}

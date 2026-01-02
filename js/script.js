const tg = window.Telegram.WebApp;
tg.expand(); 

// --- Стан гри ---
let balance = 1000;
let currentBetRoulette = null;
const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];

// --- Елементи DOM ---
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');

// Ім'я користувача
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = tg.initDataUnsafe.user.first_name;
}

// --- Навігація ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // Очищення повідомлень при переході
    document.getElementById('slot-msg').innerText = '';
    document.getElementById('roulette-msg').innerText = '';
    
    // Кнопка 'Назад' в Telegram інтерфейсі
    if (screenId === 'screen-lobby') {
        tg.BackButton.hide();
    } else {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            showScreen('screen-lobby');
            tg.BackButton.hide();
        });
    }
}

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    balanceEl.style.color = amount >= 0 ? '#4ade80' : '#f87171';
    setTimeout(() => balanceEl.style.color = '#fbbf24', 500);
}

// --- ГРА 1: СЛОТИ ---
function spinSlots() {
    const betInput = document.getElementById('slot-bet');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');

    if (bet > balance) {
        msg.innerText = "❌ Недостатньо монет!";
        return;
    }

    updateBalance(-bet);
    msg.innerText = "Крутимо...";

    let spins = 0;
    const interval = setInterval(() => {
        document.getElementById('reel1').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('reel2').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('reel3').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        spins++;
        if (spins > 10) {
            clearInterval(interval);
            finalizeSlots(bet);
        }
    }, 100);
}

function finalizeSlots(bet) {
    const r1 = symbols[Math.floor(Math.random() * symbols.length)];
    const r2 = symbols[Math.floor(Math.random() * symbols.length)];
    const r3 = symbols[Math.floor(Math.random() * symbols.length)];

    document.getElementById('reel1').innerText = r1;
    document.getElementById('reel2').innerText = r2;
    document.getElementById('reel3').innerText = r3;

    const msg = document.getElementById('slot-msg');

    if (r1 === r2 && r2 === r3) {
        const win = bet * 10;
        updateBalance(win);
        msg.innerText = `🎰 ДЖЕКПОТ! Виграш: ${win}`;
        tg.HapticFeedback.notificationOccurred('success');
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        const win = bet * 2;
        updateBalance(win);
        msg.innerText = `🔥 Пара! Виграш: ${win}`;
        tg.HapticFeedback.impactOccurred('medium');
    } else {
        msg.innerText = "Спробуй ще раз...";
    }
}

// --- ГРА 2: РУЛЕТКА ---
function setRouletteBet(color) {
    currentBetRoulette = color;
    document.getElementById('current-bet-color').innerText = color.toUpperCase();
}

function spinRoulette() {
    const bet = 50; 
    const msg = document.getElementById('roulette-msg');
    const wheel = document.getElementById('wheel');

    if (!currentBetRoulette) {
        msg.innerText = "⚠️ Оберіть колір!";
        return;
    }
    if (balance < bet) {
        msg.innerText = "❌ Немає грошей";
        return;
    }

    updateBalance(-bet);
    
    // Анімація
    const randomDeg = Math.floor(1080 + Math.random() * 360); 
    wheel.style.transform = `rotate(${randomDeg}deg)`;

    setTimeout(() => {
        const outcome = Math.random();
        let resultColor = 'black';
        if (outcome < 0.05) resultColor = 'green'; 
        else if (outcome < 0.52) resultColor = 'red'; 
        
        if (resultColor === currentBetRoulette) {
            let multiplier = resultColor === 'green' ? 14 : 2;
            let win = bet * multiplier;
            updateBalance(win);
            msg.innerText = `🎉 ${resultColor.toUpperCase()}! Виграш: ${win}`;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            msg.innerText = `Випало ${resultColor.toUpperCase()}. Програш.`;
            tg.HapticFeedback.impactOccurred('light');
        }
        
        // Скидання колеса
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            setTimeout(() => wheel.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)', 50);
        }, 2000);

    }, 3000);
}

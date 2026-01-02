const tg = window.Telegram.WebApp;
tg.expand(); 

let balance = 1000;
let currentBetRoulette = null;
const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣'];

const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = tg.initDataUnsafe.user.first_name;
}

// --- Навігація ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // Скидання UI
    document.getElementById('slot-msg').className = 'message';
    document.getElementById('slot-msg').innerText = '';
    document.getElementById('roulette-msg').innerText = '';
    
    if (screenId !== 'screen-lobby') {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            showScreen('screen-lobby');
            tg.BackButton.hide();
        });
    } else {
        tg.BackButton.hide();
    }
}

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
    
    // Ефект пульсації балансу
    balanceEl.style.transform = "scale(1.3)";
    balanceEl.style.color = amount >= 0 ? '#00ff88' : '#ff4444';
    setTimeout(() => {
        balanceEl.style.transform = "scale(1)";
        balanceEl.style.color = '#ffd700';
    }, 300);
}

// --- СЛОТИ ---
function spinSlots() {
    const betInput = document.getElementById('slot-bet');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');
    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];

    if (bet > balance) {
        msg.innerText = "❌ Недостатньо монет!";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "";
    
    // Додаємо ефект розмиття
    reels.forEach(r => r.classList.add('blur'));
    tg.HapticFeedback.impactOccurred('medium');

    // Імітація швидкої зміни символів
    let spins = 0;
    const interval = setInterval(() => {
        reels.forEach(r => r.innerText = symbols[Math.floor(Math.random() * symbols.length)]);
        spins++;
        if (spins > 15) { // Крутимо трохи довше
            clearInterval(interval);
            reels.forEach(r => r.classList.remove('blur'));
            finalizeSlots(bet);
        }
    }, 80);
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
        msg.innerHTML = `🎰 <span class="win-anim">ДЖЕКПОТ! +${win}</span>`;
        tg.HapticFeedback.notificationOccurred('success');
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        const win = bet * 2;
        updateBalance(win);
        msg.innerText = `🔥 Пара! +${win}`;
        tg.HapticFeedback.impactOccurred('light');
    } else {
        msg.innerText = "Пусто...";
    }
}

// --- РУЛЕТКА ---
function setRouletteBet(color) {
    currentBetRoulette = color;
    document.getElementById('current-bet-color').innerText = color.toUpperCase();
    
    // Візуальне виділення кнопок
    document.querySelectorAll('.bet-color').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.bet-color.${color}`).classList.add('selected');
    tg.HapticFeedback.selectionChanged();
}

function spinRoulette() {
    const bet = 50; 
    const msg = document.getElementById('roulette-msg');
    const wheel = document.getElementById('wheel');

    if (!currentBetRoulette) {
        msg.innerText = "⚠️ Оберіть колір!";
        tg.HapticFeedback.notificationOccurred('warning');
        return;
    }
    if (balance < bet) {
        msg.innerText = "❌ Немає грошей";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "Крутимо...";
    
    // Розрахунок кута: мінімум 5 обертів (1800deg) + випадковий сектор
    // Оскільки ми не робимо точну фізику, робимо візуальний трюк
    const extraSpins = 360 * 5; 
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = extraSpins + randomAngle;

    wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)'; // Плавне гальмування
    wheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        // Логіка результату (рандом)
        const outcome = Math.random();
        let resultColor = 'black';
        if (outcome < 0.05) resultColor = 'green'; 
        else if (outcome < 0.52) resultColor = 'red'; 
        
        if (resultColor === currentBetRoulette) {
            let multiplier = resultColor === 'green' ? 14 : 2;
            let win = bet * multiplier;
            updateBalance(win);
            msg.innerHTML = `🎉 <span class="win-anim">ВИПАЛО ${resultColor.toUpperCase()}! +${win}</span>`;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            msg.innerText = `Випало ${resultColor.toUpperCase()}. Програш.`;
            tg.HapticFeedback.impactOccurred('heavy');
        }
        
        // Скидання колеса для наступного разу (хитрий трюк, щоб не крутити назад)
        setTimeout(() => {
            wheel.style.transition = 'none';
            // Ми лишаємо колесо повернутим, просто додаємо до поточного значення наступного разу
            // Або скидаємо:
            const actualAngle = totalRotation % 360;
            wheel.style.transform = `rotate(${actualAngle}deg)`;
        }, 2000);

    }, 4000); // Чекаємо 4 секунди поки анімація закінчиться
}

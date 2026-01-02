const tg = window.Telegram.WebApp;
tg.expand(); 

let balance = 1000;
const symbols = ['🍒', '🍋', '🍇', '🍊', '🔔', '7️⃣', '💎']; 

const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');

if (tg.initDataUnsafe?.user) {
    usernameEl.innerText = tg.initDataUnsafe.user.first_name;
}

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    tg.HapticFeedback.selectionChanged();
}

// --- СЛОТИ ---
function setSlotBet(amount) {
    document.getElementById('slot-bet-input').value = amount;
    tg.HapticFeedback.selectionChanged();
}

function spinSlots() {
    const betInput = document.getElementById('slot-bet-input');
    const bet = parseInt(betInput.value);
    const msg = document.getElementById('slot-msg');
    
    if (balance < bet) {
        msg.innerText = "❌ Недостатньо коштів";
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    updateBalance(-bet);
    msg.innerText = "";
    
    // 1. Починаємо анімацію
    const reels = [1, 2, 3, 4, 5];
    reels.forEach(i => {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('is-spinning'); // Додаємо клас розмиття та руху
        // Під час спіну міняємо символи дуже швидко для ефекту мерехтіння
        reel.dataset.interval = setInterval(() => {
             reel.querySelector('.reel-strip').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        }, 100);
    });

    tg.HapticFeedback.impactOccurred('medium');

    // 2. Зупиняємо барабани по черзі
    let finalResult = [];
    
    reels.forEach((i, index) => {
        const delay = 600 + (index * 300); // Кожен наступний крутиться довше
        
        setTimeout(() => {
            const reel = document.getElementById(`reel${i}`);
            clearInterval(reel.dataset.interval); // Зупиняємо мерехтіння
            reel.classList.remove('is-spinning'); // Прибираємо блюр
            
            // Ставимо фінальний символ
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            reel.querySelector('.reel-strip').innerText = symbol;
            finalResult.push(symbol);
            
            // Звук "тук" при зупинці
            tg.HapticFeedback.impactOccurred('light'); 

            // Якщо це останній барабан - перевіряємо виграш
            if (index === 4) {
                checkWin(finalResult, bet);
            }
        }, delay);
    });
}

function checkWin(result, bet) {
    // Проста логіка: 3+ однакові символи підряд або є Wild (💎)
    // Тут можна додати складнішу математику
    
    // Для прикладу:
    const msg = document.getElementById('slot-msg');
    // ... логіка виграшу ...
    // Тимчасово просто рандомне повідомлення для тесту
    msg.innerText = "Спін завершено!";
}

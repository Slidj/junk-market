const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#141218');

// --- Profile ---
const userAvatarEl = document.getElementById('user-avatar');
const avatarPlaceholderEl = document.getElementById('avatar-placeholder');
const user = tg.initDataUnsafe.user;
if (user) {
    if (user.photo_url) {
        userAvatarEl.src = user.photo_url;
        userAvatarEl.style.display = 'block';
        avatarPlaceholderEl.style.display = 'none';
    } else {
        userAvatarEl.style.display = 'none';
        avatarPlaceholderEl.style.display = 'flex';
        avatarPlaceholderEl.innerText = user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';
    }
}

// --- Cart Logic ---
let cartCount = 0;
const cartBadge = document.getElementById('cart-badge');
const cartNavItem = document.getElementById('cart-nav-item');

function animateFly(startElementId) {
    const productImg = document.getElementById(startElementId);
    const cartTarget = cartNavItem.querySelector('.nav-icon-container');

    if (!productImg || !cartTarget) return;

    const flyImg = productImg.cloneNode();
    flyImg.classList.add('fly-item');
    
    const startRect = productImg.getBoundingClientRect();
    const endRect = cartTarget.getBoundingClientRect();

    flyImg.style.top = startRect.top + "px";
    flyImg.style.left = startRect.left + "px";
    flyImg.style.width = startRect.width + "px";
    flyImg.style.height = startRect.height + "px";

    document.body.appendChild(flyImg);

    setTimeout(() => {
        flyImg.style.top = (endRect.top + 10) + "px";
        flyImg.style.left = (endRect.left + 20) + "px";
        flyImg.style.width = "20px";
        flyImg.style.height = "20px";
        flyImg.style.opacity = "0.5";
    }, 50);

    setTimeout(() => {
        flyImg.remove();
        cartCount++;
        updateCartUI();
        cartBadge.classList.add('badge-pop');
        setTimeout(() => cartBadge.classList.remove('badge-pop'), 200);
        tg.HapticFeedback.impactOccurred('heavy');
    }, 800);
}

function updateCartUI() {
    if (cartCount > 0) {
        cartBadge.style.display = 'flex';
        cartBadge.innerText = cartCount;
    } else {
        cartBadge.style.display = 'none';
    }
}

function addToCart(event, imgId) {
    event.stopPropagation();
    animateFly(imgId);
}

function addToCartDirect() {
    cartCount++;
    updateCartUI();
    closeProduct();
    tg.HapticFeedback.impactOccurred('medium');
}

// --- Bottom Sheet ---
function openProduct(title, price, brand, img, desc) {
    document.getElementById('sheet-title').innerText = title;
    document.getElementById('sheet-price').innerText = price.toLocaleString() + " *";
    document.getElementById('sheet-img').src = img;
    document.getElementById('sheet-desc').innerText = desc;
    document.body.classList.add('sheet-active');
}
function closeProduct() { document.body.classList.remove('sheet-active'); }

// --- Tab Switching ---
function switchTab(clickedTab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    clickedTab.classList.add('active');
    tg.HapticFeedback.selectionChanged();
}

// --- Category Logic (НОВЕ) ---
function selectCategory(element) {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    element.classList.add('active');
    tg.HapticFeedback.selectionChanged();
    
    // Плавна прокрутка до центру
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
    });
}

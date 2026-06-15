const tg = window.Telegram.WebApp;
tg.expand();

const API_URL = "https://api.filartapp.ru";

let selectedDate = null;
let currentDate = new Date();
let availability = {};
let profiles = {};
let currentProfileId = 1;
let userId = null;
let gridEl, prevBtn, nextBtn;

// 🔥 ВМЕСТО СТРОКИ — СТРУКТУРА
let castingContact = null;

document.addEventListener("DOMContentLoaded", init);

function normalizeContact(value) {
    if (!value) return null;

    value = value.trim();

    // 1. EMAIL — самый приоритетный и строгий
    const emailRegex =
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (emailRegex.test(value)) {
        return { type: "email", value };
    }

    // 2. TELEGRAM username
    if (value.startsWith("@")) {
        return { type: "username", value: value.slice(1) };
    }

    // 3. PHONE
    if (value.startsWith("+")) {
        return { type: "phone", value };
    }

    return { type: "username", value };
}

async function init() {

    const params = new URLSearchParams(window.location.search);
    castingContact = normalizeContact(params.get("contact"));

    gridEl = document.getElementById('calendar-grid');
    prevBtn = document.getElementById('prevMonth');
    nextBtn = document.getElementById('nextMonth');

    const initData = tg.initDataUnsafe;

    if (initData?.user) {
        userId = initData.user.id;

        try {
            await fetchAvailability();
            await fetchProfiles();
        } catch (e) {
            console.error(e);
        }
    }

    renderCalendar();
    bindButtons();
    bindSwipe();
    bindAutosave();
    updateChatButton();

    document.getElementById("sheetBackdrop").onclick = closeSheet;
}

/* ---------------- CHAT ---------------- */

function openCastingChat() {

    if (!castingContact?.value) {
        tg.showAlert("Нет контакта");
        return;
    }

    const v = castingContact.value;

    if (castingContact.type === "email") {
        tg.openLink(`mailto:${v}`, "_blank");
    
        setTimeout(() => {
            tg.close();
        }, 500);
    
        return;
    }

    if (castingContact.type === "username") {
        tg.openTelegramLink(`https://t.me/${v}`);
    } else if (castingContact.type === "phone") {
        tg.openTelegramLink(`https://t.me/+${v}`);
    } else {
        tg.openTelegramLink(`https://t.me/${v}`);
    }

    tg.close();
}

function updateChatButton() {
    const btn = document.getElementById("openChatBtn");
    if (!btn) return;

    if (!castingContact?.value) {
        btn.style.display = "none";
        return;
    }

    btn.style.display = "block";
    btn.innerText = "✈️ Отправить";
}

/* ---------------- CALENDAR UI ---------------- */

function bindButtons() {

    prevBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    };

    nextBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    };
}

function bindSwipe() {

    let startX = 0;
    const container = document.getElementById("calendar-container");

    container.addEventListener("touchstart", e => {
        startX = e.changedTouches[0].clientX;
    });

    container.addEventListener("touchend", e => {

        const diff = e.changedTouches[0].clientX - startX;

        if (Math.abs(diff) < 50) return;

        currentDate.setMonth(
            currentDate.getMonth() + (diff > 0 ? -1 : 1)
        );

        renderCalendar();
    });
}

function bindAutosave() {

    document.getElementById("statusSelect")
        .addEventListener("change", saveCurrentDay);

    document.getElementById("noteInput")
        .addEventListener("input", debounce(saveCurrentDay, 500));
}

function debounce(fn, delay) {

    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/* ---------------- DATE ---------------- */

function normalizeKey(key) {

    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return key;
    }

    const m = key.match(/(\d{1,2})\.(\d{1,2})/);

    if (m) {
        const day = m[1].padStart(2,'0');
        const month = m[2].padStart(2,'0');
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
    }

    return key;
}

/* ---------------- API ---------------- */

async function fetchAvailability() {

    const response = await fetch(`${API_URL}/api/availability/${userId}`);

    if (!response.ok) return;

    const raw = await response.json();

    availability = {};

    for (const [key, value] of Object.entries(raw)) {
        availability[normalizeKey(key)] = value;
    }
}

async function syncAvailability() {

    if (!userId) return;

    try {
        await fetch(`${API_URL}/api/availability/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(availability)
        });
    } catch (e) {
        console.error(e);
    }
}

/* ---------------- RENDER ---------------- */

function renderCalendar() {

    gridEl.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Январь","Февраль","Март","Апрель","Май","Июнь",
        "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
    ];

    document.getElementById('month-year').innerText =
        `${monthNames[month]} ${year}`;

    const daysOfWeek = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

    daysOfWeek.forEach(d => {
        const el = document.createElement('div');
        el.className = 'day-name';
        el.innerText = d;
        gridEl.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevLast = new Date(year, month, 0).getDate();

    for (let i = firstDay; i > 0; i--) {
        const el = document.createElement('div');
        el.className = 'day other-month';
        el.innerText = prevLast - i + 1;
        gridEl.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {

        const dateStr =
            `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        const el = document.createElement('div');
        el.className = 'day';
        el.innerText = d;

        const status = availability[dateStr]?.status || "none";

        if (status === "pending") el.classList.add("pending");
        if (status === "approved") el.classList.add("approved");

        const today = new Date();

        if (
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            el.classList.add("today");
        }

        el.onclick = () => openDayPanel(dateStr);

        gridEl.appendChild(el);
    }
}

/* ---------------- DAY ---------------- */

function openDayPanel(dateStr) {
    closeSheet(); // 🔥 важно

    selectedDate = dateStr;

    const data = availability[dateStr] || { status: "none", note: "" };

    document.getElementById("panelDate").innerText =
        new Date(dateStr).toLocaleDateString("ru-RU");

    document.getElementById("statusSelect").value = data.status;
    document.getElementById("noteInput").value = data.note;

    document.getElementById("dayPanel").classList.add("open");
    document.getElementById("sheetBackdrop").style.display = "block";
}

function closeSheet() {
    document.getElementById("dayPanel").classList.remove("open");
    document.getElementById("profileSheet").classList.remove("open");

    const b = document.getElementById("sheetBackdrop");
    b.style.display = "none";
}

async function saveCurrentDay() {

    if (!selectedDate) return;

    const status = document.getElementById("statusSelect").value;
    let note = document.getElementById("noteInput").value;

    if (status === "none") {
        note = "";
        document.getElementById("noteInput").value = "";
    }

    availability[selectedDate] = { status, note };

    renderCalendar();
    await syncAvailability();
}

/* ---------------- PROFILES ---------------- */

async function fetchProfiles() {

    const response = await fetch(`${API_URL}/api/profiles/${userId}`);
    if (!response.ok) return;

    profiles = await response.json();
    renderProfileButtons();
}

function renderProfileButtons() {

    for (let i = 1; i <= 3; i++) {

        const btn = document.querySelector(`[onclick="openProfileSheet(${i})"]`);
        if (!btn) continue;

        const title = profiles?.[i]?.title;
        btn.innerText = title?.trim() ? title : `Анкета ${i}`;
    }
}

function openProfileSheet(id) {
    closeSheet(); // 🔥 важно

    currentProfileId = id;

    const data = profiles[id] || { title: "", text: "" };

    document.getElementById("profileTitle").innerText = `Анкета ${id}`;
    document.getElementById("profileInput").value = data.text;

    document.getElementById("profileSheet").classList.add("open");
    document.getElementById("sheetBackdrop").style.display = "block";
}

async function saveProfile() {

    const text = document.getElementById("profileInput").value;
    const title = document.getElementById("profileTitle").innerText;

    profiles[currentProfileId] = {
        title: title.replace("Анкета ", ""),
        text
    };

    await fetch(`${API_URL}/api/profiles/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profiles)
    });

    tg.showAlert("Анкета сохранена");
}

async function copyProfile() {

    const text = document.getElementById("profileInput").value;
    await navigator.clipboard.writeText(text);

    tg.showAlert("Скопировано");
}

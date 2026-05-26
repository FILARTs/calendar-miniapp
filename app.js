const tg = window.Telegram.WebApp;
tg.expand();

const API_URL = "https://material-organised-ind-exist.trycloudflare.com";

let selectedDate = null;
let currentDate = new Date();
let availability = {};
let userId = null;
let gridEl, prevBtn, nextBtn;

document.addEventListener("DOMContentLoaded", init);

async function init() {

    gridEl = document.getElementById('calendar-grid');
    prevBtn = document.getElementById('prevMonth');
    nextBtn = document.getElementById('nextMonth');

    const initData = tg.initDataUnsafe;

    if (initData?.user) {
        userId = initData.user.id;

        try {
            await fetchAvailability();
        } catch (e) {
            console.error(e);
        }
    }

    renderCalendar();
    bindButtons();
    bindSwipe();
    bindAutosave();
}

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

        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;

        if (Math.abs(diff) < 50) return;

        if (diff > 0) {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

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

        timer = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

async function fetchAvailability() {

    const response = await fetch(`${API_URL}/api/availability/${userId}`);

    if (response.ok) {
        availability = await response.json();
    }
}

async function syncAvailability() {

    if (!userId) return;

    try {

		await fetch(`${API_URL}/api/availability/${userId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(availability)
		});

    } catch (e) {
        console.error("Sync error:", e);
    }
}

function renderCalendar() {

    gridEl.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Январь","Февраль","Март",
        "Апрель","Май","Июнь",
        "Июль","Август","Сентябрь",
        "Октябрь","Ноябрь","Декабрь"
    ];

    document.getElementById('month-year').innerText =
        `${monthNames[month]} ${year}`;

    const daysOfWeek = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

    daysOfWeek.forEach(day => {

        const el = document.createElement('div');

        el.className = 'day-name';
        el.innerText = day;

        gridEl.appendChild(el);
    });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDayOfMonth; i > 0; i--) {

        const el = document.createElement('div');

        el.className = 'day other-month';
        el.innerText = prevMonthLastDay - i + 1;

        gridEl.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {

        const dateStr =
            `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        const dayEl = document.createElement('div');

        dayEl.className = 'day';
        dayEl.innerText = d;

        const data = availability[dateStr];

        const status = data?.status || "none";

        if (status === "pending") {
            dayEl.classList.add("pending");
        }

        if (status === "approved") {
            dayEl.classList.add("approved");
        }

        const today = new Date();

        if (
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayEl.classList.add('today');
        }

        dayEl.onclick = () => {
            openDayPanel(dateStr);
        };

        gridEl.appendChild(dayEl);
    }
}

function openDayPanel(dateStr) {

    selectedDate = dateStr;

    const panel = document.getElementById("dayPanel");
    const backdrop = document.getElementById("sheetBackdrop");

    const data = availability[dateStr] || {
        status: "none",
        note: ""
    };

    document.getElementById("panelDate").innerText =
        new Date(dateStr).toLocaleDateString("ru-RU");

    document.getElementById("statusSelect").value = data.status;
    document.getElementById("noteInput").value = data.note;

    panel.classList.add("open");
    backdrop.style.display = "block";
}

function closeSheet() {

    document.getElementById("dayPanel")
        .classList.remove("open");

    document.getElementById("sheetBackdrop")
        .style.display = "none";
}

async function saveCurrentDay() {

    if (!selectedDate) return;

    availability[selectedDate] = {
        status: document.getElementById("statusSelect").value,
        note: document.getElementById("noteInput").value
    };

    renderCalendar();

    await syncAvailability();
}

document.getElementById("sheetBackdrop").onclick = closeSheet;
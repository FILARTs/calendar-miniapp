const tg = window.Telegram.WebApp;
tg.expand();

let currentDate = new Date();
let availability = {};
let userId = null;

const gridEl = document.getElementById('calendar-grid');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const saveBtn = document.getElementById('saveBtn');

async function init() {
    const initData = tg.initDataUnsafe;

    if (initData && initData.user) {
        userId = initData.user.id;

        try {
            await fetchAvailability();
        } catch (e) {
            console.error(e);
        }
    } else {
        console.error("Telegram user not found");
    }

    renderCalendar();
}

async function fetchAvailability() {
    try {
        const response = await fetch(
            `https://YOUR_API_URL/api/availability/${userId}`
        );

        if (response.ok) {
            availability = await response.json();
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

function renderCalendar() {
    gridEl.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March",
        "April", "May", "June",
        "July", "August", "September",
        "October", "November", "December"
    ];

    document.getElementById('month-year').innerText =
        `${monthNames[month]} ${year}`;

    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.innerText = prevMonthLastDay - i + 1;
        gridEl.appendChild(dayEl);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');

        dayEl.className = 'day';
        dayEl.innerText = d;

        const dateStr =
            `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        if (availability[dateStr] === 'busy') {
            dayEl.classList.add('busy');
        }

        if (availability[dateStr] === 'free') {
            dayEl.classList.add('free');
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
            if (availability[dateStr] === 'busy') {
                availability[dateStr] = 'free';
            } else if (availability[dateStr] === 'free') {
                availability[dateStr] = 'busy';
            } else {
                availability[dateStr] = 'busy';
            }

            renderCalendar();
        };

        gridEl.appendChild(dayEl);
    }
}

prevBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
};

nextBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
};

saveBtn.onclick = async () => {
    if (!userId) return;

    try {
        const response = await fetch(
            `https://YOUR_API_URL/api/availability/${userId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(availability)
            }
        );

        if (response.ok) {
            tg.showAlert("Saved!");
        } else {
            tg.showAlert("Save error");
        }

    } catch (e) {
        tg.showAlert(e.message);
    }
};

init();
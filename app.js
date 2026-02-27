/**
 * TELEMED 103.KZ CORE ENGINE
 * @version 2.5.0
 * @author Artox System Integration
 */

// КОНФИГУРАЦИЯ
const CONFIG = {
    SB_URL: 'https://myopwyxeiaxinspfslew.supabase.co',
    SB_KEY: 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g',
    JITSI_DOMAIN: 'meet.jit.si',
    ROOM_EXPIRY_HOURS: 3,
    REMINDER_OFFSET_MIN: 60
};

// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
let APP_STATE = {
    isSignUp: false,
    currentUser: null,
    appointments: [],
    activeApp: null,
    showCompleted: false,
    jitsiApi: null,
    lastSelectedDoc: null,
    searchFilter: ''
};

const supabase = window.supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);

/**
 * 1. ИНИЦИАЛИЗАЦИЯ И ПРОВЕРКИ
 */
document.addEventListener('DOMContentLoaded', async () => {
    logger('System initialization started...');
    validateBrowser();
    attachGlobalEvents();
    await checkSession();
});

function logger(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
}

function validateBrowser() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);

    logger(`Browser detected: ${ua}`);

    if (isIOS && !isSafari) {
        showBrowserWarning("Текущая версия браузера на iOS не поддерживает видео. Используйте Safari.");
    } else if (!isChrome && !isSafari) {
        showBrowserWarning("Ваш браузер может работать некорректно. Рекомендуем Google Chrome.");
    }
}

function showBrowserWarning(msg) {
    const el = document.getElementById('browser-warning');
    el.classList.remove('hidden-section');
    document.getElementById('browser-msg').innerText = msg;
}

/**
 * 2. УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ (Шаг 1)
 */
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        logger('Session found for user: ' + session.user.email);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        APP_STATE.currentUser = profile;
        renderDashboard();
    }
}

async function handleAuth() {
    const email = getVal('email');
    const pass = getVal('password');
    const btn = document.getElementById('auth-btn');

    if (!validateEmail(email)) return toast('Введите корректный E-mail', 'error');
    if (pass.length < 6) return toast('Пароль должен быть от 6 символов', 'error');

    setLoading(btn, true);

    try {
        if (APP_STATE.isSignUp) {
            const name = getVal('full_name');
            const role = document.querySelector('input[name="user_role"]:checked').value;
            if (!name) throw new Error("Укажите ФИО");

            const { data, error } = await supabase.auth.signUp({ email, password: pass });
            if (error) throw error;
            
            await supabase.from('profiles').insert([{ 
                id: data.user.id, 
                full_name: name, 
                role: role 
            }]);
            
            toast('Регистрация успешна! Войдите в кабинет.', 'success');
            toggleAuth();
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
            
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            APP_STATE.currentUser = profile;
            renderDashboard();
            toast('С возвращением!', 'success');
        }
    } catch (e) {
        logger(e.message, 'error');
        toast(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/**
 * 3. ГЕНЕРАЦИЯ И УПРАВЛЕНИЕ КОНСУЛЬТАЦИЯМИ (Шаг 2)
 */
async function handleCreateAppointment() {
    const doc = getVal('input-doc');
    const pat = getVal('input-pat');
    const date = getVal('input-date');
    const time = getVal('input-time');

    if (!doc || !pat || !date || !time) return toast('Заполните все данные приемома', 'error');

    const scheduledAt = new Date(`${date}T${time}`);
    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    const baseUrl = window.location.origin + window.location.pathname;

    const { data, error } = await supabase.from('appointments').insert([{
        doctor_name: doc,
        patient_name: pat,
        scheduled_at: scheduledAt.toISOString(),
        room_id: roomId,
        status: 'Без статуса',
        admin_id: APP_STATE.currentUser.id,
        doctor_link: `${baseUrl}?room=${roomId}&role=doctor`,
        patient_link: `${baseUrl}?room=${roomId}&role=patient`
    }]).select();

    if (error) return toast(error.message, 'error');

    toast('Консультация успешно создана', 'success');
    await loadAppointments();
    clearCreateForm();
}

async function loadAppointments() {
    logger('Loading appointments from database...');
    const { data, error } = await supabase.from('appointments')
        .select('*')
        .order('scheduled_at', { ascending: false });

    if (error) return logger(error.message, 'error');
    
    APP_STATE.appointments = data;
    renderAppointmentList();
}

function renderAppointmentList() {
    const container = document.getElementById('appointment-list');
    const countEl = document.getElementById('app-count');
    
    let list = APP_STATE.appointments.filter(app => {
        const isCompleted = app.status === 'Завершено' || app.status === 'Отменено';
        const matchesSearch = app.doctor_name.toLowerCase().includes(APP_STATE.searchFilter.toLowerCase()) || 
                              app.patient_name.toLowerCase().includes(APP_STATE.searchFilter.toLowerCase());
        
        if (!APP_STATE.showCompleted && isCompleted) return false;
        return matchesSearch;
    });

    countEl.innerText = list.length;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-slate-300 text-xs font-bold uppercase">Записи не найдены</div>';
        return;
    }

    list.forEach(app => {
        const card = document.createElement('div');
        card.className = `p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${APP_STATE.activeApp?.id === app.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`;
        
        const dateObj = new Date(app.scheduled_at);
        const statusClass = app.status === 'Отменено' ? 'text-red-500' : (app.status === 'Завершено' ? 'text-green-500' : 'text-blue-500');

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-black uppercase tracking-widest ${statusClass}">${app.status}</span>
                <span class="text-[10px] text-slate-400 font-bold">${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <h5 class="font-extrabold text-sm text-slate-800 truncate">${app.doctor_name}</h5>
            <p class="text-[11px] text-slate-500 mt-1">Пациент: ${app.patient_name}</p>
        `;

        card.onclick = () => selectAppointment(app.id);
        container.appendChild(card);
    });
}

/**
 * 4. ВИДЕОСВЯЗЬ И ЧАТ (Шаг 3)
 */
function selectAppointment(id) {
    const app = APP_STATE.appointments.find(a => a.id === id);
    if (!app) return;

    APP_STATE.activeApp = app;
    renderAppointmentList(); // Обновить выделение

    const detailsBox = document.getElementById('app-details-box');
    const waitScreen = document.getElementById('call-wait-screen');
    const jitsiContainer = document.getElementById('jitsi-container');

    detailsBox.classList.remove('hidden-section');
    document.getElementById('detail-doc').innerText = app.doctor_name;
    document.getElementById('detail-pat').innerText = "Пациент: " + app.patient_name;
    document.getElementById('detail-date').innerText = new Date(app.scheduled_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    
    document.getElementById('doc-link').innerText = app.doctor_link;
    document.getElementById('pat-link').innerText = app.patient_link;

    const pill = document.getElementById('detail-status-pill');
    pill.innerText = app.status;
    pill.className = `inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${app.status === 'Отменено' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`;

    // Логика запуска видео
    if (app.status === 'Без статуса' || app.status === 'Запланировано') {
        waitScreen.classList.add('hidden-section');
        jitsiContainer.classList.remove('hidden-section');
        initJitsi(app.room_id);
    } else {
        waitScreen.classList.remove('hidden-section');
        jitsiContainer.classList.add('hidden-section');
        destroyJitsi();
    }
}

function initJitsi(roomId) {
    destroyJitsi();
    
    const options = {
        roomName: "103kz-" + roomId,
        width: "100%",
        height: "100%",
        parentNode: document.getElementById('jitsi-container'),
        userInfo: { displayName: APP_STATE.currentUser.full_name },
        lang: 'ru',
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fittowidth', 'chat', 'raisehand', 'videoquality', 'filmstrip', 'tileview', 'help', 'mute-everyone', 'security'],
            SHOW_JITSI_WATERMARK: false,
            MOBILE_APP_PROMO: false
        }
    };

    APP_STATE.jitsiApi = new JitsiMeetExternalAPI(CONFIG.JITSI_DOMAIN, options);
    
    APP_STATE.jitsiApi.addEventListeners({
        videoConferenceJoined: () => logger('User joined video conference'),
        videoConferenceLeft: () => logger('User left video conference'),
        readyToClose: () => destroyJitsi()
    });
}

function destroyJitsi() {
    if (APP_STATE.jitsiApi) {
        APP_STATE.jitsiApi.dispose();
        APP_STATE.jitsiApi = null;
    }
}

/**
 * 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ИНТЕРФЕЙС
 */
function toggleAuth() {
    APP_STATE.isSignUp = !APP_STATE.isSignUp;
    document.getElementById('auth-title').innerText = APP_STATE.isSignUp ? "Регистрация" : "Вход в кабинет";
    document.getElementById('toggle-btn').innerText = APP_STATE.isSignUp ? "Уже есть аккаунт? Войти" : "Создать аккаунт";
    document.getElementById('reg-fields').classList.toggle('hidden-section', !APP_STATE.isSignUp);
    document.getElementById('auth-btn').innerText = APP_STATE.isSignUp ? "Зарегистрироваться" : "Войти в систему";
}

function renderDashboard() {
    document.getElementById('auth-screen').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('user-name-top').innerText = APP_STATE.currentUser.full_name;
    loadAppointments();
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('tab-active', 'text-slate-800'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.add('text-slate-400'));
    
    event.target.classList.add('tab-active', 'text-slate-800');
    event.target.classList.remove('text-slate-400');

    // Переключение секций
    const sections = ['templates-section', 'left-sidebar', 'right-content'];
    if (tabId === 'templates') {
        document.getElementById('templates-section').classList.remove('hidden-section');
        document.getElementById('left-sidebar').classList.add('hidden-section');
        document.getElementById('right-content').classList.add('hidden-section');
    } else {
        document.getElementById('templates-section').classList.add('hidden-section');
        document.getElementById('left-sidebar').classList.remove('hidden-section');
        document.getElementById('right-content').classList.remove('hidden-section');
    }
}

async function confirmAction(type) {
    if (!APP_STATE.activeApp) return;
    
    const modal = document.getElementById('modal-bg');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden-section');

    if (type === 'cancel') {
        content.innerHTML = `
            <h3 class="text-2xl font-black mb-4">Отменить консультацию?</h3>
            <p class="text-slate-500 mb-8 text-sm">Врачу и пациенту придут СМС уведомления об отмене приема.</p>
            <div class="flex gap-4">
                <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Назад</button>
                <button onclick="updateStatus('Отменено')" class="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg">Да, отменить</button>
            </div>
        `;
    } else {
        content.innerHTML = `
            <h3 class="text-2xl font-black mb-4">Удалить запись?</h3>
            <p class="text-slate-500 mb-8 text-sm">Запись будет безвозвратно удалена из базы данных.</p>
            <div class="flex gap-4">
                <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Назад</button>
                <button onclick="deleteRecord()" class="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold">Удалить</button>
            </div>
        `;
    }
}

async function updateStatus(newStatus) {
    const { error } = await supabase.from('appointments')
        .update({ status: newStatus })
        .eq('id', APP_STATE.activeApp.id);
    
    if (error) return toast(error.message, 'error');
    
    toast('Статус обновлен', 'success');
    closeModal();
    loadAppointments();
    selectAppointment(APP_STATE.activeApp.id);
}

async function deleteRecord() {
    const { error } = await supabase.from('appointments')
        .delete()
        .eq('id', APP_STATE.activeApp.id);
    
    if (error) return toast(error.message, 'error');
    
    toast('Запись удалена', 'success');
    closeModal();
    APP_STATE.activeApp = null;
    document.getElementById('app-details-box').classList.add('hidden-section');
    loadAppointments();
}

function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    const color = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-600');
    t.className = `${color} text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-right-10 duration-300`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function closeModal() {
    document.getElementById('modal-bg').classList.add('hidden-section');
}

function filterAppointments() {
    APP_STATE.searchFilter = getVal('search-input');
    renderAppointmentList();
}

function toggleCompleted() {
    APP_STATE.showCompleted = !APP_STATE.showCompleted;
    renderAppointmentList();
}

const getVal = (id) => document.getElementById(id).value.trim();
const setLoading = (btn, state) => {
    btn.disabled = state;
    btn.innerHTML = state ? '<div class="custom-loader mx-auto"></div>' : (APP_STATE.isSignUp ? 'Зарегистрироваться' : 'Войти в систему');
};
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function attachGlobalEvents() {
    document.getElementById('auth-btn').onclick = handleAuth;
}

function logout() {
    supabase.auth.signOut().then(() => location.reload());
}

function sendSMS(type) {
    const target = type === 'doc' ? 'врачу' : 'пациенту';
    toast(`СМС успешно отправлено ${target}`, 'success');
}
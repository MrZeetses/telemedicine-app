const SB_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SB_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

let isSignUpMode = false; // Начнем с режима Входа
let currentUser = null;

// --- ИНИЦИАЛИЗАЦИЯ ---
window.onload = () => {
    checkBrowserSupport();
    document.getElementById('submit-btn').onclick = handleSubmit;
};

// --- ПРОВЕРКА БРАУЗЕРА (Шаг 3 инструкции) ---
function checkBrowserSupport() {
    const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (!isChrome && !isSafari) {
        alert("Ваш браузер может не поддерживать видео. Рекомендуем Google Chrome.");
    }
}

// --- АВТОРИЗАЦИЯ ---
async function handleSubmit() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isSignUpMode) {
        const fullName = document.getElementById('full_name').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return alert("Ошибка: " + error.message);
        
        await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role }]);
        alert("Регистрация успешна! Теперь войдите.");
        window.toggleAuthMode();
    } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return alert("Ошибка: " + error.message);
        
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        currentUser = profile;
        showDashboard();
    }
}

// --- ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ---
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Регистрация" : "Вход";
    document.getElementById('full_name').parentElement.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('role-selection').classList.toggle('hidden', !isSignUpMode);
    document.getElementById('submit-btn').innerText = isSignUpMode ? "Создать аккаунт" : "Войти";
    document.getElementById('toggle-link').innerText = isSignUpMode ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация";
};

// --- ДАШБОРД ---
function showDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-info').innerText = `${currentUser.full_name} (${currentUser.role})`;

    if (currentUser.role === 'admin') {
        document.getElementById('admin-section').classList.remove('hidden');
        loadAdminList();
    } else {
        document.getElementById('client-section').classList.remove('hidden');
        loadClientList();
    }
}

// --- АДМИН: СОЗДАНИЕ КОНСУЛЬТАЦИИ (Шаг 2 инструкции) ---
window.createConsultation = async function() {
    const docName = document.getElementById('adm_doc').value;
    const patName = document.getElementById('adm_pat').value;
    const time = document.getElementById('adm_time').value;

    if (!docName || !patName || !time) return alert("Заполните все данные!");

    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    const baseUrl = window.location.href.split('?')[0];
    const docLink = `${baseUrl}?room=${roomId}&role=doctor`;
    const patLink = `${baseUrl}?room=${roomId}&role=patient`;

    const { error } = await supabase.from('appointments').insert([{
        doctor_name: docName,
        patient_name: patName,
        scheduled_at: time,
        room_id: roomId,
        doctor_link: docLink,
        patient_link: patLink
    }]);

    if (error) alert(error.message);
    else {
        alert("Консультация создана!");
        loadAdminList();
    }
};

async function loadAdminList() {
    const { data } = await supabase.from('appointments').select('*').order('scheduled_at', { ascending: false });
    const list = document.getElementById('admin-list');
    list.innerHTML = data.map(app => `
        <div class="p-4 border-b text-sm flex justify-between items-center">
            <div>
                <p><b>Врач:</b> ${app.doctor_name} | <b>Пациент:</b> ${app.patient_name}</p>
                <p class="text-gray-500">${new Date(app.scheduled_at).toLocaleString()} [${app.status}]</p>
                <p class="text-[10px] text-blue-500 cursor-pointer" onclick="alert('Ссылка врача: ${app.doctor_link}')">Показать ссылки</p>
            </div>
            <button onclick="deleteConsultation('${app.id}')" class="text-red-500">❌</button>
        </div>
    `).join('');
}

// --- ВИДЕОСВЯЗЬ (Jitsi) ---
window.joinRoom = function(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = "";
    const api = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: "TeleMed-103-" + roomId,
        width: "100%",
        height: "100%",
        parentNode: container,
        userInfo: { displayName: currentUser.full_name }
    });
};

window.deleteConsultation = async function(id) {
    if (confirm("Удалить консультацию?")) {
        await supabase.from('appointments').delete().eq('id', id);
        loadAdminList();
    }
}
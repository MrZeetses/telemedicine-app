const SB_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SB_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let isSignUpMode = true;
let currentUser = null;

// --- АВТОРИЗАЦИЯ ---
async function handleSubmit() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isSignUpMode) {
        const fullName = document.getElementById('full_name').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) return alert(error.message);
        await supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role }]);
        alert("Регистрация успешна! Теперь войдите.");
        window.toggleAuthMode();
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return alert(error.message);
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        showDashboard(profile);
    }
}

// --- ПЕРЕКЛЮЧЕНИЕ ИНТЕРФЕЙСОВ ---
function showDashboard(profile) {
    currentUser = profile;
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-role-title').innerText = `Кабинет: ${profile.full_name} (${profile.role})`;

    const adminPanel = document.getElementById('admin-panel');
    const userPanel = document.getElementById('user-panel');

    if (profile.role === 'admin') {
        adminPanel.classList.remove('hidden');
        userPanel.classList.add('hidden');
        loadAdminAppointments();
    } else {
        adminPanel.classList.add('hidden');
        userPanel.classList.remove('hidden');
        loadUserAppointments();
    }
}

// --- ЛОГИКА АДМИНИСТРАТОРА ---
async function createAppointment() {
    const doctorName = document.getElementById('adm_doc_name').value;
    const patientName = document.getElementById('adm_pat_name').value;
    const dateStr = document.getElementById('adm_date').value;

    if (!doctorName || !patientName || !dateStr) return alert("Заполните все поля");

    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    
    const { data, error } = await supabaseClient.from('appointments').insert([{
        doctor_name: doctorName,
        patient_name: patientName,
        scheduled_at: dateStr,
        room_id: roomId,
        admin_id: currentUser.id,
        status: 'scheduled'
    }]).select();

    if (error) alert(error.message);
    else {
        alert("Консультация создана!");
        renderLinks(roomId);
        loadAdminAppointments();
    }
}

function renderLinks(roomId) {
    const baseUrl = window.location.origin + window.location.pathname;
    const docLink = `${baseUrl}?room=${roomId}&role=doctor`;
    const patLink = `${baseUrl}?room=${roomId}&role=patient`;

    document.getElementById('links-display').innerHTML = `
        <div class="mt-4 p-4 bg-blue-50 rounded border border-blue-200 text-sm">
            <p><b>Для врача:</b> <br> <input readonly value="${docLink}" class="w-full p-1 border"> </p>
            <p class="mt-2"><b>Для пациента:</b> <br> <input readonly value="${patLink}" class="w-full p-1 border"> </p>
        </div>
    `;
}

async function loadAdminAppointments() {
    const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .order('scheduled_at', { ascending: false });

    const list = document.getElementById('admin-appointments-list');
    list.innerHTML = data.map(app => `
        <div class="p-3 border-b flex justify-between items-center ${app.status === 'cancelled' ? 'opacity-50' : ''}">
            <div>
                <p class="font-bold">Врач: ${app.doctor_name} | Пац: ${app.patient_name}</p>
                <p class="text-xs text-gray-500">${new Date(app.scheduled_at).toLocaleString()} | Статус: ${app.status}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="updateStatus('${app.id}', 'cancelled')" class="text-red-500 text-xs border border-red-500 px-2 py-1 rounded">Отменить</button>
                <button onclick="deleteApp('${app.id}')" class="text-gray-500 text-xs">Удалить</button>
            </div>
        </div>
    `).join('');
}

// --- ЛОГИКА ПОЛЬЗОВАТЕЛЯ (ВРАЧ/ПАЦИЕНТ) ---
async function loadUserAppointments() {
    const { data } = await supabaseClient.from('appointments').select('*');
    const container = document.getElementById('user-appointments-list');
    
    container.innerHTML = data.map(app => `
        <div class="p-4 border rounded shadow-sm bg-white mb-2">
            <p class="font-bold">${app.doctor_name} ↔ ${app.patient_name}</p>
            <p class="text-xs text-gray-400">${new Date(app.scheduled_at).toLocaleString()}</p>
            <button onclick="startVideo('${app.room_id}')" class="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm w-full">Войти в звонок</button>
        </div>
    `).join('');
}

// --- ВИДЕОСВЯЗЬ (JITSI) ---
window.startVideo = function(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = "";
    
    // Проверка браузера (упрощенно)
    if (!navigator.mediaDevices) {
        return alert("Ваш браузер не поддерживает видео-связь. Используйте Chrome.");
    }

    new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: "TeleMed-103-" + roomId,
        width: "100%",
        height: 500,
        parentNode: container,
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fittowidth', 'chat', 'raisehand', 'videoquality', 'filmstrip', 'tileview', 'help', 'mute-everyone', 'security']
        }
    });
};

// --- ВСПОМОГАТЕЛЬНЫЕ ---
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Регистрация" : "Вход";
    document.getElementById('full_name').style.display = isSignUpMode ? "block" : "none";
    document.getElementById('role-selection').style.display = isSignUpMode ? "flex" : "none";
    document.getElementById('submit-btn').innerText = isSignUpMode ? "Создать аккаунт" : "Войти";
};

async function updateStatus(id, status) {
    if (!confirm("Сменить статус?")) return;
    await supabaseClient.from('appointments').update({ status }).eq('id', id);
    loadAdminAppointments();
}

async function deleteApp(id) {
    if (!confirm("Удалить запись безвозвратно?")) return;
    await supabaseClient.from('appointments').delete().eq('id', id);
    loadAdminAppointments();
}

window.onload = () => {
    document.getElementById('submit-btn').onclick = handleSubmit;
};
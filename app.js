const SB_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SB_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';

const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let isSignUpMode = true; // По умолчанию мы в режиме регистрации

// ГЛАВНАЯ ФУНКЦИЯ ДЛЯ КНОПКИ
async function handleSubmit() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Введите почту и пароль");

    if (isSignUpMode) {
        // ЛОГИКА РЕГИСТРАЦИИ
        const fullName = document.getElementById('full_name').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        
        if (error) return alert("Ошибка регистрации: " + error.message);
        
        if (data.user) {
            await supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role }]);
            alert("Регистрация успешна! Теперь нажмите 'Перейти ко входу' и войдите.");
        }
    } else {
        // ЛОГИКА ВХОДА
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) return alert("Ошибка входа: " + error.message);
        
        // Если вход успешен, получаем профиль
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        
        showDashboard(profile);
    }
}

// ПЕРЕКЛЮЧАТЕЛЬ (ИСПРАВЛЕННЫЙ)
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('submit-btn');
    const nameInput = document.getElementById('full_name');
    const roleSelection = document.getElementById('role-selection');
    const toggleLink = document.getElementById('toggle-link');

    if (isSignUpMode) {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        nameInput.style.display = "block";
        roleSelection.style.display = "flex";
        toggleLink.innerText = "Перейти ко входу";
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        nameInput.style.display = "none";
        roleSelection.style.display = "none";
        toggleLink.innerText = "Нет аккаунта? Регистрация";
    }
};

// ПОКАЗ ПАНЕЛИ
function showDashboard(profile) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const roleTitle = profile?.role === 'doctor' ? "Кабинет Врача" : "Кабинет Пациента";
    document.getElementById('user-role-title').innerText = `${roleTitle}: ${profile?.full_name || 'Пользователь'}`;
    
    loadAppointments();
}

function loadAppointments() {
    const list = document.getElementById('appointments-list');
    list.innerHTML = `
        <div class="p-4 border rounded flex justify-between items-center bg-white shadow-sm">
            <span>Консультация (Тест)</span>
            <button onclick="startVideo('test-room')" class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">Войти в чат</button>
        </div>
    `;
}

window.startVideo = function(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = "";
    new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: "TeleMed-" + roomId,
        width: "100%",
        height: 450,
        parentNode: container
    });
};

// Инициализация при загрузке
window.onload = () => {
    document.getElementById('submit-btn').onclick = handleSubmit;
};
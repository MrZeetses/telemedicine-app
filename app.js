// 1. НАСТРОЙКИ (Твои данные)
const SUPABASE_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';

// Инициализируем клиент сразу
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Система TeleMed запущена...");

// Переменные состояния
let currentUser = null;
let currentRole = null;
let isSignUpMode = true;

// 2. ФУНКЦИЯ РЕГИСТРАЦИИ (handleSignUp)
// Сделаем её глобальной через window, чтобы HTML её всегда видел
window.handleSignUp = async function() {
    console.log("Кнопка регистрации нажата");
    
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('full_name').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        if (!email || !password || !fullName) {
            alert("Заполните все поля!");
            return;
        }

        // А. Регистрация в Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        if (authData.user) {
            // Б. Запись в таблицу profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{ id: authData.user.id, full_name: fullName, role: role }]);

            if (profileError) throw profileError;

            alert("Успешно! Теперь перейдите ко входу.");
            toggleAuthMode();
        }
    } catch (err) {
        console.error("Ошибка:", err.message);
        alert("Проблема: " + err.message);
    }
};

// 3. ФУНКЦИЯ ВХОДА (handleSignIn)
window.handleSignIn = async function() {
    console.log("Кнопка входа нажата");
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Получаем профиль
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (pError) console.warn("Профиль не найден, используем роль по умолчанию");

        currentUser = data.user;
        currentRole = profile ? profile.role : 'patient';
        
        showDashboard();
    } catch (err) {
        alert("Ошибка входа: " + err.message);
    }
};

// 4. ПАНЕЛЬ УПРАВЛЕНИЯ
function showDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const title = document.getElementById('user-role-title');
    title.innerText = currentRole === 'patient' ? "Кабинет Пациента" : "Кабинет Врача";
    
    loadAppointments();
}

// 5. ТВОЯ ЛОГИКА ВСТРЕЧ И ВИДЕО
window.loadAppointments = function() {
    const list = document.getElementById('appointments-list');
    const mockData = [
        { id: 'room-1', time: '14:00', partner: currentRole === 'patient' ? 'Д-р Смит' : 'Пациент Иван' },
        { id: 'room-2', time: '16:30', partner: currentRole === 'patient' ? 'Д-р Асанов' : 'Пациент Мария' }
    ];

    list.innerHTML = mockData.map(app => `
        <div class="flex justify-between items-center p-4 border rounded bg-white mb-2 shadow-sm">
            <div>
                <p class="font-bold text-gray-800">${app.partner}</p>
                <p class="text-sm text-gray-500">Сегодня в ${app.time}</p>
            </div>
            <button onclick="startVideo('${app.id}')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                Войти
            </button>
        </div>
    `).join('');
};

window.startVideo = function(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = ""; 
    
    // Используем публичный сервер Jitsi
    const domain = "meet.jit.si";
    const options = {
        roomName: "TeleMed-Room-" + roomId,
        width: "100%",
        height: 400,
        parentNode: container,
    };
    new JitsiMeetExternalAPI(domain, options);
};

// 6. ПЕРЕКЛЮЧАТЕЛЬ ИНТЕРФЕЙСА
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('submit-btn');
    const roleSel = document.getElementById('role-selection');
    const nameInput = document.getElementById('full_name');

    if (isSignUpMode) {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        btn.onclick = window.handleSignUp;
        roleSel.style.display = 'flex';
        nameInput.style.display = 'block';
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        btn.onclick = window.handleSignIn;
        roleSel.style.display = 'none';
        nameInput.style.display = 'none';
    }
};
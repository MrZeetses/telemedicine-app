// 1. НАСТРОЙКИ (Используем другое имя переменной!)
const SB_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SB_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';

// Инициализация (window.supabase берется из подключенной библиотеки)
const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

let isSignUpMode = true;

// 2. ФУНКЦИЯ РЕГИСТРАЦИИ
async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full_name').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    if (!email || !password || !fullName) return alert("Заполните все поля!");

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        // Создаем профиль в таблице profiles
        const { error: pError } = await supabaseClient
            .from('profiles')
            .insert([{ id: data.user.id, full_name: fullName, role: role }]);
        
        if (pError) console.error(pError);
        alert("Регистрация успешна! Теперь войдите.");
        window.toggleAuthMode();
    }
}

// 3. ФУНКЦИЯ ВХОДА
async function handleSignIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('user-role-title').innerText = (profile?.role === 'doctor' ? "Кабинет Врача" : "Кабинет Пациента");
        loadAppointments(profile?.role);
    }
}

// 4. ПЕРЕКЛЮЧАТЕЛЬ (ГЛОБАЛЬНЫЙ)
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
        btn.onclick = handleSignUp;
        nameInput.classList.remove('hidden');
        roleSelection.classList.remove('hidden');
        toggleLink.innerText = "Перейти ко входу";
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        btn.onclick = handleSignIn;
        nameInput.classList.add('hidden');
        roleSelection.classList.add('hidden');
        toggleLink.innerText = "Нет аккаунта? Регистрация";
    }
};

// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function loadAppointments(role) {
    const list = document.getElementById('appointments-list');
    list.innerHTML = `
        <div class="p-4 border rounded flex justify-between items-center">
            <span>Тестовая консультация (14:00)</span>
            <button onclick="startVideo('test-room')" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">Войти</button>
        </div>
    `;
}

window.startVideo = function(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = "";
    new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: "TeleMed-" + roomId,
        width: "100%",
        height: 400,
        parentNode: container
    });
};

// Запуск при загрузке
window.onload = () => {
    document.getElementById('submit-btn').onclick = handleSignUp;
    console.log("Приложение готово!");
};
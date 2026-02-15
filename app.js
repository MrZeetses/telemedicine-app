// 1. Инициализация (Только ОДИН раз!)
const SB_URL = 'https://myopwyxeiaxinspfslew.supabase.co';
const SB_KEY = 'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g';

// Проверяем, загружена ли библиотека, прежде чем создавать клиент
let supabaseClient;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
} else {
    console.error("Supabase library not found!");
}

let currentUser = null;
let currentRole = null;
let isSignUpMode = true;

// 2. Функция регистрации
async function handleSignUp() {
    console.log("Запуск регистрации...");
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full_name').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else if (data.user) {
        await supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role }]);
        alert("Регистрация успешна! Теперь войдите.");
        toggleAuthMode();
    }
}

// 3. Функция входа
async function handleSignIn() {
    console.log("Запуск входа...");
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        currentUser = data.user;
        currentRole = profile ? profile.role : 'patient';
        showDashboard();
    }
}

// 4. Переключатель интерфейса (глобальный)
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('submit-btn');
    const roleSel = document.getElementById('role-selection');
    const nameInp = document.getElementById('full_name');

    if (isSignUpMode) {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        btn.onclick = handleSignUp;
        roleSel.style.display = 'flex';
        nameInp.style.display = 'block';
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        btn.onclick = handleSignIn;
        roleSel.style.display = 'none';
        nameInp.style.display = 'none';
    }
};

// 5. Показ Dashboard
function showDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-role-title').innerText = currentRole === 'patient' ? "Пациент" : "Врач";
    loadAppointments();
}

// Привязываем начальное событие к кнопке при загрузке страницы
window.onload = () => {
    const btn = document.getElementById('submit-btn');
    if(btn) btn.onclick = handleSignUp;
    console.log("Приложение готово.");
};

// Твои функции loadAppointments и startVideo (оставь их ниже)
function loadAppointments() { /* ... твой код ... */ }
function startVideo(id) { /* ... твой код ... */ }
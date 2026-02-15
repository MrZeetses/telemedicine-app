// Используем другое имя переменной (client), чтобы не было SyntaxError
const client = window.supabase.createClient(
    'https://myopwyxeiaxinspfslew.supabase.co',
    'sb_publishable_0UiJlElFh8zz8IORqx-cRw_UsVEVC4g'
);

console.log("Скрипт загружен, ошибок нет!");

let isSignUpMode = true;

// 1. Функция регистрации
async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full_name').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    if (!email || !password) return alert("Заполните данные!");

    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        await client.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role }]);
        alert("Регистрация успешна! Теперь войдите.");
        toggleAuthMode();
    }
}

// 2. Функция входа
async function handleSignIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        alert("Вы вошли!");
        // Здесь можно вызвать showDashboard()
    }
}

// 3. Глобальная функция переключения
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('submit-btn');
    const nameInput = document.getElementById('full_name');
    const roleSelect = document.getElementById('role-selection');
    const toggleLink = document.getElementById('toggle-link');

    if (isSignUpMode) {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        nameInput.style.display = "block";
        roleSelect.style.display = "flex";
        toggleLink.innerText = "Уже есть аккаунт? Войти";
        btn.onclick = handleSignUp;
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        nameInput.style.display = "none";
        roleSelect.style.display = "none";
        toggleLink.innerText = "Нет аккаунта? Регистрация";
        btn.onclick = handleSignIn;
    }
};

// Назначаем начальное действие кнопке при загрузке
window.onload = () => {
    const btn = document.getElementById('submit-btn');
    if (btn) btn.onclick = handleSignUp;
    console.log("Кнопки активированы");
};
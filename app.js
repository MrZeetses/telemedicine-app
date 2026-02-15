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
// 1. Главная функция отображения кабинета
async function showDashboard(profile) {
    currentUser = profile;
    currentRole = profile.role;

    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const roleTitle = currentRole === 'doctor' ? "Личный кабинет Врача" : "Личный кабинет Пациента";
    document.getElementById('user-role-title').innerText = `${roleTitle}: ${profile.full_name}`;
    
    if (currentRole === 'patient') {
        renderPatientUI();
    } else {
        loadAppointments();
    }
}

// 2. Интерфейс Пациента: Список врачей + Запись
async function renderPatientUI() {
    const list = document.getElementById('appointments-list');
    list.innerHTML = `<p class="text-gray-500">Загрузка врачей...</p>`;

    // Получаем список всех врачей из базы
    const { data: doctors, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, specialty')
        .eq('role', 'doctor');

    if (error || !doctors) {
        list.innerHTML = "<p>Ошибка загрузки врачей</p>";
        return;
    }

    list.innerHTML = `
        <h4 class="font-bold mb-2 text-blue-600">Доступные врачи:</h4>
        <div class="grid gap-4">
            ${doctors.map(doc => `
                <div class="p-4 border rounded-lg bg-white shadow-sm flex justify-between items-center">
                    <div>
                        <p class="font-bold">${doc.full_name}</p>
                        <p class="text-xs text-gray-500">${doc.specialty || 'Общая практика'}</p>
                    </div>
                    <button onclick="bookAppointment('${doc.id}')" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                        Записаться
                    </button>
                </div>
            `).join('')}
        </div>
        <hr class="my-6">
        <h4 class="font-bold mb-2 text-blue-600">Мои записи:</h4>
        <div id="my-booked-appointments">Загрузка ваших записей...</div>
    `;
    loadAppointments(); // Загружаем уже созданные записи
}

// 3. Функция записи на прием
async function bookAppointment(doctorId) {
    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    const scheduledAt = new Date().toISOString();

    const { error } = await supabaseClient
        .from('appointments')
        .insert([{
            doctor_id: doctorId,
            patient_id: currentUser.id,
            room_id: roomId,
            scheduled_at: scheduledAt,
            status: 'scheduled'
        }]);

    if (error) {
        alert("Ошибка записи: " + error.message);
    } else {
        alert("Вы успешно записались на прием!");
        loadAppointments();
    }
}

// 4. Загрузка реальных встреч из базы
async function loadAppointments() {
    const containerId = currentRole === 'patient' ? 'my-booked-appointments' : 'appointments-list';
    const container = document.getElementById(containerId);
    
    // Запрос: достаем встречи и имя партнера (врача или пациента)
    const partnerTable = currentRole === 'patient' ? 'doctor_id' : 'patient_id';
    
    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            id, room_id, scheduled_at,
            profiles!appointments_${partnerTable}_fkey (full_name)
        `)
        .eq(currentRole === 'patient' ? 'patient_id' : 'doctor_id', currentUser.id);

    if (error || !data) {
        container.innerHTML = "<p class='text-sm text-gray-400'>Записей пока нет</p>";
        return;
    }

    container.innerHTML = data.map(app => `
        <div class="flex justify-between items-center p-4 border rounded bg-blue-50 mb-2 border-blue-100 shadow-sm">
            <div>
                <p class="font-bold text-gray-800">${app.profiles.full_name}</p>
                <p class="text-xs text-gray-500">${new Date(app.scheduled_at).toLocaleString()}</p>
            </div>
            <button onclick="startVideo('${app.room_id}')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">
                Войти в кабинет
            </button>
        </div>
    `).join('');
}
// НАСТРОЙКИ SUPABASE (Замени на свои из панели Supabase)
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentRole = null;

// 1. Функция входа
async function handleLogin(role) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Для демо-версии просто имитируем вход, в реальности используем supabase.auth.signIn()
    if (email && password) {
        currentUser = { email, id: Math.random().toString(36).substr(2, 9) };
        currentRole = role;
        showDashboard();
    } else {
        alert("Введите данные!");
    }
}

// 2. Отображение интерфейса
function showDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-role-title').innerText = 
        currentRole === 'patient' ? "Личный кабинет Пациента" : "Кабинет Врача";
    
    loadAppointments();
}

// 3. Загрузка списка встреч (Имитация работы с БД)
function loadAppointments() {
    const list = document.getElementById('appointments-list');
    const mockData = [
        { id: 'room-1', time: '14:00', partner: currentRole === 'patient' ? 'Д-р Смит' : 'Пациент Иван' },
        { id: 'room-2', time: '16:30', partner: currentRole === 'patient' ? 'Д-р Асанов' : 'Пациент Мария' }
    ];

    list.innerHTML = mockData.map(app => `
        <div class="flex justify-between items-center p-4 border rounded hover:bg-gray-50">
            <div>
                <p class="font-bold">${app.partner}</p>
                <p class="text-sm text-gray-500">Сегодня в ${app.time}</p>
            </div>
            <button onclick="startVideo('${app.id}')" class="bg-blue-500 text-white px-4 py-2 rounded text-sm">
                Войти в кабинет
            </button>
        </div>
    `).join('');
}

// 4. ЗАПУСК ВИДЕО (Jitsi API)
function startVideo(roomId) {
    const container = document.getElementById('video-container');
    container.innerHTML = ""; // Очищаем контейнер

    const domain = "meet.jit.si";
    const options = {
        roomName: "TeleMed-" + roomId,
        width: "100%",
        height: 450,
        parentNode: container,
        userInfo: {
            displayName: currentRole === 'patient' ? "Пациент" : "Врач"
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup', 'settings']
        }
    };
    
    const api = new JitsiMeetExternalAPI(domain, options);
}

function logout() {
    location.reload(); // Простой способ сбросить сессию
}
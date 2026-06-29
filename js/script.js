// local storage

const getUsers = () => JSON.parse(localStorage.getItem('users')) || {};
const saveUsers = (users) => localStorage.setItem('users', JSON.stringify(users));

const getCurrentUser = () => localStorage.getItem('currentUser');
const setCurrentUser = (username) => localStorage.setItem('currentUser', username);
const clearCurrentUser = () => localStorage.removeItem('currentUser');

const getUserData = (username) => JSON.parse(localStorage.getItem(`data_${username}`)) || { transactions: [], name: '', currency: '$' };
const saveUserData = (username, data) => localStorage.setItem(`data_${username}`, JSON.stringify(data));

// login aur register ke liye

function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const error = document.getElementById('reg-error');

    if (!username && !password) return showError(error, 'Please enter username and password.');
    if (!username) return showError(error, 'Please enter a username.');
    if (!password) return showError(error, 'Please enter a password.');
    if (password.length < 4) return showError(error, 'Password must be at least 4 characters.');

    const users = getUsers();
    if (users.hasOwnProperty(username)) return showError(error, 'Username already taken. Try a different one.');

    users[username] = password;
    saveUsers(users);

    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    error.classList.add('hidden');

    showSection('login');
}

function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const error = document.getElementById('login-error');

    // if (!username || !password) return showError(error, 'Please enter username and password.');
    if (!username && !password) return showError(error, 'Please enter username and password.');
    if (!username) return showError(error, 'Please enter a username.');
    if (!password) return showError(error, 'Please enter a password.');

    const users = getUsers();
    console.log('users object:', users);
    console.log('has property:', users.hasOwnProperty(username));
    console.log('type:', typeof users);

    if (!users.hasOwnProperty(username)) return showError(error, 'User not found. Please register first.');
    if (users[username] !== password) return showError(error, 'Incorrect password. Try again.');

    // console.log('username:', username);
    // console.log('password:', password);
    // console.log('stored users:', users);


    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    error.classList.add('hidden');

    setCurrentUser(username);
    loadDashboard(username);
}

function handleLogout() {
    clearCurrentUser();
    showSection('login');
}

// show, hide jo bhi UI ka kaam hai vo

function showSection(section) {
    const login = document.getElementById('login-section');
    const register = document.getElementById('register-section');
    const dashboard = document.getElementById('dashboard-section');


    login.style.display = 'none';
    register.style.display = 'none';
    dashboard.style.display = 'none';


    if (section === 'login') {
        login.style.display = 'block';
        login.querySelector('.auth-container').style.display = 'flex';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').classList.add('hidden');
        document.title = 'Login - FinTrack Pro';
    } else if (section === 'register') {
        register.style.display = 'block';
        register.querySelector('.auth-container').style.display = 'flex';
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-error').classList.add('hidden');
        document.title = 'Register - FinTrack Pro';
    } else if (section === 'dashboard') {
        dashboard.style.display = 'block';
        document.title = 'FinTrack Pro - Your Personal Record Tracker';
    }
}

function showError(e1, msg) {
    e1.textContent = msg;
    e1.classList.remove('hidden');
}

function openModal() {
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function applyDarkMode(on) {
    document.body.classList.toggle('dark', on);
    document.querySelector('.mode-toggle p').textContent = on ? 'Light Mode' : 'Dark Mode';

    const textColor = on ? '#111111' : '#ffffff';
    const gridColor = on ? '#d1d5db' : '#374151';

    if (chartInstance) {
        chartInstance.options.plugins.legend.labels.color = textColor;
        chartInstance.options.scales.x.ticks.color = textColor;
        chartInstance.options.scales.y.ticks.color = textColor;
        chartInstance.options.scales.x.grid.color = gridColor;
        chartInstance.options.scales.y.grid.color = gridColor;
        chartInstance.update();
    }
}

// transactions ke liye

function addTransaction(username) {
    const type = document.getElementById('transaction-type').value;
    const desc = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;

    if (!desc || !amount || !date || !category) return alert('Fill all fields.');

    const data = getUserData(username);
    data.transactions.push({ id: Date.now(), type, desc, amount, date, category });
    saveUserData(username, data);
    renderAll(username);
    closeModal();

}

function deleteTransaction(username, id) {
    const data = getUserData(username);
    data.transactions = data.transactions.filter(t => t.id !== id);
    saveUserData(username, data);
    renderAll(username);
}

function renderTransactions(username, filter = 'all', search = '') {
    const data = getUserData(username);
    const currency = data.currency || '$';
    let list = data.transactions;

    if (filter !== 'all') list = list.filter(t => t.type === filter);
    if (search) list = list.filter(t => t.desc.toLowerCase().includes(search.toLowerCase()));

    const tbody = document.getElementById('transaction-body');
    tbody.innerHTML = list.map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${t.desc}</td>
            <td>${t.category}</td>
            <td style="color:${t.type === 'income' ? '#22c55e' : '#ef4444'}">
                ${t.type === 'income' ? '+' : '-'}${currency}${t.amount.toFixed(2)}
            </td>
            <td>
                <button onclick="deleteTransaction('${username}', ${t.id})" 
                        style="background:transparent;border:none;color:#ef4444;cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// dashboard ke liye
let chartInstance = null;

function renderAll(username) {
    const data = getUserData(username);
    const currency = data.currency || '$';
    const txns = data.transactions;

    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    document.getElementById('total-income').textContent = `${currency}${income.toFixed(2)}`;
    document.getElementById('total-expense').textContent = `${currency}${expense.toFixed(2)}`;
    document.getElementById('current-balance').textContent = `${currency}${(income - expense).toFixed(2)}`;
    document.getElementById('total-transactions').textContent = txns.length;

    renderTransactions(username);
    renderChart(txns, currency);
}

function renderChart(txns, currency) {
    const labels = [...new Set(txns.map(t => t.date))].sort();
    const income = labels.map(d => txns.filter(t => t.date === d && t.type === 'income').reduce((s, t) => s + t.amount, 0));
    const expense = labels.map(d => txns.filter(t => t.date === d && t.type === 'expense').reduce((s, t) => s + t.amount, 0));

    const isLight = document.body.classList.contains('dark');
    const textColor = isLight ? '#111111' : '#ffffff';
    const gridColor = isLight ? '#d1d5db' : '#374151';

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Income', data: income, backgroundColor: '#22c55e' },
                { label: 'Expenses', data: expense, backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}

function loadDashboard(username) {
    const data = getUserData(username);
    document.querySelector('.navbar .name').textContent = data.name || username;
    document.getElementById('settings-name').value = data.name || '';
    document.getElementById('settings-currency').value = data.currency || '$';

    if (data.darkMode) {
        document.body.classList.add('dark');
        document.getElementById('dark-mode').checked = true;
    }

    showSection('dashboard');
    renderAll(username);
}

// jo run krega page load pe
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (user) {
        loadDashboard(user);
    } else {
        showSection('login');
    }

    // authentication
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('reg-btn').addEventListener('click', handleRegister);
    document.getElementById('logout').addEventListener('click', handleLogout);
    document.getElementById('go-register').addEventListener('click', () => showSection('register'));
    document.getElementById('go-login').addEventListener('click', () => showSection('login'));

    // modal
    document.querySelector('.add-btn').addEventListener('click', openModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('save-transaction').addEventListener('click', () => addTransaction(getCurrentUser()));

    // search aur filter
    document.getElementById('search').addEventListener('input', e => {
        renderTransactions(getCurrentUser(), document.getElementById('select').value, e.target.value);
    });
    document.getElementById('select').addEventListener('change', e => {
        renderTransactions(getCurrentUser(), e.target.value, document.getElementById('search').value);
    });

    // navbar
    document.querySelector('.nav-dashboard').addEventListener('click', () => {
        document.getElementById('dashboard-page').style.display = 'flex';
        document.getElementById('settings-page').style.display = 'none';
        document.querySelector('.nav-dashboard').classList.add('active');
        document.querySelector('.nav-settings').classList.remove('active');
    });
    document.querySelector('.nav-settings').addEventListener('click', () => {
        document.getElementById('dashboard-page').style.display = 'none';
        document.getElementById('settings-page').style.display = 'block';
        document.querySelector('.settings-container').style.display = 'flex';
        document.querySelector('.nav-settings').classList.add('active');
        document.querySelector('.nav-dashboard').classList.remove('active');
    });

    // settings
    document.getElementById('save-settings').addEventListener('click', () => {
        const user = getCurrentUser();
        const data = getUserData(user);
        data.name = document.getElementById('settings-name').value.trim();
        data.currency = document.getElementById('settings-currency').value;
        saveUserData(user, data);
        document.querySelector('.navbar .name').textContent = data.name || user;
        renderAll(user);
    });


    // clear errors on typing
    document.getElementById('login-username').addEventListener('input', () => {
        document.getElementById('login-error').classList.add('hidden');
    });
    document.getElementById('login-password').addEventListener('input', () => {
        document.getElementById('login-error').classList.add('hidden');
    });
    document.getElementById('reg-username').addEventListener('input', () => {
        document.getElementById('reg-error').classList.add('hidden');
    });
    document.getElementById('reg-password').addEventListener('input', () => {
        document.getElementById('reg-error').classList.add('hidden');
    });



    // mode switch
    document.getElementById('dark-mode').addEventListener('change', e => {
        applyDarkMode(e.target.checked);
        const user = getCurrentUser();
        const data = getUserData(user);
        data.darkMode = e.target.checked;
        saveUserData(user, data);
        renderAll(user);
    });

    // reset
    document.querySelector('.reset').addEventListener('click', () => {
        if (confirm('Reset all transactions?')) {
            const user = getCurrentUser();
            const data = getUserData(user);
            data.transactions = [];
            saveUserData(user, data);
            renderAll(user);
        }
    });
});
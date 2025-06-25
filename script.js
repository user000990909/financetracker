let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};
let currentFilter = 'all';

const categories = {
    income: ['Зарплата', 'Фриланс', 'Инвестиции', 'Подарки', 'Другое'],
    expense: ['Еда', 'Транспорт', 'Развлечения', 'Здоровье', 'Одежда', 'Коммунальные', 'Образование', 'Другое']
};

document.addEventListener('DOMContentLoaded', function() {
    setDefaultDate();
    updateCategoryOptions();
    initializeChart();
    setupEventListeners();
    
    updateUI();
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function updateCategoryOptions() {
    const typeSelect = document.getElementById('transactionType');
    const categorySelect = document.getElementById('category');
    
    const updateCategories = () => {
        const type = typeSelect.value;
        categorySelect.innerHTML = '';
        categories[type].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    };
    
    updateCategories();
    typeSelect.addEventListener('change', updateCategories);
}

function setupEventListeners() {
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('filterIncome').addEventListener('click', () => setFilter('income'));
    document.getElementById('filterExpense').addEventListener('click', () => setFilter('expense'));
    document.getElementById('filterAll').addEventListener('click', () => setFilter('all'));
    document.getElementById('exportBtn').addEventListener('click', exportData);
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transaction = {
        id: Date.now(),
        type: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        date: document.getElementById('date').value
    };
    
    transactions.unshift(transaction);
    saveData();
    updateUI();
    
    e.target.reset();
    setDefaultDate();
    
    showNotification('Транзакция добавлена!', 'success');
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
    showNotification('Транзакция удалена!', 'info');
}

function setFilter(filter) {
    currentFilter = filter;
    updateTransactionsList();
    
    document.querySelectorAll('[id^="filter"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    
    const activeBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
        activeBtn.classList.add('bg-blue-500', 'text-white');
    }
}

function updateUI() {
    updateStats();
    updateTransactionsList();
    if (expenseChart) {
        updateChart();
    }
    updateBudgetCategories();
}

function updateStats() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
    document.getElementById('balance').textContent = formatCurrency(balance);
    
    const balanceElement = document.getElementById('balance');
    const balanceCard = balanceElement.closest('.balance-card');
    if (balance < 0) {
        balanceCard.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else {
        balanceCard.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
    }
}

function updateTransactionsList() {
    const container = document.getElementById('transactionsList');
    const filteredTransactions = transactions.filter(t => {
        if (currentFilter === 'all') return true;
        return t.type === currentFilter;
    });
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>Транзакций пока нет</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTransactions.map(transaction => `
        <div class="transaction-item bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            ${transaction.type === 'income' 
                                ? '<path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>'
                                : '<path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clip-rule="evenodd"/>'
                            }
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${transaction.description || transaction.category}</p>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <span class="category-chip px-2 py-1 rounded-full text-xs">${transaction.category}</span>
                            <span>${formatDate(transaction.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </span>
                    <button onclick="deleteTransaction(${transaction.id})" class="text-gray-400 hover:text-red-500 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateBudgetCategories() {
    const container = document.getElementById('budgetCategories');
    const expensesByCategory = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p>Добавьте транзакции, чтобы увидеть бюджет по категориям</p>
            </div>
        `;
        return;
    }
    
    const defaultBudgets = {
        'Еда': 30000,
        'Транспорт': 10000,
        'Развлечения': 15000,
        'Здоровье': 8000,
        'Одежда': 12000,
        'Коммунальные': 7000
    };
    
    container.innerHTML = Object.entries(defaultBudgets).map(([category, budget]) => {
        const spent = expensesByCategory[category] || 0;
        const percentage = Math.min((spent / budget) * 100, 100);
        const remaining = Math.max(budget - spent, 0);
        
        return `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-gray-900">${category}</h4>
                    <span class="text-sm text-gray-500">${formatCurrency(spent)} / ${formatCurrency(budget)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div class="progress-bar h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
                <div class="flex justify-between text-sm text-gray-600">
                    <span>${percentage.toFixed(1)}% использовано</span>
                    <span class="${remaining === 0 ? 'text-red-600' : 'text-green-600'}">
                        ${remaining === 0 ? 'Превышен!' : `Остается: ${formatCurrency(remaining)}`}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

let expenseChart;

function initializeChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', '#22c55e',
                    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    const expensesByCategory = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });
    
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    
    if (labels.length === 0) {
        expenseChart.data.labels = ['Нет данных'];
        expenseChart.data.datasets[0].data = [1];
        expenseChart.data.datasets[0].backgroundColor = ['#e5e7eb'];
    } else {
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = data;
        expenseChart.data.datasets[0].backgroundColor = [
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
        ];
    }
    
    expenseChart.update();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('budgets', JSON.stringify(budgets));
}

function exportData() {
    const data = {
        transactions,
        budgets,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Данные экспортированы!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 animate-fade-in ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function addSampleData() {
    const sampleTransactions = [
        { id: 1, type: 'income', amount: 80000, category: 'Зарплата', description: 'Основная работа', date: '2024-01-15' },
        { id: 2, type: 'expense', amount: 15000, category: 'Еда', description: 'Продукты в магазине', date: '2024-01-16' },
        { id: 3, type: 'expense', amount: 3000, category: 'Транспорт', description: 'Проездной на месяц', date: '2024-01-17' }
    ];
    
    transactions = sampleTransactions;
    saveData();
    updateUI();
}

window.deleteTransaction = deleteTransaction;
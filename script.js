// Dati dell'applicazione
const appData = {
    assets: {
        crypto: {
            currentValue: 424,
            contributedValue: 782,
            performance: -45.78,
            forecast: 15.00,
            allocation: [
                { name: "Bitcoin (BTC)", percentage: 22.75, value: 96.46 },
                { name: "Solana (SOL)", percentage: 11.23, value: 47.62 },
                { name: "Ether (ETH)", percentage: 10.25, value: 43.46 },
                { name: "Aave (AAVE)", percentage: 7.48, value: 31.72 },
                { name: "Cardano (ADA)", percentage: 7.22, value: 30.61 },
                { name: "Altri", percentage: 41.07, value: 174.13 }
            ]
        },
        etf: {
            currentValue: 4575,
            contributedValue: 5036,
            performance: -9.15,
            forecast: 8.79,
            allocation: [
                { name: "iShares Dow Jones Global Titans 50 (EXI2)", percentage: 20, value: 915, forecast: 9.43 },
                { name: "iShares Edge MSCI World Quality Factor (IS3Q)", percentage: 20, value: 915, forecast: 13.39 },
                { name: "Xtrackers MSCI World Information Technology (XDWT)", percentage: 20, value: 915, forecast: 20.40 },
                { name: "Xtrackers MSCI USA Consumer Discretionary (XUCD)", percentage: 10, value: 457.50, forecast: -7.50 },
                { name: "Altri ETF", percentage: 30, value: 1372.50, forecast: 4.80 }
            ]
        },
        silver: {
            currentValue: 221,
            contributedValue: 228,
            performance: -3.07,
            forecast: 6.50
        }
    },
    expenses: {
        budget: 1000,
        spent: 650,
        categories: [
            { name: "Alimentari", amount: 250, percentage: 38.46, color: "#198754" },
            { name: "Trasporti", amount: 150, percentage: 23.08, color: "#dc3545" },
            { name: "Casa", amount: 120, percentage: 18.46, color: "#0d6efd" },
            { name: "Svago", amount: 80, percentage: 12.31, color: "#ffc107" },
            { name: "Altro", amount: 50, percentage: 7.69, color: "#0dcaf0" }
        ],
        transactions: [
            { date: "01/04/2025", category: "Alimentari", description: "Spesa settimanale", amount: 85.30 },
            { date: "28/03/2025", category: "Trasporti", description: "Benzina", amount: 45.00 },
            { date: "26/03/2025", category: "Svago", description: "Cinema", amount: 25.00 }
        ]
    },
    projections: {
        months: ["Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
        crypto: [424.00, 429.30, 434.67, 440.10, 445.60, 451.17, 456.81, 462.52, 487.60],
        etf: [4575.00, 4608.56, 4642.42, 4676.58, 4711.04, 4745.80, 4780.87, 4816.24, 4977.14],
        silver: [221.00, 222.21, 223.43, 224.66, 225.90, 227.15, 228.40, 229.67, 235.37],
        total: [5220.00, 5260.07, 5300.52, 5341.34, 5382.54, 5424.12, 5466.08, 5508.43, 5700.11]
    },
    alerts: {
        active: [
            { id: 1, type: "Critico", message: "Performance negativa per Crypto: -45,78%", status: "Attivo", date: "02/04/2025" },
            { id: 2, type: "Critico", message: "Performance negativa per ETF: -9,15%", status: "Attivo", date: "02/04/2025" }
        ],
        history: [
            { id: 3, type: "Avviso", message: "Budget mensile superato all'80%", status: "Risolto", date: "15/03/2025" },
            { id: 4, type: "Info", message: "Nuovo mese iniziato, budget resettato", status: "Informativo", date: "01/03/2025" }
        ],
        config: {
            performanceNegative: { enabled: true, threshold: -5 },
            performancePositive: { enabled: true, threshold: 10 },
            allocationImbalance: { enabled: true, threshold: 70 },
            budgetExceeded: { enabled: true, threshold: 90 }
        }
    }
};

// Funzione per rilevare se il dispositivo è pieghevole
function detectFoldableDevice() {
    // Controlla se il dispositivo è un Samsung Galaxy Z Fold o simile
    const isFoldable = window.matchMedia("(min-width: 768px) and (max-width: 991.98px)").matches;
    const isOpen = window.matchMedia("(min-width: 1200px)").matches;
    
    if (isFoldable) {
        document.body.classList.add('foldable-device');
        if (isOpen) {
            document.body.classList.add('fold-open');
            document.body.classList.remove('fold-closed');
        } else {
            document.body.classList.add('fold-closed');
            document.body.classList.remove('fold-open');
        }
    }
}

// Funzione per inizializzare i grafici
function initCharts() {
    // Grafico di allocazione del patrimonio
    const allocationCtx = document.getElementById('allocationChart').getContext('2d');
    const allocationChart = new Chart(allocationCtx, {
        type: 'pie',
        data: {
            labels: ['Crypto', 'ETF', 'Argento'],
            datasets: [{
                data: [
                    appData.assets.crypto.currentValue,
                    appData.assets.etf.currentValue,
                    appData.assets.silver.currentValue
                ],
                backgroundColor: [
                    '#ffc107', // Crypto
                    '#0dcaf0', // ETF
                    '#6c757d'  // Argento
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: €${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Grafico di performance mensile
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    const performanceChart = new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'Totale',
                    data: appData.projections.total,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });

    // Grafico di allocazione degli investimenti
    const investmentsAllocationCtx = document.getElementById('investmentsAllocationChart').getContext('2d');
    const investmentsAllocationChart = new Chart(investmentsAllocationCtx, {
        type: 'doughnut',
        data: {
            labels: ['Crypto', 'ETF', 'Argento'],
            datasets: [{
                data: [
                    appData.assets.crypto.currentValue,
                    appData.assets.etf.currentValue,
                    appData.assets.silver.currentValue
                ],
                backgroundColor: [
                    '#ffc107', // Crypto
                    '#0dcaf0', // ETF
                    '#6c757d'  // Argento
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: €${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Grafico di allocazione crypto
    const cryptoAllocationCtx = document.getElementById('cryptoAllocationChart').getContext('2d');
    const cryptoAllocationChart = new Chart(cryptoAllocationCtx, {
        type: 'pie',
        data: {
            labels: appData.assets.crypto.allocation.map(item => item.name),
            datasets: [{
                data: appData.assets.crypto.allocation.map(item => item.percentage),
                backgroundColor: [
                    '#f7931a', // Bitcoin
                    '#00ffbd', // Solana
                    '#627eea', // Ethereum
                    '#2ebac6', // Aave
                    '#0033ad', // Cardano
                    '#cccccc'  // Altri
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = context.raw;
                            const value = appData.assets.crypto.allocation.find(item => item.name === context.label).value;
                            return `${context.label}: ${percentage}% (€${value})`;
                        }
                    }
                }
            }
        }
    });

    // Grafico di proiezione crypto
    const cryptoProjectionCtx = document.getElementById('cryptoProjectionChart').getContext('2d');
    const cryptoProjectionChart = new Chart(cryptoProjectionCtx, {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'Crypto',
                    data: appData.projections.crypto,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });

    // Grafico di allocazione ETF
    const etfAllocationCtx = document.getElementById('etfAllocationChart').getContext('2d');
    const etfAllocationChart = new Chart(etfAllocationCtx, {
        type: 'pie',
        data: {
            labels: appData.assets.etf.allocation.map(item => item.name),
            datasets: [{
                data: appData.assets.etf.allocation.map(item => item.percentage),
                backgroundColor: [
                    '#0dcaf0',
                    '#20c997',
                    '#0d6efd',
                    '#6610f2',
                    '#6c757d'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = context.raw;
                            const value = appData.assets.etf.allocation.find(item => item.name === context.label).value;
                            return `${context.label}: ${percentage}% (€${value})`;
                        }
                    }
                }
            }
        }
    });

    // Grafico di proiezione ETF
    const etfProjectionCtx = document.getElementById('etfProjectionChart').getContext('2d');
    const etfProjectionChart = new Chart(etfProjectionCtx, {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'ETF',
                    data: appData.projections.etf,
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });

    // Grafico prezzo argento
    const silverPriceCtx = document.getElementById('silverPriceChart').getContext('2d');
    const silverPriceChart = new Chart(silverPriceCtx, {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
            datasets: [
                {
                    label: 'Prezzo Argento (€/oz)',
                    data: [22.50, 22.80, 23.10, 23.50, 23.80, 24.20, 24.50, 24.90, 25.30, 25.70, 26.10, 26.50],
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });

    // Grafico di proiezione argento
    const silverProjectionCtx = document.getElementById('silverProjectionChart').getContext('2d');
    const silverProjectionChart = new Chart(silverProjectionCtx, {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'Argento',
                    data: appData.projections.silver,
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });

    // Grafico spese per categoria
    const expenseCategoryCtx = document.getElementById('expenseCategoryChart').getContext('2d');
    const expenseCategoryChart = new Chart(expenseCategoryCtx, {
        type: 'doughnut',
        data: {
            labels: appData.expenses.categories.map(cat => cat.name),
            datasets: [{
                data: appData.expenses.categories.map(cat => cat.amount),
                backgroundColor: appData.expenses.categories.map(cat => cat.color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: €${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Grafico proiezione totale
    const totalProjectionCtx = document.getElementById('totalProjectionChart').getContext('2d');
    const totalProjectionChart = new Chart(totalProjectionCtx, {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'Totale',
                    data: appData.projections.total,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Crypto',
                    data: appData.projections.crypto,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'ETF',
                    data: appData.projections.etf,
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Argento',
                    data: appData.projections.silver,
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });
}

// Funzione per gestire la navigazione tra le sezioni
function setupNavigation() {
    // Array di tutti gli ID delle tab
    const tabIds = [
        'dashboard-tab', 'investments-tab', 'crypto-tab', 'etf-tab', 'silver-tab', 
        'expenses-tab', 'projections-tab', 'alerts-tab',
        'mobile-dashboard-tab', 'mobile-investments-tab', 'mobile-crypto-tab', 'mobile-etf-tab', 
        'mobile-silver-tab', 'mobile-expenses-tab', 'mobile-projections-tab', 'mobile-alerts-tab'
    ];
    
    // Array di tutti gli ID dei contenuti
    const contentIds = [
        'dashboard-content', 'investments-content', 'crypto-content', 'etf-content', 
        'silver-content', 'expenses-content', 'projections-content', 'alerts-content'
    ];
    
    // Funzione per mostrare una sezione specifica
    function showSection(sectionId) {
        // Nascondi tutti i contenuti
        contentIds.forEach(id => {
            document.getElementById(id).classList.add('d-none');
        });
        
        // Mostra il contenuto selezionato
        document.getElementById(sectionId).classList.remove('d-none');
        
        // Aggiorna la classe active delle tab
        tabIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes(sectionId.replace('-content', ''))) {
                    element.classList.add('active');
                    if (element.classList.contains('text-white')) {
                        element.classList.remove('text-white');
                    }
                } else {
                    element.classList.remove('active');
                    if (id.includes('mobile') || !id.includes('dashboard')) {
                        element.classList.add('text-white');
                    }
                }
            }
        });
    }
    
    // Aggiungi event listener a tutte le tab
    tabIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = id.replace('mobile-', '').replace('-tab', '-content');
                showSection(sectionId);
            });
        }
    });
}

// Funzione per gestire i modali
function setupModals() {
    // Modal per modifica asset
    const editAssetButtons = document.querySelectorAll('.edit-asset');
    editAssetButtons.forEach(button => {
        button.addEventListener('click', function() {
            const assetType = this.getAttribute('data-asset-type');
            const asset = appData.assets[assetType];
            
            document.getElementById('assetType').value = assetType;
            document.getElementById('currentValue').value = asset.currentValue;
            document.getElementById('contributedValue').value = asset.contributedValue;
            document.getElementById('growthForecast').value = asset.forecast;
            
            const modal = new bootstrap.Modal(document.getElementById('editAssetModal'));
            modal.show();
        });
    });
    
    // Salvataggio modifiche asset
    document.getElementById('saveAssetChanges').addEventListener('click', function() {
        const assetType = document.getElementById('assetType').value;
        const currentValue = parseFloat(document.getElementById('currentValue').value);
        const contributedValue = parseFloat(document.getElementById('contributedValue').value);
        const growthForecast = parseFloat(document.getElementById('growthForecast').value);
        
        // Aggiorna i dati
        appData.assets[assetType].currentValue = currentValue;
        appData.assets[assetType].contributedValue = contributedValue;
        appData.assets[assetType].forecast = growthForecast;
        
        // Calcola la nuova performance
        const performance = ((currentValue - contributedValue) / contributedValue) * 100;
        appData.assets[assetType].performance = performance;
        
        // Aggiorna l'interfaccia
        updateUI();
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editAssetModal'));
        modal.hide();
        
        // Mostra notifica
        showNotification('Asset aggiornato con successo!');
    });
    
    // Modal per aggiunta spesa
    document.getElementById('add-expense-btn').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
        modal.show();
    });
    
    // Salvataggio nuova spesa
    document.getElementById('saveExpense').addEventListener('click', function() {
        const description = document.getElementById('expenseDescription').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = document.getElementById('expenseDate').value;
        
        // Formatta la data
        const dateObj = new Date(date);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        // Aggiungi la nuova spesa
        appData.expenses.transactions.unshift({
            date: formattedDate,
            category: category,
            description: description,
            amount: amount
        });
        
        // Aggiorna le spese totali
        appData.expenses.spent += amount;
        
        // Aggiorna l'interfaccia
        updateUI();
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        // Mostra notifica
        showNotification('Spesa aggiunta con successo!');
    });
    
    // Modal per modifica proiezioni
    document.getElementById('edit-projections-btn').addEventListener('click', function() {
        document.getElementById('cryptoGrowth').value = appData.assets.crypto.forecast;
        document.getElementById('etfGrowth').value = appData.assets.etf.forecast;
        document.getElementById('silverGrowth').value = appData.assets.silver.forecast;
        
        const modal = new bootstrap.Modal(document.getElementById('editProjectionsModal'));
        modal.show();
    });
    
    // Salvataggio modifiche proiezioni
    document.getElementById('saveProjections').addEventListener('click', function() {
        const cryptoGrowth = parseFloat(document.getElementById('cryptoGrowth').value);
        const etfGrowth = parseFloat(document.getElementById('etfGrowth').value);
        const silverGrowth = parseFloat(document.getElementById('silverGrowth').value);
        
        // Aggiorna i dati
        appData.assets.crypto.forecast = cryptoGrowth;
        appData.assets.etf.forecast = etfGrowth;
        appData.assets.silver.forecast = silverGrowth;
        
        // Ricalcola le proiezioni
        calculateProjections();
        
        // Aggiorna l'interfaccia
        updateUI();
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProjectionsModal'));
        modal.hide();
        
        // Mostra notifica
        showNotification('Proiezioni aggiornate con successo!');
    });
    
    // Modal per configurazione alert
    document.getElementById('edit-alerts-btn').addEventListener('click', function() {
        document.getElementById('alertPerformanceNegative').checked = appData.alerts.config.performanceNegative.enabled;
        document.getElementById('thresholdPerformanceNegative').value = appData.alerts.config.performanceNegative.threshold;
        document.getElementById('alertPerformancePositive').checked = appData.alerts.config.performancePositive.enabled;
        document.getElementById('thresholdPerformancePositive').value = appData.alerts.config.performancePositive.threshold;
        document.getElementById('alertAllocationImbalance').checked = appData.alerts.config.allocationImbalance.enabled;
        document.getElementById('thresholdAllocationImbalance').value = appData.alerts.config.allocationImbalance.threshold;
        document.getElementById('alertBudgetExceeded').checked = appData.alerts.config.budgetExceeded.enabled;
        document.getElementById('thresholdBudgetExceeded').value = appData.alerts.config.budgetExceeded.threshold;
        
        const modal = new bootstrap.Modal(document.getElementById('editAlertsModal'));
        modal.show();
    });
    
    // Salvataggio configurazione alert
    document.getElementById('save-alerts-config').addEventListener('click', function() {
        appData.alerts.config.performanceNegative.enabled = document.getElementById('alertPerformanceNegative').checked;
        appData.alerts.config.performanceNegative.threshold = parseFloat(document.getElementById('thresholdPerformanceNegative').value);
        appData.alerts.config.performancePositive.enabled = document.getElementById('alertPerformancePositive').checked;
        appData.alerts.config.performancePositive.threshold = parseFloat(document.getElementById('thresholdPerformancePositive').value);
        appData.alerts.config.allocationImbalance.enabled = document.getElementById('alertAllocationImbalance').checked;
        appData.alerts.config.allocationImbalance.threshold = parseFloat(document.getElementById('thresholdAllocationImbalance').value);
        appData.alerts.config.budgetExceeded.enabled = document.getElementById('alertBudgetExceeded').checked;
        appData.alerts.config.budgetExceeded.threshold = parseFloat(document.getElementById('thresholdBudgetExceeded').value);
        
        // Aggiorna gli alert
        checkAlerts();
        
        // Aggiorna l'interfaccia
        updateUI();
        
        // Mostra notifica
        showNotification('Configurazione alert salvata con successo!');
    });
    
    // Modal per aggiunta transazione
    document.getElementById('add-transaction-btn').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        modal.show();
    });
    
    // Bottoni nel modal di aggiunta transazione
    document.getElementById('addInvestmentBtn').addEventListener('click', function() {
        const transactionModal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        transactionModal.hide();
        
        const investmentModal = new bootstrap.Modal(document.getElementById('addInvestmentModal'));
        investmentModal.show();
    });
    
    document.getElementById('addExpenseFromTransactionBtn').addEventListener('click', function() {
        const transactionModal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        transactionModal.hide();
        
        const expenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
        expenseModal.show();
    });
    
    // Salvataggio nuovo investimento
    document.getElementById('saveInvestment').addEventListener('click', function() {
        const asset = document.getElementById('investmentAsset').value;
        const amount = parseFloat(document.getElementById('investmentAmount').value);
        const date = document.getElementById('investmentDate').value;
        const description = document.getElementById('investmentDescription').value || `Investimento in ${asset}`;
        
        // Aggiorna i dati
        appData.assets[asset].contributedValue += amount;
        appData.assets[asset].currentValue += amount;
        
        // Ricalcola la performance
        const performance = ((appData.assets[asset].currentValue - appData.assets[asset].contributedValue) / appData.assets[asset].contributedValue) * 100;
        appData.assets[asset].performance = performance;
        
        // Ricalcola le proiezioni
        calculateProjections();
        
        // Aggiorna l'interfaccia
        updateUI();
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addInvestmentModal'));
        modal.hide();
        
        // Mostra notifica
        showNotification('Investimento aggiunto con successo!');
    });
    
    // Gestione dismissione alert
    const dismissButtons = document.querySelectorAll('.dismiss-alert');
    dismissButtons.forEach(button => {
        button.addEventListener('click', function() {
            const alertId = parseInt(this.getAttribute('data-alert-id'));
            
            // Trova l'alert e cambia il suo stato
            const alertIndex = appData.alerts.active.findIndex(alert => alert.id === alertId);
            if (alertIndex !== -1) {
                const alert = appData.alerts.active[alertIndex];
                alert.status = 'Risolto';
                
                // Sposta l'alert nella cronologia
                appData.alerts.history.unshift(alert);
                appData.alerts.active.splice(alertIndex, 1);
                
                // Aggiorna l'interfaccia
                updateUI();
                
                // Mostra notifica
                showNotification('Alert ignorato con successo!');
            }
        });
    });
}

// Funzione per calcolare le proiezioni
function calculateProjections() {
    // Calcola le proiezioni per ogni asset
    const cryptoGrowth = appData.assets.crypto.forecast / 100;
    const etfGrowth = appData.assets.etf.forecast / 100;
    const silverGrowth = appData.assets.silver.forecast / 100;
    
    // Valori iniziali
    const cryptoStart = appData.assets.crypto.currentValue;
    const etfStart = appData.assets.etf.currentValue;
    const silverStart = appData.assets.silver.currentValue;
    
    // Calcola i valori mensili
    for (let i = 0; i < appData.projections.months.length; i++) {
        if (i === 0) {
            // Il primo mese è il valore attuale
            appData.projections.crypto[i] = cryptoStart;
            appData.projections.etf[i] = etfStart;
            appData.projections.silver[i] = silverStart;
        } else if (i === appData.projections.months.length - 1) {
            // L'ultimo mese è il valore finale con la crescita annuale
            appData.projections.crypto[i] = cryptoStart * (1 + cryptoGrowth);
            appData.projections.etf[i] = etfStart * (1 + etfGrowth);
            appData.projections.silver[i] = silverStart * (1 + silverGrowth);
        } else {
            // I mesi intermedi hanno una crescita proporzionale
            const progress = (i + 1) / appData.projections.months.length;
            appData.projections.crypto[i] = cryptoStart * (1 + (cryptoGrowth * progress));
            appData.projections.etf[i] = etfStart * (1 + (etfGrowth * progress));
            appData.projections.silver[i] = silverStart * (1 + (silverGrowth * progress));
        }
        
        // Calcola il totale
        appData.projections.total[i] = appData.projections.crypto[i] + appData.projections.etf[i] + appData.projections.silver[i];
    }
}

// Funzione per verificare gli alert
function checkAlerts() {
    appData.alerts.active = [];
    
    // Verifica performance negative
    if (appData.alerts.config.performanceNegative.enabled) {
        const threshold = appData.alerts.config.performanceNegative.threshold;
        
        if (appData.assets.crypto.performance < threshold) {
            appData.alerts.active.push({
                id: Date.now(),
                type: "Critico",
                message: `Performance negativa per Crypto: ${appData.assets.crypto.performance.toFixed(2)}%`,
                status: "Attivo",
                date: new Date().toLocaleDateString('it-IT')
            });
        }
        
        if (appData.assets.etf.performance < threshold) {
            appData.alerts.active.push({
                id: Date.now() + 1,
                type: "Critico",
                message: `Performance negativa per ETF: ${appData.assets.etf.performance.toFixed(2)}%`,
                status: "Attivo",
                date: new Date().toLocaleDateString('it-IT')
            });
        }
        
        if (appData.assets.silver.performance < threshold) {
            appData.alerts.active.push({
                id: Date.now() + 2,
                type: "Critico",
                message: `Performance negativa per Argento: ${appData.assets.silver.performance.toFixed(2)}%`,
                status: "Attivo",
                date: new Date().toLocaleDateString('it-IT')
            });
        }
    }
    
    // Verifica budget superato
    if (appData.alerts.config.budgetExceeded.enabled) {
        const threshold = appData.alerts.config.budgetExceeded.threshold;
        const budgetPercentage = (appData.expenses.spent / appData.expenses.budget) * 100;
        
        if (budgetPercentage > threshold) {
            appData.alerts.active.push({
                id: Date.now() + 3,
                type: "Avviso",
                message: `Budget mensile superato al ${budgetPercentage.toFixed(0)}%`,
                status: "Attivo",
                date: new Date().toLocaleDateString('it-IT')
            });
        }
    }
}

// Funzione per mostrare notifiche
function showNotification(message) {
    // Crea l'elemento della notifica
    const notification = document.createElement('div');
    notification.className = 'toast align-items-center text-white bg-primary border-0';
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.setAttribute('aria-atomic', 'true');
    
    notification.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Aggiungi la notifica al container
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.appendChild(notification);
    document.body.appendChild(container);
    
    // Mostra la notifica
    const toast = new bootstrap.Toast(notification, {
        autohide: true,
        delay: 3000
    });
    toast.show();
    
    // Rimuovi il container dopo che la notifica è stata nascosta
    notification.addEventListener('hidden.bs.toast', function() {
        document.body.removeChild(container);
    });
}

// Funzione per aggiornare l'interfaccia
function updateUI() {
    // Aggiorna i valori visualizzati
    
    // Dashboard
    document.querySelectorAll('.content-section').forEach(section => {
        if (!section.classList.contains('d-none')) {
            // Reinizializza i grafici
            initCharts();
        }
    });
}

// Inizializzazione dell'applicazione
document.addEventListener('DOMContentLoaded', function() {
    // Rileva se il dispositivo è pieghevole
    detectFoldableDevice();
    
    // Inizializza i grafici
    initCharts();
    
    // Configura la navigazione
    setupNavigation();
    
    // Configura i modali
    setupModals();
    
    // Verifica gli alert
    checkAlerts();
    
    // Aggiorna l'interfaccia
    updateUI();
    
    // Gestisci il ridimensionamento della finestra
    window.addEventListener('resize', function() {
        detectFoldableDevice();
    });
});

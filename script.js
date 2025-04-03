// Dati dell'applicazione (valori iniziali di esempio)
let appData = {
    assets: {
        crypto: {
            name: "Crypto", currentValue: 424, contributedValue: 782, performance: -45.78, forecast: 15.00, color: '#ffc107',
            allocation: [
                { name: "Bitcoin (BTC)", percentage: 22.75, value: 0 }, { name: "Solana (SOL)", percentage: 11.23, value: 0 },
                { name: "Ether (ETH)", percentage: 10.25, value: 0 }, { name: "Aave (AAVE)", percentage: 7.48, value: 0 },
                { name: "Cardano (ADA)", percentage: 7.22, value: 0 }, { name: "Altri", percentage: 41.07, value: 0 }
            ]
        },
        etf: {
            name: "ETF", currentValue: 4575, contributedValue: 5036, performance: -9.15, forecast: 8.79, color: '#0dcaf0',
            allocation: [
                { name: "iShares DJ Global Titans 50", percentage: 20, value: 0, forecast: 9.43 },
                { name: "iShares Edge MSCI World Quality", percentage: 20, value: 0, forecast: 13.39 },
                { name: "Xtrackers MSCI World IT", percentage: 20, value: 0, forecast: 20.40 },
                { name: "Xtrackers MSCI USA Cons Disc", percentage: 10, value: 0, forecast: -7.50 },
                { name: "Altri ETF", percentage: 30, value: 0, forecast: 4.80 }
            ]
        },
        silver: {
            name: "Argento", currentValue: 221, contributedValue: 228, performance: -3.07, forecast: 6.50, color: '#6c757d',
            allocation: null // Nessuna sotto-allocazione per l'argento
        }
    },
    expenses: {
        budget: 1000, spent: 650,
        categories: [ // Assicurati che i nomi corrispondano alle opzioni nel select
            { name: "Alimentari", amount: 0, percentage: 0, color: "#198754" }, { name: "Trasporti", amount: 0, percentage: 0, color: "#dc3545" },
            { name: "Casa", amount: 0, percentage: 0, color: "#0d6efd" }, { name: "Svago", amount: 0, percentage: 0, color: "#ffc107" },
            { name: "Altro", amount: 0, percentage: 0, color: "#fd7e14" }
        ],
        transactions: [
             { id: 1, date: "01/04/2025", category: "Alimentari", description: "Spesa settimanale", amount: 85.30 },
             { id: 2, date: "28/03/2025", category: "Trasporti", description: "Benzina", amount: 45.00 },
             { id: 3, date: "26/03/2025", category: "Svago", description: "Cinema", amount: 25.00 }
        ]
    },
    projections: {
        // Mesi verranno popolati da calculateProjections
        months: ["Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
        crypto: [], etf: [], silver: [], total: []
    },
    alerts: {
        active: [], history: [],
        config: {
            performanceNegative: { enabled: true, threshold: -5 }, performancePositive: { enabled: true, threshold: 10 },
            allocationImbalance: { enabled: true, threshold: 70 }, budgetExceeded: { enabled: true, threshold: 90 }
        }
    },
    portfolio: { totalValue: 0, totalContributions: 0, totalPerformance: 0 },
    // Aggiungi transazioni dashboard (opzionale)
    dashboardTransactions: []
};

// Store chart instances
const charts = {};
const currentYear = new Date().getFullYear();

// --- UTILITY FUNCTIONS ---
function formatCurrency(value) {
    if (isNaN(value) || value === null) return "€ --,--";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPercentage(value) {
    if (isNaN(value) || value === null) return "--,--%";
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
function getPerformanceClass(value) {
    if (isNaN(value) || value === null) return 'text-secondary';
    return value >= 0 ? 'text-success' : 'text-danger';
}

// --- DATA CALCULATION & AGGREGATION ---
function calculateAssetPerformance(assetType) {
    const asset = appData.assets[assetType];
    if (asset && asset.contributedValue > 0 && asset.currentValue !== null) {
        asset.performance = ((asset.currentValue - asset.contributedValue) / asset.contributedValue) * 100;
    } else if(asset) {
        asset.performance = 0;
    }
}
function calculatePortfolioTotals() {
    let tv = 0, tc = 0;
    for (const key in appData.assets) {
        calculateAssetPerformance(key); // Ricalcola performance singolo asset PRIMA
        tv += appData.assets[key].currentValue || 0;
        tc += appData.assets[key].contributedValue || 0;
        // Ricalcola valore $ delle sotto-allocazioni (se presenti)
        if (appData.assets[key].allocation) {
             appData.assets[key].allocation.forEach(item => {
                item.value = (item.percentage / 100) * (appData.assets[key].currentValue || 0);
             });
        }
    }
    appData.portfolio.totalValue = tv;
    appData.portfolio.totalContributions = tc;
    appData.portfolio.totalPerformance = (tc > 0 && tv > 0) ? ((tv - tc) / tc) * 100 : 0;
}
function recalculateExpenseTotals() {
    appData.expenses.spent = appData.expenses.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    appData.expenses.categories.forEach(cat => cat.amount = 0); // Resetta
    appData.expenses.transactions.forEach(tx => {
        const category = appData.expenses.categories.find(cat => cat.name === tx.category);
        (category || appData.expenses.categories.find(cat => cat.name === 'Altro')).amount += tx.amount;
    });
    const totalSpent = appData.expenses.spent;
    appData.expenses.categories.forEach(cat => {
        cat.percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
    });
}
function calculateProjections() {
    const numMonths = appData.projections.months.length;
    if (numMonths === 0) return;

    // Aggiorna etichette mesi (aggiungi anno a Dicembre)
    appData.projections.months = appData.projections.months.map((month, index) =>
         /^\d+$/.test(month.slice(-4)) ? month : (index === numMonths - 1 ? `${month} ${currentYear}` : month)
    );

    // Resetta array proiezioni
    for (const key in appData.assets) { appData.projections[key] = []; }
    appData.projections.total = [];

    for (let i = 0; i < numMonths; i++) {
        let monthTotal = 0;
        const progress = (numMonths > 1) ? (i / (numMonths - 1)) : 1; // Progresso da 0 a 1

        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const growthRate = (asset.forecast || 0) / 100;
            const projectedValue = (asset.currentValue || 0) * (1 + growthRate * progress);
            appData.projections[key].push(parseFloat(projectedValue.toFixed(2)));
            monthTotal += projectedValue;
        }
        appData.projections.total.push(parseFloat(monthTotal.toFixed(2)));
    }
     // Aggiorna anno negli span .current-year
    document.querySelectorAll('.current-year').forEach(span => span.textContent = currentYear);
}
function checkAlerts() {
    const newActiveAlerts = [];
    const config = appData.alerts.config;
    const today = new Date().toLocaleDateString('it-IT');
    const existingMessages = new Set(appData.alerts.active.map(a => a.message)); // Evita duplicati esatti

    function addAlert(type, message) {
        if (!existingMessages.has(message)) {
             newActiveAlerts.push({
                id: Date.now() + newActiveAlerts.length, // ID univoco crescente
                type: type, message: message, status: "Attivo", date: today
            });
             existingMessages.add(message); // Aggiungi al set per controllo futuro
        }
    }

    if (config.performanceNegative.enabled) {
        for (const key in appData.assets) {
            if (appData.assets[key].performance < config.performanceNegative.threshold)
                addAlert("Critico", `Perf. negativa ${appData.assets[key].name}: ${formatPercentage(appData.assets[key].performance)}`);
        }
    }
    if (config.performancePositive.enabled) {
         for (const key in appData.assets) {
            if (appData.assets[key].performance > config.performancePositive.threshold)
                addAlert("Info", `Perf. positiva ${appData.assets[key].name}: ${formatPercentage(appData.assets[key].performance)}`);
        }
    }
    if (config.budgetExceeded.enabled && appData.expenses.budget > 0) {
        const perc = (appData.expenses.spent / appData.expenses.budget) * 100;
        if (perc > config.budgetExceeded.threshold) addAlert("Avviso", `Budget superato (${formatPercentage(perc)})`);
    }
    if (config.allocationImbalance.enabled && appData.portfolio.totalValue > 0) {
        for (const key in appData.assets) {
            const perc = (appData.assets[key].currentValue / appData.portfolio.totalValue) * 100;
            if (perc > config.allocationImbalance.threshold) addAlert("Avviso", `Allocazione ${appData.assets[key].name} elevata: ${formatPercentage(perc)}`);
        }
    }
    // Mantieni alert precedenti non risolti + aggiungi nuovi non duplicati
     appData.alerts.active = [...appData.alerts.active.filter(a => a.status === 'Attivo'), ...newActiveAlerts];
}

// --- UI UPDATE FUNCTIONS ---
function updateElement(id, text, className = null, classesToRemove = []) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        if (classesToRemove.length > 0) element.classList.remove(...classesToRemove);
        if (className) element.classList.add(className);
    } else {
        // console.warn(`Elemento UI non trovato con ID: ${id}`);
    }
}

function updateUI() {
    console.log("Inizio Aggiornamento UI...");
    calculatePortfolioTotals(); // Include performance asset e valori allocazioni
    calculateProjections();
    checkAlerts();
    recalculateExpenseTotals(); // Assicurati che sia chiamato prima di aggiornare UI spese

    // == Dashboard ==
    updateElement('dashboard-total-value', formatCurrency(appData.portfolio.totalValue));
    updateElement('dashboard-total-contributions', formatCurrency(appData.portfolio.totalContributions));
    updateElement('dashboard-total-performance', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
    // Asset summaries
    updateElement('dashboard-crypto-value', formatCurrency(appData.assets.crypto.currentValue));
    updateElement('dashboard-crypto-performance', formatPercentage(appData.assets.crypto.performance), getPerformanceClass(appData.assets.crypto.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('dashboard-etf-value', formatCurrency(appData.assets.etf.currentValue));
    updateElement('dashboard-etf-performance', formatPercentage(appData.assets.etf.performance), getPerformanceClass(appData.assets.etf.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('dashboard-silver-value', formatCurrency(appData.assets.silver.currentValue));
    updateElement('dashboard-silver-performance', formatPercentage(appData.assets.silver.performance), getPerformanceClass(appData.assets.silver.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateDashboardAlerts();
    updateDashboardTransactionsTable();

    // == Investimenti ==
    updateElement('investments-total-value', formatCurrency(appData.portfolio.totalValue));
    updateElement('investments-total-contributions', formatCurrency(appData.portfolio.totalContributions));
    updateElement('investments-total-performance', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
    // Cards
    for (const key in appData.assets) { updateAssetCardInInvestments(key); }
    updateAllocationTable('#investments-allocation-table-body'); // Passa ID tbody

    // == Sezioni Asset Singoli ==
    for (const key in appData.assets) { updateAssetDetailsSection(key); }

    // == Spese ==
    updateExpensesSection();

    // == Proiezioni ==
    updateProjectionsSection();

    // == Alert ==
    updateAlertsSection();

    // == Grafici ==
    initOrUpdateAllCharts();
    console.log("Fine Aggiornamento UI.");
}

// == Funzioni di Aggiornamento Specifiche ==
function updateAssetCardInInvestments(assetType) {
    const asset = appData.assets[assetType];
    updateElement(`investments-${assetType}-value`, formatCurrency(asset.currentValue));
    updateElement(`investments-${assetType}-contributions`, `Contributi: ${formatCurrency(asset.contributedValue)}`);
    const perfLi = document.getElementById(`investments-${assetType}-performance`);
    if(perfLi) {
        perfLi.textContent = `Performance: ${formatPercentage(asset.performance)}`;
        perfLi.className = getPerformanceClass(asset.performance); // Applica classe direttamente a LI
    }
     const forecastLi = document.getElementById(`investments-${assetType}-forecast`);
     if(forecastLi) {
         forecastLi.textContent = `Previsione: ${formatPercentage(asset.forecast)}`;
         forecastLi.className = getPerformanceClass(asset.forecast); // Usa stessa logica o adattala
     }
}
function updateAllocationTable(tableBodyId) {
    const tableBody = document.getElementById(tableBodyId.substring(1)); // Rimuovi # per getElementById
    if (!tableBody) return;
    let html = '';
    const totalValue = appData.portfolio.totalValue;
    for (const key in appData.assets) {
        const asset = appData.assets[key];
        const perc = totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0;
        const textColor = ['#ffc107'].includes(asset.color) ? 'text-dark' : 'text-white';
        html += `<tr><td><span class="badge ${textColor}" style="background-color:${asset.color};">${asset.name}</span></td><td>${formatCurrency(asset.currentValue)}</td><td class="text-end">${formatPercentage(perc)}</td></tr>`;
    }
    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center">Dati non disponibili.</td></tr>';
}
function updateAssetDetailsSection(assetType) {
    const asset = appData.assets[assetType];
    updateElement(`${assetType}-details-value`, formatCurrency(asset.currentValue));
    updateElement(`${assetType}-details-contributions`, formatCurrency(asset.contributedValue));
    updateElement(`${assetType}-details-performance`, formatPercentage(asset.performance), getPerformanceClass(asset.performance), ['text-danger', 'text-success', 'text-secondary']);
    if (asset.allocation) updateAssetCompositionTable(assetType);
}
function updateAssetCompositionTable(assetType) {
    const tableBody = document.getElementById(`${assetType}-composition-table-body`);
    const asset = appData.assets[assetType];
    if (!tableBody || !asset.allocation) return;
    let html = '';
    asset.allocation.forEach(item => {
        const valueText = formatCurrency(item.value);
        if (assetType === 'crypto') {
            html += `<tr><td>${item.name}</td><td>${formatPercentage(item.percentage)}</td><td class="text-end">${valueText}</td></tr>`;
        } else if (assetType === 'etf') {
             html += `<tr><td>${item.name}</td><td class="${getPerformanceClass(item.forecast)}">${formatPercentage(item.forecast)}</td><td class="text-end">${valueText}</td></tr>`;
        }
    });
    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center">Dati composizione non disponibili.</td></tr>';
}
function updateExpensesSection() {
    const exp = appData.expenses;
    const perc = exp.budget > 0 ? (exp.spent / exp.budget) * 100 : 0;
    const remain = exp.budget - exp.spent;
    const progress = document.getElementById('expenses-budget-progress');
    if (progress) {
        progress.style.width = `${perc}%`; progress.textContent = `${perc.toFixed(0)}%`; progress.setAttribute('aria-valuenow', perc);
        progress.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (perc > 90) progress.classList.add('bg-danger'); else if (perc > 70) progress.classList.add('bg-warning'); else progress.classList.add('bg-success');
    }
    updateElement('expenses-budget-summary', `${formatCurrency(exp.spent)} / ${formatCurrency(exp.budget)}`);
    updateElement('expenses-spent-value', formatCurrency(exp.spent));
    updateElement('expenses-budget-value', formatCurrency(exp.budget));
    updateElement('expenses-remaining-value', formatCurrency(remain), getPerformanceClass(remain), ['text-danger', 'text-success', 'text-secondary']);

    const catTableBody = document.getElementById('expenses-category-table-body');
    if (catTableBody) {
        let html = '';
        exp.categories.filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).forEach(cat => {
            const textColor = ['#ffc107', '#0dcaf0'].includes(cat.color) ? 'text-dark' : 'text-white';
            html += `<tr><td><span class="badge ${textColor}" style="background-color:${cat.color};">${cat.name}</span></td><td>${formatCurrency(cat.amount)}</td><td class="text-end">${formatPercentage(cat.percentage)}</td></tr>`;
        });
        catTableBody.innerHTML = html || '<tr><td colspan="3" class="text-center">Nessuna spesa registrata.</td></tr>';
    }
    const listTableBody = document.getElementById('expenses-list-table-body');
    if (listTableBody) {
        let html = '';
        exp.transactions.sort((a,b) => b.id - a.id).forEach(tx => { // Ordina per ID (più recenti)
             const catColor = exp.categories.find(c => c.name === tx.category)?.color || '#6c757d';
             const textColor = ['#ffc107', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
             html += `<tr><td class="ps-3">${tx.date}</td><td><span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span></td><td>${tx.description}</td><td class="text-danger text-end">${formatCurrency(tx.amount)}</td><td class="text-center pe-3"><button class="btn btn-sm btn-outline-primary edit-expense py-0 px-1 me-1" data-expense-id="${tx.id}"><i class="bi bi-pencil small"></i></button><button class="btn btn-sm btn-outline-danger delete-expense py-0 px-1" data-expense-id="${tx.id}"><i class="bi bi-trash small"></i></button></td></tr>`;
        });
        listTableBody.innerHTML = html || '<tr><td colspan="5" class="text-center p-3">Nessuna spesa registrata.</td></tr>';
        setupExpenseActionButtons(); // Riattacca listener dopo update HTML
    }
}
function updateProjectionsSection() {
    const proj = appData.projections;
    const lastIdx = proj.months.length - 1;
    if (lastIdx < 0) return;

    const detailsBody = document.getElementById('projections-details-table-body');
    if (detailsBody) {
        let html = '';
        const totalProj = proj.total[lastIdx]; const totalCurr = appData.portfolio.totalValue;
        const totalGrowth = totalCurr > 0 ? ((totalProj - totalCurr) / totalCurr) * 100 : 0;
        for(const key in appData.assets){
            const asset = appData.assets[key];
            html += `<tr><td>${asset.name}</td><td>${formatCurrency(asset.currentValue)}</td><td>${formatCurrency(proj[key][lastIdx])}</td><td class="${getPerformanceClass(asset.forecast)}">${formatPercentage(asset.forecast)}</td></tr>`;
        }
        html += `<tr class="table-primary fw-bold"><td>Totale</td><td>${formatCurrency(totalCurr)}</td><td>${formatCurrency(totalProj)}</td><td class="${getPerformanceClass(totalGrowth)}">${formatPercentage(totalGrowth)}</td></tr>`;
        detailsBody.innerHTML = html;
    }
    const monthlyBody = document.getElementById('projections-monthly-table-body');
    if(monthlyBody){
        let html = '';
        for (let i = 0; i <= lastIdx; i++) {
            const isLast = i === lastIdx;
            html += `<tr class="${isLast ? 'table-primary fw-bold' : ''}"><td>${proj.months[i]}</td><td>${formatCurrency(proj.crypto[i])}</td><td>${formatCurrency(proj.etf[i])}</td><td>${formatCurrency(proj.silver[i])}</td><td>${formatCurrency(proj.total[i])}</td></tr>`;
        }
        monthlyBody.innerHTML = html;
    }
}
function updateDashboardAlerts() {
    const container = document.getElementById('dashboard-active-alerts');
    if (!container) return;
    let html = '';
    const activeAlerts = appData.alerts.active.filter(a => a.status === 'Attivo');
     if (activeAlerts.length > 0) {
        html += `<h4 class="text-danger mt-4 mb-2"><i class="bi bi-exclamation-triangle-fill me-2"></i>Alert Attivi</h4>`;
         activeAlerts.sort((a, b) => ({"Critico":1,"Avviso":2,"Info":3})[a.type] - ({"Critico":1,"Avviso":2,"Info":3})[b.type]) // Ordina per criticità
                   .slice(0, 3) // Mostra max 3 nel dashboard
                   .forEach(alert => {
            let alertClass = 'alert-info'; let icon = 'bi-info-circle-fill';
            if(alert.type === 'Critico') { alertClass = 'alert-danger'; icon = 'bi-exclamation-triangle-fill'; }
            if(alert.type === 'Avviso') { alertClass = 'alert-warning'; icon = 'bi-exclamation-circle-fill'; }
            html += `<div class="alert ${alertClass} alert-dismissible fade show d-flex align-items-center p-2 mb-2" role="alert">
                        <i class="bi ${icon} me-2"></i>
                        <small>${alert.message}</small>
                        <button type="button" class="btn-close p-2" data-bs-dismiss="alert" aria-label="Close"></button>
                     </div>`;
        });
    }
    container.innerHTML = html;
}
function updateDashboardTransactionsTable() {
    const tableBody = document.querySelector('#dashboard-transactions-table tbody');
    if (!tableBody) return;
    let html = '';
    // Prendi le ultime N transazioni (spese + investimenti se li tracci)
    const recentTransactions = [...appData.expenses.transactions] // Crea copia
        .sort((a, b) => b.id - a.id) // Ordina per ID decrescente (più recenti prima)
        .slice(0, 5); // Prendi le ultime 5

    if (recentTransactions.length > 0) {
        recentTransactions.forEach(tx => {
             const catColor = appData.expenses.categories.find(c => c.name === tx.category)?.color || '#6c757d';
             const textColor = ['#ffc107', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
            html += `<tr>
                        <td class="ps-3">${tx.date}</td>
                        <td><span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span></td>
                        <td>${tx.description}</td>
                        <td class="text-danger text-end pe-3">${formatCurrency(tx.amount)}</td>
                     </tr>`;
        });
    } else {
        html = '<tr><td colspan="4" class="text-center text-muted p-3">Nessuna transazione recente.</td></tr>';
    }
    tableBody.innerHTML = html;
}
function updateAlertsSection() {
    const activeList = document.getElementById('alerts-active-list');
    if (activeList) {
        let html = '';
        const activeAlerts = appData.alerts.active.filter(a => a.status === 'Attivo')
            .sort((a, b) => ({"Critico":1,"Avviso":2,"Info":3})[a.type] - ({"Critico":1,"Avviso":2,"Info":3})[b.type]);
        if (activeAlerts.length === 0) {
            html = '<p class="text-center text-muted">Nessun alert attivo.</p>';
        } else {
            activeAlerts.forEach(alert => {
                let aClass = 'alert-info', iClass = 'bi-info-circle-fill';
                if (alert.type === 'Critico') { aClass = 'alert-danger'; iClass = 'bi-exclamation-triangle-fill';}
                if (alert.type === 'Avviso') { aClass = 'alert-warning'; iClass = 'bi-exclamation-circle-fill';}
                const btnClass = aClass.replace('alert-', 'btn-outline-');
                html += `<div class="alert ${aClass} d-flex justify-content-between align-items-center" role="alert" data-alert-internal-id="${alert.id}"><div><i class="bi ${iClass} me-2"></i><strong>${alert.type}:</strong> ${alert.message} <small>(${alert.date})</small></div><button class="btn btn-sm ${btnClass} dismiss-alert" data-alert-id="${alert.id}"><i class="bi bi-x-circle"></i> Ignora</button></div>`;
            });
        }
        activeList.innerHTML = html;
        setupDismissAlertButtons(); // Riattacca listener
    }
    const historyBody = document.getElementById('alerts-history-table-body');
    if (historyBody) {
        let html = '';
        const combined = [...appData.alerts.active, ...appData.alerts.history].sort((a,b) => b.id - a.id);
        if (combined.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted">Nessuna cronologia alert.</td></tr>';
        } else {
             combined.forEach(alert => {
                let tBadge='bg-secondary', sBadge='bg-secondary';
                if(alert.type==='Critico')tBadge='bg-danger'; if(alert.type==='Avviso')tBadge='bg-warning text-dark'; if(alert.type==='Info')tBadge='bg-info text-dark';
                if(alert.status==='Attivo')sBadge='bg-warning text-dark'; if(alert.status==='Risolto')sBadge='bg-success'; if(alert.status==='Informativo')sBadge='bg-info text-dark';
                html += `<tr><td class="ps-3">${alert.date}</td><td><span class="badge ${tBadge}">${alert.type}</span></td><td>${alert.message}</td><td><span class="badge ${sBadge}">${alert.status}</span></td></tr>`;
             });
        }
        historyBody.innerHTML = html;
    }
}

// --- CHART FUNCTIONS ---
function initOrUpdateChart(chartId, chartConfig) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (charts[chartId]) {
        charts[chartId].data = chartConfig.data; charts[chartId].options = chartConfig.options; charts[chartId].update();
    } else { charts[chartId] = new Chart(context, chartConfig); }
}
function destroyChart(chartId) {
    if(charts[chartId]) {
        charts[chartId].destroy();
        delete charts[chartId];
    }
}
function initOrUpdateAllCharts() {
    // Dashboard & Investments Allocation
    const allocationData = {
        labels: Object.values(appData.assets).map(a => a.name),
        datasets: [{ data: Object.values(appData.assets).map(a => a.currentValue), backgroundColor: Object.values(appData.assets).map(a => a.color), borderWidth: 1 }]
    };
    initOrUpdateChart('allocationChart', { type: 'pie', data: allocationData, options: commonChartOptions('pie', null, false, true) }); // No title for dashboard chart
    initOrUpdateChart('investmentsAllocationChart', { type: 'doughnut', data: allocationData, options: commonChartOptions('doughnut', null, false, true) }); // No title

    // Dashboard Performance Trend
    initOrUpdateChart('performanceChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Totale', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.4 }] }, options: commonChartOptions('line', null, true) });

    // Crypto Charts
    if (appData.assets.crypto.allocation) {
        initOrUpdateChart('cryptoAllocationChart', { type: 'pie', data: { labels: appData.assets.crypto.allocation.map(i => i.name), datasets: [{ data: appData.assets.crypto.allocation.map(i => i.value), backgroundColor: ['#f7931a','#00ffbd','#627eea','#2ebac6','#0033ad','#cccccc'], borderWidth: 1 }] }, options: commonChartOptions('pie', null, false, true) });
    } else { destroyChart('cryptoAllocationChart'); }
    initOrUpdateChart('cryptoProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, backgroundColor: `${appData.assets.crypto.color}1A`, fill: true, tension: 0.4 }] }, options: commonChartOptions('line', null, true) });

    // ETF Charts
    if (appData.assets.etf.allocation) {
        initOrUpdateChart('etfAllocationChart', { type: 'pie', data: { labels: appData.assets.etf.allocation.map(i => i.name), datasets: [{ data: appData.assets.etf.allocation.map(i => i.value), backgroundColor: ['#0dcaf0','#20c997','#0d6efd','#6610f2','#6c757d'], borderWidth: 1 }] }, options: commonChartOptions('pie', null, false, true) });
    } else { destroyChart('etfAllocationChart'); }
    initOrUpdateChart('etfProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, backgroundColor: `${appData.assets.etf.color}1A`, fill: true, tension: 0.4 }] }, options: commonChartOptions('line', null, true) });

    // Silver Charts
    initOrUpdateChart('silverPriceChart', { type: 'line', data: { labels: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'], datasets: [{ label: 'Prezzo Argento (€/oz)', data: [22.5,22.8,23.1,23.5,23.8,24.2,24.5,24.9,25.3,25.7,26.1,26.5], borderColor: appData.assets.silver.color, backgroundColor: `${appData.assets.silver.color}1A`, fill: true, tension: 0.4 }] }, options: commonChartOptions('line', null, true) });
    initOrUpdateChart('silverProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, backgroundColor: `${appData.assets.silver.color}1A`, fill: true, tension: 0.4 }] }, options: commonChartOptions('line', null, true) });

    // Expenses Chart
    initOrUpdateChart('expenseCategoryChart', { type: 'doughnut', data: { labels: appData.expenses.categories.map(c => c.name), datasets: [{ data: appData.expenses.categories.map(c => c.amount), backgroundColor: appData.expenses.categories.map(c => c.color), borderWidth: 1 }] }, options: commonChartOptions('doughnut', null, false, true) });

    // Total Projection Chart
    initOrUpdateChart('totalProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [ { label: 'Totale', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }, { label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, fill: false, tension: 0.4, borderDash: [5, 5] }, { label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, fill: false, tension: 0.4, borderDash: [5, 5] }, { label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, fill: false, tension: 0.4, borderDash: [5, 5] } ] }, options: commonChartOptions('line', null, true) });
}
function commonChartOptions(type, title = null, showYAxis = false, tooltipValuePercentage = false) {
    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
            title: { display: !!title, text: title, padding: { top: 10, bottom: 10 }, font: { size: 16 } },
            tooltip: { callbacks: { label: (ctx) => {
                let lbl = ctx.dataset.label || ctx.label || ''; if (lbl) lbl += ': '; const val = ctx.raw;
                if (tooltipValuePercentage && (type==='pie'||type==='doughnut')) { const tot = ctx.dataset.data.reduce((a,b)=>a+b,0); lbl += `${formatCurrency(val)} (${formatPercentage(tot>0?(val/tot)*100:0)})`; }
                else if (typeof val === 'number'){ lbl += formatCurrency(val); } else { lbl += val; } return lbl;
            }}}
        },
        scales: (type === 'pie' || type === 'doughnut') ? {} : { // Rimuovi scale per pie/doughnut
            y: { display: showYAxis, beginAtZero: false, ticks: { callback: value => formatCurrency(value) } },
            x: { display: showYAxis } // Mostra asse X se Y è visibile
        }
    };
    return options;
}

// --- PDF EXPORT ---
function generatePdfHtmlReport() {
    const { portfolio, assets, expenses, projections } = appData;
    const today = new Date().toLocaleDateString('it-IT');
    const createTable = (h,r) => {let th=h.map(x=>`<th style="border:1px solid #ddd;padding:6px;background-color:#f2f2f2;text-align:left;">${x}</th>`).join('');let tr=r.map(rw=>{let c=rw.map((cl,i)=>{let s='border:1px solid #ddd;padding:6px;',v=cl;if(i>0&&typeof cl==='number')s+='text-align:right;';else if(typeof cl==='string'&&cl.includes('%'))s+='text-align:right;';if(typeof cl==='string'&&cl.includes('%'))v=cl;else if(typeof cl==='number'&&h[i]?.toLowerCase().includes('performance'))v=formatPercentage(cl);else if(typeof cl==='number'&&h[i]?.toLowerCase().includes('percentuale'))v=formatPercentage(cl);else if(typeof cl==='number')v=formatCurrency(cl);return`<td style="${s}">${v}</td>`;}).join('');return`<tr>${c}</tr>`;}).join('');return`<table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:10px;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;};
    let html = `<div style="font-family:Arial,sans-serif;margin:20px;color:#333;"><h1 style="text-align:center;color:#0d6efd;border-bottom:2px solid #0d6efd;padding-bottom:10px;">Report Finanziario</h1><p style="text-align:center;font-size:12px;margin-bottom:20px;">Generato il: ${today}</p><h2 style="color:#0d6efd;margin-top:25px;">Riepilogo Patrimonio</h2>${createTable(['Descrizione','Valore'],[['Valore Totale',portfolio.totalValue],['Contributi Totali',portfolio.totalContributions],['Performance Totale',`${formatPercentage(portfolio.totalPerformance)}`]])}<h2 style="color:#0d6efd;margin-top:25px;">Allocazione Asset</h2>${createTable(['Asset','Valore','Allocazione (%)'],Object.entries(assets).map(([k,a])=>[a.name,a.currentValue,portfolio.totalValue>0?((a.currentValue/portfolio.totalValue)*100):0]))}<h2 style="color:#0d6efd;margin-top:25px;">Dettaglio Asset</h2>`;
    for (const k in assets) { const a=assets[k]; html+=`<h3 style="color:${a.color};margin-top:20px;">${a.name}</h3>${createTable(['','Valore'],[['Valore',a.currentValue],['Contributi',a.contributedValue],['Performance',`${formatPercentage(a.performance)}`],['Previsione',`${formatPercentage(a.forecast)}']])}`; if(a.allocation&&a.allocation.length>0){html+=`<h4 style="font-size:11px;margin-top:10px;margin-bottom:5px;">Composizione ${a.name}:</h4>`;if(k==='crypto')html+=createTable(['Nome','Perc.','Valore'],a.allocation.map(i=>[i.name,i.percentage,i.value]));else if(k==='etf')html+=createTable(['Nome','Prev.','Valore'],a.allocation.map(i=>[i.name,`${formatPercentage(i.forecast)}`,i.value]));}}
    const rem=expenses.budget-expenses.spent, budPerc=expenses.budget>0?(expenses.spent/expenses.budget)*100:0; html+=`<h2 style="color:#198754;margin-top:25px;">Gestione Spese</h2>${createTable(['Descrizione','Valore'],[['Budget Mensile',expenses.budget],['Speso',expenses.spent],['Rimanente',rem],['Utilizzo Budget',`${formatPercentage(budPerc)}`]])}<h4 style="font-size:11px;margin-top:10px;margin-bottom:5px;">Spese per Categoria:</h4>${createTable(['Cat.','Importo','Perc.'],expenses.categories.filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount).map(c=>[c.name,c.amount,c.percentage]))}<h4 style="font-size:11px;margin-top:10px;margin-bottom:5px;">Ultime Spese:</h4>${createTable(['Data','Cat.','Descr.','Importo'],expenses.transactions.slice(0,10).map(t=>[t.date,t.category,t.description,-t.amount]))}`;
    const lastIdx=projections.months.length-1; if(lastIdx>=0){const totP=projections.total[lastIdx],totC=portfolio.totalValue,totG=totC>0?((totP-totC)/totC)*100:0; html+=`<h2 style="color:#6f42c1;margin-top:25px;">Proiezioni Future</h2><p style="font-size:11px;">Stima fino a ${projections.months[lastIdx]}</p>${createTable(['Asset','Attuale','Previsto','Crescita (%)'],[...Object.entries(assets).map(([k,a])=>[a.name,a.currentValue,projections[k][lastIdx],a.forecast]),['---','---','---','---'],['Totale',totC,totP,totG]])}`;} html+=`</div>`; return html;
}
function generatePdfReport() {
    const element = document.createElement('div'); element.innerHTML = generatePdfHtmlReport();
    const opt = { margin:[10,10,15,10], filename:`Report_Finanziario_${new Date().toISOString().slice(0,10)}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true,logging:false}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
    showNotification('Generazione PDF in corso...', 'info'); // Feedback immediato
    html2pdf().from(element).set(opt).save()
      .then(()=>{ showNotification('PDF generato!', 'success'); })
      .catch(err=>{ console.error("Errore PDF:", err); showNotification('Errore generazione PDF.', 'danger'); });
}

// --- EVENT LISTENERS & SETUP ---
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]');
    const contentSections = document.querySelectorAll('.content-section');
    function showSection(targetId) {
        contentSections.forEach(s => s.classList.add('d-none'));
        const target = document.getElementById(targetId); if (target) target.classList.remove('d-none');
        tabLinks.forEach(l => {
            const linkTarget = l.id.replace('mobile-', '').replace('-tab', '-content');
            const isActive = linkTarget === targetId; l.classList.toggle('active', isActive);
            if (l.closest('.sidebar')) l.classList.toggle('text-white', !isActive);
        });
    }
    tabLinks.forEach(l => { l.addEventListener('click', (e) => { e.preventDefault(); const target = l.id.replace('mobile-', '').replace('-tab', '-content'); showSection(target); const navCollapse = document.querySelector('.navbar-collapse.show'); if (navCollapse) new bootstrap.Collapse(navCollapse).hide(); }); });
    showSection('dashboard-content'); // Mostra dashboard all'inizio
}
function setupModals() {
    // Asset Edit Modal
    const editAssetModal = new bootstrap.Modal('#editAssetModal');
    document.querySelectorAll('.edit-asset').forEach(b => b.addEventListener('click', function() {
        const type = this.dataset.assetType; const asset = appData.assets[type];
        const modalEl = document.getElementById('editAssetModal');
        modalEl.querySelector('#assetType').value = type; modalEl.querySelector('#editAssetModalLabel').textContent = `Modifica ${asset.name}`;
        modalEl.querySelector('#currentValue').value = asset.currentValue; modalEl.querySelector('#contributedValue').value = asset.contributedValue; modalEl.querySelector('#growthForecast').value = asset.forecast;
        editAssetModal.show();
    }));
    document.getElementById('saveAssetChanges')?.addEventListener('click', () => {
        const type = document.getElementById('assetType').value;
        const cv = parseFloat(document.getElementById('currentValue').value); const co = parseFloat(document.getElementById('contributedValue').value); const gf = parseFloat(document.getElementById('growthForecast').value);
        if (isNaN(cv)||isNaN(co)||isNaN(gf)) { showNotification('Valori non validi.', 'danger'); return; }
        appData.assets[type].currentValue = cv; appData.assets[type].contributedValue = co; appData.assets[type].forecast = gf;
        updateUI(); editAssetModal.hide(); showNotification(`${appData.assets[type].name} aggiornato!`, 'success');
    });

    // Expense Add/Edit Modal
    const addExpenseModal = new bootstrap.Modal('#addExpenseModal');
    const expForm = document.getElementById('addExpenseForm');
    const expModalTitle = document.getElementById('addExpenseModalLabel');
    const expSubmitBtn = document.getElementById('saveExpense');
    const expCategorySelect = document.getElementById('expenseCategory');
    let editingExpenseId = null;
    // Popola select categorie spese
    if(expCategorySelect) { expCategorySelect.innerHTML = appData.expenses.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); }

    window.openAddExpenseModal = (expenseId = null) => { // Rendi globale per chiamarla da altre parti se serve
         expForm.reset(); editingExpenseId = expenseId;
         if (expenseId) {
             const exp = appData.expenses.transactions.find(tx => tx.id === expenseId);
             if(exp){ expModalTitle.textContent='Modifica Spesa'; expSubmitBtn.textContent='Salva Modifiche'; document.getElementById('expenseDescription').value=exp.description; document.getElementById('expenseAmount').value=exp.amount; document.getElementById('expenseCategory').value=exp.category; try{const dp=exp.date.split('/'); document.getElementById('expenseDate').value=`${dp[2]}-${dp[1].padStart(2,'0')}-${dp[0].padStart(2,'0')}`; } catch(e){ document.getElementById('expenseDate').valueAsDate=new Date();} }
             else { showNotification('Spesa non trovata.', 'danger'); return; }
         } else { expModalTitle.textContent='Aggiungi Spesa'; expSubmitBtn.textContent='Salva'; document.getElementById('expenseDate').valueAsDate=new Date(); }
         addExpenseModal.show();
     };
    document.getElementById('add-expense-btn')?.addEventListener('click', () => openAddExpenseModal());
    document.getElementById('addExpenseFromTransactionBtn')?.addEventListener('click', () => { bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); openAddExpenseModal(); });
    expSubmitBtn?.addEventListener('click', () => {
        const desc = document.getElementById('expenseDescription').value.trim(); const amo = parseFloat(document.getElementById('expenseAmount').value); const cat = document.getElementById('expenseCategory').value; const date = document.getElementById('expenseDate').value;
        if(!desc||isNaN(amo)||amo<=0||!cat||!date) { showNotification('Compila tutti i campi.', 'danger'); return; }
        const dO=new Date(date); if(isNaN(dO.getTime())){ showNotification('Data non valida.', 'danger'); return; } const fDate=`${dO.getDate().toString().padStart(2,'0')}/${(dO.getMonth()+1).toString().padStart(2,'0')}/${dO.getFullYear()}`;
        if (editingExpenseId) { const idx = appData.expenses.transactions.findIndex(tx => tx.id === editingExpenseId); if(idx>-1){ appData.expenses.transactions[idx]={...appData.expenses.transactions[idx],description:desc,amount:amo,category:cat,date:fDate}; showNotification('Spesa modificata!', 'success'); } else { showNotification('Errore modifica.', 'danger'); } }
        else { const newExp={id:Date.now(),description:desc,amount:amo,category:cat,date:fDate}; appData.expenses.transactions.unshift(newExp); showNotification('Spesa aggiunta!', 'success'); }
        updateUI(); addExpenseModal.hide(); editingExpenseId=null;
    });
    setupExpenseActionButtons(); // Chiamata iniziale

     // Projections Edit Modal
    const editProjModal = new bootstrap.Modal('#editProjectionsModal');
    document.getElementById('edit-projections-btn')?.addEventListener('click', () => { for(const k in appData.assets) document.getElementById(`${k}Growth`).value = appData.assets[k].forecast; editProjModal.show(); });
    document.getElementById('saveProjections')?.addEventListener('click', () => { let valid=true; for(const k in appData.assets){ const val = parseFloat(document.getElementById(`${k}Growth`).value); if(isNaN(val)) valid=false; else appData.assets[k].forecast = val; } if(!valid){showNotification('Valori previsione non validi.','danger'); return;} updateUI(); editProjModal.hide(); showNotification('Previsioni aggiornate!', 'success'); });

    // Alert Config Modal (Opzionale)
    const alertCfgModalEl = document.getElementById('editAlertsModal');
    if(alertCfgModalEl){
        const alertCfgModal = new bootstrap.Modal(alertCfgModalEl);
        document.getElementById('edit-alerts-btn')?.addEventListener('click', () => { const c = appData.alerts.config; document.getElementById('alertPerformanceNegative').checked=c.performanceNegative.enabled; document.getElementById('thresholdPerformanceNegative').value=c.performanceNegative.threshold; document.getElementById('alertPerformancePositive').checked=c.performancePositive.enabled; document.getElementById('thresholdPerformancePositive').value=c.performancePositive.threshold; document.getElementById('alertAllocationImbalance').checked=c.allocationImbalance.enabled; document.getElementById('thresholdAllocationImbalance').value=c.allocationImbalance.threshold; document.getElementById('alertBudgetExceeded').checked=c.budgetExceeded.enabled; document.getElementById('thresholdBudgetExceeded').value=c.budgetExceeded.threshold; alertCfgModal.show(); });
        document.getElementById('save-alerts-config')?.addEventListener('click', () => { const c=appData.alerts.config; c.performanceNegative.enabled=document.getElementById('alertPerformanceNegative').checked; c.performanceNegative.threshold=parseFloat(document.getElementById('thresholdPerformanceNegative').value)||0; c.performancePositive.enabled=document.getElementById('alertPerformancePositive').checked; c.performancePositive.threshold=parseFloat(document.getElementById('thresholdPerformancePositive').value)||0; c.allocationImbalance.enabled=document.getElementById('alertAllocationImbalance').checked; c.allocationImbalance.threshold=parseFloat(document.getElementById('thresholdAllocationImbalance').value)||100; c.budgetExceeded.enabled=document.getElementById('alertBudgetExceeded').checked; c.budgetExceeded.threshold=parseFloat(document.getElementById('thresholdBudgetExceeded').value)||100; updateUI(); alertCfgModal.hide(); showNotification('Configurazione alert salvata!', 'success'); });
        // Mostra la card di configurazione solo se il modal esiste
        document.getElementById('alerts-config-card').style.display = 'block';
    } else { document.getElementById('edit-alerts-btn')?.remove(); } // Rimuovi bottone se modal non c'è

    // Add Transaction Modal (Choice)
    const addTransModal = new bootstrap.Modal('#addTransactionModal');
    document.getElementById('add-transaction-btn')?.addEventListener('click', () => addTransModal.show());

     // Add Investment Modal
    const addInvestModal = new bootstrap.Modal('#addInvestmentModal');
    const addInvestForm = document.getElementById('addInvestmentForm');
    document.getElementById('addInvestmentBtn')?.addEventListener('click', () => { bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); addInvestForm.reset(); document.getElementById('investmentDate').valueAsDate = new Date(); addInvestModal.show(); });
    document.getElementById('saveInvestment')?.addEventListener('click', () => { const type=document.getElementById('investmentAsset').value; const amo=parseFloat(document.getElementById('investmentAmount').value); const date=document.getElementById('investmentDate').value; const desc=document.getElementById('investmentDescription').value.trim()||`Investimento in ${appData.assets[type].name}`; if(!type||isNaN(amo)||amo<=0||!date){showNotification('Compila Asset, Importo, Data.','danger');return;} appData.assets[type].contributedValue+=amo; updateUI(); addInvestModal.hide(); showNotification(`Investimento in ${appData.assets[type].name} aggiunto!`, 'success'); });

    // Alert Buttons Setup
    setupDismissAlertButtons(); // Chiamata iniziale
}
function setupExpenseActionButtons() {
    const tableBody = document.getElementById('expenses-list-table-body');
    if (!tableBody) return;
    // Delega eventi al tbody per performance e gestione dinamica
    tableBody.removeEventListener('click', handleExpenseActionClick); // Rimuovi vecchio listener se esiste
    tableBody.addEventListener('click', handleExpenseActionClick);
}
function handleExpenseActionClick(event) {
     const button = event.target.closest('button'); // Trova il bottone cliccato o un suo figlio (icona)
     if (!button) return; // Cliccato altrove nella tabella

     const expenseId = parseInt(button.dataset.expenseId);
     if (isNaN(expenseId)) return;

     if (button.classList.contains('edit-expense')) {
        openAddExpenseModal(expenseId);
     } else if (button.classList.contains('delete-expense')) {
         if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
            appData.expenses.transactions = appData.expenses.transactions.filter(tx => tx.id !== expenseId);
            updateUI(); // Aggiorna tutto (include ricalcolo totali e UI)
            showNotification('Spesa eliminata.', 'success');
         }
     }
}
function setupDismissAlertButtons() {
    const activeList = document.getElementById('alerts-active-list');
    if (!activeList) return;
    // Delega eventi al container
    activeList.removeEventListener('click', handleDismissAlertClick);
    activeList.addEventListener('click', handleDismissAlertClick);
}
function handleDismissAlertClick(event) {
    const button = event.target.closest('.dismiss-alert');
    if (!button) return;

    const alertId = parseInt(button.dataset.alertId);
    const alertIndex = appData.alerts.active.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
        const dismissed = appData.alerts.active.splice(alertIndex, 1)[0]; dismissed.status = 'Risolto';
        appData.alerts.history.unshift(dismissed);
        updateAlertsSection(); // Aggiorna solo UI alert
        showNotification('Alert ignorato.', 'info');
    } else { // Rimuovi il div se l'alert non è più nell'array (magari da doppio click veloce)
         button.closest('.alert')?.remove();
    }
}
function setupHeaderButtons() {
    // Share Button
    document.getElementById('share-btn')?.addEventListener('click', async () => {
        const shareData = { title: 'Riepilogo Finanziario', text: `Patrimonio: ${formatCurrency(appData.portfolio.totalValue)}, Performance: ${formatPercentage(appData.portfolio.totalPerformance)}` };
        if (navigator.share) { try { await navigator.share(shareData); showNotification('Condiviso!', 'success'); } catch (err) { if(err.name !== 'AbortError') showNotification('Errore condivisione.', 'danger'); } }
        else { copySummaryToClipboard(); showNotification('Condivisione non supportata, riepilogo copiato.', 'warning'); }
    });
    // Export Summary Button
    document.getElementById('export-summary-btn')?.addEventListener('click', copySummaryToClipboard);
    // Export PDF Button
    document.getElementById('export-pdf-btn')?.addEventListener('click', generatePdfReport);
}
function copySummaryToClipboard() {
     const txt = `Riepilogo Finanziario (${new Date().toLocaleDateString('it-IT')})\n------------------------------------\nPatrimonio: ${formatCurrency(appData.portfolio.totalValue)}\nContributi: ${formatCurrency(appData.portfolio.totalContributions)}\nPerformance: ${formatPercentage(appData.portfolio.totalPerformance)}\n\nAllocazione:\n${Object.values(appData.assets).map(a=>`- ${a.name}: ${formatCurrency(a.currentValue)} (${formatPercentage(appData.portfolio.totalValue>0?(a.currentValue/appData.portfolio.totalValue)*100:0)})`).join('\n')}`;
    navigator.clipboard.writeText(txt).then(()=>showNotification('Riepilogo copiato!', 'success'), ()=>showNotification('Errore copia.', 'danger'));
}
function showNotification(message, type = 'info') {
    const container = document.getElementById('toast-container'); if (!container) return;
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `<div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3000"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
    container.insertAdjacentHTML('beforeend', toastHTML);
    const el = document.getElementById(toastId); const toast = new bootstrap.Toast(el);
    el.addEventListener('hidden.bs.toast', () => el.remove()); toast.show();
}
function detectFoldableDevice() { /* Implementazione opzionale */ }

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM caricato. Inizializzazione...");
    detectFoldableDevice();
    setupNavigation();
    setupModals();
    setupHeaderButtons();
    updateUI(); // Prima chiamata per popolare tutto
    console.log("App inizializzata.");
});

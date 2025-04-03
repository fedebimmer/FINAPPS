// Dati dell'applicazione (assicurati che siano caricati o inizializzati correttamente)
let appData = { // Usiamo 'let' per permettere la riassegnazione se necessario (es. caricamento da storage)
    assets: {
        crypto: {
            name: "Crypto",
            currentValue: 424,
            contributedValue: 782,
            performance: -45.78,
            forecast: 15.00,
            color: '#ffc107',
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
            name: "ETF",
            currentValue: 4575,
            contributedValue: 5036,
            performance: -9.15,
            forecast: 8.79,
            color: '#0dcaf0',
            allocation: [
                { name: "iShares Dow Jones Global Titans 50 (EXI2)", percentage: 20, value: 915, forecast: 9.43 },
                { name: "iShares Edge MSCI World Quality Factor (IS3Q)", percentage: 20, value: 915, forecast: 13.39 },
                { name: "Xtrackers MSCI World Information Technology (XDWT)", percentage: 20, value: 915, forecast: 20.40 },
                { name: "Xtrackers MSCI USA Consumer Discretionary (XUCD)", percentage: 10, value: 457.50, forecast: -7.50 },
                { name: "Altri ETF", percentage: 30, value: 1372.50, forecast: 4.80 }
            ]
        },
        silver: {
            name: "Argento",
            currentValue: 221,
            contributedValue: 228,
            performance: -3.07,
            forecast: 6.50,
            color: '#6c757d'
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
             { id: 1, date: "01/04/2025", category: "Alimentari", description: "Spesa settimanale", amount: 85.30 },
             { id: 2, date: "28/03/2025", category: "Trasporti", description: "Benzina", amount: 45.00 },
             { id: 3, date: "26/03/2025", category: "Svago", description: "Cinema", amount: 25.00 }
        ]
    },
    projections: {
        months: ["Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
        // Questi verranno ricalcolati
        crypto: [],
        etf: [],
        silver: [],
        total: []
    },
    alerts: {
        active: [], // Verranno ricalcolati da checkAlerts
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
    },
    portfolio: { // Aggiunto per facilitare i totali
        totalValue: 0,
        totalContributions: 0,
        totalPerformance: 0
    }
};

// Store chart instances
const charts = {};

// --- UTILITY FUNCTIONS ---

/**
 * Formatta un numero come valuta (€).
 * @param {number} value Il numero da formattare.
 * @returns {string} Stringa formattata.
 */
function formatCurrency(value) {
    if (isNaN(value)) return "€ --,--";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatta un numero come percentuale.
 * @param {number} value Il numero da formattare (es. -10.5).
 * @returns {string} Stringa formattata (es. "-10,50%").
 */
function formatPercentage(value) {
    if (isNaN(value)) return "--,--%";
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Restituisce la classe CSS per la performance (positiva/negativa).
 * @param {number} value La performance.
 * @returns {string} La classe CSS ('text-success', 'text-danger', 'text-secondary').
 */
function getPerformanceClass(value) {
    if (isNaN(value)) return 'text-secondary';
    return value >= 0 ? 'text-success' : 'text-danger';
}

// --- DATA CALCULATION FUNCTIONS ---

/**
 * Calcola i totali del portfolio (valore, contributi, performance).
 */
function calculatePortfolioTotals() {
    let totalValue = 0;
    let totalContributions = 0;
    for (const key in appData.assets) {
        totalValue += appData.assets[key].currentValue;
        totalContributions += appData.assets[key].contributedValue;
    }
    appData.portfolio.totalValue = totalValue;
    appData.portfolio.totalContributions = totalContributions;
    if (totalContributions > 0) {
        appData.portfolio.totalPerformance = ((totalValue - totalContributions) / totalContributions) * 100;
    } else {
        appData.portfolio.totalPerformance = 0;
    }
}

/**
 * Ricalcola la performance per un singolo asset.
 * @param {string} assetType La chiave dell'asset (es. 'crypto').
 */
function calculateAssetPerformance(assetType) {
    const asset = appData.assets[assetType];
    if (asset.contributedValue > 0) {
        asset.performance = ((asset.currentValue - asset.contributedValue) / asset.contributedValue) * 100;
    } else {
        asset.performance = 0;
    }
}

/**
 * Calcola le proiezioni future basate sui dati attuali e sui forecast.
 */
function calculateProjections() {
    const numMonths = appData.projections.months.length;
    if (numMonths === 0) return;

    appData.projections.crypto = [];
    appData.projections.etf = [];
    appData.projections.silver = [];
    appData.projections.total = [];

    for (let i = 0; i < numMonths; i++) {
        let currentCrypto = 0;
        let currentEtf = 0;
        let currentSilver = 0;
        const progress = (i + 1) / numMonths; // Percentuale di progresso verso la fine del periodo

        if (i === 0) { // Primo mese = valore attuale
            currentCrypto = appData.assets.crypto.currentValue;
            currentEtf = appData.assets.etf.currentValue;
            currentSilver = appData.assets.silver.currentValue;
        } else { // Mesi successivi
            const cryptoGrowthRate = appData.assets.crypto.forecast / 100;
            const etfGrowthRate = appData.assets.etf.forecast / 100;
            const silverGrowthRate = appData.assets.silver.forecast / 100;

            // Interpolazione lineare semplice per i mesi intermedi
            currentCrypto = appData.assets.crypto.currentValue * (1 + cryptoGrowthRate * progress);
            currentEtf = appData.assets.etf.currentValue * (1 + etfGrowthRate * progress);
            currentSilver = appData.assets.silver.currentValue * (1 + silverGrowthRate * progress);
        }

        appData.projections.crypto.push(parseFloat(currentCrypto.toFixed(2)));
        appData.projections.etf.push(parseFloat(currentEtf.toFixed(2)));
        appData.projections.silver.push(parseFloat(currentSilver.toFixed(2)));
        appData.projections.total.push(parseFloat((currentCrypto + currentEtf + currentSilver).toFixed(2)));
    }
}

/**
 * Verifica e genera gli alert in base alla configurazione e ai dati attuali.
 */
function checkAlerts() {
    appData.alerts.active = []; // Resetta gli alert attivi
    const config = appData.alerts.config;
    const today = new Date().toLocaleDateString('it-IT');

    // Alert Performance Negative
    if (config.performanceNegative.enabled) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (asset.performance < config.performanceNegative.threshold) {
                appData.alerts.active.push({
                    id: Date.now() + Math.random(), // ID univoco
                    type: "Critico",
                    message: `Performance negativa ${asset.name}: ${formatPercentage(asset.performance)}`,
                    status: "Attivo",
                    date: today
                });
            }
        }
    }

     // Alert Performance Positive
    if (config.performancePositive.enabled) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (asset.performance > config.performancePositive.threshold) {
                appData.alerts.active.push({
                    id: Date.now() + Math.random(),
                    type: "Info",
                    message: `Buona performance ${asset.name}: ${formatPercentage(asset.performance)}`,
                    status: "Attivo",
                    date: today
                });
            }
        }
    }

    // Alert Budget Superato
    if (config.budgetExceeded.enabled && appData.expenses.budget > 0) {
        const budgetPercentage = (appData.expenses.spent / appData.expenses.budget) * 100;
        if (budgetPercentage > config.budgetExceeded.threshold) {
             appData.alerts.active.push({
                id: Date.now() + Math.random(),
                type: "Avviso",
                message: `Budget mensile superato (${formatPercentage(budgetPercentage)})`,
                status: "Attivo",
                date: today
            });
        }
    }

    // Alert Allocazione Sbilanciata (Esempio: un asset > X%)
    if (config.allocationImbalance.enabled && appData.portfolio.totalValue > 0) {
        const thresholdPercent = config.allocationImbalance.threshold;
         for (const key in appData.assets) {
            const asset = appData.assets[key];
            const allocationPercent = (asset.currentValue / appData.portfolio.totalValue) * 100;
            if (allocationPercent > thresholdPercent) {
                 appData.alerts.active.push({
                    id: Date.now() + Math.random(),
                    type: "Avviso",
                    message: `Allocazione ${asset.name} elevata: ${formatPercentage(allocationPercent)}`,
                    status: "Attivo",
                    date: today
                });
            }
         }
    }
}

// --- UI UPDATE FUNCTIONS ---

/**
 * Aggiorna un elemento del DOM con nuovo testo e classe opzionale.
 * @param {string} selector Selettore CSS dell'elemento.
 * @param {string} text Testo da inserire.
 * @param {string} [className] Classe CSS da aggiungere/rimuovere (opzionale).
 * @param {string[]} [classesToRemove] Array di classi da rimuovere prima di aggiungere quella nuova (opzionale).
 */
function updateElement(selector, text, className = '', classesToRemove = []) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
        if (className) {
            if (classesToRemove.length > 0) {
                element.classList.remove(...classesToRemove);
            }
            element.classList.add(className);
        }
    } else {
        console.warn(`Elemento non trovato: ${selector}`);
    }
}

/**
 * Aggiorna tutti gli elementi dell'interfaccia utente con i dati correnti.
 */
function updateUI() {
    console.log("Aggiornamento UI..."); // Log per debug

    // 1. Ricalcola tutti i dati derivati
    calculatePortfolioTotals();
    calculateProjections();
    checkAlerts(); // Ricalcola gli alert attivi

    // 2. Aggiorna Dashboard
    updateElement('#dashboard-content .card-body h2.text-primary', formatCurrency(appData.portfolio.totalValue));
    updateElement('#dashboard-content .card-body h2:nth-of-type(2)', formatCurrency(appData.portfolio.totalContributions)); // Selettore più specifico
    updateElement('#dashboard-content .card-body h2.text-danger', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);

    updateElement('#dashboard-content .col-md-4:nth-child(1) h3', formatCurrency(appData.assets.crypto.currentValue));
    updateElement('#dashboard-content .col-md-4:nth-child(1) small', formatPercentage(appData.assets.crypto.performance), getPerformanceClass(appData.assets.crypto.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('#dashboard-content .col-md-4:nth-child(2) h3', formatCurrency(appData.assets.etf.currentValue));
    updateElement('#dashboard-content .col-md-4:nth-child(2) small', formatPercentage(appData.assets.etf.performance), getPerformanceClass(appData.assets.etf.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('#dashboard-content .col-md-4:nth-child(3) h3', formatCurrency(appData.assets.silver.currentValue));
    updateElement('#dashboard-content .col-md-4:nth-child(3) small', formatPercentage(appData.assets.silver.performance), getPerformanceClass(appData.assets.silver.performance), ['text-danger', 'text-success', 'text-secondary']);

    // 3. Aggiorna Sezione Investimenti
    updateElement('#investments-content .card-body h2.text-primary', formatCurrency(appData.portfolio.totalValue));
    updateElement('#investments-content .col-md-4:nth-child(2) h2', formatCurrency(appData.portfolio.totalContributions)); // Selettore specifico
    updateElement('#investments-content .col-md-4:nth-child(3) h2', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);

    // Cards asset in Investimenti
    updateAssetCard('#investments-content', 'crypto');
    updateAssetCard('#investments-content', 'etf');
    updateAssetCard('#investments-content', 'silver');

    // Tabella allocazione in Investimenti
    updateAllocationTable('#investments-content #investmentsAllocationChart + div table tbody'); // Passa il selettore del tbody

    // 4. Aggiorna Sezioni Specifiche Asset (Crypto, ETF, Silver)
    updateAssetSection('crypto');
    updateAssetSection('etf');
    updateAssetSection('silver');

    // 5. Aggiorna Sezione Spese
    updateExpensesSection();

    // 6. Aggiorna Sezione Proiezioni
    updateProjectionsSection();

    // 7. Aggiorna Sezione Alert
    updateAlertsSection();


    // 8. Aggiorna (o reinizializza) tutti i grafici
    initOrUpdateAllCharts();

    console.log("Aggiornamento UI completato.");
}


/**
 * Aggiorna la card di un asset specifico nella sezione Investimenti.
 * @param {string} sectionSelector Selettore della sezione padre (es. '#investments-content').
 * @param {string} assetType Tipo di asset (es. 'crypto').
 */
function updateAssetCard(sectionSelector, assetType) {
    const asset = appData.assets[assetType];
    const cardSelector = `${sectionSelector} .edit-asset[data-asset-type="${assetType}"]`;
    const card = document.querySelector(cardSelector)?.closest('.card'); // Trova il bottone e risali alla card

    if (card) {
        updateElementInCard(card, '.card-title', formatCurrency(asset.currentValue));
        updateElementInCard(card, 'ul li:nth-child(1)', `Contributi: ${formatCurrency(asset.contributedValue)}`);
        updateElementInCard(card, 'ul li:nth-child(2)', `Performance: ${formatPercentage(asset.performance)}`);
        updateElementInCard(card, 'ul li:nth-child(3)', `Previsione: ${formatPercentage(asset.forecast)}`);

        // Aggiorna classe performance
        const perfElement = card.querySelector('ul li:nth-child(2)');
        if (perfElement) {
            perfElement.classList.remove('text-danger', 'text-success', 'text-secondary');
            perfElement.classList.add(getPerformanceClass(asset.performance));
        }
         // Aggiorna classe previsione (opzionale, puoi definire regole)
        const forecastElement = card.querySelector('ul li:nth-child(3)');
        if (forecastElement) {
            forecastElement.classList.remove('text-danger', 'text-success', 'text-secondary');
            forecastElement.classList.add(getPerformanceClass(asset.forecast)); // Usa stessa logica o una diversa
        }
    } else {
         console.warn(`Card non trovata per ${assetType} in ${sectionSelector}`);
    }
}

/**
 * Aggiorna un elemento all'interno di una card specifica.
 * @param {HTMLElement} cardElement L'elemento della card.
 * @param {string} elementSelector Selettore dell'elemento dentro la card.
 * @param {string} text Testo da inserire.
 */
function updateElementInCard(cardElement, elementSelector, text) {
    const element = cardElement.querySelector(elementSelector);
    if (element) {
        element.textContent = text;
    }
}


/**
 * Aggiorna la tabella di allocazione nella sezione Investimenti.
 * @param {string} tableBodySelector Selettore CSS del tbody della tabella.
 */
function updateAllocationTable(tableBodySelector) {
    const tableBody = document.querySelector(tableBodySelector);
    if (!tableBody) {
        console.warn(`Tabella allocazione non trovata: ${tableBodySelector}`);
        return;
    }

    let tableHtml = '';
    const totalValue = appData.portfolio.totalValue;

    for (const key in appData.assets) {
        const asset = appData.assets[key];
        const percentage = totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0;
        tableHtml += `
            <tr>
                <td><span class="badge" style="background-color:${asset.color}; color: ${asset.color === '#ffc107' ? '#333' : '#fff'};">${asset.name}</span></td>
                <td>${formatCurrency(asset.currentValue)}</td>
                <td>${formatPercentage(percentage)}</td>
            </tr>
        `;
    }
    tableBody.innerHTML = tableHtml;
}


/**
 * Aggiorna i dettagli nella sezione specifica di un asset.
 * @param {string} assetType Tipo di asset (es. 'crypto').
 */
function updateAssetSection(assetType) {
    const sectionId = `#${assetType}-content`;
    const asset = appData.assets[assetType];

    updateElement(`${sectionId} .card-body h2:nth-of-type(1)`, formatCurrency(asset.currentValue)); // Valore
    updateElement(`${sectionId} .card-body h2:nth-of-type(2)`, formatCurrency(asset.contributedValue)); // Contributi
    updateElement(`${sectionId} .card-body h2:nth-of-type(3)`, formatPercentage(asset.performance), getPerformanceClass(asset.performance), ['text-danger', 'text-success', 'text-secondary']); // Performance

    // Aggiorna tabella composizione (se esiste per l'asset)
    if (asset.allocation) {
        updateAssetCompositionTable(assetType);
    }
}

/**
 * Aggiorna la tabella di composizione specifica di un asset (es. Crypto, ETF).
 * @param {string} assetType Tipo di asset (es. 'crypto', 'etf').
 */
function updateAssetCompositionTable(assetType) {
    const tableBodySelector = `#${assetType}-content .table-responsive table tbody`;
    const tableBody = document.querySelector(tableBodySelector);
    const asset = appData.assets[assetType];

    if (!tableBody || !asset.allocation) {
        // console.warn(`Tabella composizione non trovata o dati mancanti per ${assetType}`);
        return; // Non tutte le sezioni hanno questa tabella (es. Argento)
    }

    let tableHtml = '';
    if (assetType === 'crypto') {
        asset.allocation.forEach(item => {
            // Ricalcola il valore basato sulla percentuale e valore totale crypto
            const calculatedValue = (item.percentage / 100) * asset.currentValue;
            tableHtml += `
                <tr>
                    <td>${item.name}</td>
                    <td>${formatPercentage(item.percentage)}</td>
                    <td>${formatCurrency(calculatedValue)}</td>
                </tr>
            `;
        });
    } else if (assetType === 'etf') {
         asset.allocation.forEach(item => {
            // Ricalcola il valore basato sulla percentuale e valore totale ETF
            const calculatedValue = (item.percentage / 100) * asset.currentValue;
            tableHtml += `
                <tr>
                    <td>${item.name}</td>
                    <td class="${getPerformanceClass(item.forecast)}">${formatPercentage(item.forecast)}</td>
                    <td>${formatCurrency(calculatedValue)}</td>
                </tr>
            `;
        });
    }
    tableBody.innerHTML = tableHtml;
}

/**
 * Aggiorna la sezione Spese.
 */
function updateExpensesSection() {
    const expenses = appData.expenses;
    const budgetPercentage = expenses.budget > 0 ? (expenses.spent / expenses.budget) * 100 : 0;
    const remaining = expenses.budget - expenses.spent;

    // Aggiorna barra progresso
    const progressBar = document.querySelector('#expenses-content .progress-bar');
    if (progressBar) {
        progressBar.style.width = `${budgetPercentage}%`;
        progressBar.textContent = `${budgetPercentage.toFixed(0)}%`;
        progressBar.setAttribute('aria-valuenow', budgetPercentage);
        // Cambia colore se sopra soglia? (Esempio)
        progressBar.classList.toggle('bg-danger', budgetPercentage > 90);
        progressBar.classList.toggle('bg-warning', budgetPercentage > 75 && budgetPercentage <= 90);
        progressBar.classList.toggle('bg-success', budgetPercentage <= 75);
    }

    updateElement('#expenses-content .col-md-4.text-md-end h5', `${formatCurrency(expenses.spent)} / ${formatCurrency(expenses.budget)}`);
    updateElement('#expenses-content .row.mt-4 .col-md-4:nth-child(1) h3', formatCurrency(expenses.spent)); // Speso
    updateElement('#expenses-content .row.mt-4 .col-md-4:nth-child(2) h3', formatCurrency(expenses.budget)); // Budget
    updateElement('#expenses-content .row.mt-4 .col-md-4:nth-child(3) h3', formatCurrency(remaining), getPerformanceClass(remaining), ['text-danger', 'text-success', 'text-secondary']); // Rimanente


    // Aggiorna tabella categorie spese
    const categoryTableBody = document.querySelector('#expenses-content #expenseCategoryChart + div table tbody');
    if (categoryTableBody) {
        let catTableHtml = '';
        // Ricalcola percentuali categorie
        const totalSpent = expenses.categories.reduce((sum, cat) => sum + cat.amount, 0);
        expenses.categories.forEach(cat => {
            const percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
            cat.percentage = percentage; // Aggiorna i dati
            catTableHtml += `
                 <tr>
                    <td><span class="badge" style="background-color: ${cat.color}; color: #fff;">${cat.name}</span></td>
                    <td>${formatCurrency(cat.amount)}</td>
                    <td>${formatPercentage(percentage)}</td>
                 </tr>
            `;
        });
        categoryTableBody.innerHTML = catTableHtml;
    }

    // Aggiorna tabella elenco spese
    const expenseListTableBody = document.querySelector('#expenses-content .card:last-child table tbody');
    if (expenseListTableBody) {
        let expListHtml = '';
        expenses.transactions.sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-'))); // Ordina per data decrescente
        expenses.transactions.forEach(tx => {
             const categoryColor = expenses.categories.find(c => c.name === tx.category)?.color || '#6c757d'; // Colore default
             expListHtml += `
                 <tr>
                    <td>${tx.date}</td>
                    <td><span class="badge" style="background-color: ${categoryColor}; color: #fff;">${tx.category}</span></td>
                    <td>${tx.description}</td>
                    <td class="text-danger">${formatCurrency(-tx.amount)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-expense" data-expense-id="${tx.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-expense" data-expense-id="${tx.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                 </tr>
             `;
        });
        expenseListTableBody.innerHTML = expListHtml;
        // Riattacca gli event listener per i bottoni edit/delete
        setupExpenseActionButtons();
    }
}

/**
 * Aggiorna la sezione Proiezioni.
 */
function updateProjectionsSection() {
    const projections = appData.projections;
    const assets = appData.assets;
    const lastMonthIndex = projections.months.length - 1;

    if (lastMonthIndex < 0) return; // Nessuna proiezione calcolata

    // Tabella dettagli proiezioni
    const detailsTableBody = document.querySelector('#projections-content .card:nth-of-type(2) table tbody');
    if (detailsTableBody) {
        const totalProjected = projections.total[lastMonthIndex];
        const totalCurrent = appData.portfolio.totalValue;
        const totalGrowth = totalCurrent > 0 ? ((totalProjected - totalCurrent) / totalCurrent) * 100 : 0;

        detailsTableBody.innerHTML = `
            <tr>
                <td>Crypto</td>
                <td>${formatCurrency(assets.crypto.currentValue)}</td>
                <td>${formatCurrency(projections.crypto[lastMonthIndex])}</td>
                <td class="${getPerformanceClass(assets.crypto.forecast)}">${formatPercentage(assets.crypto.forecast)}</td>
            </tr>
            <tr>
                <td>ETF</td>
                <td>${formatCurrency(assets.etf.currentValue)}</td>
                <td>${formatCurrency(projections.etf[lastMonthIndex])}</td>
                <td class="${getPerformanceClass(assets.etf.forecast)}">${formatPercentage(assets.etf.forecast)}</td>
            </tr>
            <tr>
                <td>Argento</td>
                <td>${formatCurrency(assets.silver.currentValue)}</td>
                <td>${formatCurrency(projections.silver[lastMonthIndex])}</td>
                <td class="${getPerformanceClass(assets.silver.forecast)}">${formatPercentage(assets.silver.forecast)}</td>
            </tr>
            <tr class="table-primary fw-bold">
                <td>Totale</td>
                <td>${formatCurrency(totalCurrent)}</td>
                <td>${formatCurrency(totalProjected)}</td>
                <td class="${getPerformanceClass(totalGrowth)}">${formatPercentage(totalGrowth)}</td>
            </tr>
        `;
    }

    // Tabella proiezioni mensili
    const monthlyTableBody = document.querySelector('#projections-content .card:nth-of-type(3) table tbody');
     if (monthlyTableBody) {
        let monthlyHtml = '';
        for (let i = 0; i < projections.months.length; i++) {
            const isLastRow = i === lastMonthIndex;
            monthlyHtml += `
                <tr class="${isLastRow ? 'table-primary fw-bold' : ''}">
                    <td>${projections.months[i]} ${isLastRow ? new Date().getFullYear() : ''}</td>
                     <td>${formatCurrency(projections.crypto[i])}</td>
                     <td>${formatCurrency(projections.etf[i])}</td>
                     <td>${formatCurrency(projections.silver[i])}</td>
                     <td>${formatCurrency(projections.total[i])}</td>
                </tr>
            `;
        }
        monthlyTableBody.innerHTML = monthlyHtml;
     }
}

/**
 * Aggiorna la sezione Alert.
 */
function updateAlertsSection() {
    // Aggiorna lista alert attivi
    const activeAlertsContainer = document.querySelector('#alerts-content .card:nth-of-type(1) .card-body');
    if (activeAlertsContainer) {
        let activeHtml = '';
        if (appData.alerts.active.length === 0) {
            activeHtml = '<p class="text-center text-muted">Nessun alert attivo.</p>';
        } else {
             appData.alerts.active.forEach(alert => {
                let alertClass = 'alert-info'; // Default
                if (alert.type === 'Critico') alertClass = 'alert-danger';
                if (alert.type === 'Avviso') alertClass = 'alert-warning';
                activeHtml += `
                    <div class="alert ${alertClass} d-flex justify-content-between align-items-center" role="alert">
                         <div>
                            <i class="bi ${alert.type === 'Critico' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} me-2"></i>
                            <strong>${alert.type}:</strong> ${alert.message} (${alert.date})
                         </div>
                         <button class="btn btn-sm btn-outline-${alertClass.split('-')[1]} dismiss-alert" data-alert-id="${alert.id}">
                            <i class="bi bi-x-circle"></i> Ignora
                         </button>
                    </div>
                `;
             });
        }
        activeAlertsContainer.innerHTML = activeHtml;
        // Riattacca listener per i bottoni "Ignora"
        setupDismissAlertButtons();
    }

    // Aggiorna cronologia alert
    const historyTableBody = document.querySelector('#alerts-content .card:last-child table tbody');
    if (historyTableBody) {
         let historyHtml = '';
         const allHistory = [...appData.alerts.active, ...appData.alerts.history] // Mostra anche attivi nella cronologia
            .sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-'))); // Ordina

         if (allHistory.length === 0) {
             historyHtml = '<tr><td colspan="4" class="text-center text-muted">Nessuna cronologia alert.</td></tr>';
         } else {
            allHistory.forEach(alert => {
                let typeBadge = 'bg-secondary';
                if (alert.type === 'Critico') typeBadge = 'bg-danger';
                if (alert.type === 'Avviso') typeBadge = 'bg-warning';
                if (alert.type === 'Info') typeBadge = 'bg-info';

                let statusBadge = 'bg-secondary';
                if (alert.status === 'Attivo') statusBadge = 'bg-warning text-dark';
                if (alert.status === 'Risolto') statusBadge = 'bg-success';
                if (alert.status === 'Informativo') statusBadge = 'bg-info text-dark';

                 historyHtml += `
                    <tr>
                        <td>${alert.date}</td>
                        <td><span class="badge ${typeBadge}">${alert.type}</span></td>
                        <td>${alert.message}</td>
                        <td><span class="badge ${statusBadge}">${alert.status}</span></td>
                    </tr>
                `;
            });
         }
         historyTableBody.innerHTML = historyHtml;
    }
}


// --- CHART FUNCTIONS ---

/**
 * Inizializza o aggiorna un grafico Chart.js.
 * @param {string} chartId ID del canvas del grafico.
 * @param {object} chartConfig Configurazione del grafico (type, data, options).
 */
function initOrUpdateChart(chartId, chartConfig) {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        console.warn(`Canvas non trovato per il grafico: ${chartId}`);
        return;
    }

    if (charts[chartId]) { // Se il grafico esiste già, aggiornalo
        charts[chartId].data = chartConfig.data;
        charts[chartId].options = chartConfig.options; // Aggiorna anche le opzioni se necessario
        charts[chartId].update();
        // console.log(`Grafico aggiornato: ${chartId}`);
    } else { // Altrimenti, crealo
        charts[chartId] = new Chart(ctx.getContext('2d'), chartConfig);
        // console.log(`Grafico creato: ${chartId}`);
    }
}

/**
 * Inizializza o aggiorna tutti i grafici dell'applicazione.
 */
function initOrUpdateAllCharts() {
    // Grafico Allocazione Dashboard
    initOrUpdateChart('allocationChart', {
        type: 'pie',
        data: {
            labels: Object.values(appData.assets).map(a => a.name),
            datasets: [{
                data: Object.values(appData.assets).map(a => a.currentValue),
                backgroundColor: Object.values(appData.assets).map(a => a.color),
                borderWidth: 1
            }]
        },
        options: commonChartOptions('pie', 'Patrimonio')
    });

    // Grafico Performance Mensile Dashboard (usa le proiezioni totali)
    initOrUpdateChart('performanceChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [{
                label: 'Totale',
                data: appData.projections.total,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: commonChartOptions('line', 'Andamento Totale', true) // Abilita asse Y
    });

    // Grafico Allocazione Investimenti
    initOrUpdateChart('investmentsAllocationChart', {
        type: 'doughnut',
         data: { // Stessi dati di allocationChart
            labels: Object.values(appData.assets).map(a => a.name),
            datasets: [{
                data: Object.values(appData.assets).map(a => a.currentValue),
                backgroundColor: Object.values(appData.assets).map(a => a.color),
                borderWidth: 1
            }]
        },
        options: commonChartOptions('doughnut', 'Allocazione Investimenti')
    });

     // Grafico Allocazione Crypto
    if (appData.assets.crypto.allocation) {
        initOrUpdateChart('cryptoAllocationChart', {
            type: 'pie',
            data: {
                labels: appData.assets.crypto.allocation.map(item => item.name),
                datasets: [{
                    // Usa il valore ricalcolato per il tooltip
                    data: appData.assets.crypto.allocation.map(item => (item.percentage / 100) * appData.assets.crypto.currentValue),
                    // Usa colori specifici se disponibili o genera/usa palette
                    backgroundColor: ['#f7931a','#00ffbd','#627eea','#2ebac6','#0033ad','#cccccc'], // Esempio colori
                    borderWidth: 1
                }]
            },
            options: commonChartOptions('pie', 'Allocazione Crypto', false, true) // abilita tooltip valore %
        });
    }

     // Grafico Proiezione Crypto
    initOrUpdateChart('cryptoProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [{
                label: 'Crypto',
                data: appData.projections.crypto,
                borderColor: appData.assets.crypto.color,
                backgroundColor: `${appData.assets.crypto.color}1A`, // Aggiungi trasparenza
                fill: true,
                tension: 0.4
            }]
        },
        options: commonChartOptions('line', 'Proiezione Crypto', true)
    });

    // Grafico Allocazione ETF
    if (appData.assets.etf.allocation) {
         initOrUpdateChart('etfAllocationChart', {
            type: 'pie',
            data: {
                labels: appData.assets.etf.allocation.map(item => item.name),
                datasets: [{
                     data: appData.assets.etf.allocation.map(item => (item.percentage / 100) * appData.assets.etf.currentValue),
                    backgroundColor: ['#0dcaf0','#20c997','#0d6efd','#6610f2','#6c757d'], // Esempio colori
                    borderWidth: 1
                }]
            },
            options: commonChartOptions('pie', 'Allocazione ETF', false, true)
        });
    }

    // Grafico Proiezione ETF
    initOrUpdateChart('etfProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [{
                label: 'ETF',
                data: appData.projections.etf,
                borderColor: appData.assets.etf.color,
                backgroundColor: `${appData.assets.etf.color}1A`,
                fill: true,
                tension: 0.4
            }]
        },
        options: commonChartOptions('line', 'Proiezione ETF', true)
    });

     // Grafico Andamento Prezzo Argento (Dati statici esempio)
     initOrUpdateChart('silverPriceChart', {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'], // Assumiamo anno corrente
            datasets: [{
                label: 'Prezzo Argento (€/oz - Esempio)',
                // NOTA: Questi sono dati fittizi, dovresti aggiornarli da API o manualmente
                data: [22.50, 22.80, 23.10, 23.50, 23.80, 24.20, 24.50, 24.90, 25.30, 25.70, 26.10, 26.50],
                borderColor: appData.assets.silver.color,
                backgroundColor: `${appData.assets.silver.color}1A`,
                fill: true,
                tension: 0.4
            }]
        },
        options: commonChartOptions('line', 'Andamento Prezzo Argento', true)
    });


    // Grafico Proiezione Argento
    initOrUpdateChart('silverProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [{
                label: 'Argento',
                data: appData.projections.silver,
                borderColor: appData.assets.silver.color,
                backgroundColor: `${appData.assets.silver.color}1A`,
                fill: true,
                tension: 0.4
            }]
        },
        options: commonChartOptions('line', 'Proiezione Argento', true)
    });

    // Grafico Spese per Categoria
    initOrUpdateChart('expenseCategoryChart', {
        type: 'doughnut',
        data: {
            labels: appData.expenses.categories.map(cat => cat.name),
            datasets: [{
                data: appData.expenses.categories.map(cat => cat.amount),
                backgroundColor: appData.expenses.categories.map(cat => cat.color),
                borderWidth: 1
            }]
        },
        options: commonChartOptions('doughnut', 'Spese per Categoria', false, true) // abilita tooltip valore %
    });

    // Grafico Proiezione Totale (Patrimonio)
    initOrUpdateChart('totalProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                {
                    label: 'Totale',
                    data: appData.projections.total,
                    borderColor: '#0d6efd', // Blu primario per il totale
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2 // Leggermente più spessa
                },
                 {
                    label: 'Crypto',
                    data: appData.projections.crypto,
                    borderColor: appData.assets.crypto.color,
                    fill: false, // Linee non riempite per gli asset singoli
                    tension: 0.4,
                    borderDash: [5, 5] // Tratteggiata
                },
                 {
                    label: 'ETF',
                    data: appData.projections.etf,
                    borderColor: appData.assets.etf.color,
                    fill: false,
                    tension: 0.4,
                     borderDash: [5, 5]
                },
                {
                    label: 'Argento',
                    data: appData.projections.silver,
                    borderColor: appData.assets.silver.color,
                    fill: false,
                    tension: 0.4,
                     borderDash: [5, 5]
                }
            ]
        },
        options: commonChartOptions('line', 'Proiezione Patrimonio', true)
    });
}

/**
 * Genera opzioni comuni per i grafici Chart.js.
 * @param {string} type Tipo di grafico ('pie', 'doughnut', 'line').
 * @param {string} title Titolo del grafico.
 * @param {boolean} [showYAxis=false] Mostrare l'asse Y (per grafici line).
 * @param {boolean} [tooltipValuePercentage=false] Mostrare valore e percentuale nel tooltip (per pie/doughnut).
 * @returns {object} Oggetto di opzioni Chart.js.
 */
function commonChartOptions(type, title, showYAxis = false, tooltipValuePercentage = false) {
    const options = {
        responsive: true,
        maintainAspectRatio: false, // Permette al grafico di adattarsi meglio
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    padding: 15
                }
            },
            title: { // Aggiungi titolo al grafico
                display: true,
                text: title,
                padding: {
                    top: 10,
                    bottom: 10
                },
                font: {
                    size: 16
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.raw;
                        if (tooltipValuePercentage && (type === 'pie' || type === 'doughnut')) {
                             const total = context.dataset.data.reduce((a, b) => a + b, 0);
                             const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                             label += `${formatCurrency(value)} (${percentage}%)`;
                        } else {
                            label += formatCurrency(value);
                        }
                        return label;
                    }
                }
            }
        }
    };

    if (showYAxis) {
        options.scales = {
            y: {
                beginAtZero: false, // Non partire sempre da zero
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                }
            }
        };
    }

    return options;
}


// --- EVENT LISTENERS AND SETUP ---

/**
 * Imposta la navigazione tra le schede/sezioni.
 */
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]'); // Seleziona link sidebar e navbar mobile
    const contentSections = document.querySelectorAll('.content-section');

    function showSection(targetId) {
        // Nascondi tutte le sezioni
        contentSections.forEach(section => section.classList.add('d-none'));

        // Mostra la sezione target
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('d-none');
            // Potrebbe essere utile forzare l'aggiornamento dei grafici qui se non visibili prima
            // initOrUpdateAllCharts(); // Scommenta se necessario
        }

        // Aggiorna stato active sui link
        tabLinks.forEach(link => {
            const linkTargetId = link.id.replace('mobile-', '').replace('-tab', '-content');
            const isActive = linkTargetId === targetId;
            link.classList.toggle('active', isActive);
             // Gestione colore testo per sidebar scura
            if (link.closest('.sidebar')) { // Se è nella sidebar
                link.classList.toggle('text-white', !isActive);
            }
        });
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.id.replace('mobile-', '').replace('-tab', '-content');
            showSection(targetId);
             // Chiudi la navbar mobile dopo il click (se aperta)
             const navbarCollapse = document.querySelector('.navbar-collapse.show');
             if (navbarCollapse) {
                 new bootstrap.Collapse(navbarCollapse).hide();
             }
        });
    });

    // Mostra la dashboard all'inizio
    showSection('dashboard-content');
}

/**
 * Imposta gli event listener per i modali.
 */
function setupModals() {
    // --- Modal Modifica Asset ---
    const editAssetModal = new bootstrap.Modal(document.getElementById('editAssetModal'));
    document.querySelectorAll('.edit-asset').forEach(button => {
        button.addEventListener('click', function() {
            const assetType = this.getAttribute('data-asset-type');
            const asset = appData.assets[assetType];
            const modalElement = document.getElementById('editAssetModal');

            modalElement.querySelector('#assetType').value = assetType;
            modalElement.querySelector('#editAssetModalLabel').textContent = `Modifica ${asset.name}`;
            modalElement.querySelector('#currentValue').value = asset.currentValue;
            modalElement.querySelector('#contributedValue').value = asset.contributedValue;
            modalElement.querySelector('#growthForecast').value = asset.forecast;

            editAssetModal.show();
        });
    });

    document.getElementById('saveAssetChanges').addEventListener('click', function() {
        const assetType = document.getElementById('assetType').value;
        const currentValue = parseFloat(document.getElementById('currentValue').value);
        const contributedValue = parseFloat(document.getElementById('contributedValue').value);
        const growthForecast = parseFloat(document.getElementById('growthForecast').value);

        if (isNaN(currentValue) || isNaN(contributedValue) || isNaN(growthForecast)) {
             showNotification('Errore: Inserire valori numerici validi.', 'danger');
             return;
        }

        // Aggiorna dati
        appData.assets[assetType].currentValue = currentValue;
        appData.assets[assetType].contributedValue = contributedValue;
        appData.assets[assetType].forecast = growthForecast;

        calculateAssetPerformance(assetType); // Ricalcola performance del singolo asset
        updateUI(); // Aggiorna tutta l'interfaccia

        editAssetModal.hide();
        showNotification(`${appData.assets[assetType].name} aggiornato con successo!`, 'success');
    });


    // --- Modal Aggiungi Spesa ---
    const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    const addExpenseForm = document.getElementById('addExpenseForm');
    const expenseModalTitle = document.getElementById('addExpenseModalLabel');
    const expenseSubmitButton = document.getElementById('saveExpense');
    let editingExpenseId = null; // Per tenere traccia se stiamo modificando

     // Apri modal per nuova spesa
     document.getElementById('add-expense-btn').addEventListener('click', () => openAddExpenseModal());
     document.getElementById('addExpenseFromTransactionBtn').addEventListener('click', () => {
         bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'))?.hide(); // Chiudi modal transazioni
         openAddExpenseModal();
     });


    // Funzione per aprire il modal (nuova o modifica)
    function openAddExpenseModal(expenseId = null) {
         addExpenseForm.reset(); // Pulisci il form
         editingExpenseId = expenseId;

         if (expenseId) { // Modalità modifica
             const expense = appData.expenses.transactions.find(tx => tx.id === expenseId);
             if (expense) {
                 expenseModalTitle.textContent = 'Modifica Spesa';
                 expenseSubmitButton.textContent = 'Salva Modifiche';
                 document.getElementById('expenseDescription').value = expense.description;
                 document.getElementById('expenseAmount').value = expense.amount;
                 document.getElementById('expenseCategory').value = expense.category;
                 // Formatta la data per l'input type="date" (YYYY-MM-DD)
                 const dateParts = expense.date.split('/');
                 document.getElementById('expenseDate').value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
             } else {
                 console.error("Spesa da modificare non trovata:", expenseId);
                 showNotification('Errore: Spesa da modificare non trovata.', 'danger');
                 return; // Non aprire il modal se non trovo la spesa
             }
         } else { // Modalità aggiunta
             expenseModalTitle.textContent = 'Aggiungi Spesa';
             expenseSubmitButton.textContent = 'Salva';
             document.getElementById('expenseDate').valueAsDate = new Date(); // Data odierna di default
         }
         addExpenseModal.show();
     }


    // Salvataggio (Aggiunta o Modifica)
    expenseSubmitButton.addEventListener('click', function() {
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const dateInput = document.getElementById('expenseDate').value; // YYYY-MM-DD

        if (!description || isNaN(amount) || amount <= 0 || !category || !dateInput) {
            showNotification('Errore: Compilare tutti i campi correttamente.', 'danger');
            return;
        }

        // Formatta la data in DD/MM/YYYY
        const dateObj = new Date(dateInput);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;


        if (editingExpenseId) { // Modalità modifica
            const expenseIndex = appData.expenses.transactions.findIndex(tx => tx.id === editingExpenseId);
            if (expenseIndex > -1) {
                // Aggiorna la spesa esistente
                appData.expenses.transactions[expenseIndex] = {
                    ...appData.expenses.transactions[expenseIndex], // Mantieni l'ID originale
                    description,
                    amount,
                    category,
                    date: formattedDate
                };
                 // Ricalcola totale spese e categorie
                recalculateExpenseTotals();
                updateUI();
                addExpenseModal.hide();
                showNotification('Spesa modificata con successo!', 'success');
            } else {
                showNotification('Errore durante la modifica della spesa.', 'danger');
            }

        } else { // Modalità aggiunta
            const newExpense = {
                id: Date.now(), // ID univoco semplice
                description,
                amount,
                category,
                date: formattedDate
            };
            appData.expenses.transactions.unshift(newExpense); // Aggiungi all'inizio
             // Ricalcola totale spese e categorie
            recalculateExpenseTotals();
            updateUI();
            addExpenseModal.hide();
            showNotification('Spesa aggiunta con successo!', 'success');
        }
        editingExpenseId = null; // Resetta ID modifica
    });

     // --- Rendi edit/delete funzionanti ---
    setupExpenseActionButtons();


    // --- Modal Modifica Proiezioni ---
    const editProjectionsModal = new bootstrap.Modal(document.getElementById('editProjectionsModal'));
    document.getElementById('edit-projections-btn').addEventListener('click', function() {
        document.getElementById('cryptoGrowth').value = appData.assets.crypto.forecast;
        document.getElementById('etfGrowth').value = appData.assets.etf.forecast;
        document.getElementById('silverGrowth').value = appData.assets.silver.forecast;
        editProjectionsModal.show();
    });

    document.getElementById('saveProjections').addEventListener('click', function() {
        const cryptoGrowth = parseFloat(document.getElementById('cryptoGrowth').value);
        const etfGrowth = parseFloat(document.getElementById('etfGrowth').value);
        const silverGrowth = parseFloat(document.getElementById('silverGrowth').value);

         if (isNaN(cryptoGrowth) || isNaN(etfGrowth) || isNaN(silverGrowth)) {
             showNotification('Errore: Inserire valori numerici validi per le previsioni.', 'danger');
             return;
         }

        appData.assets.crypto.forecast = cryptoGrowth;
        appData.assets.etf.forecast = etfGrowth;
        appData.assets.silver.forecast = silverGrowth;

        updateUI(); // Ricalcola proiezioni e aggiorna UI

        editProjectionsModal.hide();
        showNotification('Previsioni aggiornate!', 'success');
    });


    // --- Modal Configurazione Alert ---
    // NB: Il modal per editare gli alert non è definito in index.html,
    // assumiamo che esista con id 'editAlertsModal' se vuoi implementarlo.
    const editAlertsModalElement = document.getElementById('editAlertsModal'); // Aggiungi questo modal in HTML se necessario
    let editAlertsModal = null;
    if (editAlertsModalElement) {
         editAlertsModal = new bootstrap.Modal(editAlertsModalElement);

         document.getElementById('edit-alerts-btn').addEventListener('click', function() {
            // Popola il modal con la configurazione corrente
            const config = appData.alerts.config;
            document.getElementById('alertPerformanceNegative').checked = config.performanceNegative.enabled;
            document.getElementById('thresholdPerformanceNegative').value = config.performanceNegative.threshold;
            document.getElementById('alertPerformancePositive').checked = config.performancePositive.enabled;
            document.getElementById('thresholdPerformancePositive').value = config.performancePositive.threshold;
            document.getElementById('alertAllocationImbalance').checked = config.allocationImbalance.enabled;
            document.getElementById('thresholdAllocationImbalance').value = config.allocationImbalance.threshold;
            document.getElementById('alertBudgetExceeded').checked = config.budgetExceeded.enabled;
            document.getElementById('thresholdBudgetExceeded').value = config.budgetExceeded.threshold;
            editAlertsModal.show();
         });

         document.getElementById('save-alerts-config').addEventListener('click', function() {
            const config = appData.alerts.config;
            config.performanceNegative.enabled = document.getElementById('alertPerformanceNegative').checked;
            config.performanceNegative.threshold = parseFloat(document.getElementById('thresholdPerformanceNegative').value);
            config.performancePositive.enabled = document.getElementById('alertPerformancePositive').checked;
            config.performancePositive.threshold = parseFloat(document.getElementById('thresholdPerformancePositive').value);
            config.allocationImbalance.enabled = document.getElementById('alertAllocationImbalance').checked;
            config.allocationImbalance.threshold = parseFloat(document.getElementById('thresholdAllocationImbalance').value);
            config.budgetExceeded.enabled = document.getElementById('alertBudgetExceeded').checked;
            config.budgetExceeded.threshold = parseFloat(document.getElementById('thresholdBudgetExceeded').value);

            updateUI(); // Ricalcola alert e aggiorna UI
            editAlertsModal.hide();
            showNotification('Configurazione alert salvata!', 'success');
         });
    } else {
        // Se il bottone esiste ma il modal no, disabilita il bottone o logga un warning
        const editAlertsBtn = document.getElementById('edit-alerts-btn');
        if (editAlertsBtn) {
            console.warn("Bottone 'Configura Alert' trovato ma il modal 'editAlertsModal' non esiste nell'HTML.");
            // editAlertsBtn.disabled = true; // Opzionale: disabilita il bottone
        }
    }

    // --- Modal Aggiungi Transazione (Selezione tipo) ---
    const addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    document.getElementById('add-transaction-btn').addEventListener('click', function() {
        addTransactionModal.show();
    });


    // --- Modal Aggiungi Investimento ---
    const addInvestmentModal = new bootstrap.Modal(document.getElementById('addInvestmentModal'));
    const addInvestmentForm = document.getElementById('addInvestmentForm');

     // Apri da modal transazioni
    document.getElementById('addInvestmentBtn').addEventListener('click', function() {
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'))?.hide(); // Chiudi modal selezione
        addInvestmentForm.reset(); // Pulisci form
        document.getElementById('investmentDate').valueAsDate = new Date(); // Data odierna
        addInvestmentModal.show();
    });

    document.getElementById('saveInvestment').addEventListener('click', function() {
        const assetType = document.getElementById('investmentAsset').value;
        const amount = parseFloat(document.getElementById('investmentAmount').value);
        const dateInput = document.getElementById('investmentDate').value; // YYYY-MM-DD
        const description = document.getElementById('investmentDescription').value.trim() || `Investimento in ${appData.assets[assetType].name}`;

         if (!assetType || isNaN(amount) || amount <= 0 || !dateInput) {
            showNotification('Errore: Compilare correttamente Asset, Importo e Data.', 'danger');
            return;
         }

         // Formatta la data in DD/MM/YYYY (per eventuale log o visualizzazione)
         const dateObj = new Date(dateInput);
         const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

         // Aggiorna dati asset
         appData.assets[assetType].contributedValue += amount;
         // Qui potresti decidere se aggiungere l'importo anche al valore attuale
         // Dipende se consideri l'investimento subito valorizzato o meno
         // appData.assets[assetType].currentValue += amount; // Opzionale

         calculateAssetPerformance(assetType);
         updateUI();

         addInvestmentModal.hide();
         showNotification(`Investimento di ${formatCurrency(amount)} in ${appData.assets[assetType].name} aggiunto!`, 'success');

         // Aggiungi alla tabella transazioni nel Dashboard (opzionale)
         // addTransactionToDashboardTable({ date: formattedDate, category: `Investimento ${appData.assets[assetType].name}`, description, amount: amount, isInvestment: true });
    });


    // --- Gestione Alert ---
    setupDismissAlertButtons();
}

/**
 * Ricalcola i totali delle spese e le somme per categoria.
 */
function recalculateExpenseTotals() {
    appData.expenses.spent = appData.expenses.transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Resetta e ricalcola totali per categoria
    appData.expenses.categories.forEach(cat => cat.amount = 0);
    appData.expenses.transactions.forEach(tx => {
        const category = appData.expenses.categories.find(cat => cat.name === tx.category);
        if (category) {
            category.amount += tx.amount;
        } else {
            // Gestisci categoria non trovata? Potrebbe essere 'Altro' di default
            const otherCategory = appData.expenses.categories.find(cat => cat.name === 'Altro');
             if (otherCategory) otherCategory.amount += tx.amount;
        }
    });

     // Ricalcola percentuali categorie (già fatto in updateExpensesSection, ma potresti volerlo qui)
     const totalSpent = appData.expenses.spent; // Usa il totale appena calcolato
     appData.expenses.categories.forEach(cat => {
         cat.percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
     });
}


/**
 * Aggiunge event listener ai bottoni Modifica/Elimina nella tabella spese.
 * Va chiamata dopo aver rigenerato la tabella.
 */
function setupExpenseActionButtons() {
    const expenseListTableBody = document.querySelector('#expenses-content .card:last-child table tbody');
    if (!expenseListTableBody) return;

     // Bottoni Modifica
    expenseListTableBody.querySelectorAll('.edit-expense').forEach(button => {
        // Rimuovi listener precedenti per evitare duplicazioni
        button.replaceWith(button.cloneNode(true));
    });
    // Aggiungi nuovi listener
    expenseListTableBody.querySelectorAll('.edit-expense').forEach(button => {
         button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-expense-id'));
            openAddExpenseModal(expenseId); // Apri modal in modalità modifica
        });
    });

    // Bottoni Elimina
    expenseListTableBody.querySelectorAll('.delete-expense').forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
    expenseListTableBody.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-expense-id'));
             if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
                appData.expenses.transactions = appData.expenses.transactions.filter(tx => tx.id !== expenseId);
                recalculateExpenseTotals();
                updateUI();
                showNotification('Spesa eliminata.', 'success');
             }
        });
    });
}

/**
 * Aggiunge event listener ai bottoni "Ignora" negli alert attivi.
 * Va chiamata dopo aver rigenerato la lista degli alert attivi.
 */
function setupDismissAlertButtons() {
    const activeAlertsContainer = document.querySelector('#alerts-content .card:nth-of-type(1) .card-body');
    if (!activeAlertsContainer) return;

    activeAlertsContainer.querySelectorAll('.dismiss-alert').forEach(button => {
         // Rimuovi listener precedenti
         button.replaceWith(button.cloneNode(true));
     });

     activeAlertsContainer.querySelectorAll('.dismiss-alert').forEach(button => {
        button.addEventListener('click', function() {
            const alertId = parseFloat(this.getAttribute('data-alert-id')); // ID potrebbe essere timestamp
            const alertIndex = appData.alerts.active.findIndex(alert => alert.id === alertId);

            if (alertIndex !== -1) {
                const dismissedAlert = appData.alerts.active.splice(alertIndex, 1)[0]; // Rimuovi e ottieni l'alert
                dismissedAlert.status = 'Risolto'; // Cambia stato
                appData.alerts.history.unshift(dismissedAlert); // Aggiungi alla cronologia

                updateAlertsSection(); // Aggiorna solo la sezione alert
                showNotification('Alert ignorato.', 'info');
            }
        });
     });
}


/**
 * Mostra una notifica toast Bootstrap.
 * @param {string} message Messaggio da visualizzare.
 * @param {string} type Tipo di notifica ('success', 'danger', 'warning', 'info' - corrisponde a classi bg-*).
 */
function showNotification(message, type = 'info') {
    const toastContainerId = 'toast-container';
    let toastContainer = document.getElementById(toastContainerId);

    // Crea il container se non esiste
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = toastContainerId;
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = 1090; // Assicurati sia sopra altri elementi
        document.body.appendChild(toastContainer);
    }

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove(); // Rimuovi l'elemento dal DOM dopo la chiusura
        // Opzionale: rimuovi il container se è vuoto
        // if (toastContainer.children.length === 0) {
        //     toastContainer.remove();
        // }
    });

    toast.show();
}

/**
 * Funzione per rilevare dispositivi pieghevoli (opzionale, per layout specifici).
 */
function detectFoldableDevice() {
    // Implementazione esempio - potrebbe necessitare di aggiustamenti
    const isFoldableMediaQuery = window.matchMedia("(max-device-width: 991px) and (min-device-width: 600px)"); // Esempio media query
    document.body.classList.toggle('foldable-device', isFoldableMediaQuery.matches);
}

// --- APP INITIALIZATION ---

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM caricato. Inizializzazione app...");

    detectFoldableDevice(); // Rileva foldable (opzionale)
    setupNavigation();     // Imposta navigazione tra sezioni
    setupModals();         // Imposta gestione modali e azioni associate
    updateUI();            // Calcola tutto, aggiorna UI e grafici iniziali

    window.addEventListener('resize', detectFoldableDevice); // Aggiorna su resize (opzionale)

    console.log("App inizializzata.");
});

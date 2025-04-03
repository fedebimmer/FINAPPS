// Dati dell'applicazione (valori iniziali di esempio)
// Struttura dati principale che contiene tutte le informazioni finanziarie.
let appData = {
    assets: {
        crypto: {
            name: "Crypto", currentValue: 424, contributedValue: 782, performance: -45.78, forecast: 15.00, color: '#ffc107',
            allocation: [ // Suddivisione interna dell'asset Crypto
                { name: "Bitcoin (BTC)", percentage: 22.75, value: 0 }, { name: "Solana (SOL)", percentage: 11.23, value: 0 },
                { name: "Ether (ETH)", percentage: 10.25, value: 0 }, { name: "Aave (AAVE)", percentage: 7.48, value: 0 },
                { name: "Cardano (ADA)", percentage: 7.22, value: 0 }, { name: "Altri", percentage: 41.07, value: 0 }
            ]
        },
        etf: {
            name: "ETF", currentValue: 4575, contributedValue: 5036, performance: -9.15, forecast: 8.79, color: '#0dcaf0',
            allocation: [ // Suddivisione interna dell'asset ETF
                { name: "iShares DJ Global Titans 50", percentage: 20, value: 0, forecast: 9.43 },
                { name: "iShares Edge MSCI World Quality", percentage: 20, value: 0, forecast: 13.39 },
                { name: "Xtrackers MSCI World IT", percentage: 20, value: 0, forecast: 20.40 },
                { name: "Xtrackers MSCI USA Cons Disc", percentage: 10, value: 0, forecast: -7.50 },
                { name: "Altri ETF", percentage: 30, value: 0, forecast: 4.80 } // Previsione media per gli altri
            ]
        },
        silver: {
            name: "Argento", currentValue: 221, contributedValue: 228, performance: -3.07, forecast: 6.50, color: '#6c757d',
            allocation: null // L'argento non ha una sotto-allocazione in questo esempio
        }
    },
    expenses: {
        budget: 1000, // Budget mensile target
        spent: 0, // Speso nel mese corrente (verrà ricalcolato)
        categories: [ // Categorie di spesa predefinite
            { name: "Alimentari", amount: 0, percentage: 0, color: "#198754" }, { name: "Trasporti", amount: 0, percentage: 0, color: "#dc3545" },
            { name: "Casa", amount: 0, percentage: 0, color: "#0d6efd" }, { name: "Svago", amount: 0, percentage: 0, color: "#ffc107" },
            { name: "Altro", amount: 0, percentage: 0, color: "#fd7e14" } // Categoria jolly
        ],
        transactions: [ // Elenco delle spese registrate
             { id: 1, date: "01/04/2025", category: "Alimentari", description: "Spesa settimanale", amount: 85.30 },
             { id: 2, date: "28/03/2025", category: "Trasporti", description: "Benzina", amount: 45.00 },
             { id: 3, date: "26/03/2025", category: "Svago", description: "Cinema", amount: 25.00 }
             // Le nuove spese verranno aggiunte qui
        ]
    },
    projections: {
        // I mesi vengono determinati dinamicamente all'inizio
        months: [], // Es: ["Apr", "Mag", ..., "Dic 2025"]
        crypto: [], etf: [], silver: [], total: [] // Array per i valori proiettati per mese
    },
    alerts: {
        active: [], // Alert attualmente attivi da mostrare all'utente
        history: [], // Storico degli alert (attivati e poi ignorati/risolti)
        config: { // Soglie per l'attivazione degli alert
            performanceNegative: { enabled: true, threshold: -5 }, // Alert se performance < -5%
            performancePositive: { enabled: true, threshold: 10 }, // Alert se performance > +10%
            allocationImbalance: { enabled: true, threshold: 70 }, // Alert se un asset > 70% del totale
            budgetExceeded: { enabled: true, threshold: 90 } // Alert se speso > 90% del budget
        }
    },
    portfolio: { // Dati aggregati del portafoglio totale
        totalValue: 0, totalContributions: 0, totalPerformance: 0
    },
    dashboardTransactions: [] // Potenzialmente per future transazioni specifiche della dashboard
};

// Store chart instances per poterle aggiornare o distruggere
const charts = {};
const currentYear = new Date().getFullYear(); // Anno corrente per le etichette

// --- UTILITY FUNCTIONS ---

/**
 * Formatta un numero come valuta (Euro).
 * @param {number | null | undefined} value Il valore numerico da formattare.
 * @returns {string} Stringa formattata (es. "€ 1.234,56") o "€ --,--" se invalido.
 */
function formatCurrency(value) {
    // Aggiunto controllo esplicito per NaN per sicurezza
    if (value === null || typeof value === 'undefined' || isNaN(value)) return "€ --,--";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatta un numero come percentuale.
 * @param {number | null | undefined} value Il valore numerico da formattare.
 * @returns {string} Stringa formattata (es. "12,34%") o "--,--%" se invalido.
 */
function formatPercentage(value) {
     // Aggiunto controllo esplicito per NaN per sicurezza
    if (value === null || typeof value === 'undefined' || isNaN(value)) return "--,--%";
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Restituisce la classe CSS appropriata ('text-success', 'text-danger', 'text-secondary')
 * in base al segno del valore (positivo, negativo, zero/nullo).
 * @param {number | null | undefined} value Il valore numerico.
 * @returns {string} La classe CSS.
 */
function getPerformanceClass(value) {
    if (value === null || typeof value === 'undefined' || isNaN(value)) return 'text-secondary';
    return value > 0 ? 'text-success' : (value < 0 ? 'text-danger' : 'text-secondary');
}

// --- DATA CALCULATION & AGGREGATION ---

/**
 * Calcola la performance percentuale di un singolo asset.
 * Performance = ((Valore Attuale - Contributi) / Contributi) * 100
 * @param {string} assetType La chiave dell'asset (es. 'crypto', 'etf').
 */
function calculateAssetPerformance(assetType) {
    const asset = appData.assets[assetType];
    if (!asset) return;

    // Controlla che contributedValue sia un numero valido e > 0
    if (typeof asset.contributedValue === 'number' && !isNaN(asset.contributedValue) && asset.contributedValue > 0 && typeof asset.currentValue === 'number' && !isNaN(asset.currentValue)) {
        asset.performance = ((asset.currentValue - asset.contributedValue) / asset.contributedValue) * 100;
    } else {
        asset.performance = 0; // Performance è 0 se i contributi sono 0 o i valori non validi
    }
    // console.log(`Performance calcolata per ${assetType}:`, asset.performance); // DEBUG
}

/**
 * Calcola i totali aggregati del portafoglio (valore, contributi, performance)
 * e aggiorna i valori delle sotto-allocazioni degli asset (es. valore di BTC in €).
 */
function calculatePortfolioTotals() {
    let totalValue = 0;
    let totalContributions = 0;

    for (const key in appData.assets) {
        const asset = appData.assets[key];
        if (!asset) continue;

        calculateAssetPerformance(key); // Ricalcola performance asset PRIMA

        if (typeof asset.currentValue === 'number' && !isNaN(asset.currentValue)) {
            totalValue += asset.currentValue;
        }
        if (typeof asset.contributedValue === 'number' && !isNaN(asset.contributedValue)) {
            totalContributions += asset.contributedValue;
        }

        if (asset.allocation && Array.isArray(asset.allocation)) {
             asset.allocation.forEach(item => {
                if (typeof item.percentage === 'number' && !isNaN(item.percentage) && typeof asset.currentValue === 'number' && !isNaN(asset.currentValue)) {
                    item.value = (item.percentage / 100) * asset.currentValue;
                } else {
                    item.value = 0;
                }
             });
        }
    }

    appData.portfolio.totalValue = totalValue;
    appData.portfolio.totalContributions = totalContributions;

    // Calcola performance totale, gestendo il caso di contributi = 0
    if (totalContributions > 0 && typeof totalValue === 'number') {
        appData.portfolio.totalPerformance = ((totalValue - totalContributions) / totalContributions) * 100;
    } else {
        appData.portfolio.totalPerformance = 0;
    }
    // console.log("Portfolio Totals Calcolati:", JSON.stringify(appData.portfolio)); // DEBUG
}

/**
 * Ricalcola il totale speso e la distribuzione delle spese per categoria.
 */
function recalculateExpenseTotals() {
    appData.expenses.spent = appData.expenses.transactions.reduce((sum, tx) => {
        return sum + (typeof tx.amount === 'number' && !isNaN(tx.amount) && tx.amount > 0 ? tx.amount : 0);
    }, 0);

    appData.expenses.categories.forEach(cat => {
        cat.amount = 0;
        cat.percentage = 0;
    });

    const otherCategory = appData.expenses.categories.find(cat => cat.name === 'Altro');
    appData.expenses.transactions.forEach(tx => {
        if (typeof tx.amount === 'number' && !isNaN(tx.amount) && tx.amount > 0) {
            const category = appData.expenses.categories.find(cat => cat.name === tx.category);
            const targetCategory = category || otherCategory;
            if (targetCategory) {
                targetCategory.amount += tx.amount;
            }
        }
    });

    const totalSpent = appData.expenses.spent;
    if (totalSpent > 0) {
        appData.expenses.categories.forEach(cat => {
            cat.percentage = (cat.amount / totalSpent) * 100;
        });
    }
    // console.log("Totali Spese Calcolati. Speso:", appData.expenses.spent); // DEBUG
}

/**
 * Calcola i valori proiettati per ogni asset e per il totale, mese per mese.
 * Utilizza una proiezione lineare basata sul tasso di crescita annuo previsto (`forecast`).
 */
function calculateProjections() {
    const currentMonthIndex = new Date().getMonth();
    const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    appData.projections.months = monthLabels.slice(currentMonthIndex).map((month, index, arr) => {
        return (index === arr.length - 1) ? `${month} ${currentYear}` : month;
    });

    const numMonthsToProject = appData.projections.months.length;
    if (numMonthsToProject === 0) return;

    for (const key in appData.assets) { appData.projections[key] = []; }
    appData.projections.total = [];

    for (let i = 0; i < numMonthsToProject; i++) {
        let monthTotalProjected = 0;
        const yearlyProgressFraction = (i / 12);

        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const currentValue = typeof asset.currentValue === 'number' && !isNaN(asset.currentValue) ? asset.currentValue : 0;
            const annualGrowthRate = (typeof asset.forecast === 'number' && !isNaN(asset.forecast) ? asset.forecast : 0) / 100;
            const projectedValue = currentValue * (1 + annualGrowthRate * yearlyProgressFraction);
            appData.projections[key].push(parseFloat(projectedValue.toFixed(2)));
            monthTotalProjected += projectedValue;
        }
        appData.projections.total.push(parseFloat(monthTotalProjected.toFixed(2)));
    }
    document.querySelectorAll('.current-year').forEach(span => span.textContent = currentYear);
    // console.log("Proiezioni Calcolate:", JSON.stringify(appData.projections)); // DEBUG
}


/**
 * Controlla se devono essere attivati nuovi alert in base alle soglie definite.
 */
function checkAlerts() {
    const newActiveAlerts = [];
    const config = appData.alerts.config;
    const today = new Date().toLocaleDateString('it-IT');
    const existingMessages = new Set(appData.alerts.active.filter(a => a.status === 'Attivo').map(a => a.message));

    function addAlert(type, message) {
        if (!existingMessages.has(message)) {
             newActiveAlerts.push({ id: Date.now() + newActiveAlerts.length, type: type, message: message, status: "Attivo", date: today });
             existingMessages.add(message);
        }
    }

    if (config.performanceNegative.enabled) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (typeof asset.performance === 'number' && asset.performance < config.performanceNegative.threshold) {
                addAlert("Critico", `Perf. negativa ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${config.performanceNegative.threshold}%)`);
            }
        }
    }
    if (config.performancePositive.enabled) {
         for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (typeof asset.performance === 'number' && asset.performance > config.performancePositive.threshold) {
                addAlert("Info", `Perf. positiva ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${config.performancePositive.threshold}%)`);
            }
        }
    }
    if (config.budgetExceeded.enabled && appData.expenses.budget > 0) {
        const percentageSpent = (appData.expenses.spent / appData.expenses.budget) * 100;
        if (percentageSpent > config.budgetExceeded.threshold) {
            addAlert("Avviso", `Budget spesa superato (${formatPercentage(percentageSpent)}). Spesi ${formatCurrency(appData.expenses.spent)} su ${formatCurrency(appData.expenses.budget)} (Soglia: ${config.budgetExceeded.threshold}%)`);
        }
    }
    if (config.allocationImbalance.enabled && appData.portfolio.totalValue > 0) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const percentageOfTotal = (asset.currentValue / appData.portfolio.totalValue) * 100;
            if (percentageOfTotal > config.allocationImbalance.threshold) {
                addAlert("Avviso", `Allocazione ${asset.name} elevata: ${formatPercentage(percentageOfTotal)} del portafoglio (Soglia: ${config.allocationImbalance.threshold}%)`);
            }
        }
    }
    appData.alerts.active = [ ...appData.alerts.active.filter(a => a.status === 'Attivo'), ...newActiveAlerts ];
    // console.log("Alert Controllati. Attivi:", appData.alerts.active.length); // DEBUG
}

// --- UI UPDATE FUNCTIONS ---

/**
 * Helper generico per aggiornare il contenuto testuale e le classi di un elemento HTML.
 */
function updateElement(id, text, className = null, classesToRemove = []) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        if (classesToRemove.length > 0) { element.classList.remove(...classesToRemove); }
        if (className) { element.classList.add(className); }
    } else {
        // console.warn(`Elemento UI non trovato con ID: ${id}`); // DEBUG
    }
}

/**
 * Funzione principale che orchestra l'aggiornamento di tutta l'interfaccia utente.
 */
function updateUI() {
    console.log("🔄 Inizio Aggiornamento Interfaccia Utente...");

    // 1. Ricalcola tutti i dati aggregati
    try {
        calculatePortfolioTotals();
        recalculateExpenseTotals();
        calculateProjections();
        checkAlerts();
    } catch (error) {
        console.error("❌ Errore durante i calcoli:", error);
        showNotification("Si è verificato un errore durante il calcolo dei dati.", "danger");
        // Potrebbe essere utile fermare l'aggiornamento UI qui o gestire l'errore
        // return;
    }


    // 2. Aggiorna le varie sezioni della UI

    // == Dashboard ==
    try {
        const p_totalValue = appData.portfolio.totalValue;
        const p_totalContributions = appData.portfolio.totalContributions;
        const p_totalPerformance = appData.portfolio.totalPerformance;
        const a_crypto_currentValue = appData.assets.crypto.currentValue;
        const a_crypto_performance = appData.assets.crypto.performance;
        const a_etf_currentValue = appData.assets.etf.currentValue;
        const a_etf_performance = appData.assets.etf.performance;
        const a_silver_currentValue = appData.assets.silver.currentValue;
        const a_silver_performance = appData.assets.silver.performance;

        // *** NUOVO LOG DI DEBUG ***
        console.log("--- Valori PRONTI per UI Dashboard ---");
        console.log(`Portfolio - Valore: ${p_totalValue} (${typeof p_totalValue}), Contributi: ${p_totalContributions} (${typeof p_totalContributions}), Performance: ${p_totalPerformance} (${typeof p_totalPerformance})`);
        console.log(`Crypto - Valore: ${a_crypto_currentValue} (${typeof a_crypto_currentValue}), Performance: ${a_crypto_performance} (${typeof a_crypto_performance})`);
        console.log(`ETF - Valore: ${a_etf_currentValue} (${typeof a_etf_currentValue}), Performance: ${a_etf_performance} (${typeof a_etf_performance})`);
        console.log(`Silver - Valore: ${a_silver_currentValue} (${typeof a_silver_currentValue}), Performance: ${a_silver_performance} (${typeof a_silver_performance})`);
        console.log("------------------------------------");


        updateElement('dashboard-total-value', formatCurrency(p_totalValue));
        updateElement('dashboard-total-contributions', formatCurrency(p_totalContributions));
        updateElement('dashboard-total-performance', formatPercentage(p_totalPerformance), getPerformanceClass(p_totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
        updateElement('dashboard-crypto-value', formatCurrency(a_crypto_currentValue));
        updateElement('dashboard-crypto-performance', formatPercentage(a_crypto_performance), getPerformanceClass(a_crypto_performance), ['text-danger', 'text-success', 'text-secondary']);
        updateElement('dashboard-etf-value', formatCurrency(a_etf_currentValue));
        updateElement('dashboard-etf-performance', formatPercentage(a_etf_performance), getPerformanceClass(a_etf_performance), ['text-danger', 'text-success', 'text-secondary']);
        updateElement('dashboard-silver-value', formatCurrency(a_silver_currentValue));
        updateElement('dashboard-silver-performance', formatPercentage(a_silver_performance), getPerformanceClass(a_silver_performance), ['text-danger', 'text-success', 'text-secondary']);
        updateDashboardAlerts();
        updateDashboardTransactionsTable();
    } catch(error) { console.error("Errore aggiornamento UI Dashboard:", error); }

    // == Sezione Investimenti (Generale) ==
    try {
        updateElement('investments-total-value', formatCurrency(appData.portfolio.totalValue));
        updateElement('investments-total-contributions', formatCurrency(appData.portfolio.totalContributions));
        updateElement('investments-total-performance', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
        for (const key in appData.assets) { updateAssetCardInInvestments(key); }
        updateAllocationTable('#investments-allocation-table-body');
    } catch(error) { console.error("Errore aggiornamento UI Investimenti:", error); }

    // == Sezioni Dettaglio Asset Singoli ==
    try {
        for (const key in appData.assets) { updateAssetDetailsSection(key); }
    } catch(error) { console.error("Errore aggiornamento UI Dettaglio Asset:", error); }

    // == Sezione Spese ==
    try {
        updateExpensesSection();
    } catch(error) { console.error("Errore aggiornamento UI Spese:", error); }

    // == Sezione Proiezioni ==
    try {
        updateProjectionsSection();
    } catch(error) { console.error("Errore aggiornamento UI Proiezioni:", error); }

    // == Sezione Alert ==
    try {
        updateAlertsSection();
    } catch(error) { console.error("Errore aggiornamento UI Alert:", error); }

    // 3. Aggiorna (o inizializza) tutti i grafici
    try {
        initOrUpdateAllCharts();
    } catch (error) {
        console.error("❌ Errore durante l'aggiornamento dei grafici:", error);
        showNotification("Si è verificato un errore durante l'aggiornamento dei grafici.", "danger");
    }

    console.log("✅ Fine Aggiornamento Interfaccia Utente.");
}

// == Funzioni di Aggiornamento Specifiche per Sezioni UI ==
// (Le funzioni da updateAssetCardInInvestments a updateAlertsSection rimangono invariate rispetto alla versione precedente)
// ... (codice omesso per brevità, è identico a prima) ...
/**
 * Aggiorna la card di un singolo asset nella sezione "Investimenti".
 * @param {string} assetType Chiave dell'asset (es. 'crypto').
 */
function updateAssetCardInInvestments(assetType) {
    const asset = appData.assets[assetType];
    if (!asset) return;

    updateElement(`investments-${assetType}-value`, formatCurrency(asset.currentValue));
    updateElement(`investments-${assetType}-contributions`, `Contributi: ${formatCurrency(asset.contributedValue)}`);

    // Aggiorna performance e previsione con classe colore
    const perfLi = document.getElementById(`investments-${assetType}-performance`);
    if(perfLi) {
        perfLi.textContent = `Performance: ${formatPercentage(asset.performance)}`;
        // Rimuovi classi vecchie e aggiungi quella nuova
        perfLi.className = ''; // Resetta classi esistenti sull'elemento LI
        perfLi.classList.add(getPerformanceClass(asset.performance));
    }
     const forecastLi = document.getElementById(`investments-${assetType}-forecast`);
     if(forecastLi) {
         forecastLi.textContent = `Previsione: ${formatPercentage(asset.forecast)}`;
         forecastLi.className = ''; // Resetta classi
         // Usa la stessa logica di performance per il colore della previsione (o adattala se necessario)
         forecastLi.classList.add(getPerformanceClass(asset.forecast));
     }
}

/**
 * Aggiorna la tabella di allocazione del patrimonio nella sezione "Investimenti".
 * @param {string} tableBodySelector Selettore CSS per il tbody della tabella (es. '#investments-allocation-table-body').
 */
function updateAllocationTable(tableBodySelector) {
    const tableBody = document.querySelector(tableBodySelector);
    if (!tableBody) return;

    let html = '';
    const totalValue = appData.portfolio.totalValue;

    // Ordina gli asset per valore decrescente per la tabella
    const sortedAssets = Object.values(appData.assets).sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

    sortedAssets.forEach(asset => {
        const percentage = totalValue > 0 ? ((asset.currentValue || 0) / totalValue) * 100 : 0;
        // Determina colore testo badge per leggibilità (chiaro su scuro, scuro su giallo/ciano)
        const textColor = ['#ffc107', '#0dcaf0'].includes(asset.color) ? 'text-dark' : 'text-white';
        html += `<tr>
                    <td><span class="badge ${textColor}" style="background-color:${asset.color};">${asset.name}</span></td>
                    <td>${formatCurrency(asset.currentValue)}</td>
                    <td class="text-end">${formatPercentage(percentage)}</td>
                 </tr>`;
    });

    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Dati di allocazione non disponibili.</td></tr>';
}

/**
 * Aggiorna la sezione di dettaglio per un singolo asset (Crypto, ETF, Silver).
 * @param {string} assetType Chiave dell'asset (es. 'crypto').
 */
function updateAssetDetailsSection(assetType) {
    const asset = appData.assets[assetType];
    if (!asset) return;

    updateElement(`${assetType}-details-value`, formatCurrency(asset.currentValue));
    updateElement(`${assetType}-details-contributions`, formatCurrency(asset.contributedValue));
    updateElement(`${assetType}-details-performance`, formatPercentage(asset.performance), getPerformanceClass(asset.performance), ['text-danger', 'text-success', 'text-secondary']);

    // Se l'asset ha una sotto-allocazione (Crypto, ETF), aggiorna la tabella di composizione
    if (asset.allocation && Array.isArray(asset.allocation)) {
        updateAssetCompositionTable(assetType);
    }
}

/**
 * Aggiorna la tabella di composizione interna di un asset (es. dettaglio Crypto o ETF).
 * @param {string} assetType Chiave dell'asset (es. 'crypto', 'etf').
 */
function updateAssetCompositionTable(assetType) {
    const tableBody = document.getElementById(`${assetType}-composition-table-body`);
    const asset = appData.assets[assetType];
    if (!tableBody || !asset || !asset.allocation || !Array.isArray(asset.allocation)) return;

    let html = '';
    // Ordina la composizione per valore decrescente
    const sortedAllocation = [...asset.allocation].sort((a, b) => (b.value || 0) - (a.value || 0));

    sortedAllocation.forEach(item => {
        const valueText = formatCurrency(item.value);
        if (assetType === 'crypto') {
            // Tabella Crypto: Nome | Percentuale | Valore
            html += `<tr>
                        <td>${item.name}</td>
                        <td>${formatPercentage(item.percentage)}</td>
                        <td class="text-end">${valueText}</td>
                     </tr>`;
        } else if (assetType === 'etf') {
            // Tabella ETF: Nome | Previsione Annua | Valore
             html += `<tr>
                        <td>${item.name}</td>
                        <td class="${getPerformanceClass(item.forecast)}">${formatPercentage(item.forecast)}</td>
                        <td class="text-end">${valueText}</td>
                      </tr>`;
        }
        // Aggiungere altri 'else if' per tipi di asset futuri con composizione
    });

    tableBody.innerHTML = html || `<tr><td colspan="${assetType === 'etf' ? 3 : 3}" class="text-center text-muted p-3">Dati di composizione non disponibili.</td></tr>`;
}

/**
 * Aggiorna l'intera sezione "Spese".
 */
function updateExpensesSection() {
    const exp = appData.expenses;
    const budget = typeof exp.budget === 'number' && !isNaN(exp.budget) ? exp.budget : 0;
    const spent = exp.spent; // Già calcolato da recalculateExpenseTotals
    const percentageSpent = budget > 0 ? (spent / budget) * 100 : 0;
    const remaining = budget - spent;

    // Aggiorna barra di progresso budget
    const progressBar = document.getElementById('expenses-budget-progress');
    if (progressBar) {
        const displayPercentage = Math.min(percentageSpent, 100); // Non superare 100% visivamente
        progressBar.style.width = `${displayPercentage}%`;
        progressBar.textContent = `${percentageSpent.toFixed(0)}%`; // Mostra percentuale reale
        progressBar.setAttribute('aria-valuenow', percentageSpent);
        // Cambia colore barra in base alla percentuale
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (percentageSpent > 90) progressBar.classList.add('bg-danger');
        else if (percentageSpent > 70) progressBar.classList.add('bg-warning');
        else progressBar.classList.add('bg-success');
    }

    // Aggiorna riepilogo budget
    updateElement('expenses-budget-summary', `${formatCurrency(spent)} / ${formatCurrency(budget)}`);
    updateElement('expenses-spent-value', formatCurrency(spent));
    updateElement('expenses-budget-value', formatCurrency(budget));
    updateElement('expenses-remaining-value', formatCurrency(remaining), getPerformanceClass(remaining), ['text-danger', 'text-success', 'text-secondary']);

    // Aggiorna tabella spese per categoria
    const categoryTableBody = document.getElementById('expenses-category-table-body');
    if (categoryTableBody) {
        let html = '';
        // Filtra categorie con importo > 0 e ordina per importo decrescente
        exp.categories.filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).forEach(cat => {
            const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(cat.color) ? 'text-dark' : 'text-white'; // Adatta colori testo per leggibilità badge
            html += `<tr>
                        <td><span class="badge ${textColor}" style="background-color:${cat.color};">${cat.name}</span></td>
                        <td>${formatCurrency(cat.amount)}</td>
                        <td class="text-end">${formatPercentage(cat.percentage)}</td>
                     </tr>`;
        });
        categoryTableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Nessuna spesa registrata per questo mese.</td></tr>';
    }

    // Aggiorna tabella elenco spese
    const listTableBody = document.getElementById('expenses-list-table-body');
    if (listTableBody) {
        let html = '';
        // Ordina transazioni per ID decrescente (più recenti prima) o per data
        exp.transactions.sort((a,b) => {
            // Prova a convertire le date per un ordinamento più robusto
            try {
                const dateA = new Date(a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA; // Ordina per data decrescente
            } catch (e) { /* Ignora errore parsing e usa ID */ }
            return (b.id || 0) - (a.id || 0); // Fallback su ID
        }).forEach(tx => {
             const category = exp.categories.find(c => c.name === tx.category);
             const catColor = category ? category.color : '#6c757d'; // Grigio se categoria non trovata
             const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
             html += `<tr>
                        <td class="ps-3">${tx.date}</td>
                        <td><span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span></td>
                        <td>${tx.description}</td>
                        <td class="text-danger text-end">${formatCurrency(tx.amount)}</td>
                        <td class="text-center pe-3">
                            <button class="btn btn-sm btn-outline-primary edit-expense py-0 px-1 me-1" data-expense-id="${tx.id}" title="Modifica Spesa">
                                <i class="bi bi-pencil small"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-expense py-0 px-1" data-expense-id="${tx.id}" title="Elimina Spesa">
                                <i class="bi bi-trash small"></i>
                            </button>
                        </td>
                      </tr>`;
        });
        listTableBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna spesa registrata.</td></tr>';
        // Riattacca i listener ai pulsanti di modifica/eliminazione DOPO aver aggiornato l'HTML
        setupExpenseActionButtons();
    }
}

/**
 * Aggiorna la sezione "Proiezioni".
 */
function updateProjectionsSection() {
    const proj = appData.projections;
    const lastIndex = proj.months.length - 1;
    if (lastIndex < 0) return; // Nessuna proiezione calcolata

    // Aggiorna tabella dettagli proiezione (valore a fine periodo)
    const detailsTableBody = document.getElementById('projections-details-table-body');
    if (detailsTableBody) {
        let html = '';
        const totalProjected = proj.total[lastIndex];
        const totalCurrent = appData.portfolio.totalValue;
        // Calcola crescita totale prevista in percentuale
        const totalGrowthPercentage = totalCurrent > 0 ? ((totalProjected - totalCurrent) / totalCurrent) * 100 : 0;

        // Aggiungi righe per ogni asset
        for(const key in appData.assets){
            const asset = appData.assets[key];
            const projectedValue = proj[key][lastIndex];
            const currentVal = asset.currentValue || 0;
            // Crescita prevista per il singolo asset (uguale al forecast usato)
            const assetGrowth = asset.forecast || 0;
            html += `<tr>
                        <td>${asset.name}</td>
                        <td>${formatCurrency(currentVal)}</td>
                        <td>${formatCurrency(projectedValue)}</td>
                        <td class="${getPerformanceClass(assetGrowth)}">${formatPercentage(assetGrowth)}</td>
                     </tr>`;
        }
        // Aggiungi riga totale
        html += `<tr class="table-primary fw-bold">
                    <td>Totale Portafoglio</td>
                    <td>${formatCurrency(totalCurrent)}</td>
                    <td>${formatCurrency(totalProjected)}</td>
                    <td class="${getPerformanceClass(totalGrowthPercentage)}">${formatPercentage(totalGrowthPercentage)}</td>
                 </tr>`;
        detailsTableBody.innerHTML = html;
    }

    // Aggiorna tabella proiezioni mensili
    const monthlyTableBody = document.getElementById('projections-monthly-table-body');
    if(monthlyTableBody){
        let html = '';
        for (let i = 0; i <= lastIndex; i++) {
            const isLastRow = i === lastIndex;
            html += `<tr class="${isLastRow ? 'table-light fw-bold' : ''}">
                        <td>${proj.months[i]}</td>
                        <td>${formatCurrency(proj.crypto[i])}</td>
                        <td>${formatCurrency(proj.etf[i])}</td>
                        <td>${formatCurrency(proj.silver[i])}</td>
                        <td>${formatCurrency(proj.total[i])}</td>
                     </tr>`;
        }
        monthlyTableBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione mensile disponibile.</td></tr>';
    }
}

/**
 * Aggiorna la sezione degli alert attivi nel Dashboard (mostra max 3).
 */
function updateDashboardAlerts() {
    const container = document.getElementById('dashboard-active-alerts');
    if (!container) return;

    let html = '';
    // Filtra solo alert attivi e ordina per criticità (Critico > Avviso > Info)
    const activeAlerts = appData.alerts.active
        .filter(a => a.status === 'Attivo')
        .sort((a, b) => {
            const severity = {"Critico": 1, "Avviso": 2, "Info": 3};
            return (severity[a.type] || 99) - (severity[b.type] || 99); // Ordina per severità
        });

     if (activeAlerts.length > 0) {
        html += `<h4 class="text-danger mt-4 mb-2"><i class="bi bi-exclamation-triangle-fill me-2"></i>Alert Attivi Recenti</h4>`;
        // Mostra solo i primi 3 alert più critici nel dashboard
         activeAlerts.slice(0, 3).forEach(alert => {
            let alertClass = 'alert-info'; let icon = 'bi-info-circle-fill';
            if(alert.type === 'Critico') { alertClass = 'alert-danger'; icon = 'bi-exclamation-triangle-fill'; }
            if(alert.type === 'Avviso') { alertClass = 'alert-warning'; icon = 'bi-exclamation-circle-fill'; }
            // Usa alert dismissible anche nel dashboard per coerenza
            html += `<div class="alert ${alertClass} alert-dismissible fade show d-flex align-items-center p-2 mb-2" role="alert">
                        <i class="bi ${icon} flex-shrink-0 me-2"></i>
                        <small class="flex-grow-1">${alert.message}</small>
                        <button type="button" class="btn-close p-2 dismiss-alert" data-alert-id="${alert.id}" aria-label="Close" title="Ignora questo alert"></button>
                     </div>`;
        });
         // Aggiungi un link per vedere tutti gli alert se ce ne sono più di 3
         if (activeAlerts.length > 3) {
             html += `<div class="text-center mt-2"><a href="#" class="btn btn-sm btn-outline-secondary" id="view-all-alerts-link">Vedi tutti gli alert (${activeAlerts.length})</a></div>`;
         }
    } else {
        // Potresti mostrare un messaggio "Nessun alert attivo" o lasciare vuoto
        // html = '<p class="text-muted text-center mt-3">Nessun alert attivo. 👍</p>';
    }
    container.innerHTML = html;

    // Attacca listener per il pulsante "Vedi tutti" e per i dismiss
    setupDismissAlertButtons(); // Riattacca listener per i dismiss nel dashboard
    const viewAllLink = document.getElementById('view-all-alerts-link');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Simula click sulla tab Alert
            document.getElementById('alerts-tab')?.click();
            // Oppure usa la funzione showSection se disponibile globalmente
            // showSection('alerts-content');
        });
    }
}


/**
 * Aggiorna la tabella delle ultime transazioni nel Dashboard.
 */
function updateDashboardTransactionsTable() {
    const tableBody = document.querySelector('#dashboard-transactions-table tbody');
    if (!tableBody) return;

    let html = '';
    const recentExpenses = [...appData.expenses.transactions]
        .sort((a, b) => {
             try { const dateA=new Date(a.date.split('/').reverse().join('-')); const dateB=new Date(b.date.split('/').reverse().join('-')); if(!isNaN(dateA)&&!isNaN(dateB)) return dateB-dateA; } catch(e){} return (b.id||0)-(a.id||0);
        })
        .slice(0, 5);

    const recentTransactions = recentExpenses; // Per ora solo spese

    if (recentTransactions.length > 0) {
        recentTransactions.forEach(tx => {
             const category = appData.expenses.categories.find(c => c.name === tx.category);
             const catColor = category ? category.color : '#6c757d';
             const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
             const amountClass = 'text-danger';
             const amountValue = tx.amount;

            html += `<tr>
                        <td class="ps-3">${tx.date}</td>
                        <td><span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span></td>
                        <td>${tx.description}</td>
                        <td class="${amountClass} text-end pe-3">${formatCurrency(amountValue)}</td>
                     </tr>`;
        });
    } else {
        html = '<tr><td colspan="4" class="text-center text-muted p-3">Nessuna transazione recente registrata.</td></tr>';
    }
    tableBody.innerHTML = html;
}

/**
 * Aggiorna l'intera sezione "Alert" (lista attivi e tabella cronologia).
 */
function updateAlertsSection() {
    const activeListContainer = document.getElementById('alerts-active-list');
    if (activeListContainer) {
        let html = '';
        const activeAlerts = appData.alerts.active
            .filter(a => a.status === 'Attivo')
            .sort((a, b) => ({"Critico":1,"Avviso":2,"Info":3})[a.type] - ({"Critico":1,"Avviso":2,"Info":3})[b.type]);

        if (activeAlerts.length === 0) {
            html = '<p class="text-center text-muted">Nessun alert attivo al momento. Tutto sotto controllo! 👍</p>';
        } else {
            activeAlerts.forEach(alert => {
                let alertClass = 'alert-info', iconClass = 'bi-info-circle-fill';
                if (alert.type === 'Critico') { alertClass = 'alert-danger'; iconClass = 'bi-exclamation-triangle-fill';}
                if (alert.type === 'Avviso') { alertClass = 'alert-warning'; iconClass = 'bi-exclamation-circle-fill';}
                const buttonClass = alertClass.replace('alert-', 'btn-outline-');
                html += `<div class="alert ${alertClass} d-flex justify-content-between align-items-center" role="alert" data-alert-internal-id="${alert.id}">
                            <div>
                                <i class="bi ${iconClass} me-2"></i>
                                <strong>${alert.type}:</strong> ${alert.message} <small class="text-muted">(${alert.date})</small>
                            </div>
                            <button class="btn btn-sm ${buttonClass} dismiss-alert ms-2" data-alert-id="${alert.id}" title="Ignora questo alert">
                                <i class="bi bi-x-circle me-1"></i> Ignora
                            </button>
                         </div>`;
            });
        }
        activeListContainer.innerHTML = html;
        setupDismissAlertButtons();
    }

    const historyTableBody = document.getElementById('alerts-history-table-body');
    if (historyTableBody) {
        let html = '';
        const combinedAlerts = [...appData.alerts.active, ...appData.alerts.history]
            .sort((a, b) => (b.id || 0) - (a.id || 0));

        if (combinedAlerts.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted p-3">Nessuna cronologia alert disponibile.</td></tr>';
        } else {
             combinedAlerts.forEach(alert => {
                let typeBadgeClass='bg-secondary', statusBadgeClass='bg-secondary';
                if(alert.type==='Critico') typeBadgeClass='bg-danger';
                else if(alert.type==='Avviso') typeBadgeClass='bg-warning text-dark';
                else if(alert.type==='Info') typeBadgeClass='bg-info text-dark';
                if(alert.status==='Attivo') statusBadgeClass='bg-warning text-dark';
                else if(alert.status==='Risolto') statusBadgeClass='bg-success';
                html += `<tr>
                            <td class="ps-3">${alert.date}</td>
                            <td><span class="badge ${typeBadgeClass}">${alert.type}</span></td>
                            <td>${alert.message}</td>
                            <td><span class="badge ${statusBadgeClass}">${alert.status}</span></td>
                         </tr>`;
             });
        }
        historyTableBody.innerHTML = html;
    }
}


// --- CHART FUNCTIONS ---
// (Le funzioni da initOrUpdateChart a commonChartOptions rimangono invariate)
// ... (codice omesso per brevità, è identico a prima) ...
/**
 * Inizializza un nuovo grafico Chart.js o aggiorna uno esistente.
 * @param {string} chartId ID dell'elemento <canvas>.
 * @param {object} chartConfig Oggetto di configurazione per Chart.js (type, data, options).
 */
function initOrUpdateChart(chartId, chartConfig) {
    const canvasElement = document.getElementById(chartId);
    if (!canvasElement) {
        // console.warn(`Canvas con ID ${chartId} non trovato.`);
        return; // Esce se il canvas non esiste
    }
    const context = canvasElement.getContext('2d');
    if (!context) {
        console.error(`Impossibile ottenere il contesto 2D per il canvas ${chartId}.`);
        return;
    }

    // Se il grafico esiste già, aggiorna dati e opzioni
    if (charts[chartId] && charts[chartId] instanceof Chart) {
        try {
            charts[chartId].data = chartConfig.data;
            charts[chartId].options = chartConfig.options;
            charts[chartId].update();
        } catch (error) {
            console.error(`Errore durante l'aggiornamento del grafico ${chartId}:`, error);
            // Prova a distruggere e ricreare in caso di errore grave
            destroyChart(chartId);
            try {
                 charts[chartId] = new Chart(context, chartConfig);
            } catch (initError) {
                 console.error(`Errore anche nella ricreazione del grafico ${chartId}:`, initError);
            }
        }
    } else {
        // Altrimenti, crea un nuovo grafico
        try {
            // Distruggi grafico precedente se per caso era rimasto un riferimento invalido
            destroyChart(chartId);
            charts[chartId] = new Chart(context, chartConfig);
        } catch (error) {
            console.error(`Errore durante la creazione del grafico ${chartId}:`, error);
        }
    }
}

/**
 * Distrugge un'istanza di Chart.js esistente e rimuove il riferimento.
 * @param {string} chartId ID del grafico da distruggere.
 */
function destroyChart(chartId) {
    if(charts[chartId] && charts[chartId] instanceof Chart) {
        try {
            charts[chartId].destroy();
        } catch (error) {
            console.error(`Errore durante la distruzione del grafico ${chartId}:`, error);
        }
        delete charts[chartId]; // Rimuove il riferimento dall'oggetto charts
    }
}

/**
 * Inizializza o aggiorna tutti i grafici dell'applicazione.
 */
function initOrUpdateAllCharts() {
    console.log("📊 Aggiornamento Grafici...");

    // --- Grafici Allocazione (Dashboard & Investimenti) ---
    const allocationLabels = Object.values(appData.assets).map(a => a.name);
    const allocationValues = Object.values(appData.assets).map(a => a.currentValue || 0); // Usa 0 se null/undefined
    const allocationColors = Object.values(appData.assets).map(a => a.color);
    const allocationData = {
        labels: allocationLabels,
        datasets: [{
            data: allocationValues,
            backgroundColor: allocationColors,
            borderColor: '#ffffff', // Bordo bianco per separare spicchi
            borderWidth: 1
        }]
    };
    // Grafico a Torta nel Dashboard
    initOrUpdateChart('allocationChart', {
        type: 'pie',
        data: allocationData,
        options: commonChartOptions('pie', null, false, true) // No titolo, tooltip con %
    });
    // Grafico a Ciambella in Investimenti
    initOrUpdateChart('investmentsAllocationChart', {
        type: 'doughnut',
        data: allocationData,
        options: commonChartOptions('doughnut', null, false, true) // No titolo, tooltip con %
    });

    // --- Grafico Andamento Previsto (Dashboard) ---
    initOrUpdateChart('performanceChart', {
        type: 'line',
        data: {
            labels: appData.projections.months, // Usa mesi calcolati
            datasets: [{
                label: 'Valore Totale Previsto',
                data: appData.projections.total,
                borderColor: '#0d6efd', // Blu primario
                backgroundColor: 'rgba(13, 110, 253, 0.1)', // Sfumatura blu
                fill: true,
                tension: 0.3 // Leggera curvatura
            }]
        },
        options: commonChartOptions('line', null, true) // Mostra assi
    });

    // --- Grafici Specifici per Asset ---
    // Crypto
    if (appData.assets.crypto.allocation) {
        const cryptoAllocData = {
            labels: appData.assets.crypto.allocation.map(i => i.name),
            datasets: [{
                data: appData.assets.crypto.allocation.map(i => i.value || 0),
                // Colori specifici per le crypto più comuni (esempio)
                backgroundColor: ['#f7931a', '#5865f2', '#627eea', '#8a4db9', '#0033ad', '#cccccc'], // BTC, ETH, SOL, ADA, ?, Altri
                borderColor: '#ffffff', borderWidth: 1
            }]
        };
        initOrUpdateChart('cryptoAllocationChart', { type: 'pie', data: cryptoAllocData, options: commonChartOptions('pie', null, false, true) });
    } else { destroyChart('cryptoAllocationChart'); } // Distruggi se non c'è allocazione
    initOrUpdateChart('cryptoProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Crypto Previsto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, backgroundColor: `${appData.assets.crypto.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });

    // ETF
    if (appData.assets.etf.allocation) {
         const etfAllocData = {
            labels: appData.assets.etf.allocation.map(i => i.name),
            datasets: [{
                data: appData.assets.etf.allocation.map(i => i.value || 0),
                // Colori diversi per ETF (esempio)
                backgroundColor: ['#0dcaf0', '#20c997', '#0d6efd', '#6f42c1', '#fd7e14', '#adb5bd'],
                borderColor: '#ffffff', borderWidth: 1
            }]
        };
        initOrUpdateChart('etfAllocationChart', { type: 'pie', data: etfAllocData, options: commonChartOptions('pie', null, false, true) });
    } else { destroyChart('etfAllocationChart'); }
    initOrUpdateChart('etfProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'ETF Previsto', data: appData.projections.etf, borderColor: appData.assets.etf.color, backgroundColor: `${appData.assets.etf.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });

    // Argento
    // Grafico prezzo (esempio statico, potrebbe essere dinamico con API)
    const silverPriceExampleData = {
        labels: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'], // Ultimi 12 mesi (esempio)
        datasets: [{
            label: 'Prezzo Argento (Esempio €/oz)',
            data: [22.5, 22.8, 23.1, 23.5, 23.8, 24.2, 24.5, 24.9, 25.3, 25.7, 26.1, 26.5], // Dati fittizi
            borderColor: appData.assets.silver.color,
            backgroundColor: `${appData.assets.silver.color}20`,
            fill: true, tension: 0.3
        }]
    };
    initOrUpdateChart('silverPriceChart', { type: 'line', data: silverPriceExampleData, options: commonChartOptions('line', null, true) });
    // Grafico proiezione valore argento posseduto
    initOrUpdateChart('silverProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Argento Previsto', data: appData.projections.silver, borderColor: appData.assets.silver.color, backgroundColor: `${appData.assets.silver.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });

    // --- Grafico Spese per Categoria ---
    const expenseCategories = appData.expenses.categories.filter(c => c.amount > 0); // Solo categorie con spese
    const expenseData = {
        labels: expenseCategories.map(c => c.name),
        datasets: [{
            data: expenseCategories.map(c => c.amount),
            backgroundColor: expenseCategories.map(c => c.color),
            borderColor: '#ffffff', borderWidth: 1
        }]
    };
    initOrUpdateChart('expenseCategoryChart', { type: 'doughnut', data: expenseData, options: commonChartOptions('doughnut', null, false, true) });

    // --- Grafico Proiezione Totale (con dettaglio asset) ---
    initOrUpdateChart('totalProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                // Linea principale (Totale)
                { label: 'Totale Previsto', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3, borderWidth: 2, order: 1 },
                // Linee tratteggiate per singoli asset
                { label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 2 },
                { label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 3 },
                { label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 4 }
            ]
        },
        options: commonChartOptions('line', null, true) // Mostra assi
    });
    console.log("📊 Grafici Aggiornati.");
}

/**
 * Restituisce un oggetto di opzioni comuni per i grafici Chart.js.
 */
function commonChartOptions(type, title = null, showYAxis = false, tooltipValuePercentage = false) {
    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: (type === 'pie' || type === 'doughnut') ? 'bottom' : 'top', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } },
            title: { display: !!title, text: title, padding: { top: 10, bottom: 10 }, font: { size: 16, weight: '500' } },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)', titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || context.label || ''; if (label) { label += ': '; } const value = context.raw;
                        if (tooltipValuePercentage && (type === 'pie' || type === 'doughnut') && typeof value === 'number') {
                            const total = context.dataset.data.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0); const percentage = total > 0 ? (value / total) * 100 : 0; label += `${formatCurrency(value)} (${formatPercentage(percentage)})`;
                        } else if (typeof value === 'number') { label += formatCurrency(value); } else { label += value; } return label;
                    }
                }
            }
        },
        scales: (type === 'pie' || type === 'doughnut') ? {} : {
            y: { display: showYAxis, beginAtZero: false, ticks: { callback: value => formatCurrency(value), font: { size: 11 } }, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { display: showYAxis, ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } }
        },
        ...(type === 'line' && { interaction: { mode: 'index', intersect: false }, hover: { mode: 'nearest', intersect: true } }),
        ...(type === 'doughnut' && { cutout: '65%' }),
    };
    return options;
}


// --- PDF EXPORT ---
// (Le funzioni generatePdfHtmlReport e generatePdfReport rimangono invariate)
// ... (codice omesso per brevità, è identico a prima) ...
/**
 * Genera una stringa HTML formattata con stili inline per il report PDF.
 * @returns {string} La stringa HTML del report.
 */
function generatePdfHtmlReport() {
    const { portfolio, assets, expenses, projections } = appData;
    const today = new Date().toLocaleDateString('it-IT');

    // Funzione helper per creare tabelle HTML con stili inline
    const createTable = (headers, rows) => {
        // Stili comuni per celle e tabella
        const thStyle = "border:1px solid #ddd; padding:6px; background-color:#f2f2f2; text-align:left; font-weight:bold;";
        const tdStyleBase = "border:1px solid #ddd; padding:6px;";
        const tableStyle = "width:100%; border-collapse:collapse; margin-bottom:15px; font-size:10px;";

        // Crea intestazioni tabella
        let tableHeaders = headers.map(h => `<th style="${thStyle}">${h}</th>`).join('');

        // Crea righe tabella
        let tableRows = rows.map(row => {
            let cells = row.map((cellValue, index) => {
                let cellStyle = tdStyleBase;
                let formattedValue = cellValue;

                // Applica stili e formattazione in base al tipo e all'intestazione
                const headerText = headers[index]?.toLowerCase() || '';
                if (typeof cellValue === 'number') {
                    cellStyle += 'text-align:right;'; // Allinea numeri a destra
                    if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('previsione') || headerText.includes('perc.')) {
                        formattedValue = formatPercentage(cellValue); // Formatta come percentuale
                    } else {
                        formattedValue = formatCurrency(cellValue); // Formatta come valuta
                    }
                } else if (typeof cellValue === 'string' && cellValue.startsWith('€')) {
                     cellStyle += 'text-align:right;'; // Allinea valute a destra
                } else if (typeof cellValue === 'string' && cellValue.endsWith('%')) {
                     cellStyle += 'text-align:right;'; // Allinea percentuali a destra
                }

                return `<td style="${cellStyle}">${formattedValue}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return `<table style="${tableStyle}"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;
    };

    // Costruzione corpo HTML del report
    let html = `<div style="font-family:Arial, sans-serif; margin:20px; color:#333;">
                    <h1 style="text-align:center; color:#0d6efd; border-bottom:2px solid #0d6efd; padding-bottom:10px;">Report Finanziario Personale</h1>
                    <p style="text-align:center; font-size:12px; margin-bottom:20px;">Generato il: ${today}</p>

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Riepilogo Patrimonio</h2>
                    ${createTable(
                        ['Descrizione', 'Valore'],
                        [
                            ['Valore Totale Attuale', portfolio.totalValue],
                            ['Contributi Totali Versati', portfolio.totalContributions],
                            ['Performance Totale', portfolio.totalPerformance] // Già formattato da createTable
                        ]
                    )}

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Allocazione Asset</h2>
                    ${createTable(
                        ['Asset', 'Valore Attuale', 'Allocazione (%)'],
                        Object.values(assets).map(a => [
                            a.name,
                            a.currentValue,
                            portfolio.totalValue > 0 ? ((a.currentValue / portfolio.totalValue) * 100) : 0
                        ])
                    )}

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Dettaglio Asset</h2>`;

    // Aggiungi sezione dettaglio per ogni asset
    for (const key in assets) {
        const asset = assets[key];
        html += `<h3 style="color:${asset.color}; margin-top:20px; margin-bottom:5px;">${asset.name}</h3>
                 ${createTable(
                     ['Metrica', 'Valore'],
                     [
                         ['Valore Attuale', asset.currentValue],
                         ['Contributi Versati', asset.contributedValue],
                         ['Performance', asset.performance], // Già formattato
                         ['Previsione Crescita Annua', asset.forecast] // Già formattato
                     ]
                 )}`;
        // Aggiungi tabella composizione se presente (Crypto/ETF)
        if (asset.allocation && asset.allocation.length > 0) {
            html += `<h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Composizione ${asset.name}:</h4>`;
            if (key === 'crypto') {
                html += createTable(['Nome', 'Percentuale (%)', 'Valore'], asset.allocation.map(i => [i.name, i.percentage, i.value]));
            } else if (key === 'etf') {
                html += createTable(['Nome', 'Previsione Annua (%)', 'Valore'], asset.allocation.map(i => [i.name, i.forecast, i.value]));
            }
        }
    }

    // Sezione Spese
    const remainingBudget = expenses.budget - expenses.spent;
    const budgetUsagePercentage = expenses.budget > 0 ? (expenses.spent / expenses.budget) * 100 : 0;
    html += `<h2 style="color:#198754; margin-top:25px; margin-bottom:10px;">Gestione Spese Mensili</h2>
             ${createTable(
                 ['Descrizione', 'Valore'],
                 [
                     ['Budget Mensile Impostato', expenses.budget],
                     ['Totale Speso nel Mese', expenses.spent],
                     ['Budget Rimanente', remainingBudget],
                     ['Utilizzo Budget', budgetUsagePercentage] // Già formattato
                 ]
             )}
             <h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Spese per Categoria:</h4>
             ${createTable(
                 ['Categoria', 'Importo Speso', 'Percentuale sul Totale (%)'],
                 expenses.categories.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).map(c => [c.name, c.amount, c.percentage])
             )}
             <h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Ultime Spese Registrate (max 10):</h4>
             ${createTable(
                 ['Data', 'Categoria', 'Descrizione', 'Importo'],
                 // Mostra importi spesa come negativi per chiarezza nel report
                 expenses.transactions.slice(0, 10).map(t => [t.date, t.category, t.description, -t.amount])
             )}`;

    // Sezione Proiezioni (se presenti)
    const lastProjectionIndex = projections.months.length - 1;
    if (lastProjectionIndex >= 0) {
        const totalProjected = projections.total[lastProjectionIndex];
        const totalCurrent = portfolio.totalValue;
        const totalGrowth = totalCurrent > 0 ? ((totalProjected - totalCurrent) / totalCurrent) * 100 : 0;
        html += `<h2 style="color:#6f42c1; margin-top:25px; margin-bottom:10px;">Proiezioni Future</h2>
                 <p style="font-size:11px;">Stima del valore del portafoglio fino a ${projections.months[lastProjectionIndex]}</p>
                 ${createTable(
                     ['Asset / Totale', 'Valore Attuale', 'Valore Previsto', 'Crescita Prevista (%)'],
                     [
                         // Righe per ogni asset
                         ...Object.entries(assets).map(([key, asset]) => [
                             asset.name,
                             asset.currentValue,
                             projections[key][lastProjectionIndex],
                             asset.forecast // Crescita annua usata per la proiezione
                         ]),
                         // Riga separatore (opzionale)
                         // ['---','---','---','---'],
                         // Riga Totale
                         ['Totale Portafoglio', totalCurrent, totalProjected, totalGrowth]
                     ]
                 )}`;
    }

    html += `</div>`; // Chiusura div principale
    return html;
}


/**
 * Genera e avvia il download del report PDF utilizzando html2pdf.js.
 */
function generatePdfReport() {
    console.log("📄 Tentativo di generare il PDF...");
    // Crea un elemento temporaneo per contenere l'HTML del report
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = generatePdfHtmlReport(); // Genera l'HTML

    // Opzioni per html2pdf
    const pdfOptions = {
      margin:       [10, 10, 15, 10], // Margini [top, left, bottom, right] in mm
      filename:     `Report_Finanziario_${new Date().toISOString().slice(0,10)}.pdf`, // Nome file
      image:        { type: 'jpeg', quality: 0.98 }, // Qualità immagini (se presenti)
      html2canvas:  { scale: 2, useCORS: true, logging: false }, // Opzioni rendering HTML
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' } // Opzioni PDF
    };

    // Mostra notifica di avvio
    showNotification('Generazione PDF in corso... ⏳', 'info');

    // Esegui la conversione e salva il PDF
    html2pdf().from(reportContainer).set(pdfOptions).save()
      .then(() => {
          console.log("✅ PDF generato con successo.");
          showNotification('Report PDF generato con successo! 👍', 'success');
      })
      .catch(error => {
          console.error("❌ Errore durante la generazione del PDF:", error);
          showNotification('Errore durante la generazione del PDF. 🙁', 'danger');
      });
}


// --- EVENT LISTENERS & SETUP ---
// (Le funzioni da setupNavigation a detectFoldableDevice rimangono invariate)
// ... (codice omesso per brevità, è identico a prima) ...
/**
 * Imposta la logica di navigazione tra le schede (Dashboard, Investimenti, ecc.).
 */
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]'); // Seleziona link sidebar e mobile
    const contentSections = document.querySelectorAll('.content-section'); // Seleziona tutte le sezioni di contenuto

    // Funzione per mostrare una sezione e aggiornare lo stato attivo dei link
    function showSection(targetContentId) {
        // Nascondi tutte le sezioni
        contentSections.forEach(section => section.classList.add('d-none'));
        // Mostra la sezione target (se esiste)
        const targetSection = document.getElementById(targetContentId);
        if (targetSection) {
            targetSection.classList.remove('d-none');
        }

        // Aggiorna stato 'active' per tutti i link di navigazione (sidebar e mobile)
        tabLinks.forEach(link => {
            // Determina a quale contenuto corrisponde questo link
            const linkTargetId = link.id.replace('mobile-', '').replace('-tab', '-content');
            const isActive = (linkTargetId === targetContentId);
            link.classList.toggle('active', isActive); // Imposta/rimuove classe 'active'
            // Per la sidebar, cambia colore testo se non attivo
            if (link.closest('.sidebar')) {
                link.classList.toggle('text-white', !isActive); // Bianco se non attivo, altrimenti colore 'active'
            }
        });
        console.log(`Visualizzata sezione: ${targetContentId}`);
    }

    // Aggiungi event listener a ciascun link di navigazione
    tabLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Impedisce navigazione default del link '#'
            const targetContentId = link.id.replace('mobile-', '').replace('-tab', '-content');
            showSection(targetContentId);

            // Chiudi la navbar mobile se è aperta (su schermi piccoli)
            const mobileNavbarCollapse = document.querySelector('.navbar-collapse.show');
            if (mobileNavbarCollapse) {
                new bootstrap.Collapse(mobileNavbarCollapse).hide();
            }
        });
    });

    // Mostra la sezione Dashboard all'avvio
    showSection('dashboard-content');
}

/**
 * Imposta gli event listener e la logica per tutte le finestre modali.
 */
function setupModals() {
    // --- Modale Modifica Asset (Crypto, ETF, Silver) ---
    const editAssetModalElement = document.getElementById('editAssetModal');
    if (editAssetModalElement) {
        const editAssetModal = new bootstrap.Modal(editAssetModalElement);
        // Listener per i pulsanti "Modifica" nelle card Investimenti e nelle sezioni Dettaglio
        document.querySelectorAll('.edit-asset').forEach(button => {
            button.addEventListener('click', function() {
                const assetType = this.dataset.assetType; // 'crypto', 'etf', 'silver'
                const asset = appData.assets[assetType];
                if (!asset) return; // Sicurezza

                // Popola il form nel modale con i dati attuali dell'asset
                editAssetModalElement.querySelector('#assetType').value = assetType;
                editAssetModalElement.querySelector('#editAssetModalLabel').textContent = `Modifica Dati ${asset.name}`;
                editAssetModalElement.querySelector('#currentValue').value = asset.currentValue || 0;
                editAssetModalElement.querySelector('#contributedValue').value = asset.contributedValue || 0;
                editAssetModalElement.querySelector('#growthForecast').value = asset.forecast || 0;

                editAssetModal.show(); // Mostra il modale
            });
        });
        // Listener per il pulsante "Salva" nel modale Modifica Asset
        document.getElementById('saveAssetChanges')?.addEventListener('click', () => {
            const assetType = document.getElementById('assetType').value;
            const currentValue = parseFloat(document.getElementById('currentValue').value);
            const contributedValue = parseFloat(document.getElementById('contributedValue').value);
            const growthForecast = parseFloat(document.getElementById('growthForecast').value);

            // Validazione input
            if (isNaN(currentValue) || isNaN(contributedValue) || isNaN(growthForecast) || currentValue < 0 || contributedValue < 0) {
                showNotification('Errore: Inserisci valori numerici validi (>= 0).', 'danger');
                return;
            }
            if (!appData.assets[assetType]) {
                 showNotification('Errore: Tipo di asset non valido.', 'danger');
                 return;
            }

            // Aggiorna i dati nell'oggetto appData
            appData.assets[assetType].currentValue = currentValue;
            appData.assets[assetType].contributedValue = contributedValue;
            appData.assets[assetType].forecast = growthForecast;

            updateUI(); // Ricalcola tutto e aggiorna la UI
            editAssetModal.hide(); // Nascondi il modale
            showNotification(`${appData.assets[assetType].name} aggiornato con successo! ✅`, 'success');
        });
    } // Fine Modale Modifica Asset

    // --- Modale Aggiungi/Modifica Spesa ---
    const addExpenseModalElement = document.getElementById('addExpenseModal');
    if (addExpenseModalElement) {
        const addExpenseModal = new bootstrap.Modal(addExpenseModalElement);
        const expenseForm = document.getElementById('addExpenseForm');
        const expenseModalTitle = document.getElementById('addExpenseModalLabel');
        const expenseSubmitButton = document.getElementById('saveExpense');
        const expenseCategorySelect = document.getElementById('expenseCategory');
        let editingExpenseId = null; // ID della spesa che si sta modificando (null se si aggiunge)

        // Popola il menu a tendina delle categorie di spesa
        if (expenseCategorySelect) {
            expenseCategorySelect.innerHTML = appData.expenses.categories
                .map(c => `<option value="${c.name}">${c.name}</option>`)
                .join('');
        }

        // Funzione per aprire il modale (chiamata da pulsanti "Aggiungi" o "Modifica")
        // La rendiamo globale (o accessibile) per poterla chiamare da diversi punti
        window.openAddExpenseModal = (expenseIdToEdit = null) => {
             expenseForm.reset(); // Pulisci il form
             editingExpenseId = expenseIdToEdit; // Imposta l'ID se stiamo modificando

             if (editingExpenseId) {
                 // Modalità Modifica: trova la spesa e popola il form
                 const expense = appData.expenses.transactions.find(tx => tx.id === editingExpenseId);
                 if (expense) {
                     expenseModalTitle.textContent = 'Modifica Spesa';
                     expenseSubmitButton.textContent = 'Salva Modifiche';
                     document.getElementById('expenseDescription').value = expense.description;
                     document.getElementById('expenseAmount').value = expense.amount;
                     document.getElementById('expenseCategory').value = expense.category;
                     // Converte data 'dd/mm/yyyy' in 'yyyy-mm-dd' per input type="date"
                     try {
                         const dateParts = expense.date.split('/'); // [gg, mm, aaaa]
                         const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`;
                         document.getElementById('expenseDate').value = isoDate;
                     } catch (e) {
                         console.error("Errore parsing data spesa:", e);
                         document.getElementById('expenseDate').valueAsDate = new Date(); // Fallback a oggi
                     }
                 } else {
                     showNotification('Errore: Spesa da modificare non trovata.', 'danger');
                     return; // Non aprire il modale se la spesa non c'è
                 }
             } else {
                 // Modalità Aggiungi: imposta titolo e data default
                 expenseModalTitle.textContent = 'Aggiungi Nuova Spesa';
                 expenseSubmitButton.textContent = 'Salva Spesa';
                 document.getElementById('expenseDate').valueAsDate = new Date(); // Imposta data a oggi
             }
             addExpenseModal.show(); // Mostra il modale
         };

        // Listener per il pulsante principale "Aggiungi Spesa"
        document.getElementById('add-expense-btn')?.addEventListener('click', () => openAddExpenseModal());
        // Listener per il pulsante "Spesa" nel modale "Aggiungi Transazione"
        document.getElementById('addExpenseFromTransactionBtn')?.addEventListener('click', () => {
            bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); // Chiudi modale scelta
            openAddExpenseModal(); // Apri modale aggiungi spesa
        });

        // Listener per il pulsante "Salva" (sia per Aggiungi che Modifica)
        expenseSubmitButton?.addEventListener('click', () => {
            const description = document.getElementById('expenseDescription').value.trim();
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.getElementById('expenseCategory').value;
            const dateValue = document.getElementById('expenseDate').value; // Form
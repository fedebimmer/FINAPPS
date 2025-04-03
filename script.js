// Dati dell'applicazione (Struttura aggiornata)
let appData = {
    profile: { // NUOVA SEZIONE
        username: "Utente Demo",
        email: "", // Email per alert (funzionalità futura)
        currency: "EUR" // Valuta (attualmente solo EUR)
    },
    assets: {
        crypto: {
            name: "Crypto", currentValue: 424, contributedValue: 782, performance: 0, // Ricalcolato
            forecast: 15.00, // Interpretato come CAGR annuo %
            color: '#ffc107',
            allocation: [
                { name: "Bitcoin (BTC)", percentage: 22.75, value: 0 }, { name: "Solana (SOL)", percentage: 11.23, value: 0 },
                { name: "Ether (ETH)", percentage: 10.25, value: 0 }, { name: "Aave (AAVE)", percentage: 7.48, value: 0 },
                { name: "Cardano (ADA)", percentage: 7.22, value: 0 }, { name: "Altri", percentage: 41.07, value: 0 }
            ]
        },
        etf: {
            name: "ETF", currentValue: 4575, contributedValue: 5036, performance: 0, // Ricalcolato
            forecast: 8.79, // Interpretato come CAGR annuo %
            color: '#0dcaf0',
            allocation: [
                { name: "iShares DJ Global Titans 50", percentage: 20, value: 0, forecast: 9.43 },
                { name: "iShares Edge MSCI World Quality", percentage: 20, value: 0, forecast: 13.39 },
                { name: "Xtrackers MSCI World IT", percentage: 20, value: 0, forecast: 20.40 },
                { name: "Xtrackers MSCI USA Cons Disc", percentage: 10, value: 0, forecast: -7.50 },
                { name: "Altri ETF", percentage: 30, value: 0, forecast: 4.80 }
            ]
        },
        silver: {
            name: "Argento", currentValue: 221, contributedValue: 228, performance: 0, // Ricalcolato
            forecast: 6.50, // Interpretato come CAGR annuo %
            color: '#6c757d',
            allocation: null
        }
    },
    pac: { // NUOVA SEZIONE per Piano di Accumulo
        monthlyContribution: 150, // Contributo mensile totale PAC (esempio)
        // Distribuzione % per asset (opzionale, per ora assume distribuzione proporzionale al valore)
        // distribution: { crypto: 20, etf: 70, silver: 10 }
    },
    contributionsLog: [ // NUOVO: Log dei contributi/investimenti
        // { id: 1678886400000, date: "15/03/2025", assetType: 'etf', amount: 100, description: "Contributo PAC Marzo" },
        // { id: 1678886400001, date: "15/03/2025", assetType: 'crypto', amount: 50, description: "Contributo PAC Marzo" }
    ],
    expenses: {
        budget: 1000,
        spent: 0, // Ricalcolato
        categories: [ // Categorie iniziali, possono essere aggiunte/modificate
            { id: 'cat-1', name: "Alimentari", amount: 0, percentage: 0, color: "#198754", isEditable: false },
            { id: 'cat-2', name: "Trasporti", amount: 0, percentage: 0, color: "#dc3545", isEditable: false },
            { id: 'cat-3', name: "Casa", amount: 0, percentage: 0, color: "#0d6efd", isEditable: false },
            { id: 'cat-4', name: "Svago", amount: 0, percentage: 0, color: "#ffc107", isEditable: false },
            { id: 'cat-5', name: "Altro", amount: 0, percentage: 0, color: "#fd7e14", isEditable: false }
        ],
        transactions: [
             { id: 1, date: "01/04/2025", category: "Alimentari", description: "Spesa settimanale", amount: 85.30 },
             { id: 2, date: "28/03/2025", category: "Trasporti", description: "Benzina", amount: 45.00 },
             { id: 3, date: "26/03/2025", category: "Svago", description: "Cinema", amount: 25.00 }
        ]
    },
    projections: {
        months: [],
        crypto: [], etf: [], silver: [], total: []
    },
    alerts: {
        active: [], history: [],
        config: {
            performanceNegative: { enabled: true, threshold: -5 }, performancePositive: { enabled: true, threshold: 10 },
            allocationImbalance: { enabled: true, threshold: 70 }, budgetExceeded: { enabled: true, threshold: 90 }
        }
    },
    portfolio: {
        totalValue: 0, totalContributions: 0, totalPerformance: 0
    }
};

// Store chart instances
const charts = {};
const currentYear = new Date().getFullYear();

// --- UTILITY FUNCTIONS ---

/**
 * Formatta un numero come valuta (Euro).
 * @param {number | null | undefined} value Il valore numerico da formattare.
 * @returns {string} Stringa formattata (es. "€ 1.234,56") o "€ --,--" se invalido.
 */
function formatCurrency(value) {
    if (isNaN(value) || value === null || typeof value === 'undefined') return "€ --,--";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatta un numero come percentuale.
 * @param {number | null | undefined} value Il valore numerico da formattare.
 * @returns {string} Stringa formattata (es. "12,34%") o "--,--%" se invalido.
 */
function formatPercentage(value) {
    if (isNaN(value) || value === null || typeof value === 'undefined') return "--,--%";
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Restituisce la classe CSS appropriata ('text-success', 'text-danger', 'text-secondary')
 * in base al segno del valore (positivo, negativo, zero/nullo).
 * @param {number | null | undefined} value Il valore numerico.
 * @returns {string} La classe CSS.
 */
function getPerformanceClass(value) {
    if (isNaN(value) || value === null || typeof value === 'undefined') return 'text-secondary';
    return value > 0 ? 'text-success' : (value < 0 ? 'text-danger' : 'text-secondary');
}

/**
 * Converte una data stringa da 'dd/mm/yyyy' a 'yyyy-mm-dd'.
 * @param {string} dmyString Data in formato 'dd/mm/yyyy'.
 * @returns {string | null} Data in formato 'yyyy-mm-dd' o null se invalida.
 */
function convertDate_DMY_to_YMD(dmyString) {
    if (!dmyString || typeof dmyString !== 'string') return null;
    try {
        const parts = dmyString.split('/');
        if (parts.length !== 3) return null;
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        if (isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) return null;
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Errore conversione data DMY to YMD:", e);
        return null;
    }
}

/**
 * Converte una data stringa da 'yyyy-mm-dd' a 'dd/mm/yyyy'.
 * @param {string} ymdString Data in formato 'yyyy-mm-dd'.
 * @returns {string | null} Data in formato 'dd/mm/yyyy' o null se invalida.
 */
function convertDate_YMD_to_DMY(ymdString) {
     if (!ymdString || typeof ymdString !== 'string') return null;
    try {
        const dateObject = new Date(ymdString + 'T00:00:00'); // Aggiungi ora per evitare problemi fuso orario
        if (isNaN(dateObject.getTime())) throw new Error('Data non valida');
        const day = dateObject.getDate().toString().padStart(2, '0');
        const month = (dateObject.getMonth() + 1).toString().padStart(2, '0'); // Mesi sono 0-based
        const year = dateObject.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Errore conversione data YMD to DMY:", e);
        return null;
    }
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

    if (typeof asset.contributedValue === 'number' && !isNaN(asset.contributedValue) && asset.contributedValue > 0 && typeof asset.currentValue === 'number' && !isNaN(asset.currentValue)) {
        asset.performance = ((asset.currentValue - asset.contributedValue) / asset.contributedValue) * 100;
    } else {
        asset.performance = 0;
    }
}

/**
 * Calcola i totali aggregati del portafoglio (valore, contributi, performance)
 * e aggiorna i valori delle sotto-allocazioni degli asset.
 * NOTA: Ora i contributi totali vengono sommati dal log dei contributi.
 */
function calculatePortfolioTotals() {
    let totalValue = 0;
    // Il totale dei contributi ora viene calcolato sommando tutti i log
    let totalContributions = appData.contributionsLog.reduce((sum, log) => sum + (log.amount || 0), 0);

    // Resetta i contributi per singolo asset (verranno ricalcolati dal log)
    for (const key in appData.assets) {
        appData.assets[key].contributedValue = 0;
    }

    // Somma i contributi per ogni asset basandosi sul log
    appData.contributionsLog.forEach(log => {
        if (appData.assets[log.assetType]) {
            appData.assets[log.assetType].contributedValue += log.amount || 0;
        }
    });

    // Calcola valore totale e performance per ogni asset
    for (const key in appData.assets) {
        const asset = appData.assets[key];
        if (!asset) continue;

        calculateAssetPerformance(key); // Calcola performance basata sui nuovi contributi

        if (typeof asset.currentValue === 'number' && !isNaN(asset.currentValue)) {
            totalValue += asset.currentValue;
        }

        // Aggiorna valore sotto-allocazioni
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

    // Aggiorna totali portafoglio
    appData.portfolio.totalValue = totalValue;
    appData.portfolio.totalContributions = totalContributions; // Totale dal log

    // Calcola performance totale portafoglio
    if (totalContributions > 0 && typeof totalValue === 'number') {
        appData.portfolio.totalPerformance = ((totalValue - totalContributions) / totalContributions) * 100;
    } else {
        appData.portfolio.totalPerformance = 0;
    }
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
            // Cerca per nome categoria (case-insensitive per robustezza)
            const category = appData.expenses.categories.find(cat => cat.name.toLowerCase() === tx.category.toLowerCase());
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
}

/**
 * NUOVA VERSIONE: Calcola proiezioni usando CAGR e simulando PAC.
 * @param {number} [simulationYears=5] Numero di anni per la proiezione (non usato attualmente, proietta fino a fine anno).
 */
function calculateProjections(simulationYears = 1) { // Default a 1 anno (fino a Dicembre)
    const currentMonthIndex = new Date().getMonth(); // 0-11
    const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

    // Determina i mesi per la proiezione (da ora fino a fine anno)
    appData.projections.months = monthLabels.slice(currentMonthIndex).map((month, index, arr) => {
        return (index === arr.length - 1) ? `${month} ${currentYear}` : month;
    });
    const numMonthsToProject = appData.projections.months.length;
    if (numMonthsToProject === 0) return;

    // Resetta gli array delle proiezioni
    for (const key in appData.assets) { appData.projections[key] = []; }
    appData.projections.total = [];

    // Valori iniziali (copia per non modificare gli originali durante la simulazione)
    let currentProjectedValues = {};
    let totalProjectedValue = 0;
    for (const key in appData.assets) {
        currentProjectedValues[key] = appData.assets[key].currentValue || 0;
        totalProjectedValue += currentProjectedValues[key];
    }

    // Contributo mensile PAC
    const monthlyPac = appData.pac.monthlyContribution || 0;

    // Itera per ogni mese da proiettare
    for (let i = 0; i < numMonthsToProject; i++) {
        let monthTotal = 0;

        // 1. Aggiungi contributo PAC mensile (distribuito proporzionalmente al valore corrente?)
        if (monthlyPac > 0 && totalProjectedValue > 0) {
            for (const key in appData.assets) {
                // Distribuzione proporzionale (semplice)
                const assetProportion = currentProjectedValues[key] / totalProjectedValue;
                const contributionForAsset = monthlyPac * assetProportion;
                currentProjectedValues[key] += contributionForAsset;
                // console.log(`Mese ${i+1}, Asset ${key}: Aggiunto PAC ${formatCurrency(contributionForAsset)}`);
            }
            // Ricalcola totale dopo PAC
            totalProjectedValue = Object.values(currentProjectedValues).reduce((sum, val) => sum + val, 0);
        } else if (monthlyPac > 0) {
            // Se il valore totale è 0, distribuisci equamente (o secondo regole specifiche)
            const numAssets = Object.keys(appData.assets).length;
            if (numAssets > 0) {
                const contributionPerAsset = monthlyPac / numAssets;
                 for (const key in appData.assets) {
                     currentProjectedValues[key] += contributionPerAsset;
                 }
                 totalProjectedValue = monthlyPac;
            }
        }


        // 2. Applica crescita CAGR mensile
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const annualCagr = (asset.forecast || 0) / 100; // CAGR annuo (es: 0.08 per 8%)
            // Calcola tasso di crescita mensile equivalente dal CAGR annuo: (1 + CAGR)^(1/12) - 1
            const monthlyGrowthRate = Math.pow(1 + annualCagr, 1 / 12) - 1;

            // Applica crescita al valore corrente (dopo PAC)
            currentProjectedValues[key] *= (1 + monthlyGrowthRate);
            // console.log(`Mese ${i+1}, Asset ${key}: Crescita ${formatPercentage(monthlyGrowthRate*100)}, Nuovo Valore ${formatCurrency(currentProjectedValues[key])}`);

            // Salva il valore proiettato per questo mese e asset
            appData.projections[key].push(parseFloat(currentProjectedValues[key].toFixed(2)));
            monthTotal += currentProjectedValues[key]; // Somma per il totale del mese
        }

        // Salva il totale proiettato per questo mese
        appData.projections.total.push(parseFloat(monthTotal.toFixed(2)));
        // Aggiorna il valore totale per il calcolo PAC del mese successivo
        totalProjectedValue = monthTotal;
    }

    // Aggiorna span anno corrente
    document.querySelectorAll('.current-year').forEach(span => span.textContent = currentYear);
    // Aggiorna valore PAC nella nota del grafico proiezioni
    const pacValueSpan = document.getElementById('projection-pac-value');
    if (pacValueSpan) pacValueSpan.textContent = formatCurrency(monthlyPac);
}


/**
 * Controlla alert e prepara/simula invio email se configurato.
 */
function checkAlerts() {
    const newActiveAlerts = [];
    const config = appData.alerts.config;
    const today = new Date().toLocaleDateString('it-IT');
    const existingMessages = new Set(appData.alerts.active.filter(a => a.status === 'Attivo').map(a => a.message));
    const alertsForEmail = []; // NUOVO: Alert da inviare via email

    function addAlert(type, message, isCritical = false) {
        if (!existingMessages.has(message)) {
            const newAlert = {
                id: Date.now() + newActiveAlerts.length, type: type, message: message, status: "Attivo", date: today
            };
            newActiveAlerts.push(newAlert);
            existingMessages.add(message);
            // Se è critico e l'email è configurata, aggiungi alla lista per l'invio
            if (isCritical && appData.profile.email) {
                alertsForEmail.push(newAlert);
            }
        }
    }

    // Controlli (aggiunto flag 'isCritical')
    if (config.performanceNegative.enabled) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (typeof asset.performance === 'number' && asset.performance < config.performanceNegative.threshold) {
                addAlert("Critico", `Perf. negativa ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${config.performanceNegative.threshold}%)`, true); // CRITICO
            }
        }
    }
    if (config.performancePositive.enabled) {
         for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (typeof asset.performance === 'number' && asset.performance > config.performancePositive.threshold) {
                addAlert("Info", `Perf. positiva ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${config.performancePositive.threshold}%)`, false);
            }
        }
    }
    if (config.budgetExceeded.enabled && appData.expenses.budget > 0) {
        const percentageSpent = (appData.expenses.spent / appData.expenses.budget) * 100;
        if (percentageSpent > config.budgetExceeded.threshold) {
            addAlert("Avviso", `Budget spesa superato (${formatPercentage(percentageSpent)}). Spesi ${formatCurrency(appData.expenses.spent)} su ${formatCurrency(appData.expenses.budget)} (Soglia: ${config.budgetExceeded.threshold}%)`, true); // Considerato Critico/Avviso importante
        }
    }
    if (config.allocationImbalance.enabled && appData.portfolio.totalValue > 0) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const percentageOfTotal = (asset.currentValue / appData.portfolio.totalValue) * 100;
            if (percentageOfTotal > config.allocationImbalance.threshold) {
                addAlert("Avviso", `Allocazione ${asset.name} elevata: ${formatPercentage(percentageOfTotal)} del portafoglio (Soglia: ${config.allocationImbalance.threshold}%)`, true); // Considerato Critico/Avviso importante
            }
        }
    }

    appData.alerts.active = [
        ...appData.alerts.active.filter(a => a.status === 'Attivo'),
        ...newActiveAlerts
    ];

    // Simula invio email se ci sono alert critici/avvisi e email configurata
    if (alertsForEmail.length > 0) {
        sendAlertsByEmail(alertsForEmail);
    }
}

/**
 * SIMULAZIONE Invio Email Alert. Richiede un backend per funzionare realmente.
 * @param {Array<object>} alertsToSend Array di oggetti alert da inviare.
 */
function sendAlertsByEmail(alertsToSend) {
    const userEmail = appData.profile.email;
    if (!userEmail || alertsToSend.length === 0) return;

    console.warn("--- SIMULAZIONE INVIO EMAIL ALERT ---");
    console.log(`Destinatario: ${userEmail}`);
    console.log(`Numero Alert: ${alertsToSend.length}`);
    alertsToSend.forEach((alert, index) => {
        console.log(`  ${index + 1}. [${alert.type}] ${alert.message} (${alert.date})`);
    });
    console.warn("--- FINE SIMULAZIONE --- (Richiede implementazione backend per invio reale)");
    showNotification(`📧 Simulazione invio ${alertsToSend.length} alert a ${userEmail} (vedi console).`, 'warning');
}


// --- UI UPDATE FUNCTIONS ---

/**
 * Helper generico per aggiornare il contenuto testuale e le classi di un elemento HTML.
 * @param {string} id ID dell'elemento HTML.
 * @param {string} text Testo da inserire.
 * @param {string | null} [className=null] Classe CSS da aggiungere (es. 'text-success').
 * @param {string[]} [classesToRemove=[]] Array di classi CSS da rimuovere prima di aggiungere quella nuova.
 */
function updateElement(id, text, className = null, classesToRemove = []) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        if (classesToRemove.length > 0) element.classList.remove(...classesToRemove);
        if (className) element.classList.add(className);
    }
}

/**
 * Funzione principale che orchestra l'aggiornamento di tutta l'interfaccia utente.
 */
function updateUI() {
    console.log("🔄 Inizio Aggiornamento Interfaccia Utente (v2)...");

    // 1. Ricalcola dati
    calculatePortfolioTotals(); // Include performance asset, totali da log contributi
    recalculateExpenseTotals();
    calculateProjections();     // Usa CAGR + PAC
    checkAlerts();              // Controlla alert e prepara per email (simulata)

    // 2. Aggiorna UI
    // == Profilo ==
    updateProfileSection(); // Aggiorna info profilo nella UI

    // == Dashboard ==
    updateElement('dashboard-total-value', formatCurrency(appData.portfolio.totalValue));
    updateElement('dashboard-total-contributions', formatCurrency(appData.portfolio.totalContributions));
    updateElement('dashboard-total-performance', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('dashboard-crypto-value', formatCurrency(appData.assets.crypto.currentValue));
    updateElement('dashboard-crypto-performance', formatPercentage(appData.assets.crypto.performance), getPerformanceClass(appData.assets.crypto.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('dashboard-etf-value', formatCurrency(appData.assets.etf.currentValue));
    updateElement('dashboard-etf-performance', formatPercentage(appData.assets.etf.performance), getPerformanceClass(appData.assets.etf.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateElement('dashboard-silver-value', formatCurrency(appData.assets.silver.currentValue));
    updateElement('dashboard-silver-performance', formatPercentage(appData.assets.silver.performance), getPerformanceClass(appData.assets.silver.performance), ['text-danger', 'text-success', 'text-secondary']);
    updateDashboardAlerts();
    updateDashboardTransactionsTable(); // Ora include spese e contributi

    // == Sezione Investimenti ==
    updateElement('investments-total-value', formatCurrency(appData.portfolio.totalValue));
    updateElement('investments-total-contributions', formatCurrency(appData.portfolio.totalContributions));
    updateElement('investments-total-performance', formatPercentage(appData.portfolio.totalPerformance), getPerformanceClass(appData.portfolio.totalPerformance), ['text-danger', 'text-success', 'text-secondary']);
    for (const key in appData.assets) { updateAssetCardInInvestments(key); } // Aggiorna card asset
    updateAllocationTable('#investments-allocation-table-body');

    // == Sezione Contributi PAC ==
    updateContributionsSection();

    // == Sezione Spese ==
    updateExpensesSection(); // Include aggiornamento select categorie

    // == Sezione Proiezioni ==
    updateProjectionsSection();

    // == Sezione Alert ==
    updateAlertsSection();

    // 3. Aggiorna Grafici
    initOrUpdateAllCharts(); // Aggiorna tutti i grafici

    console.log("✅ Fine Aggiornamento Interfaccia Utente (v2).");
}

// == Funzioni di Aggiornamento Specifiche per Sezioni UI ==

/** Aggiorna la sezione Profilo */
function updateProfileSection() {
    const usernameInput = document.getElementById('profileUsername');
    const emailInput = document.getElementById('profileEmail');
    const sidebarUsername = document.getElementById('sidebar-username');

    if (usernameInput) usernameInput.value = appData.profile.username || '';
    if (emailInput) emailInput.value = appData.profile.email || '';
    if (sidebarUsername) sidebarUsername.textContent = appData.profile.username || 'Utente';
    // Aggiornare altri campi del profilo se aggiunti (valuta, tema, etc.)
}

/** Aggiorna la card di un singolo asset nella sezione "Investimenti" */
function updateAssetCardInInvestments(assetType) {
    const asset = appData.assets[assetType];
    if (!asset) return;
    updateElement(`investments-${assetType}-value`, formatCurrency(asset.currentValue));
    updateElement(`investments-${assetType}-contributions`, `Contributi: ${formatCurrency(asset.contributedValue)}`); // Ora ricalcolato da log
    const perfLi = document.getElementById(`investments-${assetType}-performance`);
    if(perfLi) {
        perfLi.textContent = `Performance: ${formatPercentage(asset.performance)}`;
        perfLi.className = ''; perfLi.classList.add(getPerformanceClass(asset.performance));
    }
     const forecastLi = document.getElementById(`investments-${assetType}-forecast`);
     if(forecastLi) {
         forecastLi.textContent = `Prev. CAGR: ${formatPercentage(asset.forecast)}`; // Etichetta cambiata
         forecastLi.className = ''; forecastLi.classList.add(getPerformanceClass(asset.forecast));
     }
}

/** Aggiorna la tabella di allocazione del patrimonio */
function updateAllocationTable(tableBodySelector) {
    const tableBody = document.querySelector(tableBodySelector);
    if (!tableBody) return;
    let html = '';
    const totalValue = appData.portfolio.totalValue;
    const sortedAssets = Object.values(appData.assets).sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    sortedAssets.forEach(asset => {
        const percentage = totalValue > 0 ? ((asset.currentValue || 0) / totalValue) * 100 : 0;
        const textColor = ['#ffc107', '#0dcaf0'].includes(asset.color) ? 'text-dark' : 'text-white';
        html += `<tr>
                    <td><span class="badge ${textColor}" style="background-color:${asset.color};">${asset.name}</span></td>
                    <td>${formatCurrency(asset.currentValue)}</td>
                    <td class="text-end">${formatPercentage(percentage)}</td>
                 </tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Dati non disponibili.</td></tr>';
}

/** Aggiorna la sezione di dettaglio per un singolo asset (se usata) */
function updateAssetDetailsSection(assetType) {
    // Questa funzione potrebbe non essere più necessaria se i dettagli sono solo nelle card
    // Ma la lasciamo se si decide di riattivarla
    const asset = appData.assets[assetType];
    if (!asset) return;
    const detailsValue = document.getElementById(`${assetType}-details-value`);
    const detailsContrib = document.getElementById(`${assetType}-details-contributions`);
    const detailsPerf = document.getElementById(`${assetType}-details-performance`);

    if(detailsValue) detailsValue.textContent = formatCurrency(asset.currentValue);
    if(detailsContrib) detailsContrib.textContent = formatCurrency(asset.contributedValue);
    if(detailsPerf) {
        detailsPerf.textContent = formatPercentage(asset.performance);
        detailsPerf.className = 'text-secondary'; // Rimuovi vecchie classi
        detailsPerf.classList.add(getPerformanceClass(asset.performance));
    }
    if (asset.allocation) updateAssetCompositionTable(assetType);
}

/** Aggiorna la tabella di composizione interna di un asset (se usata) */
function updateAssetCompositionTable(assetType) {
    // Anche questa potrebbe non servire più
    const tableBody = document.getElementById(`${assetType}-composition-table-body`);
    const asset = appData.assets[assetType];
    if (!tableBody || !asset || !asset.allocation) return;
    let html = '';
    const sortedAllocation = [...asset.allocation].sort((a, b) => (b.value || 0) - (a.value || 0));
    sortedAllocation.forEach(item => {
        const valueText = formatCurrency(item.value);
        if (assetType === 'crypto') {
            html += `<tr><td>${item.name}</td><td>${formatPercentage(item.percentage)}</td><td class="text-end">${valueText}</td></tr>`;
        } else if (assetType === 'etf') {
             html += `<tr><td>${item.name}</td><td class="${getPerformanceClass(item.forecast)}">${formatPercentage(item.forecast)}</td><td class="text-end">${valueText}</td></tr>`;
        }
    });
    tableBody.innerHTML = html || `<tr><td colspan="3" class="text-center text-muted p-3">Dati composizione non disponibili.</td></tr>`;
}

/** Aggiorna la sezione Contributi PAC */
function updateContributionsSection() {
    // Aggiorna input contributo mensile
    const monthlyContribInput = document.getElementById('monthlyContribution');
    if (monthlyContribInput) {
        monthlyContribInput.value = appData.pac.monthlyContribution || 0;
    }

    // Aggiorna tabella log contributi
    const logTableBody = document.getElementById('contributions-log-table-body');
    if (logTableBody) {
        let html = '';
        // Ordina log per data decrescente (più recenti prima)
        appData.contributionsLog.sort((a, b) => (b.id || 0) - (a.id || 0)).forEach(log => {
            const assetName = appData.assets[log.assetType]?.name || log.assetType;
            const assetColor = appData.assets[log.assetType]?.color || '#6c757d';
            const textColor = ['#ffc107', '#0dcaf0'].includes(assetColor) ? 'text-dark' : 'text-white';
            html += `<tr>
                        <td class="ps-3 small text-muted">${log.id}</td>
                        <td>${log.date}</td>
                        <td><span class="badge ${textColor}" style="background-color:${assetColor};">${assetName}</span></td>
                        <td>${log.description || '-'}</td>
                        <td class="text-success text-end">${formatCurrency(log.amount)}</td>
                        <td class="text-center pe-3">
                            <button class="btn btn-sm btn-outline-danger delete-contribution py-0 px-1" data-contribution-id="${log.id}" title="Elimina Contributo (Irreversibile!)">
                                <i class="bi bi-trash small"></i>
                            </button>
                        </td>
                     </tr>`;
        });
        logTableBody.innerHTML = html || '<tr><td colspan="6" class="text-center text-muted p-3">Nessun contributo registrato.</td></tr>';
        // Attacca listener per pulsanti elimina contributo
        setupContributionActionButtons();
    }
}

/** Aggiorna la sezione Spese */
function updateExpensesSection() {
    const exp = appData.expenses;
    const budget = exp.budget || 0;
    const spent = exp.spent;
    const percentageSpent = budget > 0 ? (spent / budget) * 100 : 0;
    const remaining = budget - spent;

    // Aggiorna input budget
    const budgetInput = document.getElementById('monthlyBudgetInput');
    if (budgetInput) budgetInput.value = budget;

    // Aggiorna barra progresso
    const progressBar = document.getElementById('expenses-budget-progress');
    if (progressBar) {
        const displayPercentage = Math.min(percentageSpent, 100);
        progressBar.style.width = `${displayPercentage}%`; progressBar.textContent = `${percentageSpent.toFixed(0)}%`; progressBar.setAttribute('aria-valuenow', percentageSpent);
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (percentageSpent > 90) progressBar.classList.add('bg-danger'); else if (percentageSpent > 70) progressBar.classList.add('bg-warning'); else progressBar.classList.add('bg-success');
    }
    updateElement('expenses-budget-summary', `${formatCurrency(spent)} / ${formatCurrency(budget)}`);
    updateElement('expenses-spent-value', formatCurrency(spent));
    updateElement('expenses-budget-value', formatCurrency(budget));
    updateElement('expenses-remaining-value', formatCurrency(remaining), getPerformanceClass(remaining), ['text-danger', 'text-success', 'text-secondary']);

    // Aggiorna tabella categorie
    const catTableBody = document.getElementById('expenses-category-table-body');
    if (catTableBody) {
        let html = '';
        exp.categories.filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).forEach(cat => {
            const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(cat.color) ? 'text-dark' : 'text-white';
            html += `<tr><td><span class="badge ${textColor}" style="background-color:${cat.color};">${cat.name}</span></td><td>${formatCurrency(cat.amount)}</td><td class="text-end">${formatPercentage(cat.percentage)}</td></tr>`;
        });
        catTableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Nessuna spesa registrata.</td></tr>';
    }

    // Aggiorna tabella elenco spese
    const listTableBody = document.getElementById('expenses-list-table-body');
    if (listTableBody) {
        let html = '';
        exp.transactions.sort((a,b) => (b.id || 0) - (a.id || 0)).forEach(tx => {
             const category = exp.categories.find(c => c.name.toLowerCase() === tx.category.toLowerCase());
             const catColor = category ? category.color : '#6c757d';
             const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
             html += `<tr><td class="ps-3">${tx.date}</td><td><span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span></td><td>${tx.description}</td><td class="text-danger text-end">${formatCurrency(tx.amount)}</td><td class="text-center pe-3"><button class="btn btn-sm btn-outline-primary edit-expense py-0 px-1 me-1" data-expense-id="${tx.id}"><i class="bi bi-pencil small"></i></button><button class="btn btn-sm btn-outline-danger delete-expense py-0 px-1" data-expense-id="${tx.id}"><i class="bi bi-trash small"></i></button></td></tr>`;
        });
        listTableBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna spesa registrata.</td></tr>';
        setupExpenseActionButtons();
    }

    // Aggiorna select categorie nel modale aggiungi/modifica spesa
    updateExpenseCategorySelect();
}

/** Aggiorna il menu a tendina delle categorie nel modale spese */
function updateExpenseCategorySelect() {
    const expenseCategorySelect = document.getElementById('expenseCategory');
    if (expenseCategorySelect) {
        const currentValue = expenseCategorySelect.value; // Salva valore selezionato
        expenseCategorySelect.innerHTML = appData.expenses.categories
            .map(c => `<option value="${c.name}">${c.name}</option>`)
            .join('');
        // Ripristina valore selezionato se ancora esiste
        if (appData.expenses.categories.some(c => c.name === currentValue)) {
            expenseCategorySelect.value = currentValue;
        }
    }
}


/** Aggiorna la sezione Proiezioni */
function updateProjectionsSection() {
    const proj = appData.projections;
    const lastIndex = proj.months.length - 1;
    if (lastIndex < 0) return;

    // Aggiorna tabella dettagli proiezione (fine periodo)
    const detailsTableBody = document.getElementById('projections-details-table-body');
    if (detailsTableBody) {
        let html = '';
        const totalProjected = proj.total[lastIndex];
        const totalCurrent = appData.portfolio.totalValue;
        const totalGrowthValue = totalProjected - totalCurrent;
        // La crescita % totale non è semplicemente il CAGR medio, ma dipende dal PAC
        // Potremmo calcolarla come (ValoreFinale - ValoreIniziale - ContributiTotali) / (ValoreIniziale + ContributiPonderati) -> complesso
        // Mostriamo il CAGR medio ponderato o lasciamo vuoto? Per ora usiamo il CAGR medio.
        let weightedAvgCagr = 0;
        if (totalCurrent > 0) {
             weightedAvgCagr = Object.keys(appData.assets).reduce((sum, key) => {
                 return sum + (appData.assets[key].currentValue / totalCurrent) * (appData.assets[key].forecast || 0);
             }, 0);
        }

        for(const key in appData.assets){
            const asset = appData.assets[key];
            const projectedValue = proj[key][lastIndex];
            const currentVal = asset.currentValue || 0;
            const growthValue = projectedValue - currentVal - (appData.pac.monthlyContribution * (lastIndex + 1) * ((currentVal / totalCurrent) || (1/Object.keys(appData.assets).length))); // Stima contributi per questo asset
            const assetGrowth = asset.forecast || 0;
            html += `<tr>
                        <td>${asset.name}</td>
                        <td>${formatCurrency(currentVal)}</td>
                        <td>${formatCurrency(projectedValue)}</td>
                        <td>${formatCurrency(growthValue)}</td>
                        <td class="${getPerformanceClass(assetGrowth)}">${formatPercentage(assetGrowth)}</td>
                     </tr>`;
        }
        html += `<tr class="table-primary fw-bold">
                    <td>Totale Portafoglio</td>
                    <td>${formatCurrency(totalCurrent)}</td>
                    <td>${formatCurrency(totalProjected)}</td>
                    <td>${formatCurrency(totalGrowthValue)}</td>
                    <td class="${getPerformanceClass(weightedAvgCagr)}">${formatPercentage(weightedAvgCagr)} (Medio)</td>
                 </tr>`;
        detailsTableBody.innerHTML = html;
    }

    // Aggiorna tabella proiezioni mensili
    const monthlyTableBody = document.getElementById('projections-monthly-table-body');
    if(monthlyTableBody){
        let html = '';
        for (let i = 0; i <= lastIndex; i++) {
            const isLastRow = i === lastIndex;
            html += `<tr class="${isLastRow ? 'table-light fw-bold' : ''}"><td>${proj.months[i]}</td><td>${formatCurrency(proj.crypto[i])}</td><td>${formatCurrency(proj.etf[i])}</td><td>${formatCurrency(proj.silver[i])}</td><td>${formatCurrency(proj.total[i])}</td></tr>`;
        }
        monthlyTableBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione mensile disponibile.</td></tr>';
    }
}

/** Aggiorna la sezione alert nel Dashboard */
function updateDashboardAlerts() {
    const container = document.getElementById('dashboard-active-alerts');
    if (!container) return;
    let html = '';
    const activeAlerts = appData.alerts.active.filter(a => a.status === 'Attivo').sort((a, b) => ({"Critico":1,"Avviso":2,"Info":3})[a.type] - ({"Critico":1,"Avviso":2,"Info":3})[b.type]);
     if (activeAlerts.length > 0) {
        html += `<h4 class="text-danger mt-4 mb-2"><i class="bi bi-exclamation-triangle-fill me-2"></i>Alert Attivi Recenti</h4>`;
         activeAlerts.slice(0, 3).forEach(alert => {
            let alertClass = 'alert-info'; let icon = 'bi-info-circle-fill';
            if(alert.type === 'Critico') { alertClass = 'alert-danger'; icon = 'bi-exclamation-triangle-fill'; }
            if(alert.type === 'Avviso') { alertClass = 'alert-warning'; icon = 'bi-exclamation-circle-fill'; }
            html += `<div class="alert ${alertClass} alert-dismissible fade show d-flex align-items-center p-2 mb-2" role="alert"><i class="bi ${icon} flex-shrink-0 me-2"></i><small class="flex-grow-1">${alert.message}</small><button type="button" class="btn-close p-2 dismiss-alert" data-alert-id="${alert.id}" aria-label="Close" title="Ignora alert"></button></div>`;
        });
         if (activeAlerts.length > 3) {
             html += `<div class="text-center mt-2"><a href="#" class="btn btn-sm btn-outline-secondary" id="view-all-alerts-link">Vedi tutti gli alert (${activeAlerts.length})</a></div>`;
         }
    }
    container.innerHTML = html;
    setupDismissAlertButtons();
    const viewAllLink = document.getElementById('view-all-alerts-link');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('alerts-tab')?.click(); });
    }
}

/** Aggiorna la tabella ultime transazioni nel Dashboard (include spese e contributi) */
function updateDashboardTransactionsTable() {
    const tableBody = document.querySelector('#dashboard-transactions-table tbody');
    if (!tableBody) return;

    // Combina spese e contributi
    const allTransactions = [
        ...appData.expenses.transactions.map(tx => ({ ...tx, type: 'Spesa', sortDate: new Date(convertDate_DMY_to_YMD(tx.date) + 'T00:00:00') || new Date(0) })),
        ...appData.contributionsLog.map(log => ({ ...log, type: 'Contributo', category: appData.assets[log.assetType]?.name || log.assetType, sortDate: new Date(convertDate_DMY_to_YMD(log.date) + 'T00:00:00') || new Date(0) }))
    ];

    // Ordina per data decrescente, poi per ID decrescente
    allTransactions.sort((a, b) => {
        const dateDiff = (b.sortDate?.getTime() || 0) - (a.sortDate?.getTime() || 0);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0); // Fallback su ID
    });

    // Prendi le ultime 5 transazioni combinate
    const recentTransactions = allTransactions.slice(0, 5);
    let html = '';

    if (recentTransactions.length > 0) {
        recentTransactions.forEach(tx => {
            let typeBadgeClass = 'bg-secondary';
            let amountClass = 'text-secondary';
            let amountPrefix = '';
            let categoryBadgeHtml = '';

            if (tx.type === 'Spesa') {
                typeBadgeClass = 'bg-danger';
                amountClass = 'text-danger';
                amountPrefix = '-';
                const category = appData.expenses.categories.find(c => c.name.toLowerCase() === tx.category.toLowerCase());
                const catColor = category ? category.color : '#6c757d';
                const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
                categoryBadgeHtml = `<span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span>`;
            } else if (tx.type === 'Contributo') {
                typeBadgeClass = 'bg-success';
                amountClass = 'text-success';
                amountPrefix = '+';
                const asset = appData.assets[tx.assetType];
                const assetColor = asset ? asset.color : '#6c757d';
                const textColor = ['#ffc107', '#0dcaf0'].includes(assetColor) ? 'text-dark' : 'text-white';
                categoryBadgeHtml = `<span class="badge ${textColor}" style="background-color:${assetColor};">${tx.category}</span>`; // Usa category che ora è il nome asset
            }

            html += `<tr>
                        <td class="ps-3">${tx.date}</td>
                        <td><span class="badge ${typeBadgeClass}">${tx.type}</span></td>
                        <td>${categoryBadgeHtml}</td>
                        <td>${tx.description || '-'}</td>
                        <td class="${amountClass} text-end pe-3">${amountPrefix}${formatCurrency(tx.amount)}</td>
                     </tr>`;
        });
    } else {
        html = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna transazione recente registrata.</td></tr>';
    }
    tableBody.innerHTML = html;
}


/** Aggiorna la sezione Alert (lista attivi e cronologia) */
function updateAlertsSection() {
    const activeListContainer = document.getElementById('alerts-active-list');
    if (activeListContainer) {
        let html = '';
        const activeAlerts = appData.alerts.active.filter(a => a.status === 'Attivo').sort((a, b) => ({"Critico":1,"Avviso":2,"Info":3})[a.type] - ({"Critico":1,"Avviso":2,"Info":3})[b.type]);
        if (activeAlerts.length === 0) {
            html = '<p class="text-center text-muted">Nessun alert attivo. 👍</p>';
        } else {
            activeAlerts.forEach(alert => {
                let aClass = 'alert-info', iClass = 'bi-info-circle-fill';
                if (alert.type === 'Critico') { aClass = 'alert-danger'; iClass = 'bi-exclamation-triangle-fill';}
                if (alert.type === 'Avviso') { aClass = 'alert-warning'; iClass = 'bi-exclamation-circle-fill';}
                const btnClass = aClass.replace('alert-', 'btn-outline-');
                html += `<div class="alert ${aClass} d-flex justify-content-between align-items-center" role="alert" data-alert-internal-id="${alert.id}"><div><i class="bi ${iClass} me-2"></i><strong>${alert.type}:</strong> ${alert.message} <small class="text-muted">(${alert.date})</small></div><button class="btn btn-sm ${btnClass} dismiss-alert ms-2" data-alert-id="${alert.id}" title="Ignora alert"><i class="bi bi-x-circle me-1"></i> Ignora</button></div>`;
            });
        }
        activeListContainer.innerHTML = html;
        setupDismissAlertButtons();
    }
    const historyBody = document.getElementById('alerts-history-table-body');
    if (historyBody) {
        let html = '';
        const combined = [...appData.alerts.active, ...appData.alerts.history].sort((a,b) => (b.id || 0) - (a.id || 0));
        if (combined.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted">Nessuna cronologia alert.</td></tr>';
        } else {
             combined.forEach(alert => {
                let tBadge='bg-secondary', sBadge='bg-secondary';
                if(alert.type==='Critico')tBadge='bg-danger'; else if(alert.type==='Avviso')tBadge='bg-warning text-dark'; else if(alert.type==='Info')tBadge='bg-info text-dark';
                if(alert.status==='Attivo')sBadge='bg-warning text-dark'; else if(alert.status==='Risolto')sBadge='bg-success';
                html += `<tr><td class="ps-3">${alert.date}</td><td><span class="badge ${tBadge}">${alert.type}</span></td><td>${alert.message}</td><td><span class="badge ${sBadge}">${alert.status}</span></td></tr>`;
             });
        }
        historyBody.innerHTML = html;
    }
}

// --- CHART FUNCTIONS --- (initOrUpdateChart, destroyChart, commonChartOptions rimangono uguali)

/**
 * Inizializza un nuovo grafico Chart.js o aggiorna uno esistente.
 * @param {string} chartId ID dell'elemento <canvas>.
 * @param {object} chartConfig Oggetto di configurazione per Chart.js (type, data, options).
 */
function initOrUpdateChart(chartId, chartConfig) {
    const canvasElement = document.getElementById(chartId);
    if (!canvasElement) { return; }
    const context = canvasElement.getContext('2d');
    if (!context) { console.error(`Impossibile ottenere contesto 2D per ${chartId}.`); return; }
    if (charts[chartId] && charts[chartId] instanceof Chart) {
        try {
            charts[chartId].data = chartConfig.data; charts[chartId].options = chartConfig.options; charts[chartId].update();
        } catch (error) {
            console.error(`Errore aggiornamento grafico ${chartId}:`, error); destroyChart(chartId); try { charts[chartId] = new Chart(context, chartConfig); } catch (initError) { console.error(`Errore ricreazione grafico ${chartId}:`, initError); }
        }
    } else {
        try { destroyChart(chartId); charts[chartId] = new Chart(context, chartConfig); } catch (error) { console.error(`Errore creazione grafico ${chartId}:`, error); }
    }
}

/** Distrugge un'istanza di Chart.js */
function destroyChart(chartId) {
    if(charts[chartId] && charts[chartId] instanceof Chart) {
        try { charts[chartId].destroy(); } catch (error) { console.error(`Errore distruzione grafico ${chartId}:`, error); }
        delete charts[chartId];
    }
}

/** Restituisce opzioni comuni per i grafici */
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
                        let label = context.dataset.label || context.label || ''; if (label) label += ': '; const value = context.raw;
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


/** Inizializza o aggiorna tutti i grafici */
function initOrUpdateAllCharts() {
    console.log("📊 Aggiornamento Grafici (v2)...");
    // Allocazione (Pie/Doughnut)
    const allocationLabels = Object.values(appData.assets).map(a => a.name);
    const allocationValues = Object.values(appData.assets).map(a => a.currentValue || 0);
    const allocationColors = Object.values(appData.assets).map(a => a.color);
    const allocationData = { labels: allocationLabels, datasets: [{ data: allocationValues, backgroundColor: allocationColors, borderColor: '#ffffff', borderWidth: 1 }] };
    initOrUpdateChart('allocationChart', { type: 'pie', data: allocationData, options: commonChartOptions('pie', null, false, true) });
    initOrUpdateChart('investmentsAllocationChart', { type: 'doughnut', data: allocationData, options: commonChartOptions('doughnut', null, false, true) });

    // Andamento Previsto (Dashboard - Line) - Usa proiezioni totali
    initOrUpdateChart('performanceChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Valore Totale Previsto (CAGR+PAC)', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });

    // Grafici Proiezione Asset Singoli (Line) - Non più presenti nelle sezioni dettaglio
    // initOrUpdateChart('cryptoProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Crypto Previsto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, backgroundColor: `${appData.assets.crypto.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });
    // initOrUpdateChart('etfProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'ETF Previsto', data: appData.projections.etf, borderColor: appData.assets.etf.color, backgroundColor: `${appData.assets.etf.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });
    // initOrUpdateChart('silverProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [{ label: 'Argento Previsto', data: appData.projections.silver, borderColor: appData.assets.silver.color, backgroundColor: `${appData.assets.silver.color}20`, fill: true, tension: 0.3 }] }, options: commonChartOptions('line', null, true) });

    // Grafico Prezzo Argento (Esempio statico)
    const silverPriceExampleData = { labels: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'], datasets: [{ label: 'Prezzo Argento (Esempio €/oz)', data: [22.5, 22.8, 23.1, 23.5, 23.8, 24.2, 24.5, 24.9, 25.3, 25.7, 26.1, 26.5], borderColor: appData.assets.silver.color, backgroundColor: `${appData.assets.silver.color}20`, fill: true, tension: 0.3 }] };
    // initOrUpdateChart('silverPriceChart', { type: 'line', data: silverPriceExampleData, options: commonChartOptions('line', null, true) }); // Commentato se non c'è più la sezione Silver

    // Spese per Categoria (Doughnut)
    const expenseCategories = appData.expenses.categories.filter(c => c.amount > 0);
    const expenseData = { labels: expenseCategories.map(c => c.name), datasets: [{ data: expenseCategories.map(c => c.amount), backgroundColor: expenseCategories.map(c => c.color), borderColor: '#ffffff', borderWidth: 1 }] };
    initOrUpdateChart('expenseCategoryChart', { type: 'doughnut', data: expenseData, options: commonChartOptions('doughnut', null, false, true) });

    // Proiezione Totale Dettagliata (Line)
    initOrUpdateChart('totalProjectionChart', { type: 'line', data: { labels: appData.projections.months, datasets: [ { label: 'Totale Previsto', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3, borderWidth: 2, order: 1 }, { label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 2 }, { label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 3 }, { label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1, order: 4 } ] }, options: commonChartOptions('line', null, true) });
    console.log("📊 Grafici Aggiornati (v2).");
}


// --- PDF EXPORT ---

/**
 * Genera HTML per il report PDF (versione aggiornata con contributi, etc.).
 * @returns {string} Stringa HTML del report.
 */
function generatePdfHtmlReport() {
    const { profile, portfolio, assets, expenses, projections, contributionsLog, pac } = appData;
    const today = new Date().toLocaleDateString('it-IT');

    const createTable = (headers, rows) => {
        const thStyle = "border:1px solid #ddd; padding:6px; background-color:#f2f2f2; text-align:left; font-weight:bold;"; const tdStyleBase = "border:1px solid #ddd; padding:6px;"; const tableStyle = "width:100%; border-collapse:collapse; margin-bottom:15px; font-size:10px;";
        let th = headers.map(h => `<th style="${thStyle}">${h}</th>`).join('');
        let tr = rows.map(row => {
            let cells = row.map((cellValue, index) => {
                let cellStyle = tdStyleBase; let formattedValue = cellValue; const headerText = headers[index]?.toLowerCase() || '';
                if (typeof cellValue === 'number') {
                    cellStyle += 'text-align:right;';
                    if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('previsione') || headerText.includes('perc.') || headerText.includes('cagr')) { formattedValue = formatPercentage(cellValue); }
                    else { formattedValue = formatCurrency(cellValue); }
                } else if (typeof cellValue === 'string' && (cellValue.startsWith('€') || cellValue.endsWith('%'))) { cellStyle += 'text-align:right;'; }
                 // Aggiungi colore performance
                 if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('cagr')) {
                     const perfClass = getPerformanceClass(cellValue);
                     if (perfClass === 'text-success') cellStyle += 'color:green;';
                     else if (perfClass === 'text-danger') cellStyle += 'color:red;';
                 }
                return `<td style="${cellStyle}">${formattedValue}</td>`;
            }).join(''); return `<tr>${cells}</tr>`;
        }).join(''); return `<table style="${tableStyle}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
    };

    let html = `<div style="font-family:Arial, sans-serif; margin:20px; color:#333;"><h1 style="text-align:center; color:#0d6efd; border-bottom:2px solid #0d6efd; padding-bottom:10px;">Report Finanziario Completo</h1><p style="text-align:center; font-size:12px; margin-bottom:20px;">Generato per: ${profile.username || 'Utente'} il ${today}</p>`;
    html += `<h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Riepilogo Portafoglio</h2>${createTable(['Descrizione','Valore'],[['Valore Totale',portfolio.totalValue],['Contributi Totali (da Log)',portfolio.totalContributions],['Performance Totale',portfolio.totalPerformance]])}`;
    html += `<h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Allocazione Asset</h2>${createTable(['Asset','Valore','Alloc. (%)'],Object.values(assets).map(a=>[a.name,a.currentValue,portfolio.totalValue>0?((a.currentValue/portfolio.totalValue)*100):0]))}`;
    html += `<h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px;">Dettaglio Asset</h2>`;
    for (const k in assets) { const a=assets[k]; html+=`<h3 style="color:${a.color}; margin-top:20px; margin-bottom:5px;">${a.name}</h3>${createTable(['Metrica','Valore'],[['Valore Attuale',a.currentValue],['Contributi (da Log)',a.contributedValue],['Performance',a.performance],['Prev. CAGR Annua',a.forecast]])}`; if(a.allocation&&a.allocation.length>0){html+=`<h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Composizione ${a.name}:</h4>`;if(k==='crypto')html+=createTable(['Nome','Perc. (%)','Valore'],a.allocation.map(i=>[i.name,i.percentage,i.value]));else if(k==='etf')html+=createTable(['Nome','Prev. Annua (%)','Valore'],a.allocation.map(i=>[i.name,i.forecast,i.value]));}}

    html += `<h2 style="color:#6610f2; margin-top:25px; margin-bottom:10px;">Piano di Accumulo (PAC) & Contributi</h2>`;
    html += `<p style="font-size:11px;">Contributo Mensile PAC Impostato: <strong>${formatCurrency(pac.monthlyContribution)}</strong></p>`;
    html += `<h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Cronologia Contributi Registrati:</h4>`;
    if (contributionsLog.length > 0) {
        html += createTable(['Data', 'Asset', 'Descrizione', 'Importo'], contributionsLog.sort((a,b)=>(b.id||0)-(a.id||0)).map(log => [log.date, appData.assets[log.assetType]?.name || log.assetType, log.description || '-', log.amount]));
    } else { html += `<p style="font-size:10px; color: #6c757d;">Nessun contributo registrato.</p>`; }

    const rem=expenses.budget-expenses.spent, budPerc=expenses.budget>0?(expenses.spent/expenses.budget)*100:0; html+=`<h2 style="color:#198754; margin-top:25px; margin-bottom:10px;">Gestione Spese Mensili</h2>${createTable(['Descrizione','Valore'],[['Budget Mensile',expenses.budget],['Speso',expenses.spent],['Rimanente',rem],['Utilizzo Budget',budPerc]])}<h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Spese per Categoria:</h4>${createTable(['Cat.','Importo','Perc. (%)'],expenses.categories.filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount).map(c=>[c.name,c.amount,c.percentage]))}<h4 style="font-size:11px; margin-top:10px; margin-bottom:5px;">Elenco Spese Recenti:</h4>${createTable(['Data','Cat.','Descr.','Importo'],expenses.transactions.sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,15).map(t=>[t.date,t.category,t.description,-t.amount]))}`; // Mostra ultime 15 spese

    const lastIdx=projections.months.length-1; if(lastIdx>=0){const totP=projections.total[lastIdx]; const totC=portfolio.totalValue; const totGVal=totP-totC; const avgCAGR = portfolio.totalValue > 0 ? Object.keys(assets).reduce((sum, key) => sum + (assets[key].currentValue / portfolio.totalValue) * (assets[key].forecast || 0), 0) : 0; html+=`<h2 style="color:#6f42c1; margin-top:25px; margin-bottom:10px;">Proiezioni Future (CAGR + PAC)</h2><p style="font-size:11px;">Stima fino a ${projections.months[lastIdx]} (PAC Mensile: ${formatCurrency(pac.monthlyContribution)})</p>${createTable(['Asset/Totale','Attuale','Previsto','Crescita (€)','CAGR (%)'],[...Object.entries(assets).map(([k,a])=>[a.name,a.currentValue,projections[k][lastIdx],projections[k][lastIdx]-(a.currentValue||0)-(pac.monthlyContribution*(lastIdx+1)*((a.currentValue/totC)||1/Object.keys(assets).length)),a.forecast]),['Totale',totC,totP,totGVal,avgCAGR]])}`;}

    // Sezione Alert (Opzionale)
    // html += `<h2 style="color:#dc3545; margin-top:25px; margin-bottom:10px;">Alert Recenti</h2>`; ...

    html+=`</div>`; return html;
}


/** Genera e scarica PDF */
function generatePdfReport() {
    console.log("📄 Tentativo di generare il PDF (v2)...");
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = generatePdfHtmlReport();
    const pdfOptions = { margin:[10,10,15,10], filename:`Report_Finanziario_${new Date().toISOString().slice(0,10)}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true,logging:false}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
    showNotification('Generazione PDF completo in corso... ⏳', 'info');
    html2pdf().from(reportContainer).set(pdfOptions).save()
      .then(() => { console.log("✅ PDF generato (v2)."); showNotification('Report PDF generato! 👍', 'success'); })
      .catch(error => { console.error("❌ Errore generazione PDF (v2):", error); showNotification('Errore generazione PDF. 🙁', 'danger'); });
}


// --- EVENT LISTENERS & SETUP ---

/** Imposta la navigazione tra schede */
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]');
    const contentSections = document.querySelectorAll('.content-section');
    function showSection(tar
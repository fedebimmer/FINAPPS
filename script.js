```javascript
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
        ],
        investmentTransactions: [ // Log separato per gli investimenti/contributi
            // { id: 101, date: "15/04/2025", assetType: "etf", amount: 200, description: "Contributo PAC ETF" }
            // Verrà popolato dal modale "Aggiungi Investimento"
        ]
    },
    projections: {
        // I mesi vengono determinati dinamicamente all'inizio
        months: [], // Es: ["Apr", "Mag", ..., "Dic 2025"]
        crypto: [], etf: [], silver: [], total: [], // Array per i valori proiettati per mese
        monthlyContribution: 200, // Esempio: Contributo PAC mensile totale
        pacTargetAllocation: { crypto: 25, etf: 65, silver: 10 } // Esempio: % allocazione PAC
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
    profile: { // Dati profilo utente (esempio)
        username: "Utente Demo",
        email: "",
        currency: "EUR",
        theme: "system"
    }
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
}

/**
 * Calcola i valori proiettati per ogni asset e per il totale, mese per mese.
 * Utilizza una proiezione COMPOSTA basata sul tasso di crescita annuo previsto (`forecast`)
 * e aggiunge un contributo mensile PAC (`monthlyContribution`).
 */
function calculateProjections() {
    console.log("📊 Calcolo Proiezioni PAC + CAGR...");
    const currentMonthIndex = new Date().getMonth();
    const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    appData.projections.months = monthLabels.slice(currentMonthIndex).map((month, index, arr) => {
        // Mostra l'anno solo per Dicembre per chiarezza
        return (month === "Dic") ? `${month} ${currentYear}` : month;
    });


    const numMonthsToProject = appData.projections.months.length;
    if (numMonthsToProject === 0) {
        console.log("📊 Nessun mese per la proiezione.");
        // Azzera array proiezioni se vuoti
        for (const key in appData.assets) { appData.projections[key] = []; }
        appData.projections.total = [];
        return;
    }

    // Reset arrays proiezioni
    for (const key in appData.assets) { appData.projections[key] = []; }
    appData.projections.total = [];

    // Prendi contributo mensile e allocazione PAC (usa default se non validi)
    const monthlyContribution = typeof appData.projections.monthlyContribution === 'number' && appData.projections.monthlyContribution >= 0
                                ? appData.projections.monthlyContribution : 0;
    const pacAllocation = appData.projections.pacTargetAllocation || {};
     // Verifica che la somma delle allocazioni PAC sia ~100% (opzionale)
     const totalPacAllocation = Object.values(pacAllocation).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
     if (Math.abs(totalPacAllocation - 100) > 0.1 && monthlyContribution > 0) { // Tolleranza 0.1%
         console.warn(`Allocazione PAC (${totalPacAllocation}%) non somma a 100%. Le proiezioni potrebbero non usare l'intero contributo mensile.`);
         // Potresti normalizzare l'allocazione qui se lo desideri
     }


    // Oggetto per tenere traccia dell'ultimo valore calcolato per ogni asset
    let lastValues = {};
    for (const key in appData.assets) {
        lastValues[key] = appData.assets[key].currentValue || 0;
    }

    // Itera per ogni mese da proiettare
    for (let i = 0; i < numMonthsToProject; i++) {
        let monthTotalProjected = 0;

        // Itera su ogni asset
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const currentValueForMonth = lastValues[key]; // Valore all'inizio del mese

            // 1. Calcola contributo PAC per questo asset nel mese corrente
            const allocationPercent = typeof pacAllocation[key] === 'number' ? pacAllocation[key] : 0;
            const assetPacAmount = monthlyContribution * (allocationPercent / 100);

            // 2. Calcola il tasso di crescita MENSILE dal CAGR annuale (`forecast`)
            const annualRate = (typeof asset.forecast === 'number' && !isNaN(asset.forecast) ? asset.forecast : 0) / 100;
            // Formula crescita composta: (1 + R_annuale)^(1/12) - 1
            // Gestisce anche tassi negativi (ma CAGR < -100% non ha senso fisico)
            let monthlyRate = 0;
            if (1 + annualRate >= 0) { // Evita radice di numero negativo (permette = 0)
                 monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
            } else {
                monthlyRate = -1; // Valore azzerato se CAGR < -100%
                 console.warn(`CAGR per ${key} (${annualRate*100}%) è <= -100%. Tasso mensile impostato a -100%.`);
            }


            // 3. Aggiungi PAC e calcola crescita
            const valueBeforeGrowth = currentValueForMonth + assetPacAmount;
            const projectedValue = valueBeforeGrowth * (1 + monthlyRate);

            // Arrotonda e salva il valore proiettato per il mese corrente
            const finalProjectedValue = parseFloat(projectedValue.toFixed(2));
            appData.projections[key].push(finalProjectedValue);

            // Aggiorna l'ultimo valore per il prossimo ciclo
            lastValues[key] = finalProjectedValue;

            // Somma al totale del mese
            monthTotalProjected += finalProjectedValue;
        } // Fine loop asset

        // Salva il totale proiettato per il mese corrente
        appData.projections.total.push(parseFloat(monthTotalProjected.toFixed(2)));

    } // Fine loop mesi

    // Aggiorna anno corrente nell'UI
    document.querySelectorAll('.current-year').forEach(span => span.textContent = currentYear);
    // Aggiorna display allocazione PAC
    updatePacAllocationDisplay();

    // console.log("📊 Proiezioni Calcolate:", JSON.stringify(appData.projections)); // DEBUG
}


/**
 * Controlla se devono essere attivati nuovi alert in base alle soglie definite.
 */
function checkAlerts() {
    const newActiveAlerts = [];
    const config = appData.alerts.config;
    const today = new Date().toLocaleDateString('it-IT');
    // Ottieni messaggi degli alert *già attivi* per evitare duplicati istantanei
    const existingMessages = new Set(appData.alerts.active.filter(a => a.status === 'Attivo').map(a => a.message));

    function addAlert(type, message) {
        // Aggiungi solo se un alert IDENTICO non è già attivo
        if (!existingMessages.has(message)) {
             newActiveAlerts.push({ id: Date.now() + newActiveAlerts.length, type: type, message: message, status: "Attivo", date: today });
             existingMessages.add(message); // Aggiungi al set per controllo immediato
        }
    }

    // Check Performance Negativa
    if (config.performanceNegative.enabled) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            if (typeof asset.performance === 'number' && !isNaN(asset.performance) && asset.performance < config.performanceNegative.threshold) {
                addAlert("Critico", `Perf. negativa ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${formatPercentage(config.performanceNegative.threshold)})`);
            }
        }
    }
    // Check Performance Positiva
    if (config.performancePositive.enabled) {
         for (const key in appData.assets) {
            const asset = appData.assets[key];
             if (typeof asset.performance === 'number' && !isNaN(asset.performance) && asset.performance > config.performancePositive.threshold) {
                addAlert("Info", `Perf. positiva ${asset.name}: ${formatPercentage(asset.performance)} (Soglia: ${formatPercentage(config.performancePositive.threshold)})`);
            }
        }
    }
    // Check Budget Spese
    if (config.budgetExceeded.enabled && appData.expenses.budget > 0) {
        const percentageSpent = (appData.expenses.spent / appData.expenses.budget) * 100;
        if (percentageSpent > config.budgetExceeded.threshold) {
            addAlert("Avviso", `Budget spesa superato (${formatPercentage(percentageSpent)}). Spesi ${formatCurrency(appData.expenses.spent)} su ${formatCurrency(appData.expenses.budget)} (Soglia: ${config.budgetExceeded.threshold}%)`);
        }
    }
    // Check Squilibrio Allocazione
    if (config.allocationImbalance.enabled && appData.portfolio.totalValue > 0) {
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            const assetValue = typeof asset.currentValue === 'number' && !isNaN(asset.currentValue) ? asset.currentValue : 0;
            const percentageOfTotal = (assetValue / appData.portfolio.totalValue) * 100;
            if (percentageOfTotal > config.allocationImbalance.threshold) {
                addAlert("Avviso", `Allocazione ${asset.name} elevata: ${formatPercentage(percentageOfTotal)} del portafoglio (Soglia: ${config.allocationImbalance.threshold}%)`);
            }
        }
    }

    // Aggiungi i nuovi alert non duplicati a quelli già attivi
    // Mantieni solo quelli con status 'Attivo' dagli alert precedenti
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
        calculateProjections(); // Ora usa PAC+CAGR
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
        // Usa variabili locali per chiarezza (optional)
        const p_totalValue = appData.portfolio.totalValue;
        const p_totalContributions = appData.portfolio.totalContributions;
        const p_totalPerformance = appData.portfolio.totalPerformance;
        const a_crypto_currentValue = appData.assets.crypto.currentValue;
        const a_crypto_performance = appData.assets.crypto.performance;
        const a_etf_currentValue = appData.assets.etf.currentValue;
        const a_etf_performance = appData.assets.etf.performance;
        const a_silver_currentValue = appData.assets.silver.currentValue;
        const a_silver_performance = appData.assets.silver.performance;

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

    // == Sezioni Dettaglio Asset Singoli (Non implementate come sezioni separate visibili) ==
    // try {
    //     for (const key in appData.assets) { updateAssetDetailsSection(key); }
    // } catch(error) { console.error("Errore aggiornamento UI Dettaglio Asset:", error); }

    // == Sezione Contributi PAC ==
    try {
        updateContributionsSection();
    } catch (error) { console.error("Errore aggiornamento UI Contributi PAC:", error); }

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

    // == Sezione Profilo ==
    try {
        updateProfileSection();
    } catch (error) { console.error("Errore aggiornamento UI Profilo:", error); }

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
         // Mostra la previsione CAGR come percentuale
         forecastLi.textContent = `Prev. CAGR: ${formatPercentage(asset.forecast)}`;
         forecastLi.className = ''; // Resetta classi
         // Usa la stessa logica di performance per il colore della previsione
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
        const currentValue = asset.currentValue || 0;
        const percentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        // Determina colore testo badge per leggibilità (chiaro su scuro, scuro su giallo/ciano)
        const textColor = ['#ffc107', '#0dcaf0', '#fd7e14'].includes(asset.color) ? 'text-dark' : 'text-white';
        html += `<tr>
                    <td><span class="badge ${textColor}" style="background-color:${asset.color};">${asset.name}</span></td>
                    <td>${formatCurrency(currentValue)}</td>
                    <td class="text-end">${formatPercentage(percentage)}</td>
                 </tr>`;
    });

     // Aggiungi riga totale se ci sono asset
     if (sortedAssets.length > 0 && totalValue > 0) {
         html += `<tr class="table-light fw-bold">
                     <td>Totale</td>
                     <td>${formatCurrency(totalValue)}</td>
                     <td class="text-end">${formatPercentage(100)}</td>
                  </tr>`;
     }

    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Dati di allocazione non disponibili.</td></tr>';
}

// Rimossa funzione updateAssetDetailsSection perché non ci sono sezioni HTML dedicate al momento
// function updateAssetDetailsSection(assetType) { ... }

// Rimossa funzione updateAssetCompositionTable perché non ci sono sezioni HTML dedicate al momento
// function updateAssetCompositionTable(assetType) { ... }


/**
 * Aggiorna l'intera sezione "Contributi PAC".
 */
function updateContributionsSection() {
    // Aggiorna campo input PAC con valore corrente
    const pacInput = document.getElementById('monthlyContribution');
    if (pacInput) {
        pacInput.value = appData.projections.monthlyContribution || 0;
    }

    // Aggiorna la tabella del log degli investimenti/contributi
    const logTableBody = document.getElementById('contributions-log-table-body');
    if (logTableBody) {
        let html = '';
        // Ordina per ID decrescente (più recenti prima) o per data se disponibile
        const sortedContributions = [...appData.expenses.investmentTransactions]
            .sort((a, b) => {
                 try { // Ordinamento per data se possibile
                     const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                     const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                     if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
                 } catch(e){}
                 return (b.id || 0) - (a.id || 0); // Fallback su ID
            });

        if (sortedContributions.length > 0) {
            sortedContributions.forEach(tx => {
                const assetName = appData.assets[tx.assetType]?.name || tx.assetType; // Nome leggibile
                const assetColor = appData.assets[tx.assetType]?.color || '#6c757d'; // Colore o default
                const textColor = ['#ffc107', '#0dcaf0', '#fd7e14'].includes(assetColor) ? 'text-dark' : 'text-white';
                html += `<tr>
                            <td class="ps-3"><small class="text-muted">${tx.id || 'N/A'}</small></td>
                            <td>${tx.date || 'N/A'}</td>
                            <td><span class="badge ${textColor}" style="background-color:${assetColor};">${assetName}</span></td>
                            <td>${tx.description || '-'}</td>
                            <td class="text-success text-end">${formatCurrency(tx.amount)}</td>
                            <td class="text-center pe-3">
                                <!-- Pulsante Modifica (commentato - non implementato) -->
                                <!-- <button class="btn btn-sm btn-outline-primary py-0 px-1 me-1 edit-contribution" data-contribution-id="${tx.id}" title="Modifica Contributo (Non Impl.)">
                                    <i class="bi bi-pencil small"></i>
                                </button> -->
                                <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-contribution" data-contribution-id="${tx.id}" title="Elimina questa voce dal log (Non annulla l'impatto sui contributi totali)">
                                    <i class="bi bi-trash small"></i>
                                </button>
                            </td>
                          </tr>`;
            });
        } else {
            html = '<tr><td colspan="6" class="text-center text-muted p-3">Nessun contributo/investimento registrato.</td></tr>';
        }
        logTableBody.innerHTML = html;
        // Setup listeners per pulsanti elimina
        setupContributionActionButtons();
    }
}

/** Aggiorna il display dell'allocazione PAC nella sezione Contributi */
function updatePacAllocationDisplay() {
    const displayElement = document.getElementById('pac-allocation-display');
    if (displayElement) {
        const allocation = appData.projections.pacTargetAllocation || {};
        const allocationString = Object.entries(allocation)
            .map(([key, value]) => `${appData.assets[key]?.name || key}: ${value}%`)
            .join(', ');
        displayElement.textContent = allocationString || 'Nessuna allocazione definita';
    }
}


/**
 * Aggiorna l'intera sezione "Spese".
 */
function updateExpensesSection() {
    const exp = appData.expenses;
    const budgetInput = document.getElementById('monthlyBudgetInput');
    const budget = typeof exp.budget === 'number' && !isNaN(exp.budget) ? exp.budget : 0;
    const spent = exp.spent; // Già calcolato da recalculateExpenseTotals
    const percentageSpent = budget > 0 ? (spent / budget) * 100 : 0; // Percentuale reale
    const progressBarPercentage = Math.min(percentageSpent, 100); // Max 100% per barra visiva
    const remaining = budget - spent;

    // Aggiorna campo input budget
    if (budgetInput) budgetInput.value = budget;

    // Aggiorna barra di progresso budget
    const progressBar = document.getElementById('expenses-budget-progress');
    const budgetSummary = document.getElementById('expenses-budget-summary');
    if (progressBar) {
        progressBar.style.width = `${progressBarPercentage}%`;
        progressBar.textContent = `${percentageSpent.toFixed(0)}%`; // Mostra % reale nel testo
        progressBar.setAttribute('aria-valuenow', percentageSpent); // Valore reale per accessibilità
        // Cambia colore barra in base alla percentuale REALE spesa
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (percentageSpent > 90) progressBar.classList.add('bg-danger');
        else if (percentageSpent > 70) progressBar.classList.add('bg-warning');
        else progressBar.classList.add('bg-success');
    }
     if (budgetSummary) {
         budgetSummary.textContent = `${formatCurrency(spent)} / ${formatCurrency(budget)}`;
     }

    // Aggiorna riepilogo budget (valori sotto)
    updateElement('expenses-spent-value', formatCurrency(spent));
    updateElement('expenses-budget-value', formatCurrency(budget));
    updateElement('expenses-remaining-value', formatCurrency(remaining), getPerformanceClass(remaining), ['text-danger', 'text-success', 'text-secondary']);

    // Aggiorna tabella spese per categoria
    const categoryTableBody = document.getElementById('expenses-category-table-body');
    if (categoryTableBody) {
        let html = '';
         let totalAmountCategories = 0;
         let totalPercentageCategories = 0;
        // Filtra categorie con importo > 0 e ordina per importo decrescente
        const categoriesWithExpenses = exp.categories.filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

        categoriesWithExpenses.forEach(cat => {
            const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(cat.color) ? 'text-dark' : 'text-white'; // Adatta colori testo per leggibilità badge
            html += `<tr>
                        <td><span class="badge ${textColor}" style="background-color:${cat.color};">${cat.name}</span></td>
                        <td>${formatCurrency(cat.amount)}</td>
                        <td class="text-end">${formatPercentage(cat.percentage)}</td>
                     </tr>`;
            totalAmountCategories += cat.amount;
            totalPercentageCategories += cat.percentage;
        });

        // Aggiungi riga totale se ci sono spese
        if (categoriesWithExpenses.length > 0) {
             html += `<tr class="table-light fw-bold">
                         <td>Totale</td>
                         <td>${formatCurrency(totalAmountCategories)}</td>
                         <td class="text-end">${formatPercentage(totalPercentageCategories)}</td>
                      </tr>`;
        }

        categoryTableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Nessuna spesa registrata per questo mese.</td></tr>';
    }

    // Aggiorna tabella elenco spese
    const listTableBody = document.getElementById('expenses-list-table-body');
    if (listTableBody) {
        let html = '';
        // Ordina transazioni per data decrescente, poi ID
        exp.transactions.sort((a,b) => {
            try {
                const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                    if (dateB - dateA !== 0) return dateB - dateA;
                }
            } catch (e) { /* Ignora errore parsing */ }
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

    // Aggiorna testo contributo PAC usato
    const pacValueElement = document.getElementById('projection-pac-value');
    if (pacValueElement) {
        pacValueElement.textContent = formatCurrency(proj.monthlyContribution || 0);
    }

    if (lastIndex < 0) { // Nessuna proiezione calcolata
        // Pulisci tabelle se non ci sono dati
        const detailsTableBody = document.getElementById('projections-details-table-body');
        if(detailsTableBody) detailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione disponibile. Calcolo in corso o dati insufficienti.</td></tr>';
        const monthlyTableBody = document.getElementById('projections-monthly-table-body');
        if(monthlyTableBody) monthlyTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione mensile disponibile.</td></tr>';
        return;
    }

    // Aggiorna tabella dettagli proiezione (valore a fine periodo)
    const detailsTableBody = document.getElementById('projections-details-table-body');
    if (detailsTableBody) {
        let html = '';
         // Verifica che i dati di proiezione esistano e abbiano la lunghezza corretta
         const hasValidProjections = proj.total && proj.total.length > lastIndex &&
                                     proj.crypto && proj.crypto.length > lastIndex &&
                                     proj.etf && proj.etf.length > lastIndex &&
                                     proj.silver && proj.silver.length > lastIndex;

        if (!hasValidProjections) {
             html = '<tr><td colspan="5" class="text-center text-danger p-3">Errore: Dati di proiezione incompleti o non validi.</td></tr>';
        } else {
            const totalProjected = proj.total[lastIndex];
            const totalCurrent = appData.portfolio.totalValue;
            // Calcola crescita totale prevista in valore e percentuale
            const totalGrowthValue = totalProjected - totalCurrent;
            const totalGrowthPercentage = totalCurrent > 0 ? (totalGrowthValue / totalCurrent) * 100 : (totalProjected > 0 ? Infinity : 0); // Gestisci divisione per zero

            // Aggiungi righe per ogni asset
            for(const key in appData.assets){
                const asset = appData.assets[key];
                const projectedValue = proj[key][lastIndex] ?? 0; // Usa 0 se undefined
                const currentVal = asset.currentValue || 0;
                const assetGrowthValue = projectedValue - currentVal;
                const assetGrowthPercentage = asset.forecast || 0; // Usiamo il CAGR come riferimento % annuo

                html += `<tr>
                            <td class="ps-3">${asset.name}</td>
                            <td class="text-end">${formatCurrency(currentVal)}</td>
                            <td class="text-end">${formatCurrency(projectedValue)}</td>
                            <td class="text-end ${getPerformanceClass(assetGrowthValue)}">${formatCurrency(assetGrowthValue)}</td>
                            <td class="text-end pe-3 ${getPerformanceClass(assetGrowthPercentage)}">${formatPercentage(assetGrowthPercentage)}</td>
                         </tr>`;
            }
            // Aggiungi riga totale
            html += `<tr class="table-primary fw-bold">
                        <td class="ps-3">Totale Portafoglio</td>
                        <td class="text-end">${formatCurrency(totalCurrent)}</td>
                        <td class="text-end">${formatCurrency(totalProjected)}</td>
                        <td class="text-end ${getPerformanceClass(totalGrowthValue)}">${formatCurrency(totalGrowthValue)}</td>
                        <td class="text-end pe-3 ${getPerformanceClass(totalGrowthPercentage)}">${formatPercentage(totalGrowthPercentage)}</td>
                     </tr>`;
        }
        detailsTableBody.innerHTML = html;
    }

    // Aggiorna tabella proiezioni mensili
    const monthlyTableBody = document.getElementById('projections-monthly-table-body');
    if(monthlyTableBody){
        let html = '';
         // Verifica validità dati mensili
        const hasValidMonthlyData = proj.months && proj.months.length > lastIndex &&
                                   proj.crypto && proj.crypto.length > lastIndex &&
                                   proj.etf && proj.etf.length > lastIndex &&
                                   proj.silver && proj.silver.length > lastIndex &&
                                   proj.total && proj.total.length > lastIndex;

        if(!hasValidMonthlyData){
             html = '<tr><td colspan="5" class="text-center text-danger p-3">Errore: Dati di proiezione mensile incompleti o non validi.</td></tr>';
        } else {
            for (let i = 0; i <= lastIndex; i++) {
                const isLastRow = i === lastIndex;
                html += `<tr class="${isLastRow ? 'table-light fw-bold' : ''}">
                            <td class="ps-3">${proj.months[i]}</td>
                            <td class="text-end">${formatCurrency(proj.crypto[i])}</td>
                            <td class="text-end">${formatCurrency(proj.etf[i])}</td>
                            <td class="text-end">${formatCurrency(proj.silver[i])}</td>
                            <td class="text-end pe-3">${formatCurrency(proj.total[i])}</td>
                         </tr>`;
            }
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
        html += `<h4 class="text-danger mt-4 mb-3 fs-5"><i class="bi bi-exclamation-triangle-fill me-2"></i>Alert Attivi Recenti</h4>`;
        // Mostra solo i primi 3 alert più critici nel dashboard
         activeAlerts.slice(0, 3).forEach(alert => {
            let alertClass = 'alert-info'; let icon = 'bi-info-circle-fill';
            let textClass = 'text-dark'; // Default per info/light
            if(alert.type === 'Critico') { alertClass = 'alert-danger'; icon = 'bi-exclamation-triangle-fill'; textClass = 'text-white'; }
            if(alert.type === 'Avviso') { alertClass = 'alert-warning'; icon = 'bi-exclamation-circle-fill'; textClass = 'text-dark'; } // text-dark per warning

            html += `<div class="alert ${alertClass} ${textClass} alert-dismissible fade show d-flex align-items-center" role="alert" data-alert-id="${alert.id}">
                        <i class="bi ${icon} flex-shrink-0 me-2"></i>
                        <small class="flex-grow-1">${alert.message}</small>
                        <button type="button" class="btn-close ${textClass === 'text-white' ? 'btn-close-white' : ''} dismiss-alert" data-bs-dismiss="alert" aria-label="Close" title="Ignora questo alert"></button>
                     </div>`;
        });
         // Aggiungi un link per vedere tutti gli alert se ce ne sono più di 3
         if (activeAlerts.length > 3) {
             html += `<div class="text-center mt-2"><a href="#" class="btn btn-sm btn-outline-secondary" id="view-all-alerts-link">Vedi tutti gli alert (${activeAlerts.length})</a></div>`;
         }
         html += `<hr class="my-4">`; // Separatore dopo alert
    } else {
        // Non mostrare nulla se non ci sono alert (o un messaggio molto discreto)
         // html = '<p class="text-muted text-center mt-3 small">Nessun alert attivo. 👍</p>';
         html = ''; // Lascia vuoto se non ci sono alert
    }
    container.innerHTML = html;

    // Attacca listener per il pulsante "Vedi tutti" e per i dismiss
    setupDismissAlertButtons(); // Riattacca listener per i dismiss nel dashboard
    const viewAllLink = document.getElementById('view-all-alerts-link');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Simula click sulla tab Alert
            const alertTab = document.getElementById('alerts-tab');
             if (alertTab) {
                alertTab.click(); // Attiva il tab (la funzione showSection farà il resto)
            }
        });
    }
}


/**
 * Aggiorna la tabella delle ultime transazioni nel Dashboard (Spese e Investimenti).
 */
function updateDashboardTransactionsTable() {
    const tableBody = document.querySelector('#dashboard-transactions-table tbody');
    if (!tableBody) return;

    // Combina spese e investimenti, aggiungi tipo per distinguerli
    const recentExpenses = appData.expenses.transactions.map(tx => ({ ...tx, type: 'expense' }));
    const recentInvestments = appData.expenses.investmentTransactions.map(tx => ({ ...tx, type: 'investment' }));

    // Unisci e ordina per data decrescente (poi ID)
    const recentTransactions = [...recentExpenses, ...recentInvestments]
        .sort((a, b) => {
             try {
                 const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                 const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                 if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                      if (dateB - dateA !== 0) return dateB - dateA; // Ordina per data
                 }
             } catch(e){}
             // Fallback su ID se date uguali o non valide
             return (b.id || 0) - (a.id || 0);
        })
        .slice(0, 5); // Prendi solo le ultime 5

    let html = '';
    if (recentTransactions.length > 0) {
        recentTransactions.forEach(tx => {
            let categoryBadge = '';
            let amountClass = '';
            let amountValue = tx.amount;
            let description = tx.description || '-';
            let transactionTypeLabel = '';
            let typeIcon = '';

            if (tx.type === 'expense') {
                const category = appData.expenses.categories.find(c => c.name === tx.category);
                const catColor = category ? category.color : '#6c757d';
                const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(catColor) ? 'text-dark' : 'text-white';
                categoryBadge = `<span class="badge ${textColor}" style="background-color:${catColor};">${tx.category}</span>`;
                amountClass = 'text-danger'; // Spese in rosso
                transactionTypeLabel = 'Spesa';
                typeIcon = '<i class="bi bi-cart text-danger me-1 small" title="Spesa"></i>';
            } else if (tx.type === 'investment') {
                const asset = appData.assets[tx.assetType];
                const assetName = asset ? asset.name : tx.assetType;
                const assetColor = asset ? asset.color : '#6c757d';
                const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(assetColor) ? 'text-dark' : 'text-white';
                categoryBadge = `<span class="badge ${textColor}" style="background-color:${assetColor};">${assetName}</span>`;
                amountClass = 'text-success'; // Investimenti in verde
                transactionTypeLabel = 'Invest.'; // Abbreviato per spazio
                 typeIcon = '<i class="bi bi-graph-up-arrow text-success me-1 small" title="Investimento"></i>';
            }

            html += `<tr>
                        <td class="ps-3">${tx.date || 'N/A'}</td>
                        <td>${typeIcon}${transactionTypeLabel}</td>
                        <td>${categoryBadge}</td>
                        <td>${description}</td>
                        <td class="${amountClass} text-end pe-3">${formatCurrency(amountValue)}</td>
                     </tr>`;
        });
    } else {
        html = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna transazione recente registrata.</td></tr>';
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
            html = '<p class="text-center text-muted p-3">Nessun alert attivo al momento. Tutto sotto controllo! 👍</p>';
        } else {
            activeAlerts.forEach(alert => {
                let alertClass = 'alert-info'; let iconClass = 'bi-info-circle-fill';
                let textClass = 'text-dark';
                if (alert.type === 'Critico') { alertClass = 'alert-danger'; iconClass = 'bi-exclamation-triangle-fill'; textClass = 'text-white';}
                if (alert.type === 'Avviso') { alertClass = 'alert-warning'; iconClass = 'bi-exclamation-circle-fill'; textClass = 'text-dark';} // text-dark per warning
                const buttonClass = alertClass.includes('alert-danger') ? 'btn-outline-danger' : (alertClass.includes('alert-warning') ? 'btn-outline-warning' : 'btn-outline-info');

                html += `<div class="alert ${alertClass} ${textClass} d-flex justify-content-between align-items-center" role="alert" data-alert-id="${alert.id}">
                            <div>
                                <i class="bi ${iconClass} me-2"></i>
                                <strong>${alert.type}:</strong> ${alert.message} <small class="text-muted opacity-75">(${alert.date})</small>
                            </div>
                            <button class="btn btn-sm ${buttonClass} dismiss-alert ms-2" data-alert-id="${alert.id}" title="Ignora questo alert">
                                <i class="bi bi-x-circle me-1"></i> Ignora
                            </button>
                         </div>`;
            });
        }
        activeListContainer.innerHTML = html;
        setupDismissAlertButtons(); // Riattacca listener dopo aver aggiornato HTML
    }

    const historyTableBody = document.getElementById('alerts-history-table-body');
    if (historyTableBody) {
        let html = '';
        // Combina attivi e storico per la tabella completa, ordina per ID decrescente
        const combinedAlerts = [...appData.alerts.active, ...appData.alerts.history]
             .sort((a, b) => {
                  // Prova a ordinare per data prima, poi ID
                  try {
                      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                      if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                          if (dateB - dateA !== 0) return dateB - dateA;
                      }
                  } catch(e){}
                  return (b.id || 0) - (a.id || 0); // Fallback su ID
             });


        if (combinedAlerts.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted p-3">Nessuna cronologia alert disponibile.</td></tr>';
        } else {
             combinedAlerts.forEach(alert => {
                let typeBadgeClass='bg-secondary', statusBadgeClass='bg-secondary';
                let typeTextClass='text-white', statusTextClass='text-white';
                // Colori Tipo
                if(alert.type==='Critico') { typeBadgeClass='bg-danger'; }
                else if(alert.type==='Avviso') { typeBadgeClass='bg-warning'; typeTextClass='text-dark'; }
                else if(alert.type==='Info') { typeBadgeClass='bg-info'; typeTextClass='text-dark'; }
                // Colori Stato
                if(alert.status==='Attivo') { statusBadgeClass='bg-warning'; statusTextClass='text-dark'; }
                else if(alert.status==='Risolto' || alert.status==='Ignorato') { statusBadgeClass='bg-success'; }

                html += `<tr>
                            <td class="ps-3">${alert.date}</td>
                            <td><span class="badge ${typeBadgeClass} ${typeTextClass}">${alert.type}</span></td>
                            <td>${alert.message}</td>
                            <td class="pe-3"><span class="badge ${statusBadgeClass} ${statusTextClass}">${alert.status}</span></td>
                         </tr>`;
             });
        }
        historyTableBody.innerHTML = html;
    }
}

/**
 * Aggiorna la sezione Profilo Utente con i dati da appData.profile
 */
function updateProfileSection() {
    const profile = appData.profile;
    const usernameInput = document.getElementById('profileUsername');
    const emailInput = document.getElementById('profileEmail');
    const sidebarUsername = document.getElementById('sidebar-username');

    if (usernameInput) usernameInput.value = profile.username || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (sidebarUsername) sidebarUsername.textContent = profile.username || 'Utente';
    // Nota: Valuta e Tema sono disabilitati nell'HTML, quindi non c'è bisogno di aggiornarli dinamicamente qui
}


// --- CHART FUNCTIONS ---

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
            // console.log(`Grafico ${chartId} aggiornato.`); // DEBUG
        } catch (error) {
            console.error(`Errore durante l'aggiornamento del grafico ${chartId}:`, error);
            // Prova a distruggere e ricreare in caso di errore grave
            destroyChart(chartId);
            try {
                 charts[chartId] = new Chart(context, chartConfig);
                 console.log(`Grafico ${chartId} ricreato dopo errore update.`); // DEBUG
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
            // console.log(`Grafico ${chartId} creato.`); // DEBUG
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
            // console.log(`Grafico ${chartId} distrutto.`); // DEBUG
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
            borderColor: getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '#ffffff', // Usa colore sfondo body per bordo
            borderWidth: 2 // Bordo più spesso per separare meglio
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

    // --- Grafico Andamento Previsto (Dashboard - basato su PROIEZIONE) ---
    initOrUpdateChart('performanceChart', { // ID HTML è 'performanceChart'
        type: 'line',
        data: {
            labels: appData.projections.months, // Usa mesi calcolati
            datasets: [{
                label: `Valore Totale Previsto (PAC ${formatCurrency(appData.projections.monthlyContribution || 0)}/mese)`,
                data: appData.projections.total,
                borderColor: '#0d6efd', // Blu primario
                backgroundColor: 'rgba(13, 110, 253, 0.1)', // Sfumatura blu
                fill: true,
                tension: 0.3 // Leggera curvatura
            }]
        },
        options: commonChartOptions('line', 'Andamento Previsto Totale', true) // Mostra titolo e assi
    });

    // --- Grafici Specifici per Asset (Allocazione interna e Proiezione Valore) ---
    // Questi grafici non sono più visibili nell'HTML attuale (mancano sezioni dedicate)
    // Se si volessero riattivare, bisognerebbe creare le sezioni HTML e i canvas
    /*
    if (appData.assets.crypto.allocation && appData.assets.crypto.allocation.length > 0) { ... }
    if (appData.assets.etf.allocation && appData.assets.etf.allocation.length > 0) { ... }
    */

    // --- Grafico Spese per Categoria ---
    const expenseCategories = appData.expenses.categories.filter(c => c.amount > 0); // Solo categorie con spese
    const expenseData = {
        labels: expenseCategories.map(c => c.name),
        datasets: [{
            data: expenseCategories.map(c => c.amount),
            backgroundColor: expenseCategories.map(c => c.color),
            borderColor: getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '#ffffff',
            borderWidth: 2
        }]
    };
    initOrUpdateChart('expenseCategoryChart', {
        type: 'doughnut',
        data: expenseData,
        options: commonChartOptions('doughnut', null, false, true) // No titolo, no assi, tooltip con %
    });

    // --- Grafico Proiezione Totale (con dettaglio asset) ---
    initOrUpdateChart('totalProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                // Linea principale (Totale)
                { label: 'Totale Previsto', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3, borderWidth: 2, order: 1 },
                // Linee tratteggiate per singoli asset (solo se ci sono dati proiettati)
                ...(appData.projections.crypto && appData.projections.crypto.length > 0 ? [{ label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 2 }] : []),
                ...(appData.projections.etf && appData.projections.etf.length > 0 ? [{ label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 3 }] : []),
                ...(appData.projections.silver && appData.projections.silver.length > 0 ? [{ label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 4 }] : [])
            ]
        },
        options: commonChartOptions('line', null, true) // Mostra assi, no titolo qui
    });
    console.log("📊 Grafici Aggiornati.");
}

/**
 * Restituisce un oggetto di opzioni comuni per i grafici Chart.js.
 */
function commonChartOptions(type, title = null, showAxes = false, tooltipValuePercentage = false) {
    // Determina colore testo default in base allo sfondo del body (per dark mode)
     const bodyBgColor = getComputedStyle(document.body).backgroundColor;
     // Funzione semplice per determinare se un colore è scuro
     const isDark = (color) => {
         const rgb = color.match(/\d+/g);
         if (!rgb || rgb.length < 3) return false; // Fallback se non riesce a leggere colore
         const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
         return brightness < 128;
     };
     const defaultFontColor = isDark(bodyBgColor) ? 'rgba(255, 255, 255, 0.8)' : '#495057';
     const gridColor = isDark(bodyBgColor) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';


    const options = {
        responsive: true,
        maintainAspectRatio: false, // Fondamentale per sizing corretto in container
        plugins: {
            legend: {
                position: (type === 'pie' || type === 'doughnut') ? 'bottom' : 'top',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 11 },
                    color: defaultFontColor // Colore legenda
                }
            },
            title: {
                display: !!title, // Mostra solo se title non è null/vuoto
                text: title,
                padding: { top: 10, bottom: (type === 'line' || type === 'bar') ? 5 : 15 }, // Meno spazio sotto per grafici con assi X
                font: { size: 14, weight: '500' }, // Titolo leggermente più piccolo
                color: defaultFontColor // Colore titolo
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)', // Sfondo tooltip più scuro
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                titleColor: '#fff', // Colore titolo tooltip
                bodyColor: '#fff', // Colore corpo tooltip
                padding: 10,
                cornerRadius: 4,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || context.label || '';
                        if (label) { label += ': '; }
                        const value = context.raw; // Valore numerico grezzo

                        if (typeof value !== 'number' || isNaN(value)) {
                            return label + (value || ''); // Mostra valore non numerico o stringa vuota
                        }

                        // Formattazione standard come valuta
                        label += formatCurrency(value);

                        // Aggiungi percentuale per Pie/Doughnut se richiesto
                        if (tooltipValuePercentage && (type === 'pie' || type === 'doughnut')) {
                            const dataArray = context.dataset.data;
                            // Calcola totale solo se necessario e se dataArray è valido
                            if (Array.isArray(dataArray)) {
                                const total = dataArray.reduce((sum, current) => sum + (typeof current === 'number' && !isNaN(current) ? current : 0), 0);
                                if (total > 0) {
                                    const percentage = (value / total) * 100;
                                    label += ` (${formatPercentage(percentage)})`;
                                }
                            }
                        }
                        return label;
                    }
                }
            }
        },
        // Configurazione Assi (solo se showAxes è true)
        scales: (!showAxes || type === 'pie' || type === 'doughnut') ? {} : {
            y: {
                display: true,
                beginAtZero: false, // Non forzare inizio a zero per performance/valori
                ticks: {
                    callback: value => formatCurrency(value), // Formatta valori asse Y
                    font: { size: 10 }, // Font più piccolo per assi
                    maxTicksLimit: 6, // Limita numero etichette Y
                    color: defaultFontColor // Colore etichette Y
                },
                grid: {
                    color: gridColor // Colore griglia Y
                },
                 border: { // Colore asse Y
                    color: gridColor
                }
            },
            x: {
                display: true,
                ticks: {
                    font: { size: 10 }, // Font più piccolo per assi
                    maxRotation: 0, // Evita rotazione etichette X
                    autoSkip: true, // Salta etichette se troppe
                    maxTicksLimit: 10, // Limita numero etichette X (es. per mesi)
                    color: defaultFontColor // Colore etichette X
                },
                grid: {
                    display: false // Nascondi griglia X
                },
                 border: { // Colore asse X
                    color: gridColor
                }
            }
        },
        // Opzioni specifiche per tipo
        ...(type === 'line' && {
            interaction: { mode: 'index', intersect: false }, // Tooltip su hover colonna
            hover: { mode: 'nearest', intersect: true },
            elements: {
                 point: { radius: 0, hoverRadius: 5 }, // Nascondi punti, mostra su hover
                 line: { borderWidth: 2 } // Spessore linea
            }
        }),
        ...(type === 'doughnut' && {
             cutout: '65%' // Dimensione foro ciambella
        }),
        ...(type === 'pie' && {
             cutout: '0%' // Nessun foro per Pie
        }),
    };
    return options;
}


// --- PDF EXPORT ---

/**
 * Genera una stringa HTML formattata con stili inline per il report PDF.
 * @returns {string} La stringa HTML del report.
 */
function generatePdfHtmlReport() {
    const { portfolio, assets, expenses, projections, profile } = appData;
    const today = new Date().toLocaleDateString('it-IT');
    const currentYear = new Date().getFullYear();

    // Funzione helper per creare tabelle HTML con stili inline
    const createTable = (headers, rows, footerRow = null, options = {colAlign:[]}) => {
        // Stili comuni per celle e tabella
        const thStyle = "border:1px solid #ccc; padding:5px 7px; background-color:#f0f0f0; text-align:left; font-weight:bold; font-size:9.5px; white-space:nowrap;";
        const tdStyleBase = "border:1px solid #ccc; padding:5px 7px; font-size:9.5px;";
        const tableStyle = "width:100%; border-collapse:collapse; margin-bottom:16px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#333;";
        const footerStyleBase = "border:1px solid #ccc; padding:6px 7px; background-color:#e9ecef; font-weight:bold; font-size:10px;";

        // Crea intestazioni tabella
        let tableHeaders = headers.map((h, index) => {
             let align = options.colAlign?.[index] || 'left'; // Usa allineamento specificato o default left
             // Sovrascrivi se è un header numerico tipico
             if (typeof h === 'string' && (h.includes('Valore') || h.includes('Importo') || h.includes('(%)') || h.includes('Previsto') || h.includes('€)') || h.includes('%') )) {
                align = 'right';
            }
             return `<th style="${thStyle} text-align:${align};">${h}</th>`
            }).join('');

        // Crea righe tabella
        let tableRows = rows.map(row => {
            let cells = row.map((cellValue, index) => {
                let cellStyle = tdStyleBase;
                let formattedValue = cellValue;
                let performanceClass = ''; // Per colore testo performance
                 let align = options.colAlign?.[index] || 'left';

                // Logica di allineamento e formattazione
                if (typeof cellValue === 'number' && !isNaN(cellValue)) {
                    align = 'right'; // Allinea numeri a destra
                    const headerText = headers[index]?.toLowerCase() || '';
                    if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('previsione') || headerText.includes('perc.') || headerText.includes('cagr') || headerText.includes('(%)')) {
                        formattedValue = formatPercentage(cellValue);
                         performanceClass = getPerformanceClass(cellValue); // Ottieni classe colore
                    } else {
                        formattedValue = formatCurrency(cellValue);
                    }
                } else if (typeof cellValue === 'string' && (cellValue.startsWith('€') || cellValue.endsWith('%'))) {
                     align = 'right'; // Allinea valute/percentuali pre-formattate a destra
                     if(cellValue.endsWith('%')){
                        // Prova a estrarre il numero per colorare
                        try {
                            const numericPart = parseFloat(cellValue.replace('%', '').replace('.', '').replace(',', '.'));
                            if(!isNaN(numericPart)) performanceClass = getPerformanceClass(numericPart);
                        } catch(e){}
                     }
                }

                // Applica allineamento
                 cellStyle += `text-align:${align};`;

                 // Applica colore performance se necessario
                 if (performanceClass === 'text-success') cellStyle += 'color:#198754; font-weight:500;';
                 else if (performanceClass === 'text-danger') cellStyle += 'color:#dc3545; font-weight:500;';
                 // else if (performanceClass === 'text-secondary') cellStyle += 'color:#6c757d;';


                return `<td style="${cellStyle}">${formattedValue === null || formattedValue === undefined ? '-' : formattedValue}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        // Aggiungi riga footer se presente
        let tableFooter = '';
        if (footerRow) {
            let footerCells = footerRow.map((cellValue, index) => {
                let cellStyle = footerStyleBase;
                let formattedValue = cellValue;
                let performanceClass = '';
                 let align = options.colAlign?.[index] || 'left';

                if (typeof cellValue === 'number' && !isNaN(cellValue)) {
                    align = 'right';
                     const headerText = headers[index]?.toLowerCase() || '';
                    if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('previsione') || headerText.includes('perc.') || headerText.includes('cagr') || headerText.includes('(%)')) {
                        formattedValue = formatPercentage(cellValue);
                        performanceClass = getPerformanceClass(cellValue);
                    } else {
                        formattedValue = formatCurrency(cellValue);
                    }
                } else if (typeof cellValue === 'string' && (cellValue.startsWith('€') || cellValue.endsWith('%'))) {
                     align = 'right';
                     if(cellValue.endsWith('%')){
                        try { const numericPart = parseFloat(cellValue.replace('%','').replace('.','').replace(',','.')); if(!isNaN(numericPart)) performanceClass = getPerformanceClass(numericPart); } catch(e){}
                     }
                }

                 cellStyle += `text-align:${align};`;
                if (performanceClass === 'text-success') cellStyle += 'color:#198754;';
                else if (performanceClass === 'text-danger') cellStyle += 'color:#dc3545;';
                // else if (performanceClass === 'text-secondary') cellStyle += 'color:#6c757d;';


                return `<td style="${cellStyle}">${formattedValue === null || formattedValue === undefined ? '-' : formattedValue}</td>`;
            }).join('');
            tableFooter = `<tfoot><tr>${footerCells}</tr></tfoot>`;
        }

        return `<table style="${tableStyle}"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody>${tableFooter}</table>`;
    };

    // Costruzione corpo HTML del report
    let html = `<div style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; margin:20px; color:#333;">
                    <h1 style="text-align:center; color:#0d6efd; border-bottom:2px solid #0d6efd; padding-bottom:10px; font-size:22px; font-weight:500;">Report Finanziario Personale</h1>
                    <p style="text-align:center; font-size:11px; margin-bottom:25px;">Utente: ${profile.username || 'N/D'} | Generato il: ${today}</p>

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Riepilogo Patrimonio</h2>
                    ${createTable(
                        ['Descrizione', 'Valore'],
                        [
                            ['Valore Totale Attuale', portfolio.totalValue],
                            ['Contributi Totali Versati', portfolio.totalContributions],
                            ['Performance Totale', portfolio.totalPerformance]
                        ], null, {colAlign: ['left', 'right']}
                    )}

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Allocazione Asset</h2>
                    ${createTable(
                        ['Asset', 'Valore Attuale', 'Allocazione (%)'],
                        Object.values(assets).sort((a,b) => (b.currentValue || 0) - (a.currentValue || 0)).map(a => [
                            a.name,
                            a.currentValue || 0,
                            portfolio.totalValue > 0 ? ((a.currentValue || 0) / portfolio.totalValue) * 100 : 0
                        ]),
                        // Riga Totale Allocazione
                        ['Totale', portfolio.totalValue, 100],
                        {colAlign: ['left', 'right', 'right']}
                    )}

                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dettaglio Asset</h2>`;

    // Aggiungi sezione dettaglio per ogni asset
    for (const key in assets) {
        const asset = assets[key];
        html += `<h3 style="color:${asset.color}; margin-top:20px; margin-bottom:8px; font-size:14px;">${asset.name}</h3>
                 ${createTable(
                     ['Metrica', 'Valore'],
                     [
                         ['Valore Attuale', asset.currentValue || 0],
                         ['Contributi Versati', asset.contributedValue || 0],
                         ['Performance', asset.performance],
                         ['Prev. Crescita Annua (CAGR)', asset.forecast]
                     ], null, {colAlign: ['left', 'right']}
                 )}`;
        // Aggiungi tabella composizione se presente (Crypto/ETF)
        if (asset.allocation && asset.allocation.length > 0) {
            html += `<h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Composizione ${asset.name}:</h4>`;
            if (key === 'crypto') {
                html += createTable(['Nome', 'Alloc. (%)', 'Valore (€)'], asset.allocation.sort((a,b) => (b.value||0) - (a.value||0)).map(i => [i.name, i.percentage, i.value]), null, {colAlign:['left', 'right', 'right']});
            } else if (key === 'etf') {
                 // Per ETF, mostriamo Nome, Previsione Annua (%), Valore
                html += createTable(['Nome ETF', 'Prev. Annua (%)', 'Valore (€)'], asset.allocation.sort((a,b) => (b.value||0) - (a.value||0)).map(i => [i.name, i.forecast, i.value]), null, {colAlign:['left', 'right', 'right']});
            }
        }
    }

    // Sezione Spese
    const remainingBudget = (expenses.budget || 0) - (expenses.spent || 0);
    const budgetUsagePercentage = (expenses.budget || 0) > 0 ? ((expenses.spent || 0) / expenses.budget) * 100 : 0;
    html += `<div style="page-break-before: always;"></div> <!-- Interruzione di pagina prima delle Spese -->
             <h2 style="color:#198754; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Gestione Spese Mensili</h2>
             ${createTable(
                 ['Descrizione', 'Valore'],
                 [
                     ['Budget Mensile Impostato', expenses.budget || 0],
                     ['Totale Speso nel Mese', expenses.spent || 0],
                     ['Budget Rimanente', remainingBudget],
                     ['Utilizzo Budget', budgetUsagePercentage]
                 ], null, {colAlign: ['left', 'right']}
             )}
             <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Spese per Categoria:</h4>
             ${createTable(
                 ['Categoria', 'Importo Speso', 'Percentuale (%)'],
                 expenses.categories.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).map(c => [c.name, c.amount, c.percentage]),
                 // Riga Totale Spese Categoria
                 ['Totale Speso', expenses.spent, expenses.spent > 0 ? 100 : 0],
                 {colAlign: ['left', 'right', 'right']}
             )}
             <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Ultime Spese Registrate (max 15):</h4>
             ${createTable(
                 ['Data', 'Categoria', 'Descrizione', 'Importo'],
                 expenses.transactions.slice(0, 15).map(t => [t.date, t.category, t.description, t.amount]), null, {colAlign:['left', 'left', 'left', 'right']} // Mostra importi spesa come positivi per coerenza tabella
             )}`;

     // Sezione Contributi / Investimenti Log
     if(expenses.investmentTransactions && expenses.investmentTransactions.length > 0) {
         html += `<h2 style="color:#6f42c1; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Cronologia Investimenti/Contributi</h2>
                  <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Ultimi Contributi Registrati (max 15):</h4>
                  ${createTable(
                      ['Data', 'Asset', 'Descrizione', 'Importo'],
                      expenses.investmentTransactions.slice(0, 15).map(t => [
                          t.date,
                          assets[t.assetType]?.name || t.assetType,
                          t.description || '-',
                          t.amount
                          ]), null, {colAlign: ['left', 'left', 'left', 'right']}
                  )}`;
     }


    // Sezione Proiezioni (se presenti)
    const lastProjectionIndex = projections.months.length - 1;
    if (lastProjectionIndex >= 0 && projections.total && projections.total.length > lastProjectionIndex) {
        const hasValidProjections = projections.total && projections.total.length > lastIndex &&
                                     projections.crypto && projections.crypto.length > lastIndex &&
                                     projections.etf && projections.etf.length > lastIndex &&
                                     projections.silver && projections.silver.length > lastIndex;

        if(hasValidProjections) {
            const totalProjected = projections.total[lastProjectionIndex];
            const totalCurrent = portfolio.totalValue;
            const totalGrowthValue = totalProjected - totalCurrent;
            const totalGrowthPercentage = totalCurrent > 0 ? (totalGrowthValue / totalCurrent) * 100 : (totalProjected > 0 ? Infinity : 0);
            const projectionEndDate = projections.months[lastProjectionIndex];

            html += `<div style="page-break-before: always;"></div> <!-- Interruzione di pagina prima delle Proiezioni -->
                     <h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2>
                     <p style="font-size:10px; margin-bottom:15px;">Stima del valore del portafoglio fino a <strong>${projectionEndDate}</strong>, considerando un contributo mensile PAC di <strong>${formatCurrency(projections.monthlyContribution || 0)}</strong> e i tassi di crescita (CAGR) indicati.</p>
                     ${createTable(
                         ['Asset / Totale', 'Valore Attuale', 'Valore Previsto', 'Crescita (€)', 'CAGR (%)'],
                         [
                             // Righe per ogni asset
                             ...Object.entries(assets).map(([key, asset]) => [
                                 asset.name,
                                 asset.currentValue || 0,
                                 projections[key]?.[lastProjectionIndex] ?? 0, // Valore proiettato
                                 (projections[key]?.[lastProjectionIndex] ?? 0) - (asset.currentValue || 0), // Crescita in valore
                                 asset.forecast // CAGR annuo usato per la proiezione
                             ]),
                         ],
                         // Footer per il totale
                          ['Totale Portafoglio', totalCurrent, totalProjected, totalGrowthValue, totalGrowthPercentage],
                           {colAlign: ['left', 'right', 'right', 'right', 'right']}
                     )}`;
        } else {
            html += `<h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2>
                  <p style="font-size:10px; color:#6c757d;">Dati di proiezione incompleti o non validi.</p>`;
        }
    } else {
         html += `<h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2>
                  <p style="font-size:10px; color:#6c757d;">Dati di proiezione non disponibili o non calcolati.</p>`;
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
      margin:       [12, 10, 15, 10], // Margini [top, left, bottom, right] in mm
      filename:     `Report_Finanziario_${appData.profile.username.replace(/\s+/g, '_') || 'Utente'}_${new Date().toISOString().slice(0,10)}.pdf`, // Nome file con username
      image:        { type: 'jpeg', quality: 0.98 }, // Qualità immagini (se presenti)
      html2canvas:  { scale: 2, useCORS: true, logging: false, dpi: 192, letterRendering: true }, // Opzioni rendering HTML (aumentato dpi)
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }, // Opzioni PDF
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } // Modalità gestione interruzioni pagina
    };

    // Mostra notifica di avvio
    showNotification('Generazione PDF in corso... ⏳', 'info', 10000); // Aumenta durata notifica

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

/**
 * Imposta la logica di navigazione tra le schede (Dashboard, Investimenti, ecc.).
 */
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]'); // Seleziona link sidebar e mobile
    const contentSections = document.querySelectorAll('.content-section'); // Seleziona tutte le sezioni di contenuto

    // Funzione per mostrare una sezione e aggiornare lo stato attivo dei link
    window.showSection = (targetContentId) => { // Rendi globale per accesso da altre parti (es. view all alerts)
        // Nascondi tutte le sezioni
        contentSections.forEach(section => section.classList.add('d-none'));
        // Mostra la sezione target (se esiste)
        const targetSection = document.getElementById(targetContentId);
        if (targetSection) {
            targetSection.classList.remove('d-none');
        } else {
            console.warn(`Sezione contenuto non trovata: ${targetContentId}, mostro Dashboard.`);
            // Fallback: mostra dashboard se la sezione richiesta non esiste
            document.getElementById('dashboard-content')?.classList.remove('d-none');
            targetContentId = 'dashboard-content'; // Aggiorna ID per stato attivo link
        }

        // Aggiorna stato 'active' per tutti i link di navigazione (sidebar e mobile)
        tabLinks.forEach(link => {
            // Determina a quale contenuto corrisponde questo link
            // Gestisce sia link normali che mobile
            const linkTargetId = link.id.replace('mobile-', '').replace('-tab', '-content');
            const isActive = (linkTargetId === targetContentId);

            link.classList.toggle('active', isActive); // Imposta/rimuove classe 'active'

            // Per la sidebar, gestisci anche colore testo
            if (link.closest('.sidebar')) {
                 link.classList.toggle('text-white', !isActive); // Bianco se non attivo (default sidebar)
                 if (isActive) link.classList.remove('text-white'); // Rimuovi text-white se attivo (usa stile .active)
            }
            // Per la navbar mobile, lo stato active è gestito da BS
        });
        // console.log(`Visualizzata sezione: ${targetContentId}`); // Debug log
    }

    // Aggiungi event listener a ciascun link di navigazione
    tabLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Impedisce navigazione default del link '#'
            const targetContentId = link.id.replace('mobile-', '').replace('-tab', '-content');
            window.showSection(targetContentId);

            // Chiudi la navbar mobile se è aperta (su schermi piccoli)
            const mobileNavbarCollapse = document.querySelector('.navbar-collapse.show');
            if (mobileNavbarCollapse) {
                // Usa l'API di Bootstrap 5 per chiudere il collapse
                 const bsCollapse = bootstrap.Collapse.getInstance(mobileNavbarCollapse);
                 if (bsCollapse) {
                     bsCollapse.hide();
                 }
            }
        });
    });

    // Mostra la sezione Dashboard all'avvio
    window.showSection('dashboard-content');
}

/**
 * Imposta gli event listener e la logica per tutte le finestre modali.
 */
function setupModals() {
    // --- Modale Modifica Asset (Crypto, ETF, Silver) ---
    const editAssetModalElement = document.getElementById('editAssetModal');
    if (editAssetModalElement) {
        const editAssetModal = new bootstrap.Modal(editAssetModalElement);
        // Listener per i pulsanti "Modifica" nelle card Investimenti
        document.querySelectorAll('#investments-content .edit-asset').forEach(button => {
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
            if (isNaN(currentValue) || isNaN(contributedValue) || currentValue < 0 || contributedValue < 0) {
                showNotification('Errore: Inserisci valori numerici validi (>= 0) per Valore e Contributi.', 'danger');
                return;
            }
             if (isNaN(growthForecast)) {
                 showNotification('Errore: Inserisci un valore numerico valido per la Previsione.', 'danger');
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

        // Funzione per popolare il dropdown delle categorie
        function populateCategorySelect() {
             if (expenseCategorySelect) {
                // Trova la categoria selezionata prima di svuotare (per mantenerla se possibile)
                const previouslySelected = expenseCategorySelect.value;
                expenseCategorySelect.innerHTML = appData.expenses.categories
                    .map(c => `<option value="${c.name}">${c.name}</option>`)
                    .join('');
                 // Reimposta la selezione precedente se ancora valida
                 if (appData.expenses.categories.some(c => c.name === previouslySelected)) {
                     expenseCategorySelect.value = previouslySelected;
                 }
            }
        }
        populateCategorySelect(); // Popola all'inizio

        // Funzione per aprire il modale (chiamata da pulsanti "Aggiungi" o "Modifica")
        // La rendiamo globale (o accessibile) per poterla chiamare da diversi punti
        window.openAddExpenseModal = (expenseIdToEdit = null) => {
             expenseForm.reset(); // Pulisci il form
             populateCategorySelect(); // Ripopola/resetta categorie
             editingExpenseId = expenseIdToEdit; // Imposta l'ID se stiamo modificando

             if (editingExpenseId) {
                 // Modalità Modifica: trova la spesa e popola il form
                 const expense = appData.expenses.transactions.find(tx => tx.id === editingExpenseId);
                 if (expense) {
                     expenseModalTitle.textContent = 'Modifica Spesa';
                     expenseSubmitButton.textContent = 'Salva Modifiche';
                     document.getElementById('expenseDescription').value = expense.description;
                     document.getElementById('expenseAmount').value = expense.amount;
                     expenseCategorySelect.value = expense.category; // Imposta categoria dal dropdown
                     // Converte data 'dd/mm/yyyy' in 'yyyy-mm-dd' per input type="date"
                     try {
                         const dateParts = expense.date.split('/'); // [gg, mm, aaaa]
                         if (dateParts.length === 3) {
                            const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`;
                            document.getElementById('expenseDate').value = isoDate;
                         } else {
                            throw new Error('Formato data non valido');
                         }
                     } catch (e) {
                         console.error("Errore parsing data spesa per modifica:", e, "Data originale:", expense.date);
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

        // Listener per il pulsante principale "Aggiungi Spesa" (nella sezione Spese)
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
            const dateValue = document.getElementById('expenseDate').value; // Formato yyyy-mm-dd

            // Validazione input
            if (!description || isNaN(amount) || amount <= 0 || !category || !dateValue) {
                showNotification('Errore: Compila Descrizione, Importo (> 0), Categoria e Data.', 'danger');
                return;
            }
            // Convalida e formatta la data in dd/mm/yyyy
            let formattedDate;
            try {
                // Parsing robusto della data per evitare problemi fuso orario
                const [year, month, day] = dateValue.split('-');
                // Usa UTC per creare l'oggetto Date per evitare problemi di fuso orario
                const dateObject = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                if (isNaN(dateObject.getTime())) throw new Error('Data non valida');

                const formattedDay = String(dateObject.getUTCDate()).padStart(2, '0');
                const formattedMonth = String(dateObject.getUTCMonth() + 1).padStart(2, '0'); // Mesi sono 0-based
                const formattedYear = dateObject.getUTCFullYear();
                formattedDate = `${formattedDay}/${formattedMonth}/${formattedYear}`;
            } catch (e) {
                console.error("Errore conversione data:", e);
                showNotification('Errore: Data inserita non valida.', 'danger');
                return;
            }


            if (editingExpenseId) {
                // --- Modifica Spesa Esistente ---
                const expenseIndex = appData.expenses.transactions.findIndex(tx => tx.id === editingExpenseId);
                if (expenseIndex > -1) {
                    // Aggiorna l'oggetto spesa nell'array
                    appData.expenses.transactions[expenseIndex] = {
                        ...appData.expenses.transactions[expenseIndex], // Mantieni ID originale
                        description: description,
                        amount: amount,
                        category: category,
                        date: formattedDate
                    };
                    showNotification('Spesa modificata con successo! 👌', 'success');
                } else {
                    showNotification('Errore: Impossibile trovare la spesa da modificare.', 'danger');
                }
            } else {
                // --- Aggiungi Nuova Spesa ---
                const newExpense = {
                    id: Date.now(), // ID univoco basato sul timestamp
                    description: description,
                    amount: amount,
                    category: category,
                    date: formattedDate
                };
                // Aggiungi la nuova spesa all'inizio dell'array (più recenti prima)
                appData.expenses.transactions.unshift(newExpense);
                showNotification('Spesa aggiunta con successo! 💸', 'success');
            }

            updateUI(); // Aggiorna UI (ricalcola totali, aggiorna tabelle e grafici)
            addExpenseModal.hide(); // Chiudi il modale
            editingExpenseId = null; // Resetta ID modifica
        });
        // Chiama setup iniziale per i pulsanti modifica/elimina nella tabella spese
        setupExpenseActionButtons();
    } // Fine Modale Aggiungi/Modifica Spesa

    // --- Modale Aggiungi Categoria Spesa ---
    const addCategoryModalElement = document.getElementById('addCategoryModal');
    if (addCategoryModalElement) {
        const addCategoryModal = new bootstrap.Modal(addCategoryModalElement);
        // Listener per pulsante "Gestisci Categorie" nella sezione Spese
        document.getElementById('add-category-btn')?.addEventListener('click', () => {
            document.getElementById('addCategoryForm').reset(); // Pulisci form
            document.getElementById('newCategoryColor').value = '#adb5bd'; // Reset colore default
            addCategoryModal.show();
        });
        // Listener per pulsante "Aggiungi" (Salva Nuova Categoria)
        document.getElementById('saveNewCategory')?.addEventListener('click', () => {
            const name = document.getElementById('newCategoryName').value.trim();
            const color = document.getElementById('newCategoryColor').value;
            if (!name) {
                showNotification("Errore: Inserisci un nome per la nuova categoria.", "danger");
                return;
            }
            // Controlla se categoria esiste già (case insensitive)
            if (appData.expenses.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                showNotification(`Errore: La categoria "${name}" esiste già.`, "warning");
                return;
            }
            // Aggiungi nuova categoria
            appData.expenses.categories.push({ name: name, amount: 0, percentage: 0, color: color });
            // Aggiorna UI (in particolare il dropdown nel modale spesa e la tabella categorie)
            updateUI();
            addCategoryModal.hide();
            showNotification(`Categoria "${name}" aggiunta con successo!`, 'success');
        });
    } // Fine Modale Aggiungi Categoria

    // --- Modale Modifica Previsioni Crescita ---
    const editProjectionsModalElement = document.getElementById('editProjectionsModal');
    if (editProjectionsModalElement) {
        const editProjectionsModal = new bootstrap.Modal(editProjectionsModalElement);
        // Listener per pulsante "Modifica Previsioni"
        document.getElementById('edit-projections-btn')?.addEventListener('click', () => {
            // Popola il form con le previsioni attuali
            for(const key in appData.assets) {
                const input = document.getElementById(`${key}Growth`);
                if (input) input.value = appData.assets[key].forecast || 0;
            }
            editProjectionsModal.show();
        });
        // Listener per pulsante "Salva Previsioni"
        document.getElementById('saveProjections')?.addEventListener('click', () => {
            let isValid = true;
            let changesMade = false;
            // Leggi e valida i nuovi valori dal form
            for(const key in appData.assets){
                 const input = document.getElementById(`${key}Growth`);
                 if (input) {
                     const value = parseFloat(input.value);
                     if(isNaN(value)) {
                         isValid = false;
                         showNotification(`Errore: Valore previsione per ${appData.assets[key].name} non valido.`, 'danger');
                         break; // Esce al primo errore
                     } else {
                        if (appData.assets[key].forecast !== value) {
                             appData.assets[key].forecast = value; // Aggiorna il valore nel data store
                             changesMade = true;
                        }
                     }
                 }
            }
            if (isValid) {
                if(changesMade) {
                    updateUI(); // Ricalcola proiezioni e aggiorna UI solo se ci sono state modifiche
                    showNotification('Previsioni di crescita aggiornate! 📈', 'success');
                } else {
                    showNotification('Nessuna modifica alle previsioni rilevata.', 'info');
                }
                editProjectionsModal.hide();
            }
        });
    } // Fine Modale Modifica Previsioni

    // --- Modale Configurazione Alert ---
    const alertConfigModalElement = document.getElementById('editAlertsModal');
    if (alertConfigModalElement) {
        const alertConfigModal = new bootstrap.Modal(alertConfigModalElement);
        const alertConfigCard = document.getElementById('alerts-config-card'); // Card nella sezione Alert

        // Listener per pulsante "Configura Alert"
        document.getElementById('edit-alerts-btn')?.addEventListener('click', () => {
            const config = appData.alerts.config;
            try {
                // Popola il form nel modale con la configurazione corrente
                document.getElementById('alertPerformanceNegative').checked = config.performanceNegative.enabled;
                document.getElementById('thresholdPerformanceNegative').value = config.performanceNegative.threshold;
                document.getElementById('alertPerformancePositive').checked = config.performancePositive.enabled;
                document.getElementById('thresholdPerformancePositive').value = config.performancePositive.threshold;
                document.getElementById('alertAllocationImbalance').checked = config.allocationImbalance.enabled;
                document.getElementById('thresholdAllocationImbalance').value = config.allocationImbalance.threshold;
                document.getElementById('alertBudgetExceeded').checked = config.budgetExceeded.enabled;
                document.getElementById('thresholdBudgetExceeded').value = config.budgetExceeded.threshold;
                alertConfigModal.show(); // Mostra il modale
            } catch (e) {
                console.error("Errore nel popolare il form di configurazione alert:", e);
                showNotification("Errore: Impossibile caricare la configurazione alert.", "danger");
            }
        });

        // Listener per pulsante "Salva Configurazione" nel modale
        document.getElementById('save-alerts-config')?.addEventListener('click', () => {
            try {
                const config = appData.alerts.config;
                let changesMade = false;
                // Funzione helper per aggiornare e tracciare modifiche
                const updateConfig = (key, subkey, value, isCheckbox = false) => {
                    // Pulisci e valida valori numerici prima di confrontare/salvare
                    let parsedValue = value;
                    if (!isCheckbox) {
                        parsedValue = parseFloat(value);
                        if (isNaN(parsedValue)) {
                             // Gestisci errore valore non numerico
                             console.warn(`Valore non valido per ${key}.${subkey}: ${value}. Usato valore precedente.`);
                             showNotification(`Errore: valore per ${key}.${subkey} non valido. Modifica non salvata.`, 'warning');
                             return false; // Indica che non è stato possibile aggiornare
                        }
                    }
                    // Confronta con valore attuale e aggiorna solo se diverso
                    if (config[key][subkey] !== parsedValue) {
                        config[key][subkey] = parsedValue;
                        changesMade = true;
                    }
                    return true; // Aggiornamento riuscito (o nessun cambiamento necessario)
                };

                 let updateSuccess = true;
                // Leggi i valori dal form e aggiorna la configurazione
                 updateSuccess &= updateConfig('performanceNegative', 'enabled', document.getElementById('alertPerformanceNegative').checked, true);
                 updateSuccess &= updateConfig('performanceNegative', 'threshold', document.getElementById('thresholdPerformanceNegative').value);
                 updateSuccess &= updateConfig('performancePositive', 'enabled', document.getElementById('alertPerformancePositive').checked, true);
                 updateSuccess &= updateConfig('performancePositive', 'threshold', document.getElementById('thresholdPerformancePositive').value);
                 updateSuccess &= updateConfig('allocationImbalance', 'enabled', document.getElementById('alertAllocationImbalance').checked, true);
                 updateSuccess &= updateConfig('allocationImbalance', 'threshold', document.getElementById('thresholdAllocationImbalance').value);
                 updateSuccess &= updateConfig('budgetExceeded', 'enabled', document.getElementById('alertBudgetExceeded').checked, true);
                 updateSuccess &= updateConfig('budgetExceeded', 'threshold', document.getElementById('thresholdBudgetExceeded').value);


                 if (updateSuccess) { // Procedi solo se tutti gli aggiornamenti sono validi
                     if (changesMade) {
                        updateUI(); // Ricalcola alert e aggiorna UI
                        showNotification('Configurazione alert salvata! ⚙️', 'success');
                    } else {
                         showNotification('Nessuna modifica alla configurazione rilevata.', 'info');
                    }
                    alertConfigModal.hide();
                 }
                 // Se updateSuccess è false, una notifica di errore è già stata mostrata
            } catch (e) {
                 console.error("Errore nel salvare la configurazione alert:", e);
                 showNotification("Errore: Impossibile salvare la configurazione.", "danger");
            }
        });

        // Mostra la card di configurazione nella sezione Alert solo se il modal esiste
        if (alertConfigCard) alertConfigCard.style.display = 'block';

    } else {
        // Se il modal di configurazione non esiste nell'HTML, rimuovi il pulsante "Configura Alert"
        document.getElementById('edit-alerts-btn')?.remove();
        // Nascondi la card di configurazione nella sezione Alert
        const alertConfigCard = document.getElementById('alerts-config-card');
        if (alertConfigCard) alertConfigCard.style.display = 'none';
    } // Fine Modale Configurazione Alert

    // --- Modale Aggiungi Transazione (Scelta: Investimento o Spesa) ---
    const addTransactionModalElement = document.getElementById('addTransactionModal');
    if (addTransactionModalElement) {
        const addTransactionModal = new bootstrap.Modal(addTransactionModalElement);
        // Listener per pulsante "Aggiungi" nel header Dashboard
        document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
            addTransactionModal.show();
        });
    } // Fine Modale Aggiungi Transazione

    // --- Modale Aggiungi Investimento / Contributo PAC ---
    const addInvestmentModalElement = document.getElementById('addInvestmentModal');
    if (addInvestmentModalElement) {
        const addInvestmentModal = new bootstrap.Modal(addInvestmentModalElement);
        const addInvestmentForm = document.getElementById('addInvestmentForm');
        const investmentAssetSelect = document.getElementById('investmentAsset');

        // Popola select asset (utile se si aggiungessero asset dinamicamente)
        if (investmentAssetSelect) {
             investmentAssetSelect.innerHTML = '<option value="" disabled selected>-- Seleziona Asset --</option>' +
                 Object.keys(appData.assets).map(key => `<option value="${key}">${appData.assets[key].name}</option>`).join('');
        }

        // Funzione per aprire il modale
        window.openAddInvestmentModal = () => {
             addInvestmentForm.reset(); // Pulisci form
             document.getElementById('investmentDate').valueAsDate = new Date(); // Imposta data a oggi
             // Ripopola il select in caso di modifiche agli asset (non previsto ma sicuro)
             investmentAssetSelect.innerHTML = '<option value="" disabled selected>-- Seleziona Asset --</option>' +
                 Object.keys(appData.assets).map(key => `<option value="${key}">${appData.assets[key].name}</option>`).join('');
             addInvestmentModal.show(); // Mostra modale investimento
        };

        // Listener per pulsante "Investimento" nel modale Scelta Transazione
        document.getElementById('addInvestmentBtn')?.addEventListener('click', () => {
            bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); // Chiudi modale scelta
            window.openAddInvestmentModal(); // Apri modale investimento
        });

        // Listener per pulsante "Aggiungi Contributo" nella sezione PAC
         document.getElementById('add-contribution-btn')?.addEventListener('click', () => {
             window.openAddInvestmentModal(); // Apre lo stesso modale di aggiunta investimento
         });

        // Listener per pulsante "Salva Investimento"
        document.getElementById('saveInvestment')?.addEventListener('click', () => {
            const assetType = investmentAssetSelect.value; // 'crypto', 'etf', 'silver'
            const amount = parseFloat(document.getElementById('investmentAmount').value);
            const dateValue = document.getElementById('investmentDate').value;
            const description = document.getElementById('investmentDescription').value.trim();

            // Validazione
            if (!assetType || isNaN(amount) || amount <= 0 || !dateValue) {
                showNotification('Errore: Compila Asset, Importo (> 0) e Data.', 'danger');
                return;
            }
            if (!appData.assets[assetType]) {
                 showNotification('Errore: Tipo di asset selezionato non valido.', 'danger');
                 return;
            }
             // Format date dd/mm/yyyy
             let formattedDate;
             try {
                 const [year, month, day] = dateValue.split('-');
                 const dateObject = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                 if (isNaN(dateObject.getTime())) throw new Error('Data non valida');
                 formattedDate = `${String(dateObject.getUTCDate()).padStart(2, '0')}/${String(dateObject.getUTCMonth() + 1).padStart(2, '0')}/${dateObject.getUTCFullYear()}`;
             } catch(e){
                formattedDate = new Date().toLocaleDateString('it-IT'); // Fallback
                console.error("Errore parsing data investimento:", e);
             }
             const finalDescription = description || `Investimento in ${appData.assets[assetType].name}`;

            // 1. Aggiorna i contributi versati per l'asset selezionato
            appData.assets[assetType].contributedValue = (appData.assets[assetType].contributedValue || 0) + amount;
            // 2. NON aggiorniamo currentValue automaticamente. L'utente lo farà da "Modifica Dati".

            // 3. Aggiungi questa transazione al log separato di investimenti
            const newInvestment = {
                 id: Date.now(),
                 date: formattedDate,
                 assetType: assetType,
                 amount: amount,
                 description: finalDescription
            };
            appData.expenses.investmentTransactions.unshift(newInvestment);

            updateUI(); // Ricalcola totali, performance e aggiorna UI
            addInvestmentModal.hide();
            showNotification(`Contributo di ${formatCurrency(amount)} in ${appData.assets[assetType].name} aggiunto! 💰`, 'success');
        });
    } // Fine Modale Aggiungi Investimento

    // Setup iniziale per i pulsanti Ignora negli alert (verrà richiamato da updateUI)
    setupDismissAlertButtons();
}

/**
 * Imposta (o reimposta) gli event listener per i pulsanti Modifica/Elimina nella tabella spese.
 * Utilizza la delegazione degli eventi sul tbody per gestire righe aggiunte dinamicamente.
 */
function setupExpenseActionButtons() {
    const expenseTableBody = document.getElementById('expenses-list-table-body');
    if (!expenseTableBody) return;

    // Rimuovi listener precedente per evitare duplicati se questa funzione viene chiamata più volte
    // Usiamo un namespace per l'evento per rimuovere solo il nostro listener
    expenseTableBody.removeEventListener('click', handleExpenseActionClick); // Rimuove handler precedente
    // Aggiungi un singolo listener al tbody
    expenseTableBody.addEventListener('click', handleExpenseActionClick); // Aggiunge nuovo handler
}

/**
 * Gestore eventi delegato per i click sui pulsanti nella tabella spese.
 * @param {Event} event L'oggetto evento click.
 */
function handleExpenseActionClick(event) {
     // Trova il pulsante effettivo che è stato cliccato (o un suo figlio, come l'icona <i>)
     const button = event.target.closest('button.edit-expense, button.delete-expense');
     if (!button) return; // Click non su un pulsante di azione

     const expenseId = parseInt(button.dataset.expenseId);
     if (isNaN(expenseId)) return; // ID non valido

     if (button.classList.contains('edit-expense')) {
        // --- Azione Modifica ---
        // console.log(`Richiesta modifica spesa ID: ${expenseId}`);
        // Apri il modale passando l'ID della spesa da modificare
        window.openAddExpenseModal(expenseId);
     } else if (button.classList.contains('delete-expense')) {
         // --- Azione Elimina ---
         // console.log(`Richiesta eliminazione spesa ID: ${expenseId}`);
         // Trova descrizione per conferma
         const expenseToDelete = appData.expenses.transactions.find(tx => tx.id === expenseId);
         const confirmMessage = expenseToDelete
                ? `Sei sicuro di voler eliminare questa spesa?\n\nData: ${expenseToDelete.date}\nDesc: ${expenseToDelete.description}\nImporto: ${formatCurrency(expenseToDelete.amount)}`
                : `Sei sicuro di voler eliminare la spesa con ID: ${expenseId}?`;

         if (confirm(confirmMessage)) {
            // Filtra l'array delle transazioni, rimuovendo quella con l'ID corrispondente
            const initialLength = appData.expenses.transactions.length;
            appData.expenses.transactions = appData.expenses.transactions.filter(tx => tx.id !== expenseId);
            const finalLength = appData.expenses.transactions.length;

            if (initialLength > finalLength) {
                updateUI(); // Aggiorna UI (ricalcola totali, aggiorna tabella)
                showNotification('Spesa eliminata con successo.🗑️', 'success');
            } else {
                 showNotification('Errore: Spesa non trovata per l\'eliminazione.', 'warning');
            }
         }
     }
}

/**
 * Imposta (o reimposta) gli event listener per i pulsanti Elimina nella tabella contributi/investimenti.
 * (Attualmente l'eliminazione rimuove solo dal log, non modifica i totali).
 */
function setupContributionActionButtons() {
    const logTableBody = document.getElementById('contributions-log-table-body');
    if (!logTableBody) return;

    logTableBody.removeEventListener('click', handleContributionActionClick); // Rimuovi vecchio
    logTableBody.addEventListener('click', handleContributionActionClick); // Aggiungi nuovo
}

/**
 * Gestore eventi delegato per i click sui pulsanti nella tabella log contributi.
 * @param {Event} event L'oggetto evento click.
 */
function handleContributionActionClick(event) {
    const button = event.target.closest('button.delete-contribution');
    if (!button) return; // Click non su un pulsante di azione

    const contributionId = parseInt(button.dataset.contributionId);
    if (isNaN(contributionId)) return;

    if (button.classList.contains('delete-contribution')) {
        // console.log(`Richiesta eliminazione log contributo ID: ${contributionId}`);
         const contribToDelete = appData.expenses.investmentTransactions.find(tx => tx.id === contributionId);
         const confirmMessage = contribToDelete
                ? `Sei sicuro di voler eliminare questa voce dal log contributi?\n\nData: ${contribToDelete.date}\nAsset: ${appData.assets[contribToDelete.assetType]?.name || 'N/A'}\nImporto: ${formatCurrency(contribToDelete.amount)}\n\nNOTA: Questa azione rimuove solo la riga dal log, NON annulla l'effetto sui "Contributi Versati" totali dell'asset.`
                : `Sei sicuro di voler eliminare la voce di log con ID: ${contributionId}?`;

         if (confirm(confirmMessage)) {
            const initialLength = appData.expenses.investmentTransactions.length;
            appData.expenses.investmentTransactions = appData.expenses.investmentTransactions.filter(tx => tx.id !== contributionId);
            const finalLength = appData.expenses.investmentTransactions.length;

            if (initialLength > finalLength) {
                updateUI(); // Aggiorna la tabella del log e potenzialmente la dashboard
                showNotification('Voce di log eliminata con successo.', 'success');
            } else {
                showNotification('Errore: Voce di log non trovata.', 'warning');
            }
         }
    }
    // Aggiungere logica 'edit-contribution' se implementata
}


/**
 * Imposta (o reimposta) gli event listener per i pulsanti "Ignora" negli alert attivi.
 * Utilizza la delegazione degli eventi sui contenitori degli alert.
 */
function setupDismissAlertButtons() {
    const handleDismiss = (event) => {
        // Trova il pulsante dismiss più vicino all'elemento cliccato
        // Gestisce sia bottoni custom '.dismiss-alert' che standard Bootstrap '.btn-close' dentro un '.alert'
        const dismissButton = event.target.closest('.dismiss-alert, .alert .btn-close');
        if (!dismissButton) return; // Click non su un pulsante dismiss

        // Trova l'elemento alert genitore che contiene l'ID
        const alertElement = dismissButton.closest('.alert[data-alert-id]');
        if (!alertElement) {
             console.warn("Impossibile trovare l'elemento alert genitore con data-alert-id.");
             // Prova a rimuovere l'alert visivamente come fallback se non troviamo l'ID
             dismissButton.closest('.alert')?.remove();
             return;
        }

        const alertIdStr = alertElement.dataset.alertId;
        if (!alertIdStr) {
            console.warn("Impossibile trovare l'ID nell'attributo data-alert-id.");
            alertElement.remove(); // Rimuovi comunque visivamente
            return;
        }

        const alertId = parseInt(alertIdStr);
        if (isNaN(alertId)) {
            console.warn("ID alert non è un numero valido:", alertIdStr);
            alertElement.remove(); // Rimuovi comunque visivamente
            return;
        }

        // console.log(`Richiesta ignorare alert ID: ${alertId}`);

        // Trova l'indice dell'alert nell'array degli alert attivi
        const alertIndex = appData.alerts.active.findIndex(a => a.id === alertId && a.status === 'Attivo');

        if (alertIndex !== -1) {
            // Rimuovi l'alert dall'array 'active' e prendi l'oggetto rimosso
            const dismissedAlert = appData.alerts.active.splice(alertIndex, 1)[0];
            // Cambia lo stato a 'Ignorato'
            dismissedAlert.status = 'Ignorato';
            // Aggiungi l'alert all'inizio dell'array 'history'
            appData.alerts.history.unshift(dismissedAlert);

            // Anima l'uscita dell'alert prima di rimuoverlo
             alertElement.classList.remove('show');
             alertElement.classList.add('fade'); // Assicurati che 'fade' sia presente
             // Rimuovi l'elemento dal DOM dopo la transizione
             alertElement.addEventListener('transitionend', () => {
                 alertElement.remove();
                 // Aggiorna solo le sezioni UI degli alert dopo la rimozione
                 updateAlertsSection(); // Aggiorna cronologia nella sezione Alert
                 updateDashboardAlerts(); // Aggiorna alert nel dashboard (se necessario)
             }, { once: true }); // Esegui listener una sola volta


            showNotification('Alert ignorato.', 'info');
        } else {
            // console.warn(`Alert con ID ${alertId} non trovato tra quelli attivi.`);
            // Se l'alert non è nell'array ma l'elemento DOM esiste ancora, rimuovilo
            alertElement.remove();
        }
    };

    // Rimuovi listener precedenti per evitare duplicati e riattacca
    const containers = ['#dashboard-active-alerts', '#alerts-active-list'];
    containers.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
            // Rimuovi e riattacca il listener per evitare duplicati
            // È più sicuro rimuovere/riattaccare che usare flag complessi
            container.removeEventListener('click', handleDismiss); // Rimuove listener specifico
            container.addEventListener('click', handleDismiss); // Aggiunge listener aggiornato
        }
    });
}


/**
 * Imposta gli event listener per i pulsanti nell'header (Condividi, Esporta, PDF).
 */
function setupHeaderButtons() {
    // Pulsante Condividi
    document.getElementById('share-btn')?.addEventListener('click', async () => {
        const { portfolio, assets } = appData;
        const shareData = {
            title: 'Riepilogo Finanziario',
            text: `Patrimonio Attuale: ${formatCurrency(portfolio.totalValue)}\nPerformance Totale: ${formatPercentage(portfolio.totalPerformance)}\n\nAllocazione:\n${Object.values(assets).map(a=>`- ${a.name}: ${formatCurrency(a.currentValue)}`).join('\n')}`,
            // url: window.location.href // Opzionale: condividi URL dell'app
        };
        // Usa l'API Web Share se disponibile
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                showNotification('Riepilogo condiviso! 🎉', 'success');
            } catch (err) {
                // Ignora errore se l'utente annulla la condivisione
                if (err.name !== 'AbortError') {
                    console.error('Errore condivisione:', err);
                    // Fallback: copia negli appunti se la condivisione fallisce o non è possibile
                    copySummaryToClipboard('Condivisione fallita, riepilogo copiato negli appunti. 📋', 'warning');
                } else {
                    // console.log("Condivisione annullata dall'utente.");
                }
            }
        } else {
            // Fallback per browser/dispositivi che non supportano Web Share API
            copySummaryToClipboard('Condivisione web non supportata. Riepilogo copiato negli appunti. 📋', 'warning');
        }
    });

    // Pulsante Esporta Riepilogo (copia testo)
    document.getElementById('export-summary-btn')?.addEventListener('click', () => copySummaryToClipboard());

    // Pulsante Esporta PDF
    document.getElementById('export-pdf-btn')?.addEventListener('click', generatePdfReport);
}

/**
 * Genera un riepilogo testuale e lo copia negli appunti.
 * @param {string} [customSuccessMessage=null] Messaggio di successo personalizzato.
 * @param {'info'|'success'|'warning'|'danger'} [messageType='success'] Tipo di messaggio.
 */
function copySummaryToClipboard(customSuccessMessage = null, messageType = 'success') {
     const { portfolio, assets, expenses, profile } = appData;
     const summaryText = `--- Riepilogo Finanziario (${new Date().toLocaleDateString('it-IT')}) ---\n` +
                       `Utente: ${profile.username || 'N/D'}\n\n` +
                       `Patrimonio Totale: ${formatCurrency(portfolio.totalValue)}\n` +
                       `Contributi Totali: ${formatCurrency(portfolio.totalContributions)}\n` +
                       `Performance Totale: ${formatPercentage(portfolio.totalPerformance)}\n\n` +
                       `--- Allocazione Asset ---\n` +
                       `${Object.values(assets).map(a => {
                           const assetValue = a.currentValue || 0;
                           const percentage = portfolio.totalValue > 0 ? (assetValue / portfolio.totalValue) * 100 : 0;
                           return `- ${a.name}: ${formatCurrency(assetValue)} (${formatPercentage(percentage)})`;
                       }).join('\n')}\n\n` +
                       `--- Spese Mensili (Budget: ${formatCurrency(expenses.budget || 0)}) ---\n` +
                       `Speso: ${formatCurrency(expenses.spent || 0)} (${formatPercentage((expenses.budget || 0) > 0 ? ((expenses.spent || 0) / expenses.budget) * 100 : 0)} del budget)\n` +
                       `Rimanente: ${formatCurrency((expenses.budget || 0) - (expenses.spent || 0))}`;

    // Usa l'API Clipboard per copiare il testo
    navigator.clipboard.writeText(summaryText).then(() => {
        showNotification(customSuccessMessage || 'Riepilogo copiato negli appunti! 📋', messageType);
    }, (err) => {
        console.error('Errore copia negli appunti:', err);
        showNotification('Errore durante la copia del riepilogo. 🙁', 'danger');
    });
}

/**
 * Imposta gli event listener per la sezione Profilo.
 */
function setupProfileSection() {
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const newUsername = document.getElementById('profileUsername')?.value.trim();
        const newEmail = document.getElementById('profileEmail')?.value.trim();
        let changesMade = false;

        if (newUsername !== undefined && appData.profile.username !== newUsername) {
            appData.profile.username = newUsername;
            changesMade = true;
        }
        if (newEmail !== undefined && appData.profile.email !== newEmail) {
            // Aggiungere validazione email se necessario
            appData.profile.email = newEmail;
            changesMade = true;
        }

        if (changesMade) {
            updateProfileSection(); // Aggiorna visualizzazione immediata (es. nome sidebar)
            showNotification('Profilo aggiornato con successo!👤', 'success');
            // Qui potresti aggiungere logica per salvare i dati (es. localStorage)
            // saveAppDataToLocalStorage(); // Esempio
        } else {
            showNotification('Nessuna modifica al profilo rilevata.', 'info');
        }
    });

     // Listener per link profilo nel dropdown utente sidebar
     document.getElementById('dropdown-profile-link')?.addEventListener('click', (e) => {
         e.preventDefault();
         window.showSection('profile-content'); // Mostra la sezione profilo
         // Chiudi dropdown se aperto
         const dropdownElement = document.getElementById('dropdownUser1');
         if(dropdownElement){
            const bsDropdown = bootstrap.Dropdown.getInstance(dropdownElement);
            if(bsDropdown) bsDropdown.hide();
         }
     });
}

/**
 * Imposta altri listeners generali (es. budget spese, PAC).
 */
function setupOtherListeners() {
    // Listener per salvare budget mensile spese
    document.getElementById('saveMonthlyBudgetBtn')?.addEventListener('click', () => {
        const budgetInput = document.getElementById('monthlyBudgetInput');
        if (budgetInput) {
            const newBudget = parseFloat(budgetInput.value);
            if (!isNaN(newBudget) && newBudget >= 0) {
                if (appData.expenses.budget !== newBudget) {
                    appData.expenses.budget = newBudget;
                    updateUI(); // Ricalcola % spesa, barra progresso, ecc.
                    showNotification(`Budget mensile impostato a ${formatCurrency(newBudget)}.`, 'success');
                } else {
                     showNotification('Il budget non è cambiato.', 'info');
                }
            } else {
                showNotification('Errore: Inserisci un valore numerico valido (>= 0) per il budget.', 'danger');
                 budgetInput.value = appData.expenses.budget; // Ripristina valore precedente
            }
        }
    });

     // Listener per salvare impostazioni PAC
     document.getElementById('savePacSettings')?.addEventListener('click', () => {
         const pacInput = document.getElementById('monthlyContribution');
         if (pacInput) {
             const newPacContribution = parseFloat(pacInput.value);
             if (!isNaN(newPacContribution) && newPacContribution >= 0) {
                 if (appData.projections.monthlyContribution !== newPacContribution) {
                     appData.projections.monthlyContribution = newPacContribution;
                     updateUI(); // Ricalcola proiezioni
                     showNotification(`Contributo PAC mensile impostato a ${formatCurrency(newPacContribution)}.`, 'success');
                 } else {
                      showNotification('Il contributo PAC non è cambiato.', 'info');
                 }
             } else {
                 showNotification('Errore: Inserisci un valore numerico valido (>= 0) per il contributo PAC.', 'danger');
                 pacInput.value = appData.projections.monthlyContribution; // Ripristina valore precedente
             }
         }
     });
}

/**
 * Mostra una notifica toast di Bootstrap.
 * @param {string} message Messaggio da visualizzare.
 * @param {'info' | 'success' | 'warning' | 'danger'} [type='info'] Tipo di notifica (colore).
 * @param {number} [delay=4000] Durata visualizzazione in ms.
 */
function showNotification(message, type = 'info', delay = 4000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn("Contenitore toast ('toast-container') non trovato. Notifica console:", type, message);
        return;
    }
    const toastId = `toast-${Date.now()}`; // ID univoco per il toast
    let bgClass = `bg-${type}`;
    let textClass = 'text-white';
    // Adatta colori per warning/info/light per migliore leggibilità
    if (type === 'warning' || type === 'info' || type === 'light') {
        textClass = 'text-dark';
    }
    if (type === 'light') { bgClass = 'bg-light'; }
    else if (type === 'warning') { bgClass = 'bg-warning'; } // Usa bg-warning standard

    // HTML del toast (allineato a destra, colore basato sul tipo)
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center ${textClass} ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close ${textClass === 'text-white' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>`;

    // Aggiungi il toast al contenitore
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    // Inizializza e mostra il toast usando l'API di Bootstrap
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toastInstance = new bootstrap.Toast(toastElement, { delay: delay });
        // Rimuovi l'elemento toast dal DOM dopo che è stato nascosto
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
        toastInstance.show();
    }
}

/**
 * Funzione placeholder per rilevare dispositivi pieghevoli (potrebbe essere usata
 * per adattare layout in futuro, ma richiede API specifiche o librerie).
 */
function detectFoldableDevice() {
    // Implementazione futura se necessario/possibile
    // Esempio: navigator.windowSegments
    // if ('windowSegments' in navigator) { console.log("Dispositivo pieghevole rilevato?"); }
}

// --- APP INITIALIZATION ---

// Esegui il codice di setup quando il DOM è completamente caricato e pronto.
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM Caricato. Inizializzazione Applicazione Finanziaria...");
    detectFoldableDevice(); // Check (opzionale) per dispositivi pieghevoli
    setupNavigation();      // Imposta navigazione tra schede
    setupModals();          // Imposta logica finestre modali
    setupHeaderButtons();   // Imposta pulsanti header (condividi, etc.)
    setupProfileSection();  // Imposta listeners sezione profilo
    setupOtherListeners();  // Imposta listeners budget, PAC, ecc.
    updateUI();             // Prima chiamata per popolare tutta l'interfaccia con i dati iniziali e calcolare tutto
    console.log("✨ Applicazione inizializzata e pronta.");
});

// --- LOCAL STORAGE (Optional Persistence) ---
/*
function saveAppDataToLocalStorage() {
    try {
        // Salva solo parti specifiche per evitare di salvare troppi dati calcolati
        const dataToSave = {
             assets: appData.assets, // Salva stato asset (valori, contributi, forecast)
             expenses: {
                 budget: appData.expenses.budget,
                 categories: appData.expenses.categories,
                 transactions: appData.expenses.transactions,
                 investmentTransactions: appData.expenses.investmentTransactions
             },
             projections: {
                 monthlyContribution: appData.projections.monthlyContribution,
                 pacTargetAllocation: appData.projections.pacTargetAllocation
             },
             alerts: {
                 config: appData.alerts.config,
                  history: appData.alerts.history // Salva storico alert
                  // Non salvare 'active' alerts, verranno ricalcolati
             },
             profile: appData.profile
        };
        localStorage.setItem('finanzaProData', JSON.stringify(dataToSave));
        console.log("💾 Dati salvati in localStorage.");
    } catch (error) {
        console.error("Errore durante il salvataggio in localStorage:", error);
        showNotification("Errore nel salvataggio dei dati.", "danger");
    }
}

function loadAppDataFromLocalStorage() {
     try {
        const savedData = localStorage.getItem('finanzaProData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("💾 Dati caricati da localStorage.");

            // Unisci i dati salvati con la struttura dati di default
            // Questo permette di aggiungere nuove proprietà in futuro senza rompere il caricamento
            // Nota: usa un deep merge più robusto se la struttura diventa complessa

             // Sovrascrivi/Unisci Assets
             if (parsedData.assets) {
                 for (const key in appData.assets) {
                     if (parsedData.assets[key]) {
                        // Sovrascrivi solo le proprietà salvate
                        appData.assets[key].currentValue = parsedData.assets[key].currentValue ?? appData.assets[key].currentValue;
                        appData.assets[key].contributedValue = parsedData.assets[key].contributedValue ?? appData.assets[key].contributedValue;
                        appData.assets[key].forecast = parsedData.assets[key].forecast ?? appData.assets[key].forecast;
                        // Non sovrascrivere performance, name, color, allocation structure
                     }
                 }
             }

            // Sovrascrivi/Unisci Expenses
            if(parsedData.expenses){
                appData.expenses.budget = parsedData.expenses.budget ?? appData.expenses.budget;
                appData.expenses.categories = parsedData.expenses.categories ?? appData.expenses.categories;
                appData.expenses.transactions = parsedData.expenses.transactions ?? appData.expenses.transactions;
                appData.expenses.investmentTransactions = parsedData.expenses.investmentTransactions ?? appData.expenses.investmentTransactions;
            }

             // Sovrascrivi/Unisci Projections settings
             if(parsedData.projections){
                 appData.projections.monthlyContribution = parsedData.projections.monthlyContribution ?? appData.projections.monthlyContribution;
                 appData.projections.pacTargetAllocation = parsedData.projections.pacTargetAllocation ?? appData.projections.pacTargetAllocation;
             }

            // Sovrascrivi/Unisci Alerts config and history
            if(parsedData.alerts){
                appData.alerts.config = parsedData.alerts.config ?? appData.alerts.config;
                 appData.alerts.history = parsedData.alerts.history ?? appData.alerts.history;
            }

             // Sovrascrivi/Unisci Profile
             if(parsedData.profile){
                 appData.profile = parsedData.profile ?? appData.profile;
             }

            // Dopo il caricamento, aggiorna l'UI
            updateUI();
        } else {
            console.log("Nessun dato trovato in localStorage.");
            updateUI(); // Esegui comunque UI iniziale con dati default
        }
    } catch (error) {
        console.error("Errore durante il caricamento da localStorage:", error);
        localStorage.removeItem('finanzaProData'); // Rimuovi dati corrotti
        showNotification("Errore nel caricamento dei dati salvati. Ripristinati valori predefiniti.", "warning");
        updateUI(); // Esegui comunque UI iniziale
    }
}

// Modifica l'evento DOMContentLoaded per caricare i dati
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM Caricato. Inizializzazione Applicazione Finanziaria...");
    detectFoldableDevice();
    setupNavigation();
    setupModals();
    setupHeaderButtons();
    setupProfileSection();
    setupOtherListeners();
    loadAppDataFromLocalStorage(); // Carica dati prima del primo updateUI
    // updateUI(); // Non più necessario qui, viene chiamato da loadAppDataFromLocalStorage
    console.log("✨ Applicazione inizializzata e pronta.");

     // Aggiungi un listener per salvare i dati prima che la pagina venga chiusa (opzionale)
     window.addEventListener('beforeunload', saveAppDataToLocalStorage);
});
*/
```

---

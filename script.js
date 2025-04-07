Assolutamente. Ecco il file `script.js` completo, con la sezione per il salvataggio e caricamento tramite Local Storage **attivata** (decommentata).

**FILE: `script.js` (Completo con Local Storage)**

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
 * !! QUESTA E' LA FUNZIONE CHIAVE MODIFICATA !!
 */
function calculateProjections() {
    // console.log("📊 Calcolo Proiezioni PAC + CAGR..."); // Debug
    const currentMonthIndex = new Date().getMonth();
    const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    // Crea etichette mesi da ora fino a Dicembre (mostra anno solo per Dic)
    appData.projections.months = monthLabels.slice(currentMonthIndex).map((month) => {
        return (month === "Dic") ? `${month} ${currentYear}` : month;
    });

    const numMonthsToProject = appData.projections.months.length;
    if (numMonthsToProject === 0) {
        // console.log("📊 Nessun mese per la proiezione."); // Debug
        // Azzera array proiezioni se non ci sono mesi
        for (const key in appData.assets) { appData.projections[key] = []; }
        appData.projections.total = [];
        return;
    }

    // Reset arrays proiezioni
    for (const key in appData.assets) { appData.projections[key] = []; }
    appData.projections.total = [];

    // Prendi contributo mensile PAC e allocazione (con fallback a 0)
    const monthlyContribution = typeof appData.projections.monthlyContribution === 'number' && appData.projections.monthlyContribution >= 0
                                ? appData.projections.monthlyContribution : 0;
    const pacAllocation = appData.projections.pacTargetAllocation || {};

    // Oggetto per tenere traccia del valore corrente di ogni asset durante la simulazione
    let currentAssetValues = {};
    for (const key in appData.assets) {
        currentAssetValues[key] = appData.assets[key].currentValue || 0; // Inizia dal valore attuale
    }

    // Itera per ogni mese da proiettare
    for (let i = 0; i < numMonthsToProject; i++) {
        let monthTotalProjected = 0;

        // Itera su ogni asset per calcolare il valore alla fine del mese
        for (const key in appData.assets) {
            const asset = appData.assets[key];
            let currentValueThisMonth = currentAssetValues[key]; // Valore all'inizio del mese

            // 1. Calcola contributo PAC per questo asset nel mese corrente
            const allocationPercent = typeof pacAllocation[key] === 'number' ? pacAllocation[key] : 0;
            const assetPacAmount = monthlyContribution * (allocationPercent / 100);

            // 2. Calcola il tasso di crescita MENSILE dal CAGR annuale (`forecast`)
            const annualRate = (typeof asset.forecast === 'number' && !isNaN(asset.forecast) ? asset.forecast : 0) / 100;
            let monthlyRate = 0;
            if (1 + annualRate >= 0) { // Evita radice di numero negativo
                 monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
            } else {
                // Se CAGR <= -100%, il tasso mensile è -100% (azzeramento)
                monthlyRate = -1;
                // console.warn(`CAGR per ${key} (${annualRate*100}%) è <= -100%. Tasso mensile impostato a -100%.`); // Debug
            }

            // 3. Applica la crescita sul capitale iniziale del mese E poi aggiungi il PAC
            //    (Convenzione: crescita applicata prima, PAC aggiunto alla fine del mese)
            currentValueThisMonth = currentValueThisMonth * (1 + monthlyRate);
            currentValueThisMonth += assetPacAmount;

            // Arrotonda e salva il valore proiettato per questo asset alla fine del mese
            const finalProjectedValue = parseFloat(currentValueThisMonth.toFixed(2));
            appData.projections[key].push(finalProjectedValue);

            // Aggiorna il valore per il prossimo ciclo iterativo
            currentAssetValues[key] = finalProjectedValue;

            // Somma al totale del mese
            monthTotalProjected += finalProjectedValue;
        } // Fine loop asset

        // Salva il totale proiettato per il mese corrente
        appData.projections.total.push(parseFloat(monthTotalProjected.toFixed(2)));

    } // Fine loop mesi

    // Aggiorna anno corrente e display allocazione PAC nell'UI
    document.querySelectorAll('.current-year').forEach(span => span.textContent = currentYear);
    updatePacAllocationDisplay();

    // console.log("📊 Proiezioni Calcolate:", JSON.stringify(appData.projections)); // Debug
}


/**
 * Esempio di funzione separata per il calcolo PAC+CAGR (NON usata direttamente da updateUI,
 * ma utile come riferimento logico o per calcoli esterni).
 * La logica è stata integrata nella funzione calculateProjections sopra.
 *
 * @param {number} initialCapital Capitale iniziale.
 * @param {number} contributionAmount Importo del versamento periodico.
 * @param {number} durationYears Durata dell'investimento in anni.
 * @param {number} cagrPercentage Tasso di rendimento annuo composto (CAGR) in percentuale (es. 8 per 8%).
 * @param {'monthly'|'quarterly'|'annually'} contributionFrequency Frequenza dei versamenti. Default 'monthly'.
 * @returns {object|null} Oggetto con { finalValue: number, projectionData: Array<{period: number, value: number}> } o null se input non valido.
 */
function calculateSingleProjectionPAC_Example(initialCapital, contributionAmount, durationYears, cagrPercentage, contributionFrequency = 'monthly') {
    // Validazione Input
    if (typeof initialCapital !== 'number' || initialCapital < 0 ||
        typeof contributionAmount !== 'number' || contributionAmount < 0 ||
        typeof durationYears !== 'number' || durationYears <= 0 ||
        typeof cagrPercentage !== 'number') {
        console.error("Input non validi per calculateSingleProjectionPAC_Example.");
        return null;
    }

    // Parametri di calcolo
    const totalMonths = Math.floor(durationYears * 12); // Numero totale di mesi
    const annualRate = cagrPercentage / 100;
    let monthlyRate;

    // Calcola tasso mensile equivalente
     if (1 + annualRate >= 0) { // Evita radice negativa
         monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
     } else {
         monthlyRate = -1; // Se il CAGR è <-100%, il tasso mensile effettivo è -100%
         // console.warn(`Esempio: CAGR <= -100% (${cagrPercentage}%) rilevato.`); // Debug
     }

    let monthsPerContribution = 1;
    if (contributionFrequency === 'quarterly') {
        monthsPerContribution = 3;
    } else if (contributionFrequency === 'annually') {
        monthsPerContribution = 12;
    }

    // Simulazione Iterativa
    let currentValue = initialCapital;
    const projectionData = [{ period: 0, value: parseFloat(currentValue.toFixed(2)) }]; // Periodo 0 = Inizio

    for (let month = 1; month <= totalMonths; month++) {
        // 1. Applica crescita sul valore all'inizio del mese
        const growthAmount = currentValue * monthlyRate;
        currentValue += growthAmount;

        // 2. Aggiungi versamento se dovuto in questo mese (alla fine del mese)
        if (month % monthsPerContribution === 0) {
            currentValue += contributionAmount;
        }

        // 3. Memorizza il valore alla fine del mese
        projectionData.push({
            period: month,
            value: parseFloat(currentValue.toFixed(2)) // Arrotonda a 2 decimali
        });
    }

    // Risultato finale
    const finalValue = parseFloat(currentValue.toFixed(2));

    return {
        finalValue: finalValue,
        projectionData: projectionData // Array con lo storico mese per mese
    };
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
        calculateProjections(); // Usa la versione aggiornata con PAC+CAGR
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

    const perfLi = document.getElementById(`investments-${assetType}-performance`);
    if(perfLi) {
        perfLi.textContent = `Performance: ${formatPercentage(asset.performance)}`;
        perfLi.className = ''; // Resetta classi
        perfLi.classList.add(getPerformanceClass(asset.performance));
    }
     const forecastLi = document.getElementById(`investments-${assetType}-forecast`);
     if(forecastLi) {
         forecastLi.textContent = `Prev. CAGR: ${formatPercentage(asset.forecast)}`;
         forecastLi.className = ''; // Resetta classi
         forecastLi.classList.add(getPerformanceClass(asset.forecast));
     }
}

/**
 * Aggiorna la tabella di allocazione del patrimonio nella sezione "Investimenti".
 * @param {string} tableBodySelector Selettore CSS per il tbody della tabella.
 */
function updateAllocationTable(tableBodySelector) {
    const tableBody = document.querySelector(tableBodySelector);
    if (!tableBody) return;

    let html = '';
    const totalValue = appData.portfolio.totalValue;
    const sortedAssets = Object.values(appData.assets).sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

    sortedAssets.forEach(asset => {
        const currentValue = asset.currentValue || 0;
        const percentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        const textColor = ['#ffc107', '#0dcaf0', '#fd7e14'].includes(asset.color) ? 'text-dark' : 'text-white';
        html += `<tr>
                    <td><span class="badge ${textColor}" style="background-color:${asset.color};">${asset.name}</span></td>
                    <td>${formatCurrency(currentValue)}</td>
                    <td class="text-end">${formatPercentage(percentage)}</td>
                 </tr>`;
    });

     if (sortedAssets.length > 0 && totalValue > 0) {
         html += `<tr class="table-light fw-bold">
                     <td>Totale</td>
                     <td>${formatCurrency(totalValue)}</td>
                     <td class="text-end">${formatPercentage(100)}</td>
                  </tr>`;
     }

    tableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Dati di allocazione non disponibili.</td></tr>';
}

/**
 * Aggiorna l'intera sezione "Contributi PAC".
 */
function updateContributionsSection() {
    const pacInput = document.getElementById('monthlyContribution');
    if (pacInput) {
        pacInput.value = appData.projections.monthlyContribution || 0;
    }

    const logTableBody = document.getElementById('contributions-log-table-body');
    if (logTableBody) {
        let html = '';
        const sortedContributions = [...appData.expenses.investmentTransactions]
            .sort((a, b) => {
                 try {
                     const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                     const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                     if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) { if (dateB - dateA !== 0) return dateB - dateA; }
                 } catch(e){}
                 return (b.id || 0) - (a.id || 0);
            });

        if (sortedContributions.length > 0) {
            sortedContributions.forEach(tx => {
                const assetName = appData.assets[tx.assetType]?.name || tx.assetType;
                const assetColor = appData.assets[tx.assetType]?.color || '#6c757d';
                const textColor = ['#ffc107', '#0dcaf0', '#fd7e14'].includes(assetColor) ? 'text-dark' : 'text-white';
                html += `<tr>
                            <td class="ps-3"><small class="text-muted">${tx.id || 'N/A'}</small></td>
                            <td>${tx.date || 'N/A'}</td>
                            <td><span class="badge ${textColor}" style="background-color:${assetColor};">${assetName}</span></td>
                            <td>${tx.description || '-'}</td>
                            <td class="text-success text-end">${formatCurrency(tx.amount)}</td>
                            <td class="text-center pe-3">
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
    const spent = exp.spent;
    const percentageSpent = budget > 0 ? (spent / budget) * 100 : 0;
    const progressBarPercentage = Math.min(percentageSpent, 100);
    const remaining = budget - spent;

    if (budgetInput) budgetInput.value = budget;

    const progressBar = document.getElementById('expenses-budget-progress');
    const budgetSummary = document.getElementById('expenses-budget-summary');
    if (progressBar) {
        progressBar.style.width = `${progressBarPercentage}%`;
        progressBar.textContent = `${percentageSpent.toFixed(0)}%`;
        progressBar.setAttribute('aria-valuenow', percentageSpent);
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (percentageSpent > 90) progressBar.classList.add('bg-danger');
        else if (percentageSpent > 70) progressBar.classList.add('bg-warning');
        else progressBar.classList.add('bg-success');
    }
     if (budgetSummary) {
         budgetSummary.textContent = `${formatCurrency(spent)} / ${formatCurrency(budget)}`;
     }

    updateElement('expenses-spent-value', formatCurrency(spent));
    updateElement('expenses-budget-value', formatCurrency(budget));
    updateElement('expenses-remaining-value', formatCurrency(remaining), getPerformanceClass(remaining), ['text-danger', 'text-success', 'text-secondary']);

    const categoryTableBody = document.getElementById('expenses-category-table-body');
    if (categoryTableBody) {
        let html = '';
         let totalAmountCategories = 0;
         let totalPercentageCategories = 0;
        const categoriesWithExpenses = exp.categories.filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

        categoriesWithExpenses.forEach(cat => {
            const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(cat.color) ? 'text-dark' : 'text-white';
            html += `<tr>
                        <td><span class="badge ${textColor}" style="background-color:${cat.color};">${cat.name}</span></td>
                        <td>${formatCurrency(cat.amount)}</td>
                        <td class="text-end">${formatPercentage(cat.percentage)}</td>
                     </tr>`;
            totalAmountCategories += cat.amount;
            totalPercentageCategories += cat.percentage;
        });

        if (categoriesWithExpenses.length > 0) {
             html += `<tr class="table-light fw-bold">
                         <td>Totale</td>
                         <td>${formatCurrency(totalAmountCategories)}</td>
                         <td class="text-end">${formatPercentage(totalPercentageCategories)}</td>
                      </tr>`;
        }

        categoryTableBody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted p-3">Nessuna spesa registrata per questo mese.</td></tr>';
    }

    const listTableBody = document.getElementById('expenses-list-table-body');
    if (listTableBody) {
        let html = '';
        exp.transactions.sort((a,b) => {
            try {
                const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                    if (dateB - dateA !== 0) return dateB - dateA;
                }
            } catch (e) { }
            return (b.id || 0) - (a.id || 0);
        }).forEach(tx => {
             const category = exp.categories.find(c => c.name === tx.category);
             const catColor = category ? category.color : '#6c757d';
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
        setupExpenseActionButtons();
    }
}

/**
 * Aggiorna la sezione "Proiezioni".
 */
function updateProjectionsSection() {
    const proj = appData.projections;
    const lastIndex = proj.months.length - 1;

    const pacValueElement = document.getElementById('projection-pac-value');
    if (pacValueElement) {
        pacValueElement.textContent = formatCurrency(proj.monthlyContribution || 0);
    }

    if (lastIndex < 0) {
        const detailsTableBody = document.getElementById('projections-details-table-body');
        if(detailsTableBody) detailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione disponibile. Calcolo in corso o dati insufficienti.</td></tr>';
        const monthlyTableBody = document.getElementById('projections-monthly-table-body');
        if(monthlyTableBody) monthlyTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Nessuna proiezione mensile disponibile.</td></tr>';
        return;
    }

    const detailsTableBody = document.getElementById('projections-details-table-body');
    if (detailsTableBody) {
        let html = '';
         const hasValidProjections = proj.total && proj.total.length > lastIndex &&
                                     proj.crypto && proj.crypto.length > lastIndex &&
                                     proj.etf && proj.etf.length > lastIndex &&
                                     proj.silver && proj.silver.length > lastIndex;

        if (!hasValidProjections) {
             html = '<tr><td colspan="5" class="text-center text-danger p-3">Errore: Dati di proiezione incompleti o non validi.</td></tr>';
        } else {
            const totalProjected = proj.total[lastIndex];
            const totalCurrent = appData.portfolio.totalValue;
            const totalGrowthValue = totalProjected - totalCurrent;
            const totalGrowthPercentage = totalCurrent > 0 ? (totalGrowthValue / totalCurrent) * 100 : (totalProjected > 0 ? Infinity : 0);

            for(const key in appData.assets){
                const asset = appData.assets[key];
                const projectedValue = proj[key][lastIndex] ?? 0;
                const currentVal = asset.currentValue || 0;
                const assetGrowthValue = projectedValue - currentVal;
                const assetGrowthPercentage = asset.forecast || 0;

                html += `<tr>
                            <td class="ps-3">${asset.name}</td>
                            <td class="text-end">${formatCurrency(currentVal)}</td>
                            <td class="text-end">${formatCurrency(projectedValue)}</td>
                            <td class="text-end ${getPerformanceClass(assetGrowthValue)}">${formatCurrency(assetGrowthValue)}</td>
                            <td class="text-end pe-3 ${getPerformanceClass(assetGrowthPercentage)}">${formatPercentage(assetGrowthPercentage)}</td>
                         </tr>`;
            }
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

    const monthlyTableBody = document.getElementById('projections-monthly-table-body');
    if(monthlyTableBody){
        let html = '';
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
    const activeAlerts = appData.alerts.active
        .filter(a => a.status === 'Attivo')
        .sort((a, b) => {
            const severity = {"Critico": 1, "Avviso": 2, "Info": 3};
            return (severity[a.type] || 99) - (severity[b.type] || 99);
        });

     if (activeAlerts.length > 0) {
        html += `<h4 class="text-danger mt-4 mb-3 fs-5"><i class="bi bi-exclamation-triangle-fill me-2"></i>Alert Attivi Recenti</h4>`;
         activeAlerts.slice(0, 3).forEach(alert => {
            let alertClass = 'alert-info'; let icon = 'bi-info-circle-fill';
            let textClass = 'text-dark';
            if(alert.type === 'Critico') { alertClass = 'alert-danger'; icon = 'bi-exclamation-triangle-fill'; textClass = 'text-white'; }
            if(alert.type === 'Avviso') { alertClass = 'alert-warning'; icon = 'bi-exclamation-circle-fill'; textClass = 'text-dark'; }

            html += `<div class="alert ${alertClass} ${textClass} alert-dismissible fade show d-flex align-items-center" role="alert" data-alert-id="${alert.id}">
                        <i class="bi ${icon} flex-shrink-0 me-2"></i>
                        <small class="flex-grow-1">${alert.message}</small>
                        <button type="button" class="btn-close ${textClass === 'text-white' ? 'btn-close-white' : ''} dismiss-alert" data-bs-dismiss="alert" aria-label="Close" title="Ignora questo alert"></button>
                     </div>`;
        });
         if (activeAlerts.length > 3) {
             html += `<div class="text-center mt-2"><a href="#" class="btn btn-sm btn-outline-secondary" id="view-all-alerts-link">Vedi tutti gli alert (${activeAlerts.length})</a></div>`;
         }
         html += `<hr class="my-4">`;
    } else {
         html = '';
    }
    container.innerHTML = html;

    setupDismissAlertButtons();
    const viewAllLink = document.getElementById('view-all-alerts-link');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            const alertTab = document.getElementById('alerts-tab');
             if (alertTab) {
                alertTab.click();
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

    const recentExpenses = appData.expenses.transactions.map(tx => ({ ...tx, type: 'expense' }));
    const recentInvestments = appData.expenses.investmentTransactions.map(tx => ({ ...tx, type: 'investment' }));

    const recentTransactions = [...recentExpenses, ...recentInvestments]
        .sort((a, b) => {
             try {
                 const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                 const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                 if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                      if (dateB - dateA !== 0) return dateB - dateA;
                 }
             } catch(e){}
             return (b.id || 0) - (a.id || 0);
        })
        .slice(0, 5);

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
                amountClass = 'text-danger';
                transactionTypeLabel = 'Spesa';
                typeIcon = '<i class="bi bi-cart text-danger me-1 small" title="Spesa"></i>';
            } else if (tx.type === 'investment') {
                const asset = appData.assets[tx.assetType];
                const assetName = asset ? asset.name : tx.assetType;
                const assetColor = asset ? asset.color : '#6c757d';
                const textColor = ['#ffc107', '#fd7e14', '#0dcaf0'].includes(assetColor) ? 'text-dark' : 'text-white';
                categoryBadge = `<span class="badge ${textColor}" style="background-color:${assetColor};">${assetName}</span>`;
                amountClass = 'text-success';
                transactionTypeLabel = 'Invest.';
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
                if (alert.type === 'Avviso') { alertClass = 'alert-warning'; iconClass = 'bi-exclamation-circle-fill'; textClass = 'text-dark';}
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
        setupDismissAlertButtons();
    }

    const historyTableBody = document.getElementById('alerts-history-table-body');
    if (historyTableBody) {
        let html = '';
        const combinedAlerts = [...appData.alerts.active, ...appData.alerts.history]
             .sort((a, b) => {
                  try {
                      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : null;
                      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : null;
                      if (dateA && dateB && !isNaN(dateA) && !isNaN(dateB)) {
                          if (dateB - dateA !== 0) return dateB - dateA;
                      }
                  } catch(e){}
                  return (b.id || 0) - (a.id || 0);
             });


        if (combinedAlerts.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted p-3">Nessuna cronologia alert disponibile.</td></tr>';
        } else {
             combinedAlerts.forEach(alert => {
                let typeBadgeClass='bg-secondary', statusBadgeClass='bg-secondary';
                let typeTextClass='text-white', statusTextClass='text-white';
                if(alert.type==='Critico') { typeBadgeClass='bg-danger'; }
                else if(alert.type==='Avviso') { typeBadgeClass='bg-warning'; typeTextClass='text-dark'; }
                else if(alert.type==='Info') { typeBadgeClass='bg-info'; typeTextClass='text-dark'; }
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
}


// --- CHART FUNCTIONS ---

/**
 * Inizializza un nuovo grafico Chart.js o aggiorna uno esistente.
 * @param {string} chartId ID dell'elemento <canvas>.
 * @param {object} chartConfig Oggetto di configurazione per Chart.js.
 */
function initOrUpdateChart(chartId, chartConfig) {
    const canvasElement = document.getElementById(chartId);
    if (!canvasElement) { return; }
    const context = canvasElement.getContext('2d');
    if (!context) { console.error(`Ctx 2D non trovato per ${chartId}.`); return; }

    if (charts[chartId] && charts[chartId] instanceof Chart) {
        try {
            charts[chartId].data = chartConfig.data;
            charts[chartId].options = chartConfig.options;
            charts[chartId].update();
        } catch (error) {
            console.error(`Errore update grafico ${chartId}:`, error);
            destroyChart(chartId);
            try { charts[chartId] = new Chart(context, chartConfig); }
            catch (initError) { console.error(`Errore ricreazione grafico ${chartId}:`, initError); }
        }
    } else {
        try {
            destroyChart(chartId);
            charts[chartId] = new Chart(context, chartConfig);
        } catch (error) { console.error(`Errore creazione grafico ${chartId}:`, error); }
    }
}

/**
 * Distrugge un'istanza di Chart.js esistente e rimuove il riferimento.
 * @param {string} chartId ID del grafico da distruggere.
 */
function destroyChart(chartId) {
    if(charts[chartId] && charts[chartId] instanceof Chart) {
        try { charts[chartId].destroy(); }
        catch (error) { console.error(`Errore destroy grafico ${chartId}:`, error); }
        delete charts[chartId];
    }
}

/**
 * Inizializza o aggiorna tutti i grafici dell'applicazione.
 */
function initOrUpdateAllCharts() {
    console.log("📊 Aggiornamento Grafici...");

    const bodyBgColor = getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '#ffffff';

    // --- Grafici Allocazione (Dashboard & Investimenti) ---
    const allocationLabels = Object.values(appData.assets).map(a => a.name);
    const allocationValues = Object.values(appData.assets).map(a => a.currentValue || 0);
    const allocationColors = Object.values(appData.assets).map(a => a.color);
    const allocationData = {
        labels: allocationLabels,
        datasets: [{ data: allocationValues, backgroundColor: allocationColors, borderColor: bodyBgColor, borderWidth: 2 }]
    };
    initOrUpdateChart('allocationChart', { type: 'pie', data: allocationData, options: commonChartOptions('pie', null, false, true) });
    initOrUpdateChart('investmentsAllocationChart', { type: 'doughnut', data: allocationData, options: commonChartOptions('doughnut', null, false, true) });

    // --- Grafico Andamento Previsto (Dashboard) ---
    initOrUpdateChart('performanceChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [{
                label: `Valore Previsto (PAC ${formatCurrency(appData.projections.monthlyContribution || 0)}/mese)`,
                data: appData.projections.total,
                borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3
            }]
        },
        options: commonChartOptions('line', 'Andamento Previsto Totale', true)
    });

    // --- Grafico Spese per Categoria ---
    const expenseCategories = appData.expenses.categories.filter(c => c.amount > 0);
    const expenseData = {
        labels: expenseCategories.map(c => c.name),
        datasets: [{ data: expenseCategories.map(c => c.amount), backgroundColor: expenseCategories.map(c => c.color), borderColor: bodyBgColor, borderWidth: 2 }]
    };
    initOrUpdateChart('expenseCategoryChart', { type: 'doughnut', data: expenseData, options: commonChartOptions('doughnut', null, false, true) });

    // --- Grafico Proiezione Totale (con dettaglio asset) ---
    initOrUpdateChart('totalProjectionChart', {
        type: 'line',
        data: {
            labels: appData.projections.months,
            datasets: [
                { label: 'Totale Previsto', data: appData.projections.total, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3, borderWidth: 2, order: 1 },
                ...(appData.projections.crypto?.length > 0 ? [{ label: 'Crypto', data: appData.projections.crypto, borderColor: appData.assets.crypto.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 2 }] : []),
                ...(appData.projections.etf?.length > 0 ? [{ label: 'ETF', data: appData.projections.etf, borderColor: appData.assets.etf.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 3 }] : []),
                ...(appData.projections.silver?.length > 0 ? [{ label: 'Argento', data: appData.projections.silver, borderColor: appData.assets.silver.color, fill: false, tension: 0.3, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 4 }] : [])
            ]
        },
        options: commonChartOptions('line', null, true)
    });
    // console.log("📊 Grafici Aggiornati."); // Debug
}

/**
 * Restituisce un oggetto di opzioni comuni per i grafici Chart.js.
 */
function commonChartOptions(type, title = null, showAxes = false, tooltipValuePercentage = false) {
     const bodyBgColor = getComputedStyle(document.body).backgroundColor;
     const isDark = (color) => { const rgb = color.match(/\d+/g); if (!rgb || rgb.length < 3) return false; const b = (parseInt(rgb[0])*299 + parseInt(rgb[1])*587 + parseInt(rgb[2])*114)/1000; return b < 128; };
     const defaultFontColor = isDark(bodyBgColor) ? 'rgba(255, 255, 255, 0.8)' : '#495057';
     const gridColor = isDark(bodyBgColor) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: (type==='pie'||type==='doughnut')?'bottom':'top', labels: { boxWidth: 12, padding: 15, font: { size: 11 }, color: defaultFontColor } },
            title: { display: !!title, text: title, padding: { top: 10, bottom: (type==='line'||type==='bar')?5:15 }, font: { size: 14, weight: '500' }, color: defaultFontColor },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 13 }, bodyFont: { size: 12 }, titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 4,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || context.label || ''; if (label) { label += ': '; } const value = context.raw;
                        if (typeof value !== 'number' || isNaN(value)) { return label + (value || ''); }
                        label += formatCurrency(value);
                        if (tooltipValuePercentage && (type==='pie'||type==='doughnut')) {
                            const dataArray = context.dataset.data;
                            if (Array.isArray(dataArray)) {
                                const total = dataArray.reduce((s, c) => s + (typeof c === 'number' && !isNaN(c) ? c : 0), 0);
                                if (total > 0) { const p = (value/total)*100; label += ` (${formatPercentage(p)})`; }
                            }
                        } return label;
                    }
                }
            }
        },
        scales: (!showAxes || type==='pie' || type==='doughnut') ? {} : {
            y: { display: true, beginAtZero: false, ticks: { callback: value => formatCurrency(value), font: { size: 10 }, maxTicksLimit: 6, color: defaultFontColor }, grid: { color: gridColor }, border: { color: gridColor } },
            x: { display: true, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: defaultFontColor }, grid: { display: false }, border: { color: gridColor } }
        },
        ...(type === 'line' && { interaction: { mode: 'index', intersect: false }, hover: { mode: 'nearest', intersect: true }, elements: { point: { radius: 0, hoverRadius: 5 }, line: { borderWidth: 2 } } }),
        ...(type === 'doughnut' && { cutout: '65%' }),
        ...(type === 'pie' && { cutout: '0%' }),
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

    const createTable = (headers, rows, footerRow = null, options = {colAlign:[]}) => {
        const thStyle = "border:1px solid #ccc; padding:5px 7px; background-color:#f0f0f0; text-align:left; font-weight:bold; font-size:9.5px; white-space:nowrap;";
        const tdStyleBase = "border:1px solid #ccc; padding:5px 7px; font-size:9.5px;";
        const tableStyle = "width:100%; border-collapse:collapse; margin-bottom:16px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#333;";
        const footerStyleBase = "border:1px solid #ccc; padding:6px 7px; background-color:#e9ecef; font-weight:bold; font-size:10px;";

        let tableHeaders = headers.map((h, index) => {
             let align = options.colAlign?.[index] || 'left';
             if (typeof h === 'string' && (h.includes('Valore') || h.includes('Importo') || h.includes('(%)') || h.includes('Previsto') || h.includes('€)') || h.includes('%') )) { align = 'right'; }
             return `<th style="${thStyle} text-align:${align};">${h}</th>`
            }).join('');

        let tableRows = rows.map(row => {
            let cells = row.map((cellValue, index) => {
                let cellStyle = tdStyleBase; let formattedValue = cellValue; let performanceClass = ''; let align = options.colAlign?.[index] || 'left';
                if (typeof cellValue === 'number' && !isNaN(cellValue)) {
                    align = 'right'; const headerText = headers[index]?.toLowerCase() || '';
                    if (headerText.includes('performance') || headerText.includes('crescita') || headerText.includes('previsione') || headerText.includes('perc.') || headerText.includes('cagr') || headerText.includes('(%)')) {
                        formattedValue = formatPercentage(cellValue); performanceClass = getPerformanceClass(cellValue);
                    } else { formattedValue = formatCurrency(cellValue); }
                } else if (typeof cellValue === 'string' && (cellValue.startsWith('€') || cellValue.endsWith('%'))) {
                     align = 'right'; if(cellValue.endsWith('%')){ try { const n = parseFloat(cellValue.replace('%','').replace('.','').replace(',','.')); if(!isNaN(n)) performanceClass = getPerformanceClass(n); } catch(e){} }
                }
                cellStyle += `text-align:${align};`;
                 if (performanceClass === 'text-success') cellStyle += 'color:#198754; font-weight:500;';
                 else if (performanceClass === 'text-danger') cellStyle += 'color:#dc3545; font-weight:500;';
                return `<td style="${cellStyle}">${formattedValue === null || formattedValue === undefined ? '-' : formattedValue}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        let tableFooter = '';
        if (footerRow) {
            let footerCells = footerRow.map((cellValue, index) => {
                let cellStyle = footerStyleBase; let formattedValue = cellValue; let performanceClass = ''; let align = options.colAlign?.[index] || 'left';
                if (typeof cellValue === 'number' && !isNaN(cellValue)) {
                    align = 'right'; const h = headers[index]?.toLowerCase() || '';
                    if (h.includes('performance') || h.includes('crescita') || h.includes('previsione') || h.includes('perc.') || h.includes('cagr') || h.includes('(%)')) {
                        formattedValue = formatPercentage(cellValue); performanceClass = getPerformanceClass(cellValue);
                    } else { formattedValue = formatCurrency(cellValue); }
                } else if (typeof cellValue === 'string' && (cellValue.startsWith('€') || cellValue.endsWith('%'))) {
                     align = 'right'; if(cellValue.endsWith('%')){ try { const n=parseFloat(cellValue.replace('%','').replace('.','').replace(',','.')); if(!isNaN(n)) performanceClass = getPerformanceClass(n); } catch(e){} }
                }
                 cellStyle += `text-align:${align};`;
                if (performanceClass === 'text-success') cellStyle += 'color:#198754;'; else if (performanceClass === 'text-danger') cellStyle += 'color:#dc3545;';
                return `<td style="${cellStyle}">${formattedValue === null || formattedValue === undefined ? '-' : formattedValue}</td>`;
            }).join('');
            tableFooter = `<tfoot><tr>${footerCells}</tr></tfoot>`;
        }
        return `<table style="${tableStyle}"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody>${tableFooter}</table>`;
    };

    let html = `<div style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; margin:20px; color:#333;">
                    <h1 style="text-align:center; color:#0d6efd; border-bottom:2px solid #0d6efd; padding-bottom:10px; font-size:22px; font-weight:500;">Report Finanziario Personale</h1>
                    <p style="text-align:center; font-size:11px; margin-bottom:25px;">Utente: ${profile.username || 'N/D'} | Generato il: ${today}</p>
                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Riepilogo Patrimonio</h2>
                    ${createTable(['Descrizione', 'Valore'], [['Valore Totale Attuale', portfolio.totalValue], ['Contributi Totali Versati', portfolio.totalContributions], ['Performance Totale', portfolio.totalPerformance]], null, {colAlign: ['left', 'right']})}
                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Allocazione Asset</h2>
                    ${createTable(['Asset', 'Valore Attuale', 'Allocazione (%)'], Object.values(assets).sort((a,b) => (b.currentValue || 0) - (a.currentValue || 0)).map(a => [a.name, a.currentValue || 0, portfolio.totalValue > 0 ? ((a.currentValue || 0) / portfolio.totalValue) * 100 : 0]), ['Totale', portfolio.totalValue, 100], {colAlign: ['left', 'right', 'right']})}
                    <h2 style="color:#0d6efd; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dettaglio Asset</h2>`;
    for (const key in assets) {
        const asset = assets[key];
        html += `<h3 style="color:${asset.color}; margin-top:20px; margin-bottom:8px; font-size:14px;">${asset.name}</h3>
                 ${createTable(['Metrica', 'Valore'], [['Valore Attuale', asset.currentValue || 0], ['Contributi Versati', asset.contributedValue || 0], ['Performance', asset.performance], ['Prev. Crescita Annua (CAGR)', asset.forecast]], null, {colAlign: ['left', 'right']})}`;
        if (asset.allocation?.length > 0) {
            html += `<h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Composizione ${asset.name}:</h4>`;
            if (key === 'crypto') { html += createTable(['Nome', 'Alloc. (%)', 'Valore (€)'], asset.allocation.sort((a,b) => (b.value||0) - (a.value||0)).map(i => [i.name, i.percentage, i.value]), null, {colAlign:['left', 'right', 'right']}); }
            else if (key === 'etf') { html += createTable(['Nome ETF', 'Prev. Annua (%)', 'Valore (€)'], asset.allocation.sort((a,b) => (b.value||0) - (a.value||0)).map(i => [i.name, i.forecast, i.value]), null, {colAlign:['left', 'right', 'right']}); }
        }
    }
    const remainingBudget = (expenses.budget || 0) - (expenses.spent || 0);
    const budgetUsagePercentage = (expenses.budget || 0) > 0 ? ((expenses.spent || 0) / expenses.budget) * 100 : 0;
    html += `<div style="page-break-before: always;"></div>
             <h2 style="color:#198754; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Gestione Spese Mensili</h2>
             ${createTable(['Descrizione', 'Valore'], [['Budget Mensile Impostato', expenses.budget || 0], ['Totale Speso nel Mese', expenses.spent || 0], ['Budget Rimanente', remainingBudget], ['Utilizzo Budget', budgetUsagePercentage]], null, {colAlign: ['left', 'right']})}
             <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Spese per Categoria:</h4>
             ${createTable(['Categoria', 'Importo Speso', 'Percentuale (%)'], expenses.categories.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).map(c => [c.name, c.amount, c.percentage]), ['Totale Speso', expenses.spent, expenses.spent > 0 ? 100 : 0], {colAlign: ['left', 'right', 'right']})}
             <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Ultime Spese Registrate (max 15):</h4>
             ${createTable(['Data', 'Categoria', 'Descrizione', 'Importo'], expenses.transactions.slice(0, 15).map(t => [t.date, t.category, t.description, t.amount]), null, {colAlign:['left', 'left', 'left', 'right']})}`;
     if(expenses.investmentTransactions?.length > 0) {
         html += `<h2 style="color:#6f42c1; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Cronologia Investimenti/Contributi</h2>
                  <h4 style="font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">Ultimi Contributi Registrati (max 15):</h4>
                  ${createTable(['Data', 'Asset', 'Descrizione', 'Importo'], expenses.investmentTransactions.slice(0, 15).map(t => [t.date, assets[t.assetType]?.name || t.assetType, t.description || '-', t.amount]), null, {colAlign: ['left', 'left', 'left', 'right']})}`;
     }
    const lastProjectionIndex = projections.months.length - 1;
    if (lastProjectionIndex >= 0 && projections.total?.length > lastProjectionIndex) {
        const hasValidProjections = projections.total && projections.crypto?.length > lastProjectionIndex && projections.etf?.length > lastProjectionIndex && projections.silver?.length > lastProjectionIndex;
        if(hasValidProjections) {
            const totalProjected = projections.total[lastProjectionIndex]; const totalCurrent = portfolio.totalValue; const totalGrowthValue = totalProjected - totalCurrent; const totalGrowthPercentage = totalCurrent > 0 ? (totalGrowthValue / totalCurrent) * 100 : (totalProjected > 0 ? Infinity : 0); const projectionEndDate = projections.months[lastProjectionIndex];
            html += `<div style="page-break-before: always;"></div>
                     <h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2>
                     <p style="font-size:10px; margin-bottom:15px;">Stima del valore del portafoglio fino a <strong>${projectionEndDate}</strong>, considerando un contributo mensile PAC di <strong>${formatCurrency(projections.monthlyContribution || 0)}</strong> e i tassi di crescita (CAGR) indicati.</p>
                     ${createTable(['Asset / Totale', 'Valore Attuale', 'Valore Previsto', 'Crescita (€)', 'CAGR (%)'], [...Object.entries(assets).map(([key, asset]) => [asset.name, asset.currentValue || 0, projections[key]?.[lastProjectionIndex] ?? 0, (projections[key]?.[lastProjectionIndex] ?? 0) - (asset.currentValue || 0), asset.forecast]),], ['Totale Portafoglio', totalCurrent, totalProjected, totalGrowthValue, totalGrowthPercentage], {colAlign: ['left', 'right', 'right', 'right', 'right']})}`;
        } else { html += `<h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2><p style="font-size:10px; color:#6c757d;">Dati di proiezione incompleti o non validi.</p>`; }
    } else { html += `<h2 style="color:#fd7e14; margin-top:25px; margin-bottom:10px; font-size:16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Proiezioni Future</h2><p style="font-size:10px; color:#6c757d;">Dati di proiezione non disponibili o non calcolati.</p>`; }
    html += `</div>`;
    return html;
}

/**
 * Genera e avvia il download del report PDF utilizzando html2pdf.js.
 */
function generatePdfReport() {
    console.log("📄 Tentativo di generare il PDF...");
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = generatePdfHtmlReport();
    const pdfOptions = { margin: [12, 10, 15, 10], filename: `Report_Finanziario_${appData.profile.username.replace(/\s+/g, '_')||'Utente'}_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, dpi: 192, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
    showNotification('Generazione PDF in corso... ⏳', 'info', 10000);
    html2pdf().from(reportContainer).set(pdfOptions).save()
      .then(() => { console.log("✅ PDF generato."); showNotification('Report PDF generato con successo! 👍', 'success'); })
      .catch(error => { console.error("❌ Errore PDF:", error); showNotification('Errore durante la generazione del PDF. 🙁', 'danger'); });
}

// --- EVENT LISTENERS & SETUP ---

/** Imposta navigazione tra schede */
function setupNavigation() {
    const tabLinks = document.querySelectorAll('.nav-link[id$="-tab"]');
    const contentSections = document.querySelectorAll('.content-section');
    window.showSection = (targetContentId) => {
        contentSections.forEach(section => section.classList.add('d-none'));
        const targetSection = document.getElementById(targetContentId);
        if (targetSection) { targetSection.classList.remove('d-none'); }
        else { console.warn(`Sezione ${targetContentId} non trovata.`); document.getElementById('dashboard-content')?.classList.remove('d-none'); targetContentId = 'dashboard-content'; }
        tabLinks.forEach(link => {
            const linkTargetId = link.id.replace('mobile-', '').replace('-tab', '-content'); const isActive = (linkTargetId === targetContentId); link.classList.toggle('active', isActive);
            if (link.closest('.sidebar')) { link.classList.toggle('text-white', !isActive); if (isActive) link.classList.remove('text-white'); }
        });
    }
    tabLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); const targetContentId = link.id.replace('mobile-', '').replace('-tab', '-content'); window.showSection(targetContentId);
            const mobileNavbarCollapse = document.querySelector('.navbar-collapse.show'); if (mobileNavbarCollapse) { const bsCollapse = bootstrap.Collapse.getInstance(mobileNavbarCollapse); if (bsCollapse) bsCollapse.hide(); }
        });
    });
    window.showSection('dashboard-content');
}

/** Imposta logica modali */
function setupModals() {
    // Modale Modifica Asset
    const editAssetModalElement = document.getElementById('editAssetModal');
    if (editAssetModalElement) {
        const editAssetModal = new bootstrap.Modal(editAssetModalElement);
        document.querySelectorAll('#investments-content .edit-asset').forEach(button => {
            button.addEventListener('click', function() {
                const assetType = this.dataset.assetType; const asset = appData.assets[assetType]; if (!asset) return;
                editAssetModalElement.querySelector('#assetType').value = assetType; editAssetModalElement.querySelector('#editAssetModalLabel').textContent = `Modifica Dati ${asset.name}`;
                editAssetModalElement.querySelector('#currentValue').value = asset.currentValue || 0; editAssetModalElement.querySelector('#contributedValue').value = asset.contributedValue || 0; editAssetModalElement.querySelector('#growthForecast').value = asset.forecast || 0;
                editAssetModal.show();
            });
        });
        document.getElementById('saveAssetChanges')?.addEventListener('click', () => {
            const assetType = document.getElementById('assetType').value; const cVal = parseFloat(document.getElementById('currentValue').value); const conVal = parseFloat(document.getElementById('contributedValue').value); const forecast = parseFloat(document.getElementById('growthForecast').value);
            if (isNaN(cVal) || isNaN(conVal) || cVal < 0 || conVal < 0) { showNotification('Errore: Valore e Contributi devono essere >= 0.', 'danger'); return; }
            if (isNaN(forecast)) { showNotification('Errore: Previsione non valida.', 'danger'); return; }
            if (!appData.assets[assetType]) { showNotification('Errore: Tipo asset non valido.', 'danger'); return; }
            appData.assets[assetType].currentValue = cVal; appData.assets[assetType].contributedValue = conVal; appData.assets[assetType].forecast = forecast;
            updateUI(); editAssetModal.hide(); showNotification(`${appData.assets[assetType].name} aggiornato! ✅`, 'success');
        });
    }

    // Modale Aggiungi/Modifica Spesa
    const addExpenseModalElement = document.getElementById('addExpenseModal');
    if (addExpenseModalElement) {
        const addExpenseModal = new bootstrap.Modal(addExpenseModalElement); const form = document.getElementById('addExpenseForm'); const title = document.getElementById('addExpenseModalLabel'); const btn = document.getElementById('saveExpense'); const catSelect = document.getElementById('expenseCategory'); let editingId = null;
        const populateCatSelect = () => { if(catSelect){ const prev = catSelect.value; catSelect.innerHTML = appData.expenses.categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join(''); if(appData.expenses.categories.some(c=>c.name===prev)) catSelect.value = prev; }}; populateCatSelect();
        window.openAddExpenseModal = (id = null) => {
            form.reset(); populateCatSelect(); editingId = id;
            if(id){ const exp = appData.expenses.transactions.find(tx => tx.id === id); if(exp){ title.textContent='Modifica Spesa'; btn.textContent='Salva Modifiche'; document.getElementById('expenseDescription').value=exp.description; document.getElementById('expenseAmount').value=exp.amount; catSelect.value=exp.category; try { const dp=exp.date.split('/'); if(dp.length===3) document.getElementById('expenseDate').value=`${dp[2]}-${dp[1].padStart(2,'0')}-${dp[0].padStart(2,'0')}`; else throw Error();} catch(e){document.getElementById('expenseDate').valueAsDate=new Date();} } else { showNotification('Errore: Spesa non trovata.', 'danger'); return; } }
            else { title.textContent='Aggiungi Nuova Spesa'; btn.textContent='Salva Spesa'; document.getElementById('expenseDate').valueAsDate=new Date(); }
            addExpenseModal.show();
        };
        document.getElementById('add-expense-btn')?.addEventListener('click', () => openAddExpenseModal());
        document.getElementById('addExpenseFromTransactionBtn')?.addEventListener('click', () => { bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); openAddExpenseModal(); });
        btn?.addEventListener('click', () => {
            const desc = document.getElementById('expenseDescription').value.trim(); const amount = parseFloat(document.getElementById('expenseAmount').value); const cat = catSelect.value; const dateVal = document.getElementById('expenseDate').value;
            if (!desc || isNaN(amount) || amount <= 0 || !cat || !dateVal) { showNotification('Errore: Compila tutti i campi (Importo > 0).', 'danger'); return; }
            let fDate; try { const [y,m,d]=dateVal.split('-'); const dt=new Date(Date.UTC(parseInt(y),parseInt(m)-1,parseInt(d))); if(isNaN(dt.getTime())) throw Error(); fDate=`${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`; } catch(e){ showNotification('Errore: Data non valida.', 'danger'); return; }
            if(editingId){ const idx=appData.expenses.transactions.findIndex(tx=>tx.id===editingId); if(idx>-1){ appData.expenses.transactions[idx]={...appData.expenses.transactions[idx], description:desc, amount:amount, category:cat, date:fDate}; showNotification('Spesa modificata! 👌','success'); } else { showNotification('Errore modifica: Spesa non trovata.','danger'); } }
            else { const newExp={id:Date.now(), description:desc, amount:amount, category:cat, date:fDate}; appData.expenses.transactions.unshift(newExp); showNotification('Spesa aggiunta! 💸','success'); }
            updateUI(); addExpenseModal.hide(); editingId=null;
        });
        setupExpenseActionButtons();
    }

    // Modale Aggiungi Categoria
    const addCategoryModalElement = document.getElementById('addCategoryModal');
    if(addCategoryModalElement){
        const addCategoryModal = new bootstrap.Modal(addCategoryModalElement);
        document.getElementById('add-category-btn')?.addEventListener('click', () => { document.getElementById('addCategoryForm').reset(); document.getElementById('newCategoryColor').value='#adb5bd'; addCategoryModal.show(); });
        document.getElementById('saveNewCategory')?.addEventListener('click', () => {
            const name = document.getElementById('newCategoryName').value.trim(); const color = document.getElementById('newCategoryColor').value;
            if(!name){ showNotification("Errore: Inserisci nome categoria.", "danger"); return; }
            if(appData.expenses.categories.some(c => c.name.toLowerCase() === name.toLowerCase())){ showNotification(`Errore: Categoria "${name}" esiste già.`, "warning"); return; }
            appData.expenses.categories.push({ name: name, amount: 0, percentage: 0, color: color });
            updateUI(); addCategoryModal.hide(); showNotification(`Categoria "${name}" aggiunta!`, 'success');
        });
    }

    // Modale Modifica Previsioni
    const editProjectionsModalElement = document.getElementById('editProjectionsModal');
    if(editProjectionsModalElement){
        const editProjectionsModal = new bootstrap.Modal(editProjectionsModalElement);
        document.getElementById('edit-projections-btn')?.addEventListener('click', () => { for(const key in appData.assets){ const input=document.getElementById(`${key}Growth`); if(input) input.value=appData.assets[key].forecast||0; } editProjectionsModal.show(); });
        document.getElementById('saveProjections')?.addEventListener('click', () => {
            let isValid=true; let changes=false;
            for(const key in appData.assets){ const input=document.getElementById(`${key}Growth`); if(input){ const val=parseFloat(input.value); if(isNaN(val)){ isValid=false; showNotification(`Errore: Valore previsione ${appData.assets[key].name} non valido.`,'danger'); break; } else { if(appData.assets[key].forecast!==val){ appData.assets[key].forecast=val; changes=true; }} } }
            if(isValid){ if(changes){ updateUI(); showNotification('Previsioni CAGR aggiornate! 📈','success'); } else { showNotification('Nessuna modifica alle previsioni.','info'); } editProjectionsModal.hide(); }
        });
    }

    // Modale Configurazione Alert
    const alertConfigModalElement = document.getElementById('editAlertsModal');
    if(alertConfigModalElement){
        const alertConfigModal = new bootstrap.Modal(alertConfigModalElement); const card = document.getElementById('alerts-config-card');
        document.getElementById('edit-alerts-btn')?.addEventListener('click', () => {
            const cfg=appData.alerts.config; try{ document.getElementById('alertPerformanceNegative').checked=cfg.performanceNegative.enabled; document.getElementById('thresholdPerformanceNegative').value=cfg.performanceNegative.threshold; document.getElementById('alertPerformancePositive').checked=cfg.performancePositive.enabled; document.getElementById('thresholdPerformancePositive').value=cfg.performancePositive.threshold; document.getElementById('alertAllocationImbalance').checked=cfg.allocationImbalance.enabled; document.getElementById('thresholdAllocationImbalance').value=cfg.allocationImbalance.threshold; document.getElementById('alertBudgetExceeded').checked=cfg.budgetExceeded.enabled; document.getElementById('thresholdBudgetExceeded').value=cfg.budgetExceeded.threshold; alertConfigModal.show(); } catch(e){ console.error("Errore popola form alert:", e); showNotification("Errore caricamento config alert.", "danger"); }
        });
        document.getElementById('save-alerts-config')?.addEventListener('click', () => {
            try{ const cfg=appData.alerts.config; let changes=false; const updateCfg=(k,s,v,isChk=false)=>{ let pV=v; if(!isChk){ pV=parseFloat(v); if(isNaN(pV)){ console.warn(`Valore non valido ${k}.${s}: ${v}`); showNotification(`Errore: valore ${k}.${s} non valido.`,'warning'); return false; }} if(cfg[k][s]!==pV){ cfg[k][s]=pV; changes=true; } return true; }; let ok=true;
            ok &= updateCfg('performanceNegative','enabled',document.getElementById('alertPerformanceNegative').checked,true); ok &= updateCfg('performanceNegative','threshold',document.getElementById('thresholdPerformanceNegative').value); ok &= updateCfg('performancePositive','enabled',document.getElementById('alertPerformancePositive').checked,true); ok &= updateCfg('performancePositive','threshold',document.getElementById('thresholdPerformancePositive').value); ok &= updateCfg('allocationImbalance','enabled',document.getElementById('alertAllocationImbalance').checked,true); ok &= updateCfg('allocationImbalance','threshold',document.getElementById('thresholdAllocationImbalance').value); ok &= updateCfg('budgetExceeded','enabled',document.getElementById('alertBudgetExceeded').checked,true); ok &= updateCfg('budgetExceeded','threshold',document.getElementById('thresholdBudgetExceeded').value);
            if(ok){ if(changes){ updateUI(); showNotification('Configurazione alert salvata! ⚙️','success'); } else { showNotification('Nessuna modifica config.','info'); } alertConfigModal.hide(); }
            } catch(e){ console.error("Errore salva config alert:",e); showNotification("Errore salvataggio config.","danger"); }
        });
        if(card) card.style.display='block';
    } else { document.getElementById('edit-alerts-btn')?.remove(); const card=document.getElementById('alerts-config-card'); if(card) card.style.display='none'; }

    // Modale Scelta Transazione
    const addTransactionModalElement = document.getElementById('addTransactionModal');
    if(addTransactionModalElement){ const addTransactionModal = new bootstrap.Modal(addTransactionModalElement); document.getElementById('add-transaction-btn')?.addEventListener('click', () => addTransactionModal.show()); }

    // Modale Aggiungi Investimento
    const addInvestmentModalElement = document.getElementById('addInvestmentModal');
    if(addInvestmentModalElement){
        const addInvestmentModal = new bootstrap.Modal(addInvestmentModalElement); const form = document.getElementById('addInvestmentForm'); const sel = document.getElementById('investmentAsset');
        const populateInvSel = () => { if(sel) sel.innerHTML='<option value="" disabled selected>-- Seleziona --</option>'+Object.keys(appData.assets).map(k=>`<option value="${k}">${appData.assets[k].name}</option>`).join(''); }; populateInvSel();
        window.openAddInvestmentModal = () => { form.reset(); document.getElementById('investmentDate').valueAsDate = new Date(); populateInvSel(); addInvestmentModal.show(); };
        document.getElementById('addInvestmentBtn')?.addEventListener('click', () => { bootstrap.Modal.getInstance('#addTransactionModal')?.hide(); window.openAddInvestmentModal(); });
        document.getElementById('add-contribution-btn')?.addEventListener('click', () => window.openAddInvestmentModal());
        document.getElementById('saveInvestment')?.addEventListener('click', () => {
            const assetType=sel.value; const amount=parseFloat(document.getElementById('investmentAmount').value); const dateVal=document.getElementById('investmentDate').value; const desc=document.getElementById('investmentDescription').value.trim();
            if(!assetType||isNaN(amount)||amount<=0||!dateVal){ showNotification('Errore: Compila Asset, Importo (>0) e Data.','danger'); return; }
            if(!appData.assets[assetType]){ showNotification('Errore: Tipo asset non valido.','danger'); return; }
            let fDate; try{ const [y,m,d]=dateVal.split('-'); const dt=new Date(Date.UTC(parseInt(y),parseInt(m)-1,parseInt(d))); if(isNaN(dt.getTime())) throw Error(); fDate=`${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`; } catch(e){ fDate=new Date().toLocaleDateString('it-IT'); console.error("Errore parsing data investimento:",e); }
            const fDesc=desc||`Investimento in ${appData.assets[assetType].name}`;
            appData.assets[assetType].contributedValue=(appData.assets[assetType].contributedValue||0)+amount;
            const newInv={id:Date.now(), date:fDate, assetType:assetType, amount:amount, description:fDesc}; appData.expenses.investmentTransactions.unshift(newInv);
            updateUI(); addInvestmentModal.hide(); showNotification(`Contributo ${formatCurrency(amount)} in ${appData.assets[assetType].name} aggiunto! 💰`,'success');
        });
    }
    setupDismissAlertButtons();
}

/** Imposta listener bottoni tabella spese */
function setupExpenseActionButtons() {
    const tableBody = document.getElementById('expenses-list-table-body'); if (!tableBody) return;
    tableBody.removeEventListener('click', handleExpenseActionClick); tableBody.addEventListener('click', handleExpenseActionClick);
}

/** Gestore click bottoni tabella spese */
function handleExpenseActionClick(event) {
     const btn = event.target.closest('button.edit-expense, button.delete-expense'); if (!btn) return;
     const id = parseInt(btn.dataset.expenseId); if (isNaN(id)) return;
     if (btn.classList.contains('edit-expense')) { window.openAddExpenseModal(id); }
     else if (btn.classList.contains('delete-expense')) {
         const exp = appData.expenses.transactions.find(tx => tx.id === id); const msg = exp ? `Eliminare spesa?\n\nData: ${exp.date}\nDesc: ${exp.description}\nImporto: ${formatCurrency(exp.amount)}` : `Eliminare spesa ID: ${id}?`;
         if (confirm(msg)) {
            const len = appData.expenses.transactions.length; appData.expenses.transactions = appData.expenses.transactions.filter(tx => tx.id !== id);
            if (appData.expenses.transactions.length < len) { updateUI(); showNotification('Spesa eliminata.🗑️','success'); } else { showNotification('Errore: Spesa non trovata.','warning'); }
         }
     }
}

/** Imposta listener bottoni tabella contributi */
function setupContributionActionButtons() {
    const tableBody = document.getElementById('contributions-log-table-body'); if (!tableBody) return;
    tableBody.removeEventListener('click', handleContributionActionClick); tableBody.addEventListener('click', handleContributionActionClick);
}

/** Gestore click bottoni tabella contributi */
function handleContributionActionClick(event) {
    const btn = event.target.closest('button.delete-contribution'); if (!btn) return;
    const id = parseInt(btn.dataset.contributionId); if (isNaN(id)) return;
    if (btn.classList.contains('delete-contribution')) {
         const ctb = appData.expenses.investmentTransactions.find(tx => tx.id === id); const msg = ctb ? `Eliminare voce log?\n\nData: ${ctb.date}\nAsset: ${appData.assets[ctb.assetType]?.name||'N/A'}\nImporto: ${formatCurrency(ctb.amount)}\n\nNOTA: Rimuove solo log, non impatto su Contributi.` : `Eliminare log ID: ${id}?`;
         if (confirm(msg)) {
            const len = appData.expenses.investmentTransactions.length; appData.expenses.investmentTransactions = appData.expenses.investmentTransactions.filter(tx => tx.id !== id);
            if (appData.expenses.investmentTransactions.length < len) { updateUI(); showNotification('Voce log eliminata.','success'); } else { showNotification('Errore: Voce log non trovata.','warning'); }
         }
    }
}

/** Imposta listener bottoni dismiss alert */
function setupDismissAlertButtons() {
    const handleDismiss = (event) => {
        const btn = event.target.closest('.dismiss-alert, .alert .btn-close'); if (!btn) return;
        const alertEl = btn.closest('.alert[data-alert-id]'); if (!alertEl) { console.warn("Alert parent non trovato."); btn.closest('.alert')?.remove(); return; }
        const idStr = alertEl.dataset.alertId; if (!idStr) { console.warn("ID alert mancante."); alertEl.remove(); return; }
        const id = parseInt(idStr); if (isNaN(id)) { console.warn("ID alert non valido:", idStr); alertEl.remove(); return; }
        const idx = appData.alerts.active.findIndex(a => a.id === id && a.status === 'Attivo');
        if (idx !== -1) {
            const dismissed = appData.alerts.active.splice(idx, 1)[0]; dismissed.status = 'Ignorato'; appData.alerts.history.unshift(dismissed);
            alertEl.classList.remove('show'); alertEl.classList.add('fade');
            alertEl.addEventListener('transitionend', () => { alertEl.remove(); updateAlertsSection(); updateDashboardAlerts(); }, { once: true });
            showNotification('Alert ignorato.', 'info');
        } else { alertEl.remove(); }
    };
    const containers = ['#dashboard-active-alerts', '#alerts-active-list'];
    containers.forEach(selector => { const c = document.querySelector(selector); if(c){ c.removeEventListener('click', handleDismiss); c.addEventListener('click', handleDismiss); }});
}

/** Imposta listener bottoni header */
function setupHeaderButtons() {
    document.getElementById('share-btn')?.addEventListener('click', async () => {
        const { portfolio, assets } = appData; const shareData = { title: 'Riepilogo Finanziario', text: `Patrimonio: ${formatCurrency(portfolio.totalValue)}, Perf: ${formatPercentage(portfolio.totalPerformance)}\nAlloc: ${Object.values(assets).map(a=>`${a.name}: ${formatCurrency(a.currentValue)}`).join('; ')}` };
        if (navigator.share) { try { await navigator.share(shareData); showNotification('Riepilogo condiviso! 🎉','success'); } catch(err){ if(err.name !== 'AbortError'){ console.error('Errore share:', err); copySummaryToClipboard('Condivisione fallita, copiato. 📋','warning'); } } }
        else { copySummaryToClipboard('Condivisione non supportata, copiato. 📋','warning'); }
    });
    document.getElementById('export-summary-btn')?.addEventListener('click', () => copySummaryToClipboard());
    document.getElementById('export-pdf-btn')?.addEventListener('click', generatePdfReport);
}

/** Copia riepilogo negli appunti */
function copySummaryToClipboard(customMsg = null, msgType = 'success') {
     const { portfolio, assets, expenses, profile } = appData;
     const txt = `--- Riepilogo (${new Date().toLocaleDateString('it-IT')}) ---\nUtente: ${profile.username||'N/D'}\nPatrimonio: ${formatCurrency(portfolio.totalValue)}\nContributi: ${formatCurrency(portfolio.totalContributions)}\nPerformance: ${formatPercentage(portfolio.totalPerformance)}\n\n--- Allocazione ---\n${Object.values(assets).map(a=>{const v=a.currentValue||0; const p=portfolio.totalValue>0?(v/portfolio.totalValue)*100:0; return `- ${a.name}: ${formatCurrency(v)} (${formatPercentage(p)})`}).join('\n')}\n\n--- Spese (Budget: ${formatCurrency(expenses.budget||0)}) ---\nSpeso: ${formatCurrency(expenses.spent||0)} (${formatPercentage((expenses.budget||0)>0?((expenses.spent||0)/expenses.budget)*100:0)}%)\nRimanente: ${formatCurrency((expenses.budget||0)-(expenses.spent||0))}`;
    navigator.clipboard.writeText(txt).then(() => { showNotification(customMsg || 'Riepilogo copiato! 📋', msgType); }, (err) => { console.error('Errore clipboard:', err); showNotification('Errore copia riepilogo. 🙁','danger'); });
}

/** Imposta listener sezione profilo */
function setupProfileSection() {
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const name = document.getElementById('profileUsername')?.value.trim(); const email = document.getElementById('profileEmail')?.value.trim(); let changes=false;
        if(name !== undefined && appData.profile.username !== name){ appData.profile.username=name; changes=true; }
        if(email !== undefined && appData.profile.email !== email){ appData.profile.email=email; changes=true; }
        if(changes){ updateProfileSection(); showNotification('Profilo aggiornato!👤','success'); saveAppDataToLocalStorage(); } else { showNotification('Nessuna modifica profilo.','info'); }
    });
     document.getElementById('dropdown-profile-link')?.addEventListener('click', (e) => {
         e.preventDefault(); window.showSection('profile-content');
         const dd = document.getElementById('dropdownUser1'); if(dd){ const bsDd=bootstrap.Dropdown.getInstance(dd); if(bsDd) bsDd.hide(); }
     });
}

/** Imposta altri listener (budget, PAC) */
function setupOtherListeners() {
    document.getElementById('saveMonthlyBudgetBtn')?.addEventListener('click', () => {
        const input = document.getElementById('monthlyBudgetInput'); if(!input) return;
        const budget = parseFloat(input.value);
        if (!isNaN(budget) && budget >= 0) { if(appData.expenses.budget !== budget){ appData.expenses.budget=budget; updateUI(); showNotification(`Budget impostato a ${formatCurrency(budget)}.`, 'success'); } else { showNotification('Budget non cambiato.','info'); } }
        else { showNotification('Errore: Budget non valido (>= 0).','danger'); input.value=appData.expenses.budget; }
    });
     document.getElementById('savePacSettings')?.addEventListener('click', () => {
         const input = document.getElementById('monthlyContribution'); if(!input) return;
         const pac = parseFloat(input.value);
         if (!isNaN(pac) && pac >= 0) { if(appData.projections.monthlyContribution !== pac){ appData.projections.monthlyContribution=pac; updateUI(); showNotification(`Contributo PAC impostato a ${formatCurrency(pac)}.`, 'success'); } else { showNotification('Contributo PAC non cambiato.','info'); } }
         else { showNotification('Errore: Contributo PAC non valido (>= 0).','danger'); input.value=appData.projections.monthlyContribution; }
     });
}

/** Mostra notifica toast */
function showNotification(message, type = 'info', delay = 4000) {
    const container = document.getElementById('toast-container'); if (!container) { console.warn("No toast container. Notify:", type, message); return; }
    const id = `toast-${Date.now()}`; let bg = `bg-${type}`; let text = 'text-white';
    if (type === 'warning' || type === 'info' || type === 'light') text = 'text-dark';
    if (type === 'light') bg = 'bg-light'; else if(type === 'warning') bg = 'bg-warning';
    const html = `<div id="${id}" class="toast align-items-center ${text} ${bg} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close ${text==='text-white'?'btn-close-white':''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id); if(el){ const toast = new bootstrap.Toast(el, { delay: delay }); el.addEventListener('hidden.bs.toast', () => el.remove()); toast.show(); }
}

/** Rileva foldable (placeholder) */
function detectFoldableDevice() { /* if ('windowSegments' in navigator) console.log("Foldable?"); */ }

// --- APP INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM Caricato. Inizializzazione...");
    detectFoldableDevice();
    setupNavigation();
    setupModals();
    setupHeaderButtons();
    setupProfileSection();
    setupOtherListeners();
    loadAppDataFromLocalStorage(); // Carica dati prima del primo updateUI
    // updateUI(); // Rimosso da qui, chiamato da loadAppDataFromLocalStorage
    console.log("✨ Applicazione pronta.");

     // Aggiungi un listener per salvare i dati prima che la pagina venga chiusa (opzionale ma utile)
     window.addEventListener('beforeunload', saveAppDataToLocalStorage);
});

// --- LOCAL STORAGE (Opzionale ma raccomandato per persistenza) ---

/**
 * Salva le parti modificabili di appData nel localStorage.
 */
function saveAppDataToLocalStorage() {
    try {
        // Salva solo parti specifiche per evitare di salvare troppi dati calcolati
        // e per permettere aggiornamenti della struttura dati di default
        const dataToSave = {
             assets: {}, // Salviamo solo le proprietà modificabili degli asset
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

         // Popola assets in dataToSave solo con le proprietà chiave
         for (const key in appData.assets) {
             const asset = appData.assets[key];
             dataToSave.assets[key] = {
                 currentValue: asset.currentValue,
                 contributedValue: asset.contributedValue,
                 forecast: asset.forecast
                 // Non salvare name, color, performance, allocation structure etc.
                 // che sono parte della definizione statica o calcolati
             };
         }


        localStorage.setItem('finanzaProData', JSON.stringify(dataToSave));
        console.log("💾 Dati salvati in localStorage.");
    } catch (error) {
        console.error("Errore durante il salvataggio in localStorage:", error);
        showNotification("Errore nel salvataggio dei dati.", "danger");
    }
}

/**
 * Carica i dati salvati dal localStorage e li unisce a quelli di default.
 * Chiama updateUI alla fine.
 */
function loadAppDataFromLocalStorage() {
     try {
        const savedData = localStorage.getItem('finanzaProData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("💾 Dati caricati da localStorage.");

            // Funzione helper per unire oggetti in modo sicuro (sovrascrive solo proprietà esistenti nel target)
            const safeMerge = (target, source) => {
                if (!source) return;
                Object.keys(source).forEach(key => {
                    if (target.hasOwnProperty(key)) {
                        // Se la proprietà è un oggetto (ma non un array), unisci ricorsivamente
                        if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) &&
                            typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                            safeMerge(target[key], source[key]);
                        } else {
                            // Altrimenti, sovrascrivi se il tipo è compatibile o se target è null/undefined
                            if (typeof target[key] === typeof source[key] || target[key] == null) {
                                target[key] = source[key];
                            }
                        }
                    }
                });
            };

             // Sovrascrivi/Unisci Assets (proprietà specifiche)
             if (parsedData.assets) {
                 for (const key in appData.assets) {
                     if (parsedData.assets[key] && appData.assets[key]) {
                        appData.assets[key].currentValue = parsedData.assets[key].currentValue ?? appData.assets[key].currentValue;
                        appData.assets[key].contributedValue = parsedData.assets[key].contributedValue ?? appData.assets[key].contributedValue;
                        appData.assets[key].forecast = parsedData.assets[key].forecast ?? appData.assets[key].forecast;
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
                // Usa safeMerge per la configurazione per gestire aggiunte future
                safeMerge(appData.alerts.config, parsedData.alerts.config);
                appData.alerts.history = parsedData.alerts.history ?? appData.alerts.history;
            }

             // Sovrascrivi/Unisci Profile
             if(parsedData.profile){
                 appData.profile = parsedData.profile ?? appData.profile;
             }

            console.log("✅ Dati uniti con successo.");
            // Dopo il caricamento e l'unione, aggiorna l'UI
            updateUI();

        } else {
            console.log("Nessun dato trovato in localStorage, uso valori di default.");
            // Nessun dato salvato, usa i dati di default e aggiorna UI
            updateUI();
        }
    } catch (error) {
        console.error("Errore durante il caricamento da localStorage:", error);
        localStorage.removeItem('finanzaProData'); // Rimuovi dati corrotti per evitare loop
        showNotification("Errore nel caricamento dei dati salvati. Ripristinati valori predefiniti.", "warning");
        updateUI(); // Esegui comunque UI iniziale con dati default
    }
}

```
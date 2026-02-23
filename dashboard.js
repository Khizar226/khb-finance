
import { auth, db } from "./app.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
    collection,
    doc,
    onSnapshot,
    updateDoc,
    setDoc,
    getDocs,
    addDoc,
    deleteDoc,
    serverTimestamp,
    runTransaction,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
    ACCOUNT_OPTIONS,
    FLOW_TYPES,
    BUDGET_FUND_SUGGESTIONS,
    TAB_TITLES,
    getFlowByValue,
    getHeadsForFlow,
    getAllHeads
} from "./catalog.js";
import {
    formatPKR,
    toNumber,
    parseFlexibleDateTime,
    formatDateTime,
    formatDate,
    buildTransactionCode,
    parseCsvText,
    toCsvString,
    nowIso,
    escapeHtml,
    nonEmptyString,
    downloadTextFile,
    downloadBlob,
    monthKey
} from "./utils.js";

const refs = {
    appShell: document.getElementById("appShell"),
    userEmailPreview: document.getElementById("userEmailPreview"),
    tabButtons: document.querySelectorAll(".tab-btn"),
    tabContents: document.querySelectorAll(".tab-content"),
    sectionHeading: document.getElementById("sectionHeading"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    logoutBtn: document.getElementById("logoutBtn"),

    totalIncomeCard: document.getElementById("totalIncomeCard"),
    totalExpenseCard: document.getElementById("totalExpenseCard"),
    netCashCard: document.getElementById("netCashCard"),
    totalAssetsCard: document.getElementById("totalAssetsCard"),
    loanReceivableCard: document.getElementById("loanReceivableCard"),
    loanPayableCard: document.getElementById("loanPayableCard"),
    netWorthCard: document.getElementById("netWorthCard"),

    accountBalanceTableBody: document.getElementById("accountBalanceTableBody"),
    recentTransactionsBody: document.getElementById("recentTransactionsBody"),
    ledgerTableBody: document.getElementById("ledgerTableBody"),
    ledgerCount: document.getElementById("ledgerCount"),

    filterType: document.getElementById("filterType"),
    filterAccount: document.getElementById("filterAccount"),
    filterHead: document.getElementById("filterHead"),
    filterFromDate: document.getElementById("filterFromDate"),
    filterToDate: document.getElementById("filterToDate"),
    filterSearch: document.getElementById("filterSearch"),
    applyLedgerFiltersBtn: document.getElementById("applyLedgerFiltersBtn"),
    resetLedgerFiltersBtn: document.getElementById("resetLedgerFiltersBtn"),

    transactionModal: document.getElementById("transactionModal"),
    openTransactionModalBtn: document.getElementById("openTransactionModalBtn"),
    closeTransactionModalBtn: document.getElementById("closeTransactionModalBtn"),
    transactionForm: document.getElementById("transactionForm"),
    transactionModalTitle: document.getElementById("transactionModalTitle"),
    saveTransactionBtn: document.getElementById("saveTransactionBtn"),
    txEditId: document.getElementById("txEditId"),
    txDetail: document.getElementById("txDetail"),
    txAmount: document.getElementById("txAmount"),
    txFlowType: document.getElementById("txFlowType"),
    txAccount: document.getElementById("txAccount"),
    txHead: document.getElementById("txHead"),
    txDate: document.getElementById("txDate"),
    txTime: document.getElementById("txTime"),
    txNotes: document.getElementById("txNotes"),
    txMetaInfo: document.getElementById("txMetaInfo"),

    bulkCsvFile: document.getElementById("bulkCsvFile"),
    readBulkCsvFileBtn: document.getElementById("readBulkCsvFileBtn"),
    bulkCsvText: document.getElementById("bulkCsvText"),
    processBulkCsvBtn: document.getElementById("processBulkCsvBtn"),

    assetForm: document.getElementById("assetForm"),
    assetEditId: document.getElementById("assetEditId"),
    assetName: document.getElementById("assetName"),
    assetCategory: document.getElementById("assetCategory"),
    assetLocation: document.getElementById("assetLocation"),
    assetPurchaseDate: document.getElementById("assetPurchaseDate"),
    assetPurchaseValue: document.getElementById("assetPurchaseValue"),
    assetCurrentValue: document.getElementById("assetCurrentValue"),
    assetNotes: document.getElementById("assetNotes"),
    cancelAssetEditBtn: document.getElementById("cancelAssetEditBtn"),
    assetsTableBody: document.getElementById("assetsTableBody"),
    totalAssetsWorth: document.getElementById("totalAssetsWorth"),

    loanForm: document.getElementById("loanForm"),
    loanEditId: document.getElementById("loanEditId"),
    loanDirection: document.getElementById("loanDirection"),
    loanParty: document.getElementById("loanParty"),
    loanPrincipal: document.getElementById("loanPrincipal"),
    loanOutstanding: document.getElementById("loanOutstanding"),
    loanInterestRate: document.getElementById("loanInterestRate"),
    loanDueDate: document.getElementById("loanDueDate"),
    loanStatus: document.getElementById("loanStatus"),
    loanNotes: document.getElementById("loanNotes"),
    cancelLoanEditBtn: document.getElementById("cancelLoanEditBtn"),
    loansTableBody: document.getElementById("loansTableBody"),
    loanGivenTotal: document.getElementById("loanGivenTotal"),
    loanTakenTotal: document.getElementById("loanTakenTotal"),
    loanReceivableTotal: document.getElementById("loanReceivableTotal"),
    loanPayableTotal: document.getElementById("loanPayableTotal"),

    budgetForm: document.getElementById("budgetForm"),
    budgetEditId: document.getElementById("budgetEditId"),
    budgetName: document.getElementById("budgetName"),
    budgetAccount: document.getElementById("budgetAccount"),
    budgetTarget: document.getElementById("budgetTarget"),
    budgetCurrent: document.getElementById("budgetCurrent"),
    budgetMonthly: document.getElementById("budgetMonthly"),
    budgetDeadline: document.getElementById("budgetDeadline"),
    budgetNotes: document.getElementById("budgetNotes"),
    budgetNameList: document.getElementById("budgetNameList"),
    cancelBudgetEditBtn: document.getElementById("cancelBudgetEditBtn"),
    budgetsTableBody: document.getElementById("budgetsTableBody"),

    reportFromDate: document.getElementById("reportFromDate"),
    reportToDate: document.getElementById("reportToDate"),
    reportType: document.getElementById("reportType"),
    reportAccount: document.getElementById("reportAccount"),
    reportHead: document.getElementById("reportHead"),
    generateReportBtn: document.getElementById("generateReportBtn"),
    resetReportBtn: document.getElementById("resetReportBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    exportPngBtn: document.getElementById("exportPngBtn"),
    exportJpgBtn: document.getElementById("exportJpgBtn"),
    printReportBtn: document.getElementById("printReportBtn"),
    reportTableBody: document.getElementById("reportTableBody"),
    reportIncomeValue: document.getElementById("reportIncomeValue"),
    reportExpenseValue: document.getElementById("reportExpenseValue"),
    reportNetValue: document.getElementById("reportNetValue"),
    reportCaptureArea: document.getElementById("reportCaptureArea"),

    accountList: document.getElementById("accountList"),
    cashflowChart: document.getElementById("cashflowChart")
};

const state = {
    user: null,
    transactions: [],
    filteredLedger: [],
    assets: [],
    loans: [],
    budgets: [],
    reportRows: [],
    unsubscribers: [],
    chart: null
};

function setThemeFromStorage() {
    const saved = localStorage.getItem("finance_theme");
    if (saved === "dark" || saved === "light") {
        document.documentElement.setAttribute("data-theme", saved);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("finance_theme", next);
}

function checkUnlockSession(user) {
    const unlockUid = sessionStorage.getItem("finance_unlock_uid");
    const expiresAt = Number(sessionStorage.getItem("finance_unlock_expires") || "0");
    return unlockUid === user.uid && Date.now() < expiresAt;
}

function clearUnlockSession() {
    sessionStorage.removeItem("finance_unlock_uid");
    sessionStorage.removeItem("finance_unlock_expires");
}

function userPath(name) {
    return collection(db, "users", state.user.uid, name);
}

function profilePath() {
    return doc(db, "users", state.user.uid);
}

function byNewest(a, b) {
    return toNumber(b.createdAtMs || b.eventAtMs, 0) - toNumber(a.createdAtMs || a.eventAtMs, 0);
}

function getNonDeletedTransactions() {
    return state.transactions
        .filter((tx) => !tx.isDeleted)
        .sort(byNewest);
}

function applyLedgerFilters() {
    const type = refs.filterType.value;
    const account = refs.filterAccount.value;
    const head = refs.filterHead.value;
    const fromDate = refs.filterFromDate.value;
    const toDate = refs.filterToDate.value;
    const search = refs.filterSearch.value.trim().toLowerCase();

    state.filteredLedger = getNonDeletedTransactions().filter((tx) => {
        if (type && tx.flowType !== type) {
            return false;
        }
        if (account && tx.account !== account) {
            return false;
        }
        if (head && tx.head !== head) {
            return false;
        }
        if (fromDate) {
            const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
            if ((tx.eventAtMs || tx.createdAtMs || 0) < fromMs) {
                return false;
            }
        }
        if (toDate) {
            const toMs = new Date(`${toDate}T23:59:59`).getTime();
            if ((tx.eventAtMs || tx.createdAtMs || 0) > toMs) {
                return false;
            }
        }
        if (search) {
            const haystack = [
                tx.txCode,
                tx.detail,
                tx.notes,
                tx.head,
                tx.account,
                tx.flowType
            ].join(" ").toLowerCase();
            if (!haystack.includes(search)) {
                return false;
            }
        }
        return true;
    });
}

function populateSelect(selectElement, options, includeAllLabel = "All") {
    const normalized = Array.from(new Set(options.filter(Boolean)));
    const html = [`<option value="">${escapeHtml(includeAllLabel)}</option>`]
        .concat(normalized.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`))
        .join("");
    selectElement.innerHTML = html;
}

function populateStaticDropdowns() {
    refs.txFlowType.innerHTML = FLOW_TYPES.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
    refs.txAccount.innerHTML = ACCOUNT_OPTIONS.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("");

    const accountOptions = ACCOUNT_OPTIONS.map((account) => `<option value="${escapeHtml(account)}"></option>`).join("");
    refs.accountList.innerHTML = accountOptions;

    refs.budgetNameList.innerHTML = BUDGET_FUND_SUGGESTIONS.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

    populateHeadForFlow();

    populateSelect(refs.filterType, FLOW_TYPES.map((item) => item.value), "All Types");
    populateSelect(refs.filterAccount, ACCOUNT_OPTIONS, "All Accounts");
    populateSelect(refs.filterHead, getAllHeads(), "All Heads");

    populateSelect(refs.reportType, FLOW_TYPES.map((item) => item.value), "All Types");
    populateSelect(refs.reportAccount, ACCOUNT_OPTIONS, "All Accounts");
    populateSelect(refs.reportHead, getAllHeads(), "All Heads");
}

function populateHeadForFlow() {
    const flowType = refs.txFlowType.value || FLOW_TYPES[0].value;
    const heads = getHeadsForFlow(flowType);
    refs.txHead.innerHTML = heads.map((head) => `<option value="${escapeHtml(head)}">${escapeHtml(head)}</option>`).join("");
}

function switchTab(tabId) {
    refs.tabContents.forEach((section) => section.classList.toggle("hidden", section.id !== tabId));
    refs.tabButtons.forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-tab-target") === tabId);
    });
    refs.sectionHeading.textContent = TAB_TITLES[tabId] || "Dashboard";
}

function openTransactionModal(transaction = null) {
    refs.transactionForm.reset();
    refs.txEditId.value = "";
    refs.txMetaInfo.textContent = "";
    refs.transactionModalTitle.textContent = "Add Transaction";
    populateHeadForFlow();

    if (transaction) {
        refs.transactionModalTitle.textContent = `Edit ${transaction.txCode || "Transaction"}`;
        refs.txEditId.value = transaction.id;
        refs.txDetail.value = transaction.detail || "";
        refs.txAmount.value = toNumber(transaction.amount, 0);
        refs.txFlowType.value = transaction.flowType || FLOW_TYPES[0].value;
        populateHeadForFlow();
        refs.txAccount.value = transaction.account || ACCOUNT_OPTIONS[0];
        refs.txHead.value = transaction.head || getHeadsForFlow(refs.txFlowType.value)[0];

        if (transaction.eventAtMs) {
            const eventDate = new Date(transaction.eventAtMs);
            const day = String(eventDate.getDate()).padStart(2, "0");
            const month = String(eventDate.getMonth() + 1).padStart(2, "0");
            const year = eventDate.getFullYear();
            const hour = String(eventDate.getHours()).padStart(2, "0");
            const minute = String(eventDate.getMinutes()).padStart(2, "0");
            refs.txDate.value = `${day}-${month}-${year}`;
            refs.txTime.value = `${hour}:${minute}`;
        }

        refs.txNotes.value = transaction.notes || "";
        refs.txMetaInfo.textContent = `Created: ${formatDateTime(transaction.createdAtMs)} | Last updated: ${formatDateTime(transaction.updatedAtMs)}`;
    }

    refs.transactionModal.classList.add("active");
}

function closeTransactionModal() {
    refs.transactionModal.classList.remove("active");
}
async function allocateTransactionSequence(count = 1) {
    const counterRef = doc(db, "users", state.user.uid, "meta", "counters");

    return runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const current = snap.exists() ? toNumber(snap.data().txSeq, 0) : 0;
        const start = current + 1;
        tx.set(counterRef, {
            txSeq: current + count,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return start;
    });
}

function buildAuditEntry(action, note, before = null, after = null) {
    return {
        action,
        note,
        atMs: Date.now(),
        atIso: nowIso(),
        before,
        after
    };
}

function getTxPayloadFromForm() {
    const detail = nonEmptyString(refs.txDetail.value);
    const amount = toNumber(refs.txAmount.value, -1);
    const flowType = refs.txFlowType.value;
    const account = refs.txAccount.value;
    const head = refs.txHead.value;
    const notes = nonEmptyString(refs.txNotes.value);
    const dateInput = nonEmptyString(refs.txDate.value);
    const timeInput = nonEmptyString(refs.txTime.value);

    if (!detail) {
        throw new Error("Transaction detail is required.");
    }

    if (amount <= 0) {
        throw new Error("Amount must be greater than zero.");
    }

    let eventAtMs = Date.now();
    let eventAtIso = nowIso();
    let eventDateInput = "";
    let eventTimeInput = "";

    if (dateInput || timeInput) {
        const parsed = parseFlexibleDateTime(dateInput, timeInput || "00:00");
        if (!parsed) {
            throw new Error("Invalid event date/time. Use DD-MM-YYYY or YYYY-MM-DD and HH:mm.");
        }
        eventAtMs = parsed.eventAtMs;
        eventAtIso = parsed.eventAtIso;
        eventDateInput = parsed.eventDate;
        eventTimeInput = parsed.eventTime;
    }

    return {
        detail,
        amount,
        flowType,
        account,
        head,
        notes,
        eventAtMs,
        eventAtIso,
        eventDateInput,
        eventTimeInput
    };
}

async function saveTransaction(event) {
    event.preventDefault();
    refs.saveTransactionBtn.disabled = true;

    try {
        const payload = getTxPayloadFromForm();
        const editId = refs.txEditId.value;

        if (!editId) {
            const startSeq = await allocateTransactionSequence(1);
            const txCode = buildTransactionCode(startSeq, state.user.uid, new Date(payload.eventAtMs));

            await addDoc(userPath("transactions"), {
                ...payload,
                txSequence: startSeq,
                txCode,
                isDeleted: false,
                createdAtMs: Date.now(),
                updatedAtMs: Date.now(),
                createdAtServer: serverTimestamp(),
                updatedAtServer: serverTimestamp(),
                auditTrail: [buildAuditEntry("create", "Transaction created")]
            });
        } else {
            const existing = state.transactions.find((tx) => tx.id === editId);
            if (!existing) {
                throw new Error("Transaction not found for edit.");
            }

            const changedFields = {};
            ["detail", "amount", "flowType", "account", "head", "notes", "eventAtMs", "eventAtIso", "eventDateInput", "eventTimeInput"].forEach((field) => {
                if (existing[field] !== payload[field]) {
                    changedFields[field] = {
                        from: existing[field] ?? "",
                        to: payload[field] ?? ""
                    };
                }
            });

            await updateDoc(doc(db, "users", state.user.uid, "transactions", editId), {
                ...payload,
                updatedAtMs: Date.now(),
                updatedAtServer: serverTimestamp(),
                auditTrail: [...(existing.auditTrail || []), buildAuditEntry("edit", "Transaction updated", changedFields, payload)]
            });
        }

        closeTransactionModal();
    } catch (error) {
        alert(error.message || "Failed to save transaction.");
    } finally {
        refs.saveTransactionBtn.disabled = false;
    }
}

async function deleteTransaction(txId) {
    const target = state.transactions.find((tx) => tx.id === txId);
    if (!target) {
        return;
    }

    const confirmed = window.confirm(`Delete transaction ${target.txCode}? It will be archived with audit history.`);
    if (!confirmed) {
        return;
    }

    await updateDoc(doc(db, "users", state.user.uid, "transactions", txId), {
        isDeleted: true,
        deletedAtMs: Date.now(),
        deletedAtServer: serverTimestamp(),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp(),
        auditTrail: [...(target.auditTrail || []), buildAuditEntry("delete", "Transaction deleted")]
    });
}

function renderAccountBalances() {
    const balances = {};

    getNonDeletedTransactions().forEach((tx) => {
        const flow = getFlowByValue(tx.flowType);
        balances[tx.account] = toNumber(balances[tx.account], 0) + (flow.impact * toNumber(tx.amount, 0));
    });

    const rows = Object.entries(balances).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    refs.accountBalanceTableBody.innerHTML = rows.length
        ? rows.map(([account, balance]) => `<tr><td>${escapeHtml(account)}</td><td>${formatPKR(balance)}</td></tr>`).join("")
        : `<tr><td colspan="2" class="muted">No account activity yet.</td></tr>`;
}

function summarizeLoans() {
    let givenTotal = 0;
    let takenTotal = 0;
    let receivableOutstanding = 0;
    let payableOutstanding = 0;

    state.loans.forEach((loan) => {
        if (loan.direction === "given") {
            givenTotal += toNumber(loan.principal, 0);
            receivableOutstanding += toNumber(loan.outstanding, 0);
        } else {
            takenTotal += toNumber(loan.principal, 0);
            payableOutstanding += toNumber(loan.outstanding, 0);
        }
    });

    refs.loanGivenTotal.textContent = formatPKR(givenTotal);
    refs.loanTakenTotal.textContent = formatPKR(takenTotal);
    refs.loanReceivableTotal.textContent = formatPKR(receivableOutstanding);
    refs.loanPayableTotal.textContent = formatPKR(payableOutstanding);

    refs.loanReceivableCard.textContent = formatPKR(receivableOutstanding);
    refs.loanPayableCard.textContent = formatPKR(payableOutstanding);

    return {
        receivableOutstanding,
        payableOutstanding
    };
}

function summarizeDashboard() {
    const rows = getNonDeletedTransactions();

    const totalIncome = rows
        .filter((tx) => tx.flowType === "income")
        .reduce((sum, tx) => sum + toNumber(tx.amount, 0), 0);

    const totalExpenses = rows
        .filter((tx) => tx.flowType === "expense")
        .reduce((sum, tx) => sum + toNumber(tx.amount, 0), 0);

    const netCash = rows.reduce((sum, tx) => {
        const flow = getFlowByValue(tx.flowType);
        return sum + (flow.impact * toNumber(tx.amount, 0));
    }, 0);

    const totalAssets = state.assets.reduce((sum, asset) => sum + toNumber(asset.currentValue, 0), 0);

    refs.totalIncomeCard.textContent = formatPKR(totalIncome);
    refs.totalExpenseCard.textContent = formatPKR(totalExpenses);
    refs.netCashCard.textContent = formatPKR(netCash);
    refs.totalAssetsCard.textContent = formatPKR(totalAssets);
    refs.totalAssetsWorth.textContent = formatPKR(totalAssets);

    const loanSummary = summarizeLoans();
    const netWorth = netCash + totalAssets + loanSummary.receivableOutstanding - loanSummary.payableOutstanding;

    refs.netWorthCard.textContent = formatPKR(netWorth);
}

function renderRecentTransactions() {
    const rows = getNonDeletedTransactions().slice(0, 8);

    refs.recentTransactionsBody.innerHTML = rows.length
        ? rows.map((tx) => {
            const flow = getFlowByValue(tx.flowType);
            return `
                <tr>
                    <td>${escapeHtml(tx.txCode || "-")}</td>
                    <td>${formatDateTime(tx.eventAtMs || tx.createdAtMs)}</td>
                    <td>${escapeHtml(tx.detail || "")}</td>
                    <td><span class="pill">${escapeHtml(flow.label)}</span></td>
                    <td>${escapeHtml(tx.account || "")}</td>
                    <td>${escapeHtml(tx.head || "")}</td>
                    <td>${formatPKR(tx.amount)}</td>
                    <td class="row-actions">
                        <button class="btn btn-soft" data-action="edit-tx" data-id="${tx.id}" type="button">Edit</button>
                        <button class="btn btn-danger" data-action="delete-tx" data-id="${tx.id}" type="button">Delete</button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="8" class="muted">No transactions yet.</td></tr>`;
}

function renderLedgerTable() {
    applyLedgerFilters();
    refs.ledgerCount.textContent = `${state.filteredLedger.length} entries`;

    refs.ledgerTableBody.innerHTML = state.filteredLedger.length
        ? state.filteredLedger.map((tx) => {
            const flow = getFlowByValue(tx.flowType);
            const lastAudit = (tx.auditTrail || []).slice(-2).map((item) => `${item.action} at ${formatDateTime(item.atMs)}`).join(" | ");

            return `
                <tr>
                    <td>${escapeHtml(tx.txCode || "-")}</td>
                    <td>${formatDateTime(tx.eventAtMs)}</td>
                    <td>${formatDateTime(tx.createdAtMs)}</td>
                    <td><span class="pill">${escapeHtml(flow.label)}</span></td>
                    <td>${escapeHtml(tx.detail || "")}</td>
                    <td>${escapeHtml(tx.account || "")}</td>
                    <td>${escapeHtml(tx.head || "")}</td>
                    <td>${formatPKR(tx.amount)}</td>
                    <td>
                        <div>${escapeHtml(tx.notes || "-")}</div>
                        <div class="helper">${escapeHtml(lastAudit || "")}</div>
                    </td>
                    <td class="row-actions">
                        <button class="btn btn-soft" data-action="edit-tx" data-id="${tx.id}" type="button">Edit</button>
                        <button class="btn btn-danger" data-action="delete-tx" data-id="${tx.id}" type="button">Delete</button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="10" class="muted">No ledger entries match filters.</td></tr>`;
}

function renderAssetsTable() {
    refs.assetsTableBody.innerHTML = state.assets.length
        ? state.assets.map((asset) => {
            const gainLoss = toNumber(asset.currentValue, 0) - toNumber(asset.purchaseValue, 0);
            return `
                <tr>
                    <td>${escapeHtml(asset.name || "")}</td>
                    <td>${escapeHtml(asset.category || "")}</td>
                    <td>${escapeHtml(asset.location || "")}</td>
                    <td>${formatPKR(asset.purchaseValue)}</td>
                    <td>${formatPKR(asset.currentValue)}</td>
                    <td>${formatPKR(gainLoss)}</td>
                    <td class="row-actions">
                        <button class="btn btn-soft" data-action="edit-asset" data-id="${asset.id}" type="button">Edit</button>
                        <button class="btn btn-danger" data-action="delete-asset" data-id="${asset.id}" type="button">Delete</button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="7" class="muted">No assets recorded.</td></tr>`;
}

function renderLoansTable() {
    refs.loansTableBody.innerHTML = state.loans.length
        ? state.loans.map((loan) => `
            <tr>
                <td>${escapeHtml(loan.direction === "given" ? "Given" : "Taken")}</td>
                <td>${escapeHtml(loan.party || "")}</td>
                <td>${formatPKR(loan.principal)}</td>
                <td>${formatPKR(loan.outstanding)}</td>
                <td>${toNumber(loan.interestRate, 0).toFixed(2)}%</td>
                <td>${loan.dueDate ? formatDate(new Date(`${loan.dueDate}T00:00:00`).getTime()) : "-"}</td>
                <td><span class="pill">${escapeHtml(loan.status || "")}</span></td>
                <td class="row-actions">
                    <button class="btn btn-soft" data-action="edit-loan" data-id="${loan.id}" type="button">Edit</button>
                    <button class="btn btn-danger" data-action="delete-loan" data-id="${loan.id}" type="button">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="8" class="muted">No loans recorded.</td></tr>`;
}

function renderBudgetsTable() {
    refs.budgetsTableBody.innerHTML = state.budgets.length
        ? state.budgets.map((budget) => {
            const target = toNumber(budget.target, 0);
            const current = toNumber(budget.current, 0);
            const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            return `
                <tr>
                    <td>${escapeHtml(budget.name || "")}</td>
                    <td>${formatPKR(target)}</td>
                    <td>${formatPKR(current)}</td>
                    <td>
                        <div class="progress"><span style="width:${progress.toFixed(2)}%"></span></div>
                        <div class="helper">${progress.toFixed(1)}%</div>
                    </td>
                    <td>${formatPKR(budget.monthly)}</td>
                    <td>${budget.deadline ? formatDate(new Date(`${budget.deadline}T00:00:00`).getTime()) : "-"}</td>
                    <td>${escapeHtml(budget.account || "-")}</td>
                    <td class="row-actions">
                        <button class="btn btn-soft" data-action="edit-budget" data-id="${budget.id}" type="button">Edit</button>
                        <button class="btn btn-danger" data-action="delete-budget" data-id="${budget.id}" type="button">Delete</button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="8" class="muted">No fund plans added.</td></tr>`;
}
function renderCashflowChart() {
    const rows = getNonDeletedTransactions();
    const now = new Date();
    const bucketKeys = [];

    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        bucketKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const incomeBuckets = Object.fromEntries(bucketKeys.map((key) => [key, 0]));
    const expenseBuckets = Object.fromEntries(bucketKeys.map((key) => [key, 0]));

    rows.forEach((tx) => {
        const key = monthKey(tx.eventAtMs || tx.createdAtMs);
        if (!incomeBuckets[key] && !expenseBuckets[key]) {
            return;
        }
        if (tx.flowType === "income") {
            incomeBuckets[key] += toNumber(tx.amount, 0);
        }
        if (tx.flowType === "expense") {
            expenseBuckets[key] += toNumber(tx.amount, 0);
        }
    });

    const labels = bucketKeys.map((key) => {
        const [year, month] = key.split("-");
        return `${month}/${year.slice(-2)}`;
    });

    const incomeData = bucketKeys.map((key) => incomeBuckets[key]);
    const expenseData = bucketKeys.map((key) => expenseBuckets[key]);

    if (state.chart) {
        state.chart.destroy();
    }

    state.chart = new window.Chart(refs.cashflowChart, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.18)",
                    fill: true,
                    tension: 0.28
                },
                {
                    label: "Expense",
                    data: expenseData,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.16)",
                    fill: true,
                    tension: 0.28
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    ticks: {
                        callback(value) {
                            return `PKR ${Number(value).toLocaleString("en-PK")}`;
                        }
                    }
                }
            }
        }
    });
}

function renderAll() {
    renderAccountBalances();
    summarizeDashboard();
    renderRecentTransactions();
    renderLedgerTable();
    renderAssetsTable();
    renderLoansTable();
    renderBudgetsTable();
    renderCashflowChart();
    generateReport();
}

function attachRealtimeListeners() {
    state.unsubscribers.forEach((unsub) => unsub());
    state.unsubscribers = [];

    state.unsubscribers.push(onSnapshot(userPath("transactions"), (snapshot) => {
        state.transactions = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort(byNewest);
        renderAll();
    }));

    state.unsubscribers.push(onSnapshot(userPath("assets"), (snapshot) => {
        state.assets = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => toNumber(b.updatedAtMs, 0) - toNumber(a.updatedAtMs, 0));
        renderAll();
    }));

    state.unsubscribers.push(onSnapshot(userPath("loans"), (snapshot) => {
        state.loans = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => toNumber(b.updatedAtMs, 0) - toNumber(a.updatedAtMs, 0));
        renderAll();
    }));

    state.unsubscribers.push(onSnapshot(userPath("budgets"), (snapshot) => {
        state.budgets = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => toNumber(b.updatedAtMs, 0) - toNumber(a.updatedAtMs, 0));
        renderAll();
    }));
}

async function seedDefaultBudgetsIfEmpty() {
    const snapshot = await getDocs(userPath("budgets"));
    if (!snapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    BUDGET_FUND_SUGGESTIONS.slice(0, 6).forEach((name) => {
        const rowRef = doc(userPath("budgets"));
        batch.set(rowRef, {
            name,
            target: 0,
            current: 0,
            monthly: 0,
            deadline: "",
            account: "",
            notes: "",
            createdAtMs: Date.now(),
            updatedAtMs: Date.now(),
            createdAtServer: serverTimestamp(),
            updatedAtServer: serverTimestamp()
        });
    });

    await batch.commit();
}

async function saveAsset(event) {
    event.preventDefault();

    const name = nonEmptyString(refs.assetName.value);
    const category = nonEmptyString(refs.assetCategory.value);
    if (!name || !category) {
        alert("Asset name and category are required.");
        return;
    }

    const payload = {
        name,
        category,
        location: nonEmptyString(refs.assetLocation.value),
        purchaseDate: refs.assetPurchaseDate.value,
        purchaseValue: toNumber(refs.assetPurchaseValue.value, 0),
        currentValue: toNumber(refs.assetCurrentValue.value, 0),
        notes: nonEmptyString(refs.assetNotes.value),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp()
    };

    const editId = refs.assetEditId.value;

    if (editId) {
        await updateDoc(doc(db, "users", state.user.uid, "assets", editId), payload);
    } else {
        await addDoc(userPath("assets"), {
            ...payload,
            createdAtMs: Date.now(),
            createdAtServer: serverTimestamp()
        });
    }

    refs.assetForm.reset();
    refs.assetEditId.value = "";
    refs.cancelAssetEditBtn.classList.add("hidden");
}

async function saveLoan(event) {
    event.preventDefault();

    const party = nonEmptyString(refs.loanParty.value);
    if (!party) {
        alert("Counterparty is required.");
        return;
    }

    const payload = {
        direction: refs.loanDirection.value,
        party,
        principal: toNumber(refs.loanPrincipal.value, 0),
        outstanding: toNumber(refs.loanOutstanding.value, 0),
        interestRate: toNumber(refs.loanInterestRate.value, 0),
        dueDate: refs.loanDueDate.value,
        status: refs.loanStatus.value,
        notes: nonEmptyString(refs.loanNotes.value),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp()
    };

    const editId = refs.loanEditId.value;
    if (editId) {
        await updateDoc(doc(db, "users", state.user.uid, "loans", editId), payload);
    } else {
        await addDoc(userPath("loans"), {
            ...payload,
            createdAtMs: Date.now(),
            createdAtServer: serverTimestamp()
        });
    }

    refs.loanForm.reset();
    refs.loanEditId.value = "";
    refs.cancelLoanEditBtn.classList.add("hidden");
}

async function saveBudget(event) {
    event.preventDefault();

    const name = nonEmptyString(refs.budgetName.value);
    if (!name) {
        alert("Fund name is required.");
        return;
    }

    const payload = {
        name,
        account: nonEmptyString(refs.budgetAccount.value),
        target: toNumber(refs.budgetTarget.value, 0),
        current: toNumber(refs.budgetCurrent.value, 0),
        monthly: toNumber(refs.budgetMonthly.value, 0),
        deadline: refs.budgetDeadline.value,
        notes: nonEmptyString(refs.budgetNotes.value),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp()
    };

    const editId = refs.budgetEditId.value;
    if (editId) {
        await updateDoc(doc(db, "users", state.user.uid, "budgets", editId), payload);
    } else {
        await addDoc(userPath("budgets"), {
            ...payload,
            createdAtMs: Date.now(),
            createdAtServer: serverTimestamp()
        });
    }

    refs.budgetForm.reset();
    refs.budgetEditId.value = "";
    refs.cancelBudgetEditBtn.classList.add("hidden");
}
function buildReportRows() {
    const type = refs.reportType.value;
    const account = refs.reportAccount.value;
    const head = refs.reportHead.value;
    const fromDate = refs.reportFromDate.value;
    const toDate = refs.reportToDate.value;

    return getNonDeletedTransactions().filter((tx) => {
        if (type && tx.flowType !== type) {
            return false;
        }
        if (account && tx.account !== account) {
            return false;
        }
        if (head && tx.head !== head) {
            return false;
        }
        if (fromDate) {
            const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
            if ((tx.eventAtMs || 0) < fromMs) {
                return false;
            }
        }
        if (toDate) {
            const toMs = new Date(`${toDate}T23:59:59`).getTime();
            if ((tx.eventAtMs || 0) > toMs) {
                return false;
            }
        }
        return true;
    });
}

function generateReport() {
    state.reportRows = buildReportRows();

    const income = state.reportRows
        .filter((tx) => tx.flowType === "income")
        .reduce((sum, tx) => sum + toNumber(tx.amount, 0), 0);

    const expense = state.reportRows
        .filter((tx) => tx.flowType === "expense")
        .reduce((sum, tx) => sum + toNumber(tx.amount, 0), 0);

    const net = state.reportRows.reduce((sum, tx) => {
        const flow = getFlowByValue(tx.flowType);
        return sum + (flow.impact * toNumber(tx.amount, 0));
    }, 0);

    refs.reportIncomeValue.textContent = formatPKR(income);
    refs.reportExpenseValue.textContent = formatPKR(expense);
    refs.reportNetValue.textContent = formatPKR(net);

    refs.reportTableBody.innerHTML = state.reportRows.length
        ? state.reportRows.map((tx) => `
            <tr>
                <td>${escapeHtml(tx.txCode || "-")}</td>
                <td>${formatDateTime(tx.eventAtMs)}</td>
                <td>${escapeHtml(getFlowByValue(tx.flowType).label)}</td>
                <td>${escapeHtml(tx.detail || "")}</td>
                <td>${escapeHtml(tx.account || "")}</td>
                <td>${escapeHtml(tx.head || "")}</td>
                <td>${formatPKR(tx.amount)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="7" class="muted">No rows for this report filter.</td></tr>`;
}

function exportReportCsv() {
    if (!state.reportRows.length) {
        alert("Generate a report first.");
        return;
    }

    const columns = ["txCode", "eventAt", "flowType", "detail", "account", "head", "amount", "notes"];
    const rows = state.reportRows.map((tx) => ({
        txCode: tx.txCode || "",
        eventAt: formatDateTime(tx.eventAtMs),
        flowType: getFlowByValue(tx.flowType).label,
        detail: tx.detail || "",
        account: tx.account || "",
        head: tx.head || "",
        amount: tx.amount,
        notes: tx.notes || ""
    }));

    const csv = toCsvString(rows, columns);
    downloadTextFile(`finance-report-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

function exportReportPdf() {
    if (!state.reportRows.length) {
        alert("Generate a report first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    docPdf.setFontSize(14);
    docPdf.text("Finance Fortress Statement", 34, 32);
    docPdf.setFontSize(10);
    docPdf.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 34, 50);

    const body = state.reportRows.map((tx) => [
        tx.txCode || "-",
        formatDateTime(tx.eventAtMs),
        getFlowByValue(tx.flowType).label,
        tx.detail || "",
        tx.account || "",
        tx.head || "",
        formatPKR(tx.amount)
    ]);

    docPdf.autoTable({
        startY: 62,
        head: [["Txn Code", "Date", "Type", "Detail", "Account", "Head", "Amount"]],
        body,
        styles: { fontSize: 8, cellPadding: 4 }
    });

    docPdf.save(`finance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportReportImage(format = "png") {
    if (!state.reportRows.length) {
        alert("Generate a report first.");
        return;
    }

    const canvas = await window.html2canvas(refs.reportCaptureArea, {
        backgroundColor: "#ffffff",
        scale: 2
    });

    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    canvas.toBlob((blob) => {
        if (!blob) {
            return;
        }
        downloadBlob(`finance-report-${new Date().toISOString().slice(0, 10)}.${format}`, blob);
    }, mime, 0.95);
}

function printReport() {
    if (!state.reportRows.length) {
        alert("Generate a report first.");
        return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
        alert("Allow popups to print report.");
        return;
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>Finance Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
                    th { background: #f1f3f6; }
                </style>
            </head>
            <body>
                <h2>Finance Fortress Statement</h2>
                <p>Generated: ${new Date().toLocaleString("en-PK")}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Txn Code</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Detail</th>
                            <th>Account</th>
                            <th>Head</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.reportRows.map((tx) => `
                            <tr>
                                <td>${escapeHtml(tx.txCode || "-")}</td>
                                <td>${escapeHtml(formatDateTime(tx.eventAtMs))}</td>
                                <td>${escapeHtml(getFlowByValue(tx.flowType).label)}</td>
                                <td>${escapeHtml(tx.detail || "")}</td>
                                <td>${escapeHtml(tx.account || "")}</td>
                                <td>${escapeHtml(tx.head || "")}</td>
                                <td>${escapeHtml(formatPKR(tx.amount))}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

async function processBulkCsvText() {
    const text = refs.bulkCsvText.value;
    const rows = parseCsvText(text);

    if (!rows.length) {
        alert("No CSV rows found.");
        return;
    }

    const prepared = [];

    rows.forEach((row) => {
        const detail = nonEmptyString(row.detail || row.description || "");
        const amount = toNumber(row.amount, NaN);
        const flowType = nonEmptyString(row.flowtype || row.type || "expense").toLowerCase();
        const account = nonEmptyString(row.account || ACCOUNT_OPTIONS[0]);
        const head = nonEmptyString(row.head || getHeadsForFlow(flowType)[0]);
        const notes = nonEmptyString(row.notes || row.remarks || "");
        const dateInput = nonEmptyString(row.date || "");
        const timeInput = nonEmptyString(row.time || "");

        if (!detail || Number.isNaN(amount) || amount <= 0) {
            return;
        }

        const flowExists = FLOW_TYPES.some((item) => item.value === flowType);
        const finalFlow = flowExists ? flowType : "expense";

        let eventAtMs = Date.now();
        let eventAtIso = nowIso();
        let eventDateInput = "";
        let eventTimeInput = "";

        if (dateInput || timeInput) {
            const parsed = parseFlexibleDateTime(dateInput, timeInput || "00:00");
            if (!parsed) {
                return;
            }
            eventAtMs = parsed.eventAtMs;
            eventAtIso = parsed.eventAtIso;
            eventDateInput = parsed.eventDate;
            eventTimeInput = parsed.eventTime;
        }

        prepared.push({
            detail,
            amount,
            flowType: finalFlow,
            account,
            head,
            notes,
            eventAtMs,
            eventAtIso,
            eventDateInput,
            eventTimeInput
        });
    });

    if (!prepared.length) {
        alert("No valid rows found. Check CSV columns and data types.");
        return;
    }

    const startSequence = await allocateTransactionSequence(prepared.length);
    const batch = writeBatch(db);

    prepared.forEach((payload, index) => {
        const txSequence = startSequence + index;
        const txCode = buildTransactionCode(txSequence, state.user.uid, new Date(payload.eventAtMs));
        const rowRef = doc(userPath("transactions"));

        batch.set(rowRef, {
            ...payload,
            txSequence,
            txCode,
            isDeleted: false,
            createdAtMs: Date.now() + index,
            updatedAtMs: Date.now() + index,
            createdAtServer: serverTimestamp(),
            updatedAtServer: serverTimestamp(),
            auditTrail: [buildAuditEntry("create", "Bulk import")]
        });
    });

    await batch.commit();
    alert(`Imported ${prepared.length} transaction(s).`);
    refs.bulkCsvText.value = "";
    refs.bulkCsvFile.value = "";
}
function fillFormForAsset(asset) {
    refs.assetEditId.value = asset.id;
    refs.assetName.value = asset.name || "";
    refs.assetCategory.value = asset.category || "";
    refs.assetLocation.value = asset.location || "";
    refs.assetPurchaseDate.value = asset.purchaseDate || "";
    refs.assetPurchaseValue.value = toNumber(asset.purchaseValue, 0);
    refs.assetCurrentValue.value = toNumber(asset.currentValue, 0);
    refs.assetNotes.value = asset.notes || "";
    refs.cancelAssetEditBtn.classList.remove("hidden");
    switchTab("assetsTab");
}

function fillFormForLoan(loan) {
    refs.loanEditId.value = loan.id;
    refs.loanDirection.value = loan.direction || "given";
    refs.loanParty.value = loan.party || "";
    refs.loanPrincipal.value = toNumber(loan.principal, 0);
    refs.loanOutstanding.value = toNumber(loan.outstanding, 0);
    refs.loanInterestRate.value = toNumber(loan.interestRate, 0);
    refs.loanDueDate.value = loan.dueDate || "";
    refs.loanStatus.value = loan.status || "active";
    refs.loanNotes.value = loan.notes || "";
    refs.cancelLoanEditBtn.classList.remove("hidden");
    switchTab("loansTab");
}

function fillFormForBudget(budget) {
    refs.budgetEditId.value = budget.id;
    refs.budgetName.value = budget.name || "";
    refs.budgetAccount.value = budget.account || "";
    refs.budgetTarget.value = toNumber(budget.target, 0);
    refs.budgetCurrent.value = toNumber(budget.current, 0);
    refs.budgetMonthly.value = toNumber(budget.monthly, 0);
    refs.budgetDeadline.value = budget.deadline || "";
    refs.budgetNotes.value = budget.notes || "";
    refs.cancelBudgetEditBtn.classList.remove("hidden");
    switchTab("budgetsTab");
}

function handleTableAction(event) {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
        return;
    }

    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");

    if (!action || !id) {
        return;
    }

    if (action === "edit-tx") {
        const tx = state.transactions.find((item) => item.id === id);
        if (tx) {
            openTransactionModal(tx);
        }
        return;
    }

    if (action === "delete-tx") {
        deleteTransaction(id);
        return;
    }

    if (action === "edit-asset") {
        const asset = state.assets.find((item) => item.id === id);
        if (asset) {
            fillFormForAsset(asset);
        }
        return;
    }

    if (action === "delete-asset") {
        if (window.confirm("Delete this asset record?")) {
            deleteDoc(doc(db, "users", state.user.uid, "assets", id));
        }
        return;
    }

    if (action === "edit-loan") {
        const loan = state.loans.find((item) => item.id === id);
        if (loan) {
            fillFormForLoan(loan);
        }
        return;
    }

    if (action === "delete-loan") {
        if (window.confirm("Delete this loan record?")) {
            deleteDoc(doc(db, "users", state.user.uid, "loans", id));
        }
        return;
    }

    if (action === "edit-budget") {
        const budget = state.budgets.find((item) => item.id === id);
        if (budget) {
            fillFormForBudget(budget);
        }
        return;
    }

    if (action === "delete-budget") {
        if (window.confirm("Delete this budget fund?")) {
            deleteDoc(doc(db, "users", state.user.uid, "budgets", id));
        }
    }
}

function bindEvents() {
    refs.themeToggleBtn.addEventListener("click", toggleTheme);

    refs.tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            switchTab(button.getAttribute("data-tab-target"));
        });
    });

    refs.logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        clearUnlockSession();
        window.location.href = "index.html";
    });

    refs.openTransactionModalBtn.addEventListener("click", () => openTransactionModal());
    refs.closeTransactionModalBtn.addEventListener("click", closeTransactionModal);
    refs.transactionModal.addEventListener("click", (event) => {
        if (event.target === refs.transactionModal) {
            closeTransactionModal();
        }
    });

    refs.txFlowType.addEventListener("change", populateHeadForFlow);
    refs.transactionForm.addEventListener("submit", saveTransaction);

    refs.applyLedgerFiltersBtn.addEventListener("click", renderLedgerTable);
    refs.resetLedgerFiltersBtn.addEventListener("click", () => {
        refs.filterType.value = "";
        refs.filterAccount.value = "";
        refs.filterHead.value = "";
        refs.filterFromDate.value = "";
        refs.filterToDate.value = "";
        refs.filterSearch.value = "";
        renderLedgerTable();
    });

    refs.readBulkCsvFileBtn.addEventListener("click", () => {
        const file = refs.bulkCsvFile.files?.[0];
        if (!file) {
            alert("Select a CSV file first.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            refs.bulkCsvText.value = String(event.target?.result || "");
        };
        reader.readAsText(file);
    });

    refs.processBulkCsvBtn.addEventListener("click", processBulkCsvText);

    refs.assetForm.addEventListener("submit", saveAsset);
    refs.cancelAssetEditBtn.addEventListener("click", () => {
        refs.assetForm.reset();
        refs.assetEditId.value = "";
        refs.cancelAssetEditBtn.classList.add("hidden");
    });

    refs.loanForm.addEventListener("submit", saveLoan);
    refs.cancelLoanEditBtn.addEventListener("click", () => {
        refs.loanForm.reset();
        refs.loanEditId.value = "";
        refs.cancelLoanEditBtn.classList.add("hidden");
    });

    refs.budgetForm.addEventListener("submit", saveBudget);
    refs.cancelBudgetEditBtn.addEventListener("click", () => {
        refs.budgetForm.reset();
        refs.budgetEditId.value = "";
        refs.cancelBudgetEditBtn.classList.add("hidden");
    });

    refs.generateReportBtn.addEventListener("click", generateReport);
    refs.resetReportBtn.addEventListener("click", () => {
        refs.reportFromDate.value = "";
        refs.reportToDate.value = "";
        refs.reportType.value = "";
        refs.reportAccount.value = "";
        refs.reportHead.value = "";
        generateReport();
    });

    refs.exportCsvBtn.addEventListener("click", exportReportCsv);
    refs.exportPdfBtn.addEventListener("click", exportReportPdf);
    refs.exportPngBtn.addEventListener("click", () => exportReportImage("png"));
    refs.exportJpgBtn.addEventListener("click", () => exportReportImage("jpg"));
    refs.printReportBtn.addEventListener("click", printReport);

    refs.ledgerTableBody.addEventListener("click", handleTableAction);
    refs.recentTransactionsBody.addEventListener("click", handleTableAction);
    refs.assetsTableBody.addEventListener("click", handleTableAction);
    refs.loansTableBody.addEventListener("click", handleTableAction);
    refs.budgetsTableBody.addEventListener("click", handleTableAction);

    window.addEventListener("beforeunload", () => {
        state.unsubscribers.forEach((unsub) => unsub());
    });
}

async function bootstrapDashboard(user) {
    state.user = user;

    refs.userEmailPreview.textContent = user.email || user.uid;

    const profileRef = profilePath();
    await setDoc(profileRef, {
        email: user.email || "",
        displayName: user.displayName || "",
        lastDashboardOpenAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });

    await seedDefaultBudgetsIfEmpty();
    attachRealtimeListeners();

    refs.appShell.classList.remove("hidden");
}

function init() {
    setThemeFromStorage();
    populateStaticDropdowns();
    bindEvents();

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            clearUnlockSession();
            window.location.href = "auth.html?mode=login";
            return;
        }

        if (!checkUnlockSession(user)) {
            window.location.href = "auth.html?mode=login&next=dashboard.html";
            return;
        }

        await bootstrapDashboard(user);
    });
}

init();

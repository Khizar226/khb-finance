export const ACCOUNT_OPTIONS = [
    "Meezan Bank",
    "Alfalah Bank",
    "HBL Bank",
    "NayaPay Wallet",
    "SadaPay Wallet",
    "JazzCash",
    "EasyPaisa",
    "Cash Wallet",
    "Family Cash",
    "Investment Broker"
];

export const FLOW_TYPES = [
    { value: "income", label: "Income", impact: 1 },
    { value: "expense", label: "Expense", impact: -1 },
    { value: "loan_given", label: "Loan Given", impact: -1 },
    { value: "loan_taken", label: "Loan Taken", impact: 1 },
    { value: "loan_repayment_paid", label: "Loan Repayment Paid", impact: -1 },
    { value: "loan_repayment_received", label: "Loan Repayment Received", impact: 1 },
    { value: "asset_purchase", label: "Asset Purchase", impact: -1 },
    { value: "asset_sale", label: "Asset Sale", impact: 1 },
    { value: "transfer_in", label: "Transfer In", impact: 1 },
    { value: "transfer_out", label: "Transfer Out", impact: -1 },
    { value: "adjustment", label: "Balance Adjustment", impact: 0 }
];

export const FLOW_HEADS = {
    income: [
        "Salary",
        "Client Payment",
        "Business Income",
        "Freelancing",
        "Digital Marketing",
        "Investment Return",
        "Family Support",
        "Other Income"
    ],
    expense: [
        "Food & Groceries",
        "Fuel & Transport",
        "Rent & Utilities",
        "Family Expense",
        "Kids Education",
        "Medical",
        "Travel",
        "Charity",
        "Personal Shopping",
        "Other Expense"
    ],
    loan_given: ["Personal Loan Given", "Business Loan Given", "Family Loan Given"],
    loan_taken: ["Personal Loan Taken", "Bank Loan Taken", "Credit Due"],
    loan_repayment_paid: ["Loan Installment Paid", "Loan Principal Paid", "Loan Interest Paid"],
    loan_repayment_received: ["Loan Installment Received", "Loan Principal Received", "Loan Interest Received"],
    asset_purchase: ["Real Estate", "Gold", "Vehicle", "Electronics", "Investment Asset", "Other Asset"],
    asset_sale: ["Real Estate Sale", "Gold Sale", "Vehicle Sale", "Asset Liquidation"],
    transfer_in: ["From Another Account", "Cash Deposit", "Wallet Transfer In"],
    transfer_out: ["To Another Account", "Cash Withdrawal", "Wallet Transfer Out"],
    adjustment: ["Opening Balance", "Manual Correction", "Reconciliation"]
};

export const BUDGET_FUND_SUGGESTIONS = [
    "Emergency Fund",
    "Family Education Fund",
    "Travel Fund",
    "Future Investment Fund",
    "Savings Fund",
    "Charity Fund",
    "Health Reserve",
    "Business Growth Fund"
];

export const TAB_TITLES = {
    dashboardTab: "Dashboard Summary",
    ledgerTab: "Ledger Entries",
    assetsTab: "Assets Register",
    loansTab: "Loan Management",
    budgetsTab: "Fund Planning",
    reportsTab: "Reports & Export"
};

export function getFlowByValue(flowValue) {
    return FLOW_TYPES.find((item) => item.value === flowValue) || FLOW_TYPES[0];
}

export function getHeadsForFlow(flowValue) {
    return FLOW_HEADS[flowValue] || FLOW_HEADS.expense;
}

export function getAllHeads() {
    const headSet = new Set();
    Object.values(FLOW_HEADS).forEach((arr) => {
        arr.forEach((head) => headSet.add(head));
    });
    return Array.from(headSet).sort((a, b) => a.localeCompare(b));
}

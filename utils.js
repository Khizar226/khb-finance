const PKR_FORMATTER = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
});

export function formatPKR(value) {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return PKR_FORMATTER.format(amount);
}

export function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function nowIso() {
    return new Date().toISOString();
}

export function escapeHtml(input) {
    return String(input ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function parseDatePart(dateStr) {
    const clean = String(dateStr || "").trim();
    if (!clean) {
        return null;
    }

    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        return {
            year: Number(isoMatch[1]),
            month: Number(isoMatch[2]),
            day: Number(isoMatch[3])
        };
    }

    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
        return {
            year: Number(dmyMatch[3]),
            month: Number(dmyMatch[2]),
            day: Number(dmyMatch[1])
        };
    }

    return null;
}

function parseTimePart(timeStr) {
    const clean = String(timeStr || "").trim();
    if (!clean) {
        return { hour: 0, minute: 0 };
    }

    const hhmm = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
        return {
            hour: Number(hhmm[1]),
            minute: Number(hhmm[2])
        };
    }

    const hhmmampm = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (hhmmampm) {
        let hour = Number(hhmmampm[1]);
        const minute = Number(hhmmampm[2]);
        const ampm = hhmmampm[3].toLowerCase();
        if (ampm === "pm" && hour < 12) {
            hour += 12;
        }
        if (ampm === "am" && hour === 12) {
            hour = 0;
        }
        return { hour, minute };
    }

    return null;
}

export function parseFlexibleDateTime(dateInput, timeInput) {
    const datePart = parseDatePart(dateInput);
    const timePart = parseTimePart(timeInput);

    if (!datePart || !timePart) {
        return null;
    }

    const candidate = new Date(
        datePart.year,
        datePart.month - 1,
        datePart.day,
        timePart.hour,
        timePart.minute,
        0,
        0
    );

    if (Number.isNaN(candidate.getTime())) {
        return null;
    }

    return {
        eventAtMs: candidate.getTime(),
        eventAtIso: candidate.toISOString(),
        eventDate: `${String(datePart.year).padStart(4, "0")}-${String(datePart.month).padStart(2, "0")}-${String(datePart.day).padStart(2, "0")}`,
        eventTime: `${String(timePart.hour).padStart(2, "0")}:${String(timePart.minute).padStart(2, "0")}`
    };
}

export function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("en-PK", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function formatDate(value) {
    if (!value) {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

export async function hashText(input) {
    const data = new TextEncoder().encode(String(input));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomChunk(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

export function generateRecoveryCodes(count = 8) {
    const codes = [];
    while (codes.length < count) {
        const code = `${randomChunk(5)}-${randomChunk(5)}`;
        if (!codes.includes(code)) {
            codes.push(code);
        }
    }
    return codes;
}

export function downloadTextFile(filename, text, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function uidShort(uid) {
    return String(uid || "USER").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase().padEnd(4, "X");
}

export function buildTransactionCode(sequence, uid, date = new Date()) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const seq = String(sequence).padStart(7, "0");
    return `TXN-${yy}${mm}-${uidShort(uid)}-${seq}`;
}

export function monthKey(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseCsvLine(line) {
    const out = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === "\"") {
            if (inQuotes && line[i + 1] === "\"") {
                current += "\"";
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === "," && !inQuotes) {
            out.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    out.push(current);
    return out.map((cell) => cell.trim());
}

export function parseCsvText(csvText) {
    const lines = String(csvText || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [];
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
        const values = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ?? "";
        });
        rows.push(row);
    }

    return rows;
}

export function csvEscape(value) {
    const raw = String(value ?? "");
    if (!raw.includes(",") && !raw.includes("\"") && !raw.includes("\n")) {
        return raw;
    }
    return `"${raw.replaceAll("\"", "\"\"")}"`;
}

export function toCsvString(rows, columns) {
    const header = columns.join(",");
    const body = rows
        .map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","))
        .join("\n");
    return `${header}\n${body}`;
}

export function nonEmptyString(value) {
    return String(value ?? "").trim();
}

export function arrayToOptions(values, labelFormatter = (value) => value) {
    return values.map((value) => `<option value=\"${escapeHtml(value)}\">${escapeHtml(labelFormatter(value))}</option>`).join("");
}

export function cleanPrice(text) {
    if (!text || typeof text !== 'string') return NaN;

    let raw = String(text).trim();
    if (!raw.length) return NaN;

    raw = raw
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/^(R\$|\$|USD|EUR|£|€|\s)*/i, '')
        .replace(/\s+/g, '')
        .replace(/,/g, '.')
        .replace(/\.(?=.*\.)/g, '')
        .replace(/[^0-9.\-]/g, '')
        .replace(/\.$/, '');
    
    if (!raw) return NaN;

    const price = parseFloat(raw);
    if (isNaN(price) || price < 0) return NaN;

    return Number(price.toFixed(2));
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const colors = {
        info: "\x1b[36m", success: "\x1b[32m",
        error: "\x1b[31m", warn: "\x1b[33m"
    };
    console.log(`${colors[type] || ''}[${timestamp}] ${message}\x1b[0m`);
}
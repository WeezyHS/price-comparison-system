export function cleanPrice(text) {
    return parseFloat(
        text
            .replace("R$", "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    );
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
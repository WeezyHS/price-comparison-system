import cron from 'node-cron';
import { log } from '../utils/priceUtils.js';
import { KabumScraper } from '../scrapers/kabumScraper.js';
import { saveBatch } from '../models/priceModel.js';

const MONITORED_URLS = [
    'https://www.kabum.com.br/produto/747518/monitor-gamer-asus-tuf-27-full-hd-240hz-0-3ms-fast-ips-vrr-g-sync-comp-freesync-premium-hdr10-som-integrado-preto-vg279qm5a',
];

export async function runScraperJob() {
    log('Iniciando job de scraping...', 'info');
    const startTime = Date.now();

    try {
        const kabum = new KabumScraper();
        const products = await kabum.scrapeMany(MONITORED_URLS);
        log(`${products.length} produtos extraindo. Salvando...`, 'info');

        const saved = await saveBatch(products);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`Job finalizado! ${saved.length}/${products.length} salvos em ${duration}s`, 'success');
    } catch (err) {
        log(`Job falhou: ${err.message}`, 'error');
    }
}

export function startCronScheduler() {
    const schedule = process.env.CRON_SCHEDULE || '0 */6 * * *';
    if (!cron.validate(schedule)) throw new Error(`Expressão cron inválida: ${schedule}`);

    log(`Cron agendado com: "${schedule}" (America/Sao_Paulo)`, 'info');
    return cron.schedule(schedule, async () => await runScraperJob(), {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
    });
}
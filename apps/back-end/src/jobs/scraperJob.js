import cron from 'node-cron';
import { log } from '../utils/priceUtils.js';
import { getScraperForStore } from '../scrapers/scraperFactory.js';
import { saveScrapedProduct, getMonitoredProducts, updateProductStatus } from '../models/priceModel.js';

export async function runScraperJob() {
    log('Iniciando job de scraping...', 'info');
    const startTime = Date.now();

    try {
        const productsToScrape = await getMonitoredProducts();

        if (productsToScrape.length === 0) {
            log('Nenhum produto monitorado encontrado no banco. Saindo...', 'warn');
            return { total: 0, success: 0, failed: 0 };
        }

        log(`${productsToScrape.length} produto(s) monitorado(s) carregado(s) do banco`, 'info');

        const report = { total: productsToScrape.length, success: 0, failed: 0, items: [] };

        for (const item of productsToScrape) {
            try {
                log(`Processando id=${item.id} | loja=${item.store} | url=${item.url.slice(0, 60)}...`, 'info');

                const scraper = getScraperForStore(item.store);
                const scrapedProduct = await scraper.scrapeProduct(item.url);

                await saveScrapedProduct(scrapedProduct);
                await updateProductStatus(item.id, 'active');
                report.success++;
            } catch (err) {
                log(`Falha no produto id=${item.id}: ${err.message}`, 'error');
                await updateProductStatus(item.id, 'error');
                report.failed++;
                report.items.push({ id: item.id, error: err.message });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`Job finalizado! Total: ${report.total} | Sucesso: ${report.success} | Falha: ${report.failed} | Tempo: ${duration}s`, report.failed === 0 ? 'success' : 'warn');
        return report;
    } catch (err) {
        log(`Job falhou de forma geral: ${err.message}`, 'error');
        throw err;
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
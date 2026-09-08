import 'dotenv/config';
import { log } from './src/utils/priceUtils.js';
import { startCronScheduler, runScraperJob } from './src/jobs/scraperJob.js';

const args = process.argv.slice(2);

async function main() {
    log('=================================', 'info');
    log('Price Comparison System - Back-end', 'info');
    log('=================================', 'info');

    if (args.includes('--once')) {
        log('Modo: execução única (--once)', 'info');
        await runScraperJob();
        process.exit(0);
    }

    await runScraperJob();
    startCronScheduler();
    log('Aguardando próximas execuções...(Ctrl + C para sair)', 'info');
}

main().catch(err => {
    log(`Fatal: ${err.message}`, 'error');
    process.exit(1);
});
import 'dotenv/config';
import { log } from './src/utils/priceUtils.js';
import { startCronScheduler, runScraperJob } from './src/jobs/scraperJob.js';
import { startServer } from './src/server.js';

const args = process.argv.slice(2);

async function main() {
    log('=================================', 'info');
    log('Price Comparison System - Back-end', 'info');
    log('=================================', 'info');

    startServer();

    if (args.includes('--once')) {
        log('Modo: execução única (--once)', 'info');
        await runScraperJob();
        // process.exit(0);
        log('Execução única finalizada. API continua ativa em http://localhost:3001 (Ctrl + C pra sair)', 'warn');
        return;
    }

    await runScraperJob();
    startCronScheduler();
    log('Aguardando próximas execuções...(Ctrl + C para sair)', 'info');
}

main().catch(err => {
    log(`Fatal: ${err.message}`, 'error');
    process.exit(1);
});
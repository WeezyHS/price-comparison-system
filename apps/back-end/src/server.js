import express from 'express';
import cors from 'cors';
import { log } from './utils/priceUtils.js';
import { detectStoreFromUrl, getScraperForUrl } from './scrapers/scraperFactory.js';
import { runScraperJob } from './jobs/scraperJob.js';
import { createPendingProduct, saveScrapedProduct, updateProductStatus } from './models/priceModel.js';
import { supabase } from './config/supabase.js';

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function startServer() {
    const app = express();

    app.use(cors({ origin: FRONTEND_URL, credentials: true }));
    app.use(express.json({ limit: '1mb' }));

    app.use((req, res, next) => {
        log(`HTTP ${req.method} ${req.url}`, 'info');
        next();
    });

    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime_s: Math.floor(process.uptime())
        });
    });

    app.get('/api/products', async (req, res) => {
        try {
            const { store, sort = 'last_scraped_at', limit = 100 } = req.query;

            let query = supabase
                .from('vw_products_latest_price')
                .select('*')
                .order(sort, { ascending: false });
            
            if (store) query = query.eq('store', store);
            if (limit) query = query.limit(Number(limit));

            const { data, error } = await query;
            if (error) throw error;

            res.json({ total: data.length, store_filter: store || null, data });
        } catch (err) {
            log(`GET /api/products ERROR: ${err.message}`, 'error');
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/products/:id/history', async (req, res) => {
        try {
            const { id } =req.params;
            const { limit = 30 } = req.query;

            const { data, error } = await supabase
                .from('price_history')
                .select('*')
                .eq('product_id', Number(id))
                .order('scraped_at', { ascending: false })
                .limit(Number(limit));

            if (error) throw error;
            res.json({ product_id: Number(id), points: data.length, data });
        } catch (err) {
            log(`GET /api/products/${id}/history ERROR: ${err.message}`, 'error');
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/scrape', async (req, res) => {
        const startedAt = new Date().toISOString();
        log(`[API] POST /api/scrape recebido`, 'warn');
        res.status(202).json({
            status: 'accepted',
            message: 'Job iniciado em background!',
            started_at: startedAt,
            check_back_in: '5 segundos'
        });
        runScraperJob().catch(err => log(`[API] Job bg falhou: ${err.message}`, 'error'));
    });

    app.post('/api/monitor-url', async (req, res) => {
        try {
            const { url } = req.body || {};
            if (!url || typeof url !== 'string') {
                return res.status(400).json({ error: 'Body obrigatório: { "url": "https://..." }' });
            }

            //Fast validate
            const store = detectStoreFromUrl(url);
            if (!store) {
                return res.status(400).json({
                    error: 'Loja não suportada ainda.',
                    supported_stores: ['Kabum', 'Amazon', 'MercadoLivre', 'Pichau']
                });
            }

            // const record = await createPendingProduct(url, store);

            // log(`✅ Produto adicionado para monitoramento: ${url.slice(0, 60)}... (${store})`, 'success');
            
            log(`[API] Novo pedido de monitoramento: ${url.slice(0, 70)}... (${store})`, 'warn');
            log(`Tentando coletar dados do produto IMEDIATAMENTE...`, 'info');

            let saved = null;
            let scrapeError = null;

            try {
                const scraper = getScraperForUrl(url);
                const scrapedProduct = await scraper.scrapeProduct(url);

                saved = await saveScrapedProduct(scrapedProduct);
                log(`[API] Sucesso! Produto "${saved.product.title.slice(0, 50)}" gravado com preço R$ ${scrapedProduct.price.toFixed(2)}`, 'success');
            } catch (scrapeErr) {
                scrapeError = scrapeErr.message;
                log(`[API] Falha no scraping imediato: ${scrapeErr.message}. Produto será CADASTRADO MESMO ASSIM para o cron tentar em 6h.`, 'warn');
                const pending = await createPendingProduct(url, store, 'error');
                saved = { product: pending, priceRecord: null };
            }

            if (scrapeError) {
                return res.status(202).json({
                    status: 'created_scheduled',
                    scraped_now: false,
                    message: 'Produto cadastrado para monitoramento! Não conseguimos coletar os dados agora, mas tentaremos novamente em até 6 horas.',
                    scrape_error: scrapeError,
                    store,
                    product: saved.product
                })
            }

            res.status(201).json({
                status: 'created_and_scraped',
                scraped_now: true,
                message: 'Produto adicionado e coletado com sucesso! Já está na lista de monitoramento (6/6h).',
                store,
                product: saved.product,
                latest_price: saved.priceRecord
            });
        } catch (err) {
            log(`POST /api/monitor-url ERROR: ${err.message}`, 'error');
            res.status(500).json({ error: err.message });
        }
    });

    app.listen(PORT, () => {
            log(`🚀 API Express rodando em http://localhost:${PORT}`, 'success');
            log(`   CORS liberado para ${FRONTEND_URL}`, 'info');
            log(`   GET  /api/health`, 'info');
            log(`   GET  /api/products`, 'info');
            log(`   GET  /api/products/:id/history`, 'info');
            log(`   POST /api/scrape`, 'info');
            log(`   POST /api/monitor-url   [NOVO - adicionar produto]`, 'info');
    });

    return app;
}
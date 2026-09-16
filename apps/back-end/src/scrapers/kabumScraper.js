import fs from 'node:fs';
import path from 'node:path';
import { BaseScraper } from './baseScraper.js';
import { cleanPrice, log, delay } from '../utils/priceUtils.js';
import { STORES } from '@ps/shared';

const PRICE_SELECTORS = [
    // ====== MAIS CONFIÁVEIS (SEO / JSON-LD - a Kabum NÃO PODE MUDAR) ======
    { type: 'jsonld', desc: 'JSON-LD offers.price (SEO Google)' },
    { type: 'meta',   desc: 'meta[itemprop=price]',             css: 'meta[itemprop="price"]',             attr: 'content' },
    { type: 'meta',   desc: 'product:price:amount og',         css: 'meta[property="product:price:amount"]',attr: 'content' },
    { type: 'meta',   desc: 'og:price:amount',                 css: 'meta[property="og:price:amount"]',    attr: 'content' },
    { type: 'meta',   desc: 'meta[itemprop=lowPrice]',          css: 'meta[itemprop="lowPrice"]',           attr: 'content' },
    // ====== ATRIBUTOS DE PREÇO (HTML data-*) ======
    { type: 'attr',   desc: '[data-price]',                    css: '[data-price]',                         attr: 'data-price' },
    { type: 'attr',   desc: '[data-preco]',                    css: '[data-preco]',                         attr: 'data-preco' },
    { type: 'attr',   desc: '[data-value] em preço',           css: '[class*="price"][data-value]',       attr: 'data-value' },
    { type: 'attr',   desc: 'span.price-tag [data-price]',     css: 'span.price-tag [data-price]',          attr: 'data-price' },
    // ====== CLASSES TEXTO (Kabum usa hoje) ======
    { type: 'text',   desc: '.final-price',                    css: '.final-price' },
    { type: 'text',   desc: '.price-card',                     css: '.price-card .price' },
    { type: 'text',   desc: '.preco-avista',                   css: '.preco-avista' },
    { type: 'text',   desc: '.preco_desconto_avista',          css: '.preco_desconto_avista' },
    { type: 'text',   desc: '.product-price',                  css: '.product-price' },
    { type: 'text',   desc: '.price-current',                  css: '.price-current' },
    { type: 'text',   desc: '#produto_preco_avista',           css: '#produto_preco_avista' },
    { type: 'text',   desc: '.sc-kpDqfm.bsPpDv (Tailwind dinâmico)', css: '[class*="sc-"][class*="price"]' },
    { type: 'text',   desc: 'span[data-tipi="price"]',       css: 'span[data-tipi="price"]' },
    { type: 'text',   desc: 'h4.text-secondary-500 (LEGACY)',  css: 'h4.text-secondary-500' },
];

const TITLE_SELECTORS = [
    { desc: 'meta[og:title]', css: 'meta[property="og:title"]', attr: 'content' },
    { desc: 'h1 padrao', css: 'h1' },
    { desc: '#product-title', css: '#product-title' },
];

export class KabumScraper extends BaseScraper {
    constructor() {
        super(STORES.KABUM);
    }

    _pick($, selectors, $root = null) {
        const root = $root || $;

        for (const sel of selectors) {
            try {
                const el = sel.attr ? root(sel.css).first() : root(sel.css).first();
                const raw = sel.attr ? el.attr(sel.attr) : el.text();
                if (raw && typeof raw === 'string' && raw.trim().length > 0) {
                    log(`Match [${sel.desc}]`, 'info');
                    return raw.trim();
                }
            } catch {}
        }
        return null;
    }

    async scrapeProduct(url) {
        const slug = new URL(url).pathname.split('/')[3] || url.slice(0, 40);
        log(`Scrapeando Kabum: ${slug}`, 'info');
        const $ = await this.fetchHTML(url);

        // const title = $('h1').first().text().trim();
        // const priceText = $('h4.text-secondary-500').first().text().trim();
        // const price = cleanPrice(priceText);
        // const externalId = url.split('/')[4] || null;

        //Debug mode
        if (process.env.SCRAPE_DEBUG === 'true') {
            try {
                const debugDir = path.resolve('debug');
                fs.mkdirSync(debugDir, { recursive: true });
                const file = path.join(debugDir, `kabum-${Date.now()}-${Math.floor(Math.random()*999)}.html`);
                fs.writeFileSync(file, $.root().html());
                log(`[DEBUG] HTML bruto salvo em ${file}`, 'warn');
            } catch (err) {
                log(`[DEBUG] Falha ao salvar HTML: ${err.message}`, 'warn');
            }
        }

        const title = this._pick($, TITLE_SELECTORS);

        let price = NaN;

        try {
            const scripts = $('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                const rawText = $(scripts[i]).contents().text()?.trim();
                if (!rawText) continue;
                const chunks = rawText.startsWith('[') ? JSON.parse(rawText) : [JSON.parse(rawText)];
                for (const chunk of chunks) {
                    const offer = chunk?.offers?.price
                        || chunk?.offers?.[0]?.price
                        || chunk?.offers?.lowPrice
                        || chunk?.offers?.highPrice;
                    if (offer) {
                        const candidate = cleanPrice(String(offer));
                        if (!isNaN(candidate) && candidate > 0) {
                            log(`💰 Preço encontrado via [JSON-LD offers.price (SEO Google)] = R$ ${candidate.toFixed(2)}`, 'success');
                            price = candidate;
                            break;
                        }
                    }
                    // Produto aninhado tipo Product/Offer
                    if (chunk?.['@type'] === 'Product') {
                        const titleLd = chunk.name;
                        if (titleLd && (!title || title.length < 15)) {
                            log(`💡 Título atualizado via JSON-LD: ${titleLd.slice(0,60)}`, 'info');
                        }
                    }
                }
                if (!isNaN(price)) break;
            }
        } catch (err) {
            log(`[JSON-LD] fallback para seletores: ${err.message}`, 'warn');
        }

        // ==================================================
        // 2. FALLBACK: loop de seletores (meta tags + classes CSS)
        // ==================================================
        if (isNaN(price)) {
            for (const sel of PRICE_SELECTORS) {
                if (sel.type === 'jsonld') continue; // JSON-LD já tentamos acima
                try {
                    const raw = sel.attr ? $(sel.css).first().attr(sel.attr) : $(sel.css).first().text();
                    if (!raw) continue;
                    const candidate = cleanPrice(raw);
                    if (!isNaN(candidate) && candidate > 0) {
                        log(`💰 Preço encontrado via seletor: [${sel.desc}] = R$ ${candidate.toFixed(2)}`, 'success');
                        price = candidate;
                        break;
                    }
                } catch {}
            }
        }

        const externalId = url.split('/').filter(tok => /^\d+$/.test(tok.trim()))[0] || null;

        if (!title || isNaN(price)) {
            throw new Error(`Dados incompletos: title=${title ? title.slice(0, 40) : 'NULL'}, price=${price}`);
        }

        return {
            title,
            price,
            url,
            store: this.storeName,
            external_id: externalId,
            scraped_at: new Date().toISOString()
        };
    }
}
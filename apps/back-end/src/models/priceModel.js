import { supabase } from '../config/supabase.js';
import { log } from '../utils/priceUtils.js';

export async function upsertProduct(productData, extraFields = {}) {
    const { data: product, error: productError } = await supabase
        .from('products')
        .upsert({
            title: productData.title,
            url: productData.url,
            store: productData.store,
            external_id: productData.external_id,
            status: 'active',
            monitored: true,
            ...extraFields
        }, { onConflict: 'url' })
        .select()
        .single();

        if (productError) throw productError;
        return product;
}

export async function savePrice(productId, price, scrapedAt) {
    const { data, error } = await supabase
        .from('price_history')
        .insert({ product_id: productId, price, scraped_at: scrapedAt })
        .select()
        .single();

        if (error) throw error;
        return data;
}

export async function saveScrapedProduct(productData) {
    try {
        const product = await upsertProduct(productData);
        const priceRecord = await savePrice(product.id, productData.price, productData.scraped_at);
        log(`${productData.store} - R$ ${productData.price.toFixed(2)} - ${productData.title.slice(0, 50)}...`, 'success');
        return { product, priceRecord };
    } catch (err) {
        log(`Erro ao salvar ${productData.url}: ${err.message}`, 'error');
        throw err;
    }
}

export async function saveBatch(products) {
    const results = [];
    for (const p of products) {
        try { results.push(await saveScrapedProduct(p)); } catch {}
    }
    return results;
}

export async function createPendingProduct(url, store, status = 'pending') {
    const { data, error } = await supabase
        .from('products')
        .insert({
            title: 'Aguardando primeira coleta...',
            url,
            store,
            external_id: null,
            status,
            monitored: true
        })
        .select()
        .single();

        if (error) throw error;
        return data;
}

export async function getMonitoredProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, url, store, status, title')
        .eq('monitored', true)
        .order('id', { ascending: true });
    
    if (error) throw error;
    return data || [];
}

export async function updateProductStatus(productId, status) {
    const { error } = await supabase
        .from('products')
        .update({ status })
        .eq('id', productId);

        if (error) throw error;
}
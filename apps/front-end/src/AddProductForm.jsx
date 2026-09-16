import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('[AddProductForm] API_URL usada:', API_URL);

async function addProduct(url) {
    const response = await fetch(`${API_URL}/api/monitor-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.error || 'Erro ao adicionar produto!');
    }
    return body;
}

function AddProductForm() {
    const [url, setUrl] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: addProduct,
        onSuccess: (data) => {
            setUrl('');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            if (data.scraped_now) {
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                }, 300);
            }
        },
    });

    function handleSubmit(e) {
        e.preventDefault();
        if (!url.trim()) return;
        mutation.reset();
        mutation.mutate(url.trim());
    }

    function renderSuccessMessage() {
        const data = mutation.data || {};

        if (data.scraped_now || data.status === 'created_and_scraped') {
            const price = data.latest_price?.price ? `R$ ${Number(data.latest_price.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;

            return (
                <div>
                    <strong>Produto adicionado e coletado com sucesso!</strong>
                    <p>Já está na lista de monitoramento automático (a cada 6h). {price && <span>Primeiro preço registrado: {price}</span>}</p>
                </div>
            );
        }

        if (data.status === 'created_scheduled') {
            return (
                <div>
                    <strong>Produto cadastrado para monitoramento!</strong>
                    <p>Não conseguimos coletar os dados <strong>agora</strong>, mas ele já está na lista! O sistema tentará novamente automaticamente em até <strong>6 horas</strong>.</p>
                    {data.scrape_error && (<p>Detalhe da falha: <code>{data.scrape_error}</code></p>)}
                </div>
            );
        }
        return <p>Produto adicionado!</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="">
            <label htmlFor="product-url" className="font-semibold">Adicionar produto para monitorar</label>
            <p className="font-semibold">Cole o link abaixo. O sistema pega os dados do produto e agenda novas coletas automáticas a cada 6 horas.</p>
            <div className="flex flex-col items-center mb-5 mt-3">
                <input id="product-url" type="url" required placeholder="Ex: https://www.kabum.com.br/produto/..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={mutation.isPending} className="w-220 rounded-md bg-white/5 px-2 text-white outline-1 outline-white/10 mb-4" />
                <button type="submit" disabled={mutation.isPending || !url} className="text-white font-semibold cursor-pointer bg-red-600 hover:bg-green-600 w-25 py-1 rounded-md outline-1 outline-black">{mutation.isPending ? 'Coletando dados...' : 'Adicionar'}</button>
            </div>

            {mutation.isError && (
                <div className="">
                    <strong className="">Erro ao adicionar</strong>
                    <p className="">{mutation.error?.message || 'Falha ao adicionar!'}</p>
                </div>
            )}
        </form>
    );
}

export default AddProductForm;
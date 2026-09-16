import { useQuery } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import AddProductForm from './AddProductForm';

function formatPrice(price) {
  return Number(price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function Badge({ store }) {
  const colors = {
    Kabum: 'store-kabum',
    Amazon: 'store-amazon',
    MercadoLivre: 'store-ml',
    Pichau: 'store-pichau',
  };
  return (
    <span className={`badge ${colors[store] || 'badge-default'}`}>
      {store}
    </span>
  );
}

function App() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_products_latest_price')
        .select('*')
        .order('last_scraped_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },
  });

  return (
    <div className="">
      <header className="">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Comparação de Preços</h1>
        </div>
      </header>
      
      <AddProductForm />
      <button onClick={() => refetch()} className="bg-blue-600 font-semibold text-white py-1 w-25 mb-4 rounded cursor-pointer outline-1 outline-black">Atualizar</button>

      <p>----------------------------------------------------------------------------------------------</p>

      {isLoading && (
        <div className="">
          <div className="">Carregando preços de produtos...</div>
        </div>
      )}

      {!isLoading && error && (
        <div className="">
          Erro ao carregar preços: {error.message}
          <button onClick={() => refetch()} className="">Tentar novamente</button>
        </div>
      )}

      {!isLoading && !error && data.length === 0 && (
        <div className="font-semibold">Nenhum produto monitorado ainda!</div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <>
          <div className="mb-6">
            <div>Quantidade: <strong>{data.length}</strong> produto(s)</div>
            <div>Quantidade: <strong>{new Set(data.map(p => p.store)).size}</strong> loja(s)</div>
            <div className="flex gap-2 items-center">
            <p className="font-semibold">Última coleta:</p>
            <strong>{formatDate(data[0]?.last_scraped_at)}</strong>
            </div>
          </div>
          <div>
            {data.map((product) => (
              <a key={product.url}>
                <div className="font-semibold">
                  <Badge store={product.store} className="" />
                  <span className="">{formatPrice(product.last_price)}</span>
                </div>
                <h3 title={product.title} className="font-semibold">Descrição: {product.title}</h3>
                <footer className="">
                  <span className="font-semibold">Última atualização: <time>{formatDate(product.last_scraped_at)}</time></span>
                </footer>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App

import { obterPeriodoBalanco } from './balancoService';

// Série SGS 4390: Selic acumulada no mês, em percentual ao mês.
export async function consultarSelicMensal(dataSelecionada, signal, agora = new Date()) {
    if (!Number.isFinite(dataSelecionada?.getTime()) || !Number.isFinite(agora?.getTime())) throw new Error('Período inválido para consultar a Selic.');
    const { fim } = obterPeriodoBalanco(dataSelecionada);
    // A série mensal não informa o dia de corte de uma eventual publicação parcial.
    const limite = new Date(Math.min(fim.getTime(), new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()));
    const inicio = new Date(limite.getFullYear(), limite.getMonth() - 12, 1);
    const formatarData = (data) => `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
    const valores = new Map();
    const consultar = async (de, ate) => {
        const ultimoDia = new Date(ate.getFullYear(), ate.getMonth(), 0);
        const parametros = new URLSearchParams({ formato: 'json', dataInicial: formatarData(de), dataFinal: formatarData(ultimoDia) });
        const resposta = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?${parametros}`, { signal });
        if (!resposta.ok) throw new Error('Não foi possível consultar a Selic. Tente novamente.');
        const registros = await resposta.json();
        if (!Array.isArray(registros)) throw new Error('A consulta da Selic retornou dados inválidos.');
        registros.forEach((registro) => {
            const partes = typeof registro?.data === 'string' && registro.data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            const valor = typeof registro?.valor === 'string' && /^-?\d+(\.\d+)?$/.test(registro.valor) ? Number(registro.valor) : NaN;
            if (!partes || !Number.isFinite(valor)) throw new Error('A consulta da Selic retornou dados inválidos.');
            const [, dia, mes, ano] = partes.map(Number);
            const data = new Date(ano, mes - 1, dia);
            if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
                throw new Error('A consulta da Selic retornou dados inválidos.');
            }
            if (data < de || data >= ate) return;
            const chave = new Date(ano, mes - 1, 1).getTime();
            if (valores.has(chave)) throw new Error('A consulta da Selic retornou meses duplicados.');
            valores.set(chave, valor);
        });
    };
    await consultar(inicio, limite);
    if (!valores.size) return { taxas: Array(12).fill(null), dataFinal: null };
    const dataFinal = new Date(Math.max(...valores.keys()));
    const inicioComparacao = new Date(dataFinal.getFullYear(), dataFinal.getMonth() - 11, 1);
    // Se a última publicação atrasar, completa apenas os meses anteriores à janela consultada.
    if (inicioComparacao < inicio) await consultar(inicioComparacao, inicio);
    // Ausência de publicação não significa uma taxa de zero.
    return { dataFinal, taxas: Array.from({ length: 12 }, (_, indice) => {
        const data = new Date(inicioComparacao.getFullYear(), inicioComparacao.getMonth() + indice, 1);
        return valores.get(data.getTime()) ?? null;
    }) };
}

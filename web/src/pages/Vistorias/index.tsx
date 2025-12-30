import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { formatCurrency } from '@/lib/utils';
import type { Vistoria, Fechamento } from '@/types';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'IMPORTADA', label: 'Importada' },
  { value: 'CALCULADA', label: 'Calculada' },
  { value: 'CONTESTADA', label: 'Contestada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'FATURADA', label: 'Faturada' },
];

export function VistoriasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [fechamentoId, setFechamentoId] = useState(searchParams.get('fechamentoId') || '');

  const { data: fechamentos } = useQuery({
    queryKey: ['fechamentos-select'],
    queryFn: async () => {
      const response = await api.get('/fechamentos', { params: { limit: 20 } });
      return response.data.data as Fechamento[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vistorias', { search, status, fechamentoId }],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (fechamentoId) params.fechamentoId = fechamentoId;

      const response = await api.get('/vistorias', { params });
      return response.data.data as Vistoria[];
    },
  });

  const fechamentoOptions = [
    { value: '', label: 'Todos os fechamentos' },
    ...(fechamentos?.map(f => ({
      value: f.id,
      label: `${f.mesReferencia.toString().padStart(2, '0')}/${f.anoReferencia}`,
    })) || []),
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vistorias</h1>
        <p className="text-gray-500">Visualizar e gerenciar vistorias</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por endereço, ID KSI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="w-48">
          <Select
            value={fechamentoId}
            onChange={(e) => {
              setFechamentoId(e.target.value);
              setSearchParams(e.target.value ? { fechamentoId: e.target.value } : {});
            }}
            options={fechamentoOptions}
          />
        </div>

        <div className="w-40">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Lista */}
      {data && data.length > 0 ? (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>ID KSI</th>
                <th>Imobiliária</th>
                <th>Vistoriador</th>
                <th>Endereço</th>
                <th>Cidade</th>
                <th>Tipo</th>
                <th className="text-right">Área</th>
                <th className="text-right">Valor Serv.</th>
                <th className="text-right">Valor Vist.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((vistoria) => (
                <tr key={vistoria.id}>
                  <td className="font-mono text-xs">{vistoria.idKsi}</td>
                  <td>{vistoria.imobiliaria?.nome || '-'}</td>
                  <td>{vistoria.vistoriador?.nome || '-'}</td>
                  <td className="max-w-[200px] truncate" title={vistoria.endereco}>
                    {vistoria.endereco}
                  </td>
                  <td>{vistoria.cidade}</td>
                  <td className="text-xs">
                    {vistoria.tipoServico?.codigo} - {vistoria.tipoServico?.nome}
                  </td>
                  <td className="text-right">{vistoria.areaFaturar} m²</td>
                  <td className="text-right font-medium text-green-600">
                    {formatCurrency(vistoria.valorServico)}
                  </td>
                  <td className="text-right font-medium text-red-600">
                    {formatCurrency(vistoria.valorVistoriador)}
                  </td>
                  <td>
                    <StatusBadge status={vistoria.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma vistoria encontrada"
            description="Importe vistorias através de um fechamento"
          />
        </Card>
      )}
    </div>
  );
}

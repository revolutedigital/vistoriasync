import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Calculator,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { formatCurrency, getMonthName, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Fechamento, Vistoria, ImportResult, CalculoResult } from '@/types';

export function FechamentoDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: fechamento, isLoading } = useQuery({
    queryKey: ['fechamento', id],
    queryFn: async () => {
      const response = await api.get(`/fechamentos/${id}`);
      return response.data.data as Fechamento;
    },
  });

  const { data: vistorias } = useQuery({
    queryKey: ['fechamento-vistorias', id],
    queryFn: async () => {
      const response = await api.get(`/fechamentos/${id}/vistorias`, {
        params: { limit: 10 },
      });
      return response.data.data as Vistoria[];
    },
    enabled: !!fechamento,
  });

  const { data: resumo } = useQuery({
    queryKey: ['fechamento-resumo', id],
    queryFn: async () => {
      const response = await api.get(`/fechamentos/${id}/resumo`);
      return response.data.data;
    },
    enabled: !!fechamento && fechamento.status !== 'RASCUNHO',
  });

  const calcularMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/fechamentos/${id}/calcular`);
      return response.data.data as CalculoResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fechamento', id] });
      queryClient.invalidateQueries({ queryKey: ['fechamento-vistorias', id] });
      queryClient.invalidateQueries({ queryKey: ['fechamento-resumo', id] });
      toast.success(`${data.calculadas} vistorias calculadas com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao calcular');
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/fechamentos/${id}/importar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data.data as ImportResult;
      queryClient.invalidateQueries({ queryKey: ['fechamento', id] });
      queryClient.invalidateQueries({ queryKey: ['fechamento-vistorias', id] });

      if (result.erros.length > 0) {
        toast.success(
          `${result.importadas} de ${result.total} vistorias importadas. ${result.erros.length} erros.`
        );
      } else {
        toast.success(`${result.importadas} vistorias importadas com sucesso!`);
      }

      if (result.imobiliariasNovas.length > 0) {
        toast(`${result.imobiliariasNovas.length} novas imobiliárias criadas`, {
          icon: '🏢',
        });
      }
      if (result.vistoriadoresNovos.length > 0) {
        toast(`${result.vistoriadoresNovos.length} novos vistoriadores criados`, {
          icon: '👤',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro na importação');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async (tipo: 'receber' | 'pagar') => {
    try {
      const response = await api.get(`/fechamentos/${id}/exportar/${tipo}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `contas-${tipo}-${fechamento?.mesReferencia}-${fechamento?.anoReferencia}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Arquivo exportado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao exportar');
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!fechamento) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Fechamento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/fechamentos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getMonthName(fechamento.mesReferencia)} / {fechamento.anoReferencia}
          </h1>
          <p className="text-gray-500">
            Criado em {formatDate(fechamento.createdAt)}
          </p>
        </div>
        <StatusBadge status={fechamento.status} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total de Vistorias</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {fechamento.totalVistorias}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total a Receber</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(fechamento.totalReceber)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total a Pagar</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(fechamento.totalPagar)}
          </p>
        </Card>
      </div>

      {/* Ações */}
      <Card>
        <CardHeader
          title="Ações do Fechamento"
          description="Execute as etapas do fechamento mensal"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Importar */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">1. Importar</p>
                <p className="text-xs text-gray-500">Planilha do KSI</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              loading={importing}
              disabled={!['RASCUNHO', 'IMPORTADO'].includes(fechamento.status)}
            >
              {fechamento.dataImportacao ? 'Reimportar' : 'Selecionar Arquivo'}
            </Button>
          </div>

          {/* Calcular */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calculator className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">2. Calcular</p>
                <p className="text-xs text-gray-500">Valores automáticos</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => calcularMutation.mutate()}
              loading={calcularMutation.isPending}
              disabled={!['IMPORTADO', 'CALCULADO'].includes(fechamento.status)}
            >
              Calcular Valores
            </Button>
          </div>

          {/* Exportar Receber */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">3. Exportar</p>
                <p className="text-xs text-gray-500">Contas a Receber</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleExport('receber')}
              disabled={fechamento.status === 'RASCUNHO'}
            >
              Baixar Excel
            </Button>
          </div>

          {/* Exportar Pagar */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Download className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">4. Exportar</p>
                <p className="text-xs text-gray-500">Contas a Pagar</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleExport('pagar')}
              disabled={fechamento.status === 'RASCUNHO'}
            >
              Baixar Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo por Imobiliária */}
      {resumo && resumo.porImobiliaria?.length > 0 && (
        <Card>
          <CardHeader title="Resumo por Imobiliária" />
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Imobiliária</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumo.porImobiliaria.map((item: any) => (
                  <tr key={item.imobiliariaId}>
                    <td className="font-medium">{item.nome}</td>
                    <td className="text-right">{item._count.id}</td>
                    <td className="text-right font-medium text-green-600">
                      {formatCurrency(item._sum.valorServico || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vistorias */}
      {vistorias && vistorias.length > 0 && (
        <Card>
          <CardHeader
            title="Vistorias"
            action={
              <Link
                to={`/vistorias?fechamentoId=${id}`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Ver todas
              </Link>
            }
          />
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID KSI</th>
                  <th>Imobiliária</th>
                  <th>Vistoriador</th>
                  <th>Endereço</th>
                  <th className="text-right">Área</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vistorias.map((vistoria) => (
                  <tr key={vistoria.id}>
                    <td className="font-mono text-xs">{vistoria.idKsi}</td>
                    <td>{vistoria.imobiliaria?.nome}</td>
                    <td>{vistoria.vistoriador?.nome}</td>
                    <td className="max-w-xs truncate">{vistoria.endereco}</td>
                    <td className="text-right">{vistoria.areaFaturar} m²</td>
                    <td className="text-right font-medium">
                      {formatCurrency(vistoria.valorServico)}
                    </td>
                    <td>
                      <StatusBadge status={vistoria.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Calculator,
  Send,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  const [confirmModal, setConfirmModal] = useState<'receber' | 'pagar' | null>(null);
  const [sending, setSending] = useState(false);

  const { data: fechamento, isLoading } = useQuery({
    queryKey: ['fechamento', id],
    queryFn: async () => {
      const response = await api.get(`/api/fechamentos/${id}`);
      return response.data.data as Fechamento;
    },
  });

  const { data: vistorias } = useQuery({
    queryKey: ['fechamento-vistorias', id],
    queryFn: async () => {
      const response = await api.get(`/api/fechamentos/${id}/vistorias`, {
        params: { limit: 10 },
      });
      return response.data.data as Vistoria[];
    },
    enabled: !!fechamento,
  });

  const { data: resumo } = useQuery({
    queryKey: ['fechamento-resumo', id],
    queryFn: async () => {
      const response = await api.get(`/api/fechamentos/${id}/resumo`);
      return response.data.data;
    },
    enabled: !!fechamento && fechamento.status !== 'RASCUNHO',
  });

  const calcularMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/fechamentos/${id}/calcular`);
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

      const response = await api.post(`/api/fechamentos/${id}/importar`, formData, {
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
        toast(`${result.imobiliariasNovas.length} novas imobiliarias criadas`, {
          icon: '🏢',
        });
      }
      if (result.vistoriadoresNovos.length > 0) {
        toast(`${result.vistoriadoresNovos.length} novos vistoriadores criados`, {
          icon: '👤',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro na importacao');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendToFlow = async (tipo: 'receber' | 'pagar') => {
    setSending(true);
    try {
      await api.post(`/api/fechamentos/${id}/enviar-flow/${tipo}`);
      queryClient.invalidateQueries({ queryKey: ['fechamento', id] });
      toast.success(
        tipo === 'receber'
          ? 'Contas a receber enviadas para o Flow!'
          : 'Contas a pagar enviadas para o Flow!'
      );
      setConfirmModal(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao enviar para o Flow');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!fechamento) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Fechamento nao encontrado</p>
      </div>
    );
  }

  const getResumoReceber = () => {
    if (!resumo?.porImobiliaria) return { quantidade: 0, total: 0 };
    return {
      quantidade: resumo.porImobiliaria.reduce((acc: number, item: any) => acc + item._count.id, 0),
      total: resumo.porImobiliaria.reduce((acc: number, item: any) => acc + (item._sum.valorServico || 0), 0),
    };
  };

  const getResumoPagar = () => {
    if (!resumo?.porVistoriador) return { quantidade: 0, total: 0 };
    return {
      quantidade: resumo.porVistoriador.reduce((acc: number, item: any) => acc + item._count.id, 0),
      total: resumo.porVistoriador.reduce((acc: number, item: any) => acc + (item._sum.valorVistoriador || 0), 0),
    };
  };

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

      {/* Acoes */}
      <Card>
        <CardHeader
          title="Acoes do Fechamento"
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
                <p className="text-xs text-gray-500">Valores automaticos</p>
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

          {/* Enviar Receber */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">3. Enviar Flow</p>
                <p className="text-xs text-gray-500">Contas a Receber</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setConfirmModal('receber')}
              disabled={fechamento.status === 'RASCUNHO'}
            >
              Enviar para Flow
            </Button>
          </div>

          {/* Enviar Pagar */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Send className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">4. Enviar Flow</p>
                <p className="text-xs text-gray-500">Contas a Pagar</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setConfirmModal('pagar')}
              disabled={fechamento.status === 'RASCUNHO'}
            >
              Enviar para Flow
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo por Imobiliaria */}
      {resumo && resumo.porImobiliaria?.length > 0 && (
        <Card>
          <CardHeader title="Resumo por Imobiliaria" />
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Imobiliaria</th>
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
                  <th>Imobiliaria</th>
                  <th>Vistoriador</th>
                  <th>Endereco</th>
                  <th className="text-right">Area</th>
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
                    <td className="text-right">{vistoria.areaFaturar} m2</td>
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

      {/* Modal Confirmacao Receber */}
      <Modal
        isOpen={confirmModal === 'receber'}
        onClose={() => setConfirmModal(null)}
        title="Confirmar Envio - Contas a Receber"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Atencao</p>
              <p className="text-sm text-yellow-700 mt-1">
                Voce esta prestes a enviar as contas a receber para o sistema Flow.
                Esta acao ira criar os lancamentos financeiros automaticamente.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Resumo do Envio</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Periodo:</span>
              <span className="font-medium">
                {getMonthName(fechamento.mesReferencia)}/{fechamento.anoReferencia}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantidade de contas:</span>
              <span className="font-medium">{getResumoReceber().quantidade}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor total:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(getResumoReceber().total)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmModal(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleSendToFlow('receber')}
              loading={sending}
            >
              Confirmar Envio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmacao Pagar */}
      <Modal
        isOpen={confirmModal === 'pagar'}
        onClose={() => setConfirmModal(null)}
        title="Confirmar Envio - Contas a Pagar"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Atencao</p>
              <p className="text-sm text-yellow-700 mt-1">
                Voce esta prestes a enviar as contas a pagar para o sistema Flow.
                Esta acao ira criar os lancamentos financeiros para os vistoriadores.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Resumo do Envio</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Periodo:</span>
              <span className="font-medium">
                {getMonthName(fechamento.mesReferencia)}/{fechamento.anoReferencia}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantidade de contas:</span>
              <span className="font-medium">{getResumoPagar().quantidade}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor total:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(getResumoPagar().total)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmModal(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleSendToFlow('pagar')}
              loading={sending}
            >
              Confirmar Envio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

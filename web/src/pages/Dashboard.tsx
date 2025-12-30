import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { formatCurrency, getMonthName } from '@/lib/utils';
import type { Fechamento } from '@/types';

export function DashboardPage() {
  const { data: fechamentos, isLoading: loadingFechamentos } = useQuery({
    queryKey: ['fechamentos', { limit: 5 }],
    queryFn: async () => {
      const response = await api.get('/api/fechamentos', { params: { limit: 5 } });
      return response.data.data as Fechamento[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [imobRes, vistRes] = await Promise.all([
        api.get('/api/imobiliarias', { params: { limit: 1, ativo: true } }),
        api.get('/api/vistoriadores', { params: { limit: 1, ativo: true } }),
      ]);
      return {
        imobiliarias: imobRes.data.meta.total,
        vistoriadores: vistRes.data.meta.total,
      };
    },
  });

  if (loadingFechamentos) {
    return <PageLoading />;
  }

  const currentFechamento = fechamentos?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Visão geral do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total a Receber</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(currentFechamento?.totalReceber || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentFechamento
                  ? `${getMonthName(currentFechamento.mesReferencia)}/${currentFechamento.anoReferencia}`
                  : '-'}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total a Pagar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(currentFechamento?.totalPagar || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Vistoriadores</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Imobiliárias</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.imobiliarias || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ativas</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Vistoriadores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.vistoriadores || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ativos</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fechamentos recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Fechamentos Recentes
            </h3>
            <Link
              to="/fechamentos"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {fechamentos?.map((fechamento) => (
              <Link
                key={fechamento.id}
                to={`/fechamentos/${fechamento.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {getMonthName(fechamento.mesReferencia)}/{fechamento.anoReferencia}
                    </p>
                    <p className="text-sm text-gray-500">
                      {fechamento.totalVistorias} vistorias
                    </p>
                  </div>
                </div>
                <StatusBadge status={fechamento.status} />
              </Link>
            ))}

            {(!fechamentos || fechamentos.length === 0) && (
              <div className="text-center py-6 text-gray-500">
                Nenhum fechamento encontrado
              </div>
            )}
          </div>
        </Card>

        {/* Ações rápidas */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ações Rápidas
          </h3>

          <div className="space-y-3">
            <Link
              to="/fechamentos/novo"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Novo Fechamento</p>
                <p className="text-sm text-gray-500">Iniciar fechamento mensal</p>
              </div>
            </Link>

            <Link
              to="/imobiliarias"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gerenciar Imobiliárias</p>
                <p className="text-sm text-gray-500">Cadastrar e editar clientes</p>
              </div>
            </Link>

            <Link
              to="/vistoriadores"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gerenciar Vistoriadores</p>
                <p className="text-sm text-gray-500">Cadastrar e editar vistoriadores</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

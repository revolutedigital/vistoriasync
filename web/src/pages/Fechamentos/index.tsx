import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileSpreadsheet, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { formatCurrency, getMonthName, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Fechamento } from '@/types';

export function FechamentosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: async () => {
      const response = await api.get('/api/fechamentos');
      return response.data.data as Fechamento[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/fechamentos', {
        mesReferencia: mes,
        anoReferencia: ano,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
      toast.success('Fechamento criado com sucesso!');
      setModalOpen(false);
      navigate(`/fechamentos/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar fechamento');
    },
  });

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: getMonthName(i + 1),
  }));

  const anos = Array.from({ length: 5 }, (_, i) => ({
    value: String(new Date().getFullYear() - 2 + i),
    label: String(new Date().getFullYear() - 2 + i),
  }));

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fechamentos</h1>
          <p className="text-gray-500">Gerenciar fechamentos mensais</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Novo Fechamento
        </Button>
      </div>

      {data && data.length > 0 ? (
        <div className="grid gap-4">
          {data.map((fechamento) => (
            <Link
              key={fechamento.id}
              to={`/fechamentos/${fechamento.id}`}
              className="card p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getMonthName(fechamento.mesReferencia)} / {fechamento.anoReferencia}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {fechamento.totalVistorias} vistorias •
                      Criado em {formatDate(fechamento.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-500">A Receber</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(fechamento.totalReceber)}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-500">A Pagar</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(fechamento.totalPagar)}
                    </p>
                  </div>
                  <StatusBadge status={fechamento.status} />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title="Nenhum fechamento"
            description="Crie seu primeiro fechamento mensal para começar"
            action={{
              label: 'Criar Fechamento',
              onClick: () => setModalOpen(true),
            }}
          />
        </Card>
      )}

      {/* Modal de criação */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Fechamento"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Mês"
              value={String(mes)}
              onChange={(e) => setMes(Number(e.target.value))}
              options={meses}
            />
            <Select
              label="Ano"
              value={String(ano)}
              onChange={(e) => setAno(Number(e.target.value))}
              options={anos}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Criar Fechamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

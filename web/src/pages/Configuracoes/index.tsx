import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Settings, Ruler } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import toast from 'react-hot-toast';
import type { TipoServico, FaixaMetragem } from '@/types';

export function ConfiguracoesPage() {
  const queryClient = useQueryClient();

  // Tipos de Serviço
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoServico | null>(null);
  const [tipoForm, setTipoForm] = useState({ codigo: '', nome: '', descricao: '' });

  // Faixas de Metragem
  const [faixaModalOpen, setFaixaModalOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<FaixaMetragem | null>(null);
  const [faixaForm, setFaixaForm] = useState({
    nome: '',
    metrosMin: 0,
    metrosMax: 150,
    multiplicador: 1,
    ordem: 0,
  });

  const { data: tiposServico, isLoading: loadingTipos } = useQuery({
    queryKey: ['tipos-servico'],
    queryFn: async () => {
      const response = await api.get('/tipos-servico');
      return response.data.data as TipoServico[];
    },
  });

  const { data: faixas, isLoading: loadingFaixas } = useQuery({
    queryKey: ['faixas-metragem'],
    queryFn: async () => {
      const response = await api.get('/faixas-metragem');
      return response.data.data as FaixaMetragem[];
    },
  });

  // Mutations Tipos de Serviço
  const saveTipoMutation = useMutation({
    mutationFn: async () => {
      if (editingTipo) {
        await api.patch(`/tipos-servico/${editingTipo.id}`, tipoForm);
      } else {
        await api.post('/tipos-servico', tipoForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-servico'] });
      toast.success(editingTipo ? 'Tipo atualizado!' : 'Tipo criado!');
      handleCloseTipoModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _deleteTipoMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tipos-servico/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-servico'] });
      toast.success('Tipo desativado!');
    },
  });

  // Mutations Faixas
  const saveFaixaMutation = useMutation({
    mutationFn: async () => {
      if (editingFaixa) {
        await api.patch(`/faixas-metragem/${editingFaixa.id}`, faixaForm);
      } else {
        await api.post('/faixas-metragem', faixaForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas-metragem'] });
      toast.success(editingFaixa ? 'Faixa atualizada!' : 'Faixa criada!');
      handleCloseFaixaModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    },
  });

  const deleteFaixaMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/faixas-metragem/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas-metragem'] });
      toast.success('Faixa removida!');
    },
  });

  // Handlers Tipos
  const handleOpenTipoModal = (tipo?: TipoServico) => {
    if (tipo) {
      setEditingTipo(tipo);
      setTipoForm({
        codigo: tipo.codigo,
        nome: tipo.nome,
        descricao: tipo.descricao || '',
      });
    }
    setTipoModalOpen(true);
  };

  const handleCloseTipoModal = () => {
    setTipoModalOpen(false);
    setEditingTipo(null);
    setTipoForm({ codigo: '', nome: '', descricao: '' });
  };

  // Handlers Faixas
  const handleOpenFaixaModal = (faixa?: FaixaMetragem) => {
    if (faixa) {
      setEditingFaixa(faixa);
      setFaixaForm({
        nome: faixa.nome,
        metrosMin: faixa.metrosMin,
        metrosMax: faixa.metrosMax,
        multiplicador: faixa.multiplicador,
        ordem: faixa.ordem,
      });
    }
    setFaixaModalOpen(true);
  };

  const handleCloseFaixaModal = () => {
    setFaixaModalOpen(false);
    setEditingFaixa(null);
    setFaixaForm({ nome: '', metrosMin: 0, metrosMax: 150, multiplicador: 1, ordem: 0 });
  };

  if (loadingTipos || loadingFaixas) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Gerenciar tabelas do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipos de Serviço */}
        <Card>
          <CardHeader
            title="Tipos de Serviço"
            description="Categorias de vistorias"
            action={
              <Button
                size="sm"
                onClick={() => handleOpenTipoModal()}
                icon={<Plus className="w-4 h-4" />}
              >
                Adicionar
              </Button>
            }
          />

          <div className="space-y-2">
            {tiposServico?.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Settings className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tipo.codigo} - {tipo.nome}
                    </p>
                    {tipo.descricao && (
                      <p className="text-sm text-gray-500">{tipo.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tipo.ativo ? 'success' : 'gray'}>
                    {tipo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <button
                    onClick={() => handleOpenTipoModal(tipo)}
                    className="p-1.5 hover:bg-white rounded-lg"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Faixas de Metragem */}
        <Card>
          <CardHeader
            title="Faixas de Metragem"
            description="Multiplicadores por área"
            action={
              <Button
                size="sm"
                onClick={() => handleOpenFaixaModal()}
                icon={<Plus className="w-4 h-4" />}
              >
                Adicionar
              </Button>
            }
          />

          <div className="space-y-2">
            {faixas?.map((faixa) => (
              <div
                key={faixa.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Ruler className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{faixa.nome}</p>
                    <p className="text-sm text-gray-500">
                      {faixa.metrosMin} - {faixa.metrosMax} m² • {faixa.multiplicador}x
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenFaixaModal(faixa)}
                    className="p-1.5 hover:bg-white rounded-lg"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Remover esta faixa?')) {
                        deleteFaixaMutation.mutate(faixa.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal Tipo de Serviço */}
      <Modal
        isOpen={tipoModalOpen}
        onClose={handleCloseTipoModal}
        title={editingTipo ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveTipoMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Código"
            value={tipoForm.codigo}
            onChange={(e) => setTipoForm({ ...tipoForm, codigo: e.target.value })}
            placeholder="Ex: 1.0"
            required
          />
          <Input
            label="Nome"
            value={tipoForm.nome}
            onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
            placeholder="Ex: VISTORIA DE ENTRADA"
            required
          />
          <Input
            label="Descrição"
            value={tipoForm.descricao}
            onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseTipoModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveTipoMutation.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Faixa de Metragem */}
      <Modal
        isOpen={faixaModalOpen}
        onClose={handleCloseFaixaModal}
        title={editingFaixa ? 'Editar Faixa de Metragem' : 'Nova Faixa de Metragem'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveFaixaMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Nome"
            value={faixaForm.nome}
            onChange={(e) => setFaixaForm({ ...faixaForm, nome: e.target.value })}
            placeholder="Ex: Até 150 m²"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Metros Mínimo"
              type="number"
              value={faixaForm.metrosMin}
              onChange={(e) => setFaixaForm({ ...faixaForm, metrosMin: Number(e.target.value) })}
              required
            />
            <Input
              label="Metros Máximo"
              type="number"
              value={faixaForm.metrosMax}
              onChange={(e) => setFaixaForm({ ...faixaForm, metrosMax: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Multiplicador"
              type="number"
              step="0.1"
              value={faixaForm.multiplicador}
              onChange={(e) => setFaixaForm({ ...faixaForm, multiplicador: Number(e.target.value) })}
              required
            />
            <Input
              label="Ordem"
              type="number"
              value={faixaForm.ordem}
              onChange={(e) => setFaixaForm({ ...faixaForm, ordem: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseFaixaModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveFaixaMutation.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

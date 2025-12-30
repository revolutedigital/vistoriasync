import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import toast from 'react-hot-toast';
import type { Vistoriador } from '@/types';

export function VistoriadoresPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    nomeKsi: '',
    cpf: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cidade: '',
    chavePix: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vistoriadores', search],
    queryFn: async () => {
      const response = await api.get('/vistoriadores', {
        params: { search, limit: 100 },
      });
      return response.data.data as Vistoriador[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await api.patch(`/vistoriadores/${editingId}`, form);
      } else {
        await api.post('/vistoriadores', form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoriadores'] });
      toast.success(editingId ? 'Vistoriador atualizado!' : 'Vistoriador criado!');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vistoriadores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoriadores'] });
      toast.success('Vistoriador desativado!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao desativar');
    },
  });

  const handleOpenModal = (vistoriador?: Vistoriador) => {
    if (vistoriador) {
      setEditingId(vistoriador.id);
      setForm({
        nome: vistoriador.nome,
        nomeKsi: vistoriador.nomeKsi,
        cpf: vistoriador.cpf || '',
        email: vistoriador.email || '',
        telefone: vistoriador.telefone || '',
        whatsapp: vistoriador.whatsapp || '',
        cidade: vistoriador.cidade || '',
        chavePix: vistoriador.chavePix || '',
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({
      nome: '',
      nomeKsi: '',
      cpf: '',
      email: '',
      telefone: '',
      whatsapp: '',
      cidade: '',
      chavePix: '',
    });
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vistoriadores</h1>
          <p className="text-gray-500">Gerenciar vistoriadores</p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
          Novo Vistoriador
        </Button>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vistoriador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      {data && data.length > 0 ? (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Nome KSI</th>
                <th>CPF</th>
                <th>Cidade</th>
                <th>Chave PIX</th>
                <th>Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((vist) => (
                <tr key={vist.id}>
                  <td className="font-medium">{vist.nome}</td>
                  <td className="text-gray-500">{vist.nomeKsi}</td>
                  <td>{vist.cpf || '-'}</td>
                  <td>{vist.cidade || '-'}</td>
                  <td className="max-w-[150px] truncate">{vist.chavePix || '-'}</td>
                  <td>
                    <Badge variant={vist.ativo ? 'success' : 'gray'}>
                      {vist.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(vist)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Desativar este vistoriador?')) {
                            deleteMutation.mutate(vist.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title="Nenhum vistoriador"
            description="Cadastre seu primeiro vistoriador"
            action={{
              label: 'Cadastrar',
              onClick: () => handleOpenModal(),
            }}
          />
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Vistoriador' : 'Novo Vistoriador'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
            <Input
              label="Nome no KSI"
              value={form.nomeKsi}
              onChange={(e) => setForm({ ...form, nomeKsi: e.target.value })}
              required
              hint="Exatamente como aparece no KSI"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CPF"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
            <Input
              label="Cidade"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
            <Input
              label="Chave PIX"
              value={form.chavePix}
              onChange={(e) => setForm({ ...form, chavePix: e.target.value })}
              hint="CPF, Email, Telefone ou Chave aleatória"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

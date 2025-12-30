import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Search, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import toast from 'react-hot-toast';
import type { Imobiliaria } from '@/types';

const formasPagamento = [
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
];

export function ImobiliariasPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    nomeKsi: '',
    cnpj: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cidade: '',
    diaPagamento: 12,
    formaPagamento: 'BOLETO' as 'BOLETO' | 'PIX' | 'TRANSFERENCIA',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['imobiliarias', search],
    queryFn: async () => {
      const response = await api.get('/imobiliarias', {
        params: { search, limit: 100 },
      });
      return response.data.data as Imobiliaria[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await api.patch(`/imobiliarias/${editingId}`, form);
      } else {
        await api.post('/imobiliarias', form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imobiliarias'] });
      toast.success(editingId ? 'Imobiliária atualizada!' : 'Imobiliária criada!');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/imobiliarias/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imobiliarias'] });
      toast.success('Imobiliária desativada!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao desativar');
    },
  });

  const handleOpenModal = (imobiliaria?: Imobiliaria) => {
    if (imobiliaria) {
      setEditingId(imobiliaria.id);
      setForm({
        nome: imobiliaria.nome,
        nomeKsi: imobiliaria.nomeKsi,
        cnpj: imobiliaria.cnpj || '',
        email: imobiliaria.email || '',
        telefone: imobiliaria.telefone || '',
        whatsapp: imobiliaria.whatsapp || '',
        cidade: imobiliaria.cidade || '',
        diaPagamento: imobiliaria.diaPagamento,
        formaPagamento: imobiliaria.formaPagamento,
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
      cnpj: '',
      email: '',
      telefone: '',
      whatsapp: '',
      cidade: '',
      diaPagamento: 12,
      formaPagamento: 'BOLETO',
    });
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Imobiliárias</h1>
          <p className="text-gray-500">Gerenciar clientes</p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
          Nova Imobiliária
        </Button>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar imobiliária..."
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
                <th>Cidade</th>
                <th>Contato</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((imob) => (
                <tr key={imob.id}>
                  <td className="font-medium">{imob.nome}</td>
                  <td className="text-gray-500">{imob.nomeKsi}</td>
                  <td>{imob.cidade || '-'}</td>
                  <td>
                    {imob.email || imob.telefone || '-'}
                  </td>
                  <td>
                    <Badge variant="info">
                      {imob.formaPagamento} - Dia {imob.diaPagamento}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={imob.ativo ? 'success' : 'gray'}>
                      {imob.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(imob)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Desativar esta imobiliária?')) {
                            deleteMutation.mutate(imob.id);
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
            icon={Building2}
            title="Nenhuma imobiliária"
            description="Cadastre sua primeira imobiliária"
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
        title={editingId ? 'Editar Imobiliária' : 'Nova Imobiliária'}
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
              label="CNPJ"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
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
              label="Dia de Pagamento"
              type="number"
              min={1}
              max={28}
              value={form.diaPagamento}
              onChange={(e) => setForm({ ...form, diaPagamento: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Forma de Pagamento"
            value={form.formaPagamento}
            onChange={(e) => setForm({ ...form, formaPagamento: e.target.value as any })}
            options={formasPagamento}
          />

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

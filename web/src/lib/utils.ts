import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getMonthName(month: number) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || '';
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    // Fechamento
    RASCUNHO: 'badge-gray',
    IMPORTADO: 'badge-info',
    CALCULADO: 'badge-info',
    AGUARDANDO_VISTORIADORES: 'badge-warning',
    EM_REVISAO: 'badge-warning',
    AGUARDANDO_IMOBILIARIAS: 'badge-warning',
    FATURADO: 'badge-success',
    FINALIZADO: 'badge-success',
    // Vistoria
    IMPORTADA: 'badge-gray',
    CALCULADA: 'badge-info',
    CONTESTADA: 'badge-warning',
    REVISADA: 'badge-info',
    APROVADA: 'badge-success',
    // Fatura
    PENDENTE: 'badge-warning',
    ENVIADA: 'badge-info',
    VENCIDA: 'badge-error',
    PAGA: 'badge-success',
    CANCELADA: 'badge-gray',
  };
  return colors[status] || 'badge-gray';
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    // Fechamento
    RASCUNHO: 'Rascunho',
    IMPORTADO: 'Importado',
    CALCULADO: 'Calculado',
    AGUARDANDO_VISTORIADORES: 'Aguardando Vistoriadores',
    EM_REVISAO: 'Em Revisão',
    AGUARDANDO_IMOBILIARIAS: 'Aguardando Imobiliárias',
    FATURADO: 'Faturado',
    FINALIZADO: 'Finalizado',
    // Vistoria
    IMPORTADA: 'Importada',
    CALCULADA: 'Calculada',
    CONTESTADA: 'Contestada',
    REVISADA: 'Revisada',
    APROVADA: 'Aprovada',
    FATURADA: 'Faturada',
    // Fatura
    PENDENTE: 'Pendente',
    ENVIADA: 'Enviada',
    VENCIDA: 'Vencida',
    PAGA: 'Paga',
    CANCELADA: 'Cancelada',
  };
  return labels[status] || status;
}

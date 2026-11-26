export type Profissional = {
  id: string
  nome: string
  crn: string | null
  telefone: string | null
  email: string | null
  avatar_url: string | null
}

export type Paciente = {
  id: string
  profissional_id: string
  user_id: string | null
  nome: string
  email: string | null
  telefone: string | null
  data_nascimento: string | null
  altura_cm: number | null
  peso_inicial: number | null
  objetivo: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  profissional?: { nome: string; crn: string | null } // vem em /me para o paciente
}

export type Habito = {
  id: string
  paciente_id: string
  nome: string
  meta: string | null
  cor: string
  ordem: number
  inicio: string
  fim: string | null
}

export type StatusRegistro = 'ok' | 'nao'

export type Registro = {
  habito_id: string
  data: string
  status: StatusRegistro
  nota?: string | null
}

export type ResumoMensal = {
  id?: string
  paciente_id: string
  mes: string
  peso: number | null
  cintura_cm: number | null
  quadril_cm: number | null
  gordura_pct: number | null
  pontos_positivos: string | null
  a_melhorar: string | null
  resumo: string | null
  metas_proximo_mes: string | null
  compartilhado: boolean
  updated_at?: string
}

export type TipoCompromisso = 'consulta' | 'retorno' | 'online' | 'avaliacao' | 'lembrete' | 'outro'
export type StatusCompromisso = 'agendado' | 'realizado' | 'cancelado' | 'faltou'

export type Compromisso = {
  id: string
  profissional_id: string
  paciente_id: string | null
  titulo: string
  tipo: TipoCompromisso
  inicio: string
  fim: string | null
  local: string | null
  notas: string | null
  status: StatusCompromisso
  pacientes?: { nome: string } | null
}

export const TIPOS: Record<TipoCompromisso, { label: string; cor: string }> = {
  consulta: { label: 'Consulta', cor: '#5f7f64' },
  retorno: { label: 'Retorno', cor: '#3b82a6' },
  online: { label: 'Online', cor: '#8b6bb8' },
  avaliacao: { label: 'Avaliação', cor: '#c08a3e' },
  lembrete: { label: 'Lembrete', cor: '#78716c' },
  outro: { label: 'Outro', cor: '#a8a29e' },
}

export const STATUS: Record<StatusCompromisso, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

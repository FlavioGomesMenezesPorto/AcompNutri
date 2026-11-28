-- =========================================================
-- ACOMPNUTRI — banco de dados da API própria (PostgreSQL 13+)
-- Aplicado automaticamente quando a API inicia (idempotente).
-- O Supabase só faz o login: o "id" de usuarios é o id da conta
-- no Supabase Auth (claim "sub" do token).
-- Quem pode ver/alterar o quê é decidido na API (routes/*.js).
-- =========================================================

create table if not exists usuarios (
  id            uuid primary key,
  email         text not null,
  nome          text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  ultimo_acesso timestamptz not null default now()
);
create index if not exists usuarios_email_idx on usuarios (lower(email));

create table if not exists profissionais (
  id          uuid primary key references usuarios on delete cascade,
  nome        text not null check (char_length(trim(nome)) between 2 and 120),
  crn         text,
  telefone    text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists pacientes (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais on delete cascade,
  user_id         uuid references usuarios on delete set null,
  nome            text not null check (char_length(trim(nome)) between 2 and 120),
  email           text check (email is null or email = lower(email)),
  telefone        text,
  data_nascimento date,
  altura_cm       numeric(5,1),
  peso_inicial    numeric(5,1),
  objetivo        text,
  observacoes     text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists pacientes_prof_idx  on pacientes (profissional_id);
create index if not exists pacientes_user_idx  on pacientes (user_id);
create index if not exists pacientes_email_idx on pacientes (email);

create table if not exists habitos (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes on delete cascade,
  nome        text not null check (char_length(trim(nome)) between 1 and 80),
  meta        text,
  cor         text not null default '#6b8f71',
  ordem       int  not null default 0,
  inicio      date not null default current_date,
  fim         date,
  created_at  timestamptz not null default now()
);
create index if not exists habitos_paciente_idx on habitos (paciente_id);
-- hábito criado pelo próprio paciente (ele pode editar/excluir só esses)
alter table habitos add column if not exists criado_pelo_paciente boolean not null default false;

create table if not exists registros_habito (
  habito_id  uuid not null references habitos on delete cascade,
  data       date not null,
  status     text not null check (status in ('ok', 'nao')),
  updated_at timestamptz not null default now(),
  primary key (habito_id, data)
);

create table if not exists resumos_mensais (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references pacientes on delete cascade,
  mes               date not null check (extract(day from mes) = 1),
  peso              numeric(5,1),
  cintura_cm        numeric(5,1),
  quadril_cm        numeric(5,1),
  gordura_pct       numeric(4,1),
  pontos_positivos  text,
  a_melhorar        text,
  resumo            text,
  metas_proximo_mes text,
  compartilhado     boolean not null default false,
  updated_at        timestamptz not null default now(),
  unique (paciente_id, mes)
);

create table if not exists observacoes_mes (
  paciente_id uuid not null references pacientes on delete cascade,
  mes         date not null check (extract(day from mes) = 1),
  texto       text not null default '' check (char_length(texto) <= 4000),
  updated_at  timestamptz not null default now(),
  primary key (paciente_id, mes)
);

create table if not exists compromissos (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais on delete cascade,
  paciente_id     uuid references pacientes on delete set null,
  titulo          text not null check (char_length(trim(titulo)) between 1 and 120),
  tipo            text not null default 'consulta'
                  check (tipo in ('consulta', 'retorno', 'online', 'avaliacao', 'lembrete', 'outro')),
  inicio          timestamptz not null,
  fim             timestamptz,
  local           text,
  notas           text,
  status          text not null default 'agendado'
                  check (status in ('agendado', 'realizado', 'cancelado', 'faltou')),
  created_at      timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create index if not exists compromissos_prof_inicio_idx on compromissos (profissional_id, inicio);
create index if not exists compromissos_paciente_idx    on compromissos (paciente_id);

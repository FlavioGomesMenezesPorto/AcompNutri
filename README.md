# AcompNutri

Feito para meu dia a dia.

Controle de hábitos e acompanhamento nutricional — a versão digital da folha
"Controle de Hábitos" (Consegui / Não consegui por dia), com resumo mensal e agenda.
Site + app Android.

## Arquitetura

```
 Site (Vite/React) ─┐                       ┌─ Supabase: SÓ login com Google
 App Android ───────┼── token do login ───▶ │
 (Capacitor)        └── /api + token ─────▶ API própria (server/, Express) ──▶ PostgreSQL próprio
```

- **Supabase** faz apenas o login Google e entrega um token ao app. Nenhum dado fica lá.
- **API própria** (`server/`) confere o token (chaves públicas do Supabase), cria o usuário
  na primeira chamada e decide quem pode ver/alterar o quê.
- **PostgreSQL próprio** guarda tudo: profissionais, pacientes, hábitos, marcações, resumos, agenda.

## Como funciona

**Nutricionista** — entra com Google → "Sou nutricionista" → cria o consultório.
Cadastra pacientes com o e-mail Google deles, monta a folha de hábitos, escreve o
resumo do mês (privado até **Salvar e compartilhar**, com **Imprimir / PDF**) e usa a agenda.

**Paciente** — entra com o e-mail cadastrado e é vinculado automaticamente. Marca ✓/✗
nos hábitos do dia, escreve observações e lê o resumo compartilhado.

## 1. Criar o projeto Supabase novo (só login)

1. https://supabase.com → **New project** → nome `acompnutri`, região **South America (São Paulo)**.
2. **Login Google**
   - Google Cloud → crie um projeto "AcompNutri" → **Tela de consentimento OAuth** (Externo, nome "AcompNutri")
     → **Publicar app**.
   - **Credenciais → Criar ID do cliente OAuth → Aplicativo da Web**. Em *URIs de redirecionamento autorizados*:
     `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   - Supabase → **Authentication → Sign In / Providers → Google** → ative, cole ID e chave secreta.
3. Supabase → **Authentication → URL Configuration**
   - **Site URL:** o endereço do site do AcompNutri (ex.: `https://acompnutri.vercel.app`), ou `http://localhost:5180` por enquanto
   - **Redirect URLs:** adicione
     - `http://localhost:5180/**`
     - `com.acompnutri.app://**` ← o app Android
     - `https://acompnutri.vercel.app/**` (quando publicar)
4. **Project Settings → API**: copie **Project URL** e a chave **publishable/anon**.
   (Não precisa rodar nenhum SQL no Supabase.)

Coloque os dois valores em:
- `.env.local` → `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`
- `server/.env` → `SUPABASE_URL` (o mesmo Project URL)

## 2. Rodar em desenvolvimento

Requer Node 20+.

```bash
npm install
cd server && npm install && cd ..
```

**Banco** — escolha um:
- Com Docker: `npm run db` (Postgres em `localhost:5434`) e depois `cd server && npm run dev`
- Sem Docker (banco embutido, dados em `server/.pgdata`):
  ```bash
  cd server
  npm run db:local     # deixe este terminal aberto
  npm run dev:local    # em outro terminal: a API
  ```

**Site:** `npm run dev` → http://localhost:5180 (o Vite repassa `/api` para a API em `localhost:3000`).

**Testes da API:** `cd server && npm test` (sobe um Postgres embutido e um Supabase falso;
testa login, cadastro, hábitos, resumo, agenda e todas as regras de acesso).

## 3. App Android

O app chama a API pela internet, então precisa do endereço completo dela:

```bash
copy .env.android.example .env.android   # e preencha VITE_API_URL=https://sua-api
npm run android:build
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

- Para testar com a API rodando no seu PC (mesma rede Wi-Fi), use `VITE_API_URL=http://IP-DO-PC:3000`
  e gere com `$env:CAP_ALLOW_HTTP="true"; npm run android:build` (nunca para publicar).
- Android Studio: `npm run android:open`. Play Store: Build → Generate Signed Bundle (AAB).
- Ícone e splash: imagens-fonte em `assets/` → `npx capacitor-assets generate --android`.

> Ajustes desta máquina: Gradle 9.1 (JDK 25), `android.overridePathCheck=true` (pasta com acentos)
> e `scripts/android-build.cjs` usa `C:\Users\Public\acompnutri-tmp` como pasta temporária do Java.

## 4. Publicar

| Parte | Onde | Configuração |
|---|---|---|
| Banco | Neon, Render, Railway (Postgres) | copie a connection string |
| API | Render / Railway / Fly (`server/Dockerfile`) ou uma VPS com `docker compose up -d --build` | `DATABASE_URL`, `DATABASE_SSL=true`, `SUPABASE_URL`, `CORS_ORIGIN=https://seu-site,https://localhost` |
| Site | Vercel (build `npm run build`, saída `dist`) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL=https://sua-api` |
| App | `.env.android` com `VITE_API_URL=https://sua-api` | `npm run android:build` |

`https://localhost` no `CORS_ORIGIN` é a origem do app Android (Capacitor).
O banco é criado/atualizado sozinho quando a API inicia (`server/schema.sql`).

## API

Todas as rotas exigem `Authorization: Bearer <token do Supabase>` (exceto `/api/health`).

- `GET /api/me` · `POST|PUT /api/me/profissional`
- `GET|POST /api/pacientes` · `GET /api/pacientes/adesao` · `GET|PUT|PATCH|DELETE /api/pacientes/:id`
- `GET|POST /api/pacientes/:id/habitos?mes=AAAA-MM` · `PUT|DELETE /api/habitos/:id` · `PUT /api/habitos/:id/registros/:data`
- `GET|PUT /api/pacientes/:id/resumo?mes=` · `GET|PUT /api/pacientes/:id/observacoes?mes=`
- `GET /api/pacientes/:id/compromissos` · `GET|POST /api/compromissos` · `PUT|DELETE /api/compromissos/:id`

## Estrutura

```
server/            API (Express + pg): auth.js (token do Supabase), routes/, schema.sql, test/
src/lib/api.ts     cliente da API (envia o token)
src/lib/auth.tsx   login (Supabase) + papel do usuário (vem de /api/me)
src/components/    GradeHabitos (a folha), ResumoMes, modais, layout
src/pages/         Login, Onboarding, prof/*, paciente/*
android/           projeto Android (Capacitor)
```

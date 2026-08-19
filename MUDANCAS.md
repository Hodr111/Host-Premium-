# HostBygdeall — Notas desta etapa

## O que foi feito (testado de verdade, não só escrito)

### Backend (`backend/server.js` + novos arquivos `schema.js`, `helpers.js`)
- **Perfil real**: `GET/PUT /api/me`, upload de avatar (`POST /api/me/avatar`, com validação de
  extensão e limite de 3MB), troca de e-mail com verificação por código no e-mail novo.
- **Suporte com tickets de verdade**: criar, listar, responder, fechar (usuário) e
  listar/filtrar/responder/mudar status (admin). E-mail do usuário só aparece nas rotas de admin.
- **Dashboard admin com números reais**: `GET /api/admin/stats` faz `COUNT(*)` de verdade —
  nada de métrica inventada.
- **Usuários**: bloquear/desbloquear e mudar função continuam restritos a `super_admin`;
  visualizar a lista agora também funciona para `admin` (antes só `super_admin` conseguia ver).
- **Notificações**: tabela e endpoints básicos (o usuário é notificado quando o suporte responde
  ou muda o status do chamado).
- **Log de ações administrativas**: toda ação de admin (bloquear, mudar função, responder
  ticket) fica registrada em `admin_actions`.

### Correções em código já existente
- `setup-admin.js` **não carregava o `.env`** — por isso `ADMIN_PASSWORD` só funcionava se
  passado na mão pela linha de comando. Corrigido.
- O e-mail do admin bootstrap estava **hardcoded no código-fonte** (violando a própria regra
  do projeto de não colocar credenciais no código). Agora vem de `ADMIN_EMAIL` no `.env`.
- `POST /api/admin/login` só aceitava contas com `role = 'super_admin'` — ou seja, promover
  alguém a `admin` nunca dava acesso real ao painel. Corrigido para aceitar `admin` e
  `super_admin`.
- Como usuários comuns entram só por código (OTP) e nunca têm senha, promovê-los a admin não
  dava um jeito de fazer login administrativo. Adicionei
  `POST /api/admin/users/:id/set-password` (só `super_admin`) para resolver isso.
- Frontend estava com a URL da API fixa em `127.0.0.1:3000` — agora usa `VITE_API_URL`
  (ver `.env.example` do frontend).
- `JWT_SECRET` do `.env` era um placeholder óbvio (`"...change-this-later"`) — troquei por um
  valor aleatório forte de 96 caracteres. **Isso invalida qualquer token/sessão antiga**, o que
  não é problema numa fase de desenvolvimento.
- Removidos arquivos mortos/duplicados: `*.backup`, `*.bak`, `admin-dashboard.html` (protótipo
  órfão sem nenhuma referência no projeto, com um design completamente diferente do painel
  admin real em `admin.html`/`admin.js`), `dist/` antigo, assets do scaffold padrão do Vite
  não usados.

### Frontend
- `main.js`: painel do usuário deixou de ser só uma tela com botões falsos
  ("Enviar ZIP" e "GitHub" que só chamavam `alert()`) — agora tem Dashboard (números reais),
  Minha Conta (editar nome, trocar e-mail com confirmação) e Suporte (abrir/ver/responder/fechar
  chamados), todos conectados à API de verdade.
- `admin.js`: as abas da sidebar agora funcionam de verdade — Dashboard, Usuários (com
  bloquear/desbloquear, ver detalhes, mudar função e definir senha) e Suporte (listar, filtrar
  por status, responder, mudar status). As abas ainda não implementadas (Hospedagens, Bots,
  Música, Logs) mostram um aviso honesto de "módulo em desenvolvimento" em vez de dado falso.

## O que NÃO foi feito nesta etapa (e por quê)

O motor de hospedagem (upload de site/Node/Python, processos de bot, isolamento, domínios,
SSL, música, planos) exige decisões de infraestrutura que só quem vai rodar o servidor pode
tomar — por exemplo: o servidor de produção tem Docker disponível? Vai rodar em uma VPS só sua
ou compartilhada? Isso muda completamente como o isolamento de processos deve ser feito com
segurança. Prefiro construir essa parte depois de alinhar isso, em vez de simular isolamento
que não seria seguro de verdade.

## Segurança — ações que EU já tomei
- Gerei um novo `JWT_SECRET` forte (o antigo era um placeholder de exemplo).
- Corrigi a falha que fazia o e-mail do admin ficar hardcoded no código.
- Adicionei `.gitignore` no backend (não existia) para `.env`, `*.sqlite` e uploads nunca irem
  para controle de versão.

## Segurança — ação que só VOCÊ pode tomar
O `backend/.env` tem uma senha de app do Gmail real (`SMTP_PASSWORD`). Ela já estava aí antes
de eu mexer no projeto. Se esse arquivo já foi commitado em algum git ou compartilhado em algum
lugar, revogue essa senha de app agora em https://myaccount.google.com/apppasswords e gere uma
nova.

## Como rodar

```bash
# Backend
cd backend
npm install          # o node_modules do zip original tinha binários nativos
                      # (bcrypt) incompatíveis com este ambiente de teste — instale limpo
node setup-admin.js   # idempotente: só cria o admin se ainda não existir
node server.js

# Frontend (em outro terminal)
cd frontend
cp .env.example .env  # ajuste VITE_API_URL se necessário
npm install
npm run dev
```

## O que foi testado de verdade nesta sessão
Rodei o backend de verdade (não é só leitura de código) e testei via `curl`:
- login OTP/perfil/edição de nome, troca de e-mail (formato inválido, e-mail duplicado, sem
  código pendente),
- upload de avatar (arquivo válido e extensão bloqueada),
- criação/listagem/resposta/fechamento de ticket,
- que um usuário não consegue ver ticket de outro (404),
- que um usuário comum não acessa rota de admin (403),
- bloquear usuário, promover a `admin`, definir senha nova e logar com ela,
- login com senha errada (rejeitado sem detalhe que ajude a adivinhar),
- que o arquivo de avatar fica realmente acessível via HTTP.

Depois de cada teste, restaurei o banco de dados original — a única conta que sobrou é o
`super_admin` que já existia antes de eu mexer no projeto.


## Autenticação — senha após primeiro código

Foi alterado o fluxo de acesso do usuário para não exigir OTP em todo login:

- Primeiro acesso: Gmail → código único → criação da senha.
- Durante a criação da senha, o usuário informa um e-mail de recuperação.
- A tela deixa explícito para anotar e guardar a senha.
- Próximos acessos: Gmail + senha, sem novo código.
- “Esqueci minha senha”: o código de recuperação é enviado ao e-mail de recuperação cadastrado.
- O código de recuperação expira em 10 minutos, tem limite de 5 tentativas e é invalidado após uso.
- Senhas são armazenadas com bcrypt.
- O OTP de cadastro e o OTP de recuperação agora possuem finalidades separadas no banco.

### Novos endpoints

- `POST /api/auth/login`
- `POST /api/auth/set-initial-password`
- `POST /api/auth/request-reset`
- `POST /api/auth/reset-password`

O login administrativo existente continua separado em `/api/admin/login`.

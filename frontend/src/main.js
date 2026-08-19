import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

const app = document.querySelector('#app');

let emailAtual = '';
let paginaAtual = 'dashboard';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getToken() {
  return localStorage.getItem('host_token');
}

// Wrapper de fetch autenticado. Em 401, derruba a sessão e volta pro login,
// porque o token expirou ou foi revogado (não fingimos que a sessão continua válida).
async function apiFetch(pathUrl, options = {}) {
  const token = getToken();

  const response = await fetch(`${API}${pathUrl}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('host_token');
    localStorage.removeItem('host_user');
    telaLogin();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}


function saveSession(data) {
  localStorage.setItem('host_token', data.token);
  localStorage.setItem('host_user', JSON.stringify(data.user));
  dashboard(data.user);
}

function saveSetupSession(data) {
  localStorage.setItem('host_setup_token', data.setup_token);
  localStorage.setItem('host_setup_user', JSON.stringify(data.user));
  telaCriarSenha(data.user);
}

function telaLogin() {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">

        <div class="login-top">
          <div class="brand">HOST<span>BYGDEALL</span></div>
          <button id="admin-menu" class="admin-menu" type="button">⋮</button>
        </div>

        <form id="login-form">
          <label>Gmail</label>
          <input id="email" type="email" placeholder="voce@gmail.com" autocomplete="email" required>

          <label>Senha</label>
          <input id="password" type="password" placeholder="Sua senha" autocomplete="current-password" required>

          <button type="submit">Entrar</button>
          <p id="error" class="error"></p>
        </form>

        <div class="login-links">
          <button id="create" class="secondary" type="button">
            Primeiro acesso / Criar conta
          </button>

          <button id="forgot" class="secondary" type="button">
            Esqueci minha senha
          </button>
        </div>

      </div>
    </div>
  `;

  document.querySelector('#login-form').onsubmit = loginComSenha;
  document.querySelector('#create').onclick = telaCadastro;
  document.querySelector('#forgot').onclick = telaEsqueciSenha;

  document.querySelector('#admin-menu').onclick = () => {
    const existente = document.querySelector('#admin-popup');

    if (existente) {
      existente.remove();
      return;
    }

    const popup = document.createElement('div');
    popup.id = 'admin-popup';
    popup.className = 'admin-popup';

    popup.innerHTML = `
      <div class="admin-popup-title">Área administrativa</div>
      <div class="admin-popup-text">
        Acesso restrito à equipe autorizada.
      </div>
      <button id="open-admin" type="button">
        Acessar painel ADM
      </button>
    `;

    document.body.appendChild(popup);

    document.querySelector('#open-admin').onclick = () => {
      window.location.href = '/admin.html';
    };
  };
}

async function loginComSenha(event) {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim().toLowerCase();
  const password = document.querySelector('#password').value;
  const error = document.querySelector('#error');
  const button = event.submitter;

  button.disabled = true;
  button.textContent = 'Entrando...';
  error.textContent = '';

  try {
    const response = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Não foi possível entrar');

    saveSession(data);
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Entrar';
  }
}

function telaCadastro() {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <h2>Criar sua conta</h2>
        <p class="muted">
          O código por e-mail será usado somente no primeiro cadastro.
          Depois você entra normalmente com sua senha.
        </p>

        <form id="signup-form">
          <label>Seu Gmail</label>
          <input id="email" type="email" placeholder="voce@gmail.com" autocomplete="email" required>
          <button type="submit">Enviar código</button>
          <p id="error" class="error"></p>
        </form>

        <button id="back" class="secondary">Voltar para login</button>
      </div>
    </div>
  `;

  document.querySelector('#signup-form').onsubmit = solicitarCodigoCadastro;
  document.querySelector('#back').onclick = telaLogin;
}

async function solicitarCodigoCadastro(event) {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim().toLowerCase();
  const error = document.querySelector('#error');
  const button = event.submitter;

  button.disabled = true;
  button.textContent = 'Enviando código...';
  error.textContent = '';

  try {
    const response = await fetch(`${API}/api/auth/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o código');

    emailAtual = email;
    telaCodigoCadastro();
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Enviar código';
  }
}

function telaCodigoCadastro() {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <div class="code-icon">✉</div>
        <h2>Confira seu e-mail</h2>
        <p class="muted">
          Enviamos um código de 6 dígitos para <strong>${escapeHtml(emailAtual)}</strong>.
        </p>

        <form id="code-form">
          <label>Código de cadastro</label>
          <input id="code" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="000000" autocomplete="one-time-code" required>
          <button type="submit">Verificar código</button>
          <p id="error" class="error"></p>
        </form>

        <button id="back" class="secondary">Voltar</button>
      </div>
    </div>
  `;

  document.querySelector('#code-form').onsubmit = verificarCodigoCadastro;
  document.querySelector('#back').onclick = telaCadastro;
  document.querySelector('#code').focus();
}

async function verificarCodigoCadastro(event) {
  event.preventDefault();

  const code = document.querySelector('#code').value.trim();
  const error = document.querySelector('#error');
  const button = event.submitter;

  button.disabled = true;
  button.textContent = 'Verificando...';
  error.textContent = '';

  try {
    const response = await fetch(`${API}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAtual, code })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Código inválido');

    saveSetupSession(data);
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Verificar código';
  }
}

function telaCriarSenha(user) {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <h2>Crie sua senha</h2>
        <p class="muted">
          O código foi confirmado. Agora sua conta ficará protegida por uma senha.
        </p>

        <form id="password-form">
          <label>Nova senha</label>
          <input id="password" type="password" minlength="8" autocomplete="new-password" required>

          <label>Confirme a senha</label>
          <input id="password2" type="password" minlength="8" autocomplete="new-password" required>

          <label>Gmail/e-mail de recuperação</label>
          <input id="recovery" type="email" placeholder="recuperacao@gmail.com" autocomplete="email" required>

          <div class="panel" style="margin:12px 0">
            <strong>⚠️ Anote e guarde sua senha!</strong>
            <p class="muted">Depois deste cadastro, você entra com Gmail + senha. Se esquecer, o código será enviado para o seu e-mail de recuperação.</p>
          </div>

          <button type="submit">Salvar senha e entrar</button>
          <p id="error" class="error"></p>
        </form>
      </div>
    </div>
  `;

  document.querySelector('#password-form').onsubmit = salvarSenhaInicial;
}

async function salvarSenhaInicial(event) {
  event.preventDefault();

  const password = document.querySelector('#password').value;
  const password2 = document.querySelector('#password2').value;
  const recovery_email = document.querySelector('#recovery').value.trim().toLowerCase();
  const error = document.querySelector('#error');
  const button = event.submitter;

  error.textContent = '';

  if (password.length < 8) {
    error.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }

  if (password !== password2) {
    error.textContent = 'As senhas não são iguais.';
    return;
  }

  const setupToken = localStorage.getItem('host_setup_token');

  button.disabled = true;
  button.textContent = 'Salvando...';

  try {
    const response = await fetch(`${API}/api/auth/set-initial-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${setupToken}`
      },
      body: JSON.stringify({ password, recovery_email })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a senha');

    localStorage.removeItem('host_setup_token');
    localStorage.removeItem('host_setup_user');
    saveSession(data);
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Salvar senha e entrar';
  }
}

function telaEsqueciSenha() {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <h2>Recuperar senha</h2>
        <p class="muted">Digite o Gmail da sua conta. O código será enviado para o e-mail de recuperação que você cadastrou.</p>

        <form id="reset-request-form">
          <label>Gmail da conta</label>
          <input id="email" type="email" autocomplete="email" required>
          <button type="submit">Enviar código de recuperação</button>
          <p id="error" class="error"></p>
        </form>

        <button id="back" class="secondary">Voltar para login</button>
      </div>
    </div>
  `;

  document.querySelector('#reset-request-form').onsubmit = solicitarReset;
  document.querySelector('#back').onclick = telaLogin;
}

async function solicitarReset(event) {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim().toLowerCase();
  const error = document.querySelector('#error');
  const button = event.submitter;

  button.disabled = true;
  button.textContent = 'Enviando...';
  error.textContent = '';

  try {
    const response = await fetch(`${API}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o código');

    emailAtual = email;
    telaResetCodigo(data.recovery_hint);
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Enviar código de recuperação';
  }
}

function telaResetCodigo(hint) {
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <h2>Digite o código</h2>
        <p class="muted">
          Enviamos o código para seu e-mail de recuperação <strong>${escapeHtml(hint || '')}</strong>.
        </p>

        <form id="reset-form">
          <label>Código de recuperação</label>
          <input id="code" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required>

          <label>Nova senha</label>
          <input id="password" type="password" minlength="8" autocomplete="new-password" required>

          <label>Confirme a nova senha</label>
          <input id="password2" type="password" minlength="8" autocomplete="new-password" required>

          <div class="panel" style="margin:12px 0">
            <strong>⚠️ Anote e guarde sua nova senha!</strong>
            <p class="muted">Ela será usada nos próximos acessos.</p>
          </div>

          <button type="submit">Redefinir senha</button>
          <p id="error" class="error"></p>
        </form>

        <button id="back" class="secondary">Voltar para login</button>
      </div>
    </div>
  `;

  document.querySelector('#reset-form').onsubmit = redefinirSenha;
  document.querySelector('#back').onclick = telaLogin;
  document.querySelector('#code').focus();
}

async function redefinirSenha(event) {
  event.preventDefault();

  const code = document.querySelector('#code').value.trim();
  const password = document.querySelector('#password').value;
  const password2 = document.querySelector('#password2').value;
  const error = document.querySelector('#error');
  const button = event.submitter;

  if (password.length < 8) {
    error.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }

  if (password !== password2) {
    error.textContent = 'As senhas não são iguais.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Redefinindo...';
  error.textContent = '';

  try {
    const response = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAtual, code, password })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Não foi possível redefinir a senha');

    saveSession(data);
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Redefinir senha';
  }
}

const NAV_ITEMS = [
  { id: 'dashboard', label: '⌂ Dashboard', ready: true },
  { id: 'servicos', label: '▣ Meus serviços', ready: false },
  { id: 'suporte', label: '🎧 Suporte', ready: true },
  { id: 'conta', label: '⚙ Minha conta', ready: true }
];

function shell(user, contentHtml) {
  app.innerHTML = `
    <div class="user-layout">
      <aside>
        <div class="brand">HOST<span>BYGDEALL</span></div>

        <nav>
          ${NAV_ITEMS.map(item => `
            <button data-page="${item.id}" class="${paginaAtual === item.id ? 'active' : ''}">
              ${item.label}
            </button>
          `).join('')}
        </nav>

        <button id="logout" class="logout">Sair</button>
      </aside>

      <main>
        <header>
          <div>
            <h1>Olá, ${escapeHtml(user.name || 'usuário')} 👋</h1>
            <p>${escapeHtml(user.email)}</p>
          </div>
          <div class="status">● ONLINE</div>
        </header>

        ${contentHtml}

        <footer>
          <span>HostBygdeall</span>
          <span>bygdëall ♪</span>
        </footer>
      </main>
    </div>
  `;

  document.querySelector('#logout').onclick = () => {
    localStorage.removeItem('host_token');
    localStorage.removeItem('host_user');
    emailAtual = '';
    telaLogin();
  };

  document.querySelectorAll('nav [data-page]').forEach(btn => {
    btn.onclick = () => {
      const item = NAV_ITEMS.find(i => i.id === btn.dataset.page);
      paginaAtual = item.id;
      renderPagina(user);
    };
  });
}

async function renderPagina(user) {
  if (paginaAtual === 'dashboard') return pageDashboard(user);
  if (paginaAtual === 'suporte') return pageSuporte(user);
  if (paginaAtual === 'conta') return pageConta(user);
  return pageEmConstrucao(user);
}

function loadingSection() {
  return `<section class="panel"><p class="muted">Carregando...</p></section>`;
}

async function pageDashboard(user) {
  shell(user, loadingSection());

  let summary = { tickets_open: 0, services_total: 0 };

  try {
    const data = await apiFetch('/api/me/summary');
    summary = data.summary;
  } catch (err) {
    // Se a sessão caiu, apiFetch já redirecionou para o login.
  }

  const content = `
    <section class="cards">
      <div class="card">
        <small>SERVIÇOS</small>
        <strong>${summary.services_total}</strong>
        <span>hospedados</span>
      </div>

      <div class="card">
        <small>CHAMADOS</small>
        <strong>${summary.tickets_open}</strong>
        <span>em aberto</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Hospedagem de serviços</h2>
          <p>Upload de sites, Node.js, Python e bots está em desenvolvimento nesta etapa do projeto.</p>
        </div>
      </div>
      <p class="muted">
        Assim que o motor de deploy estiver pronto, essa tela vai mostrar o fluxo real de
        criação de serviços — nada aparece aqui como "disponível" até realmente funcionar.
      </p>
    </section>
  `;

  shell(user, content);
}

function pageEmConstrucao(user) {
  shell(user, `
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Módulo em desenvolvimento</h2>
          <p>Esta área ainda não está disponível.</p>
        </div>
      </div>
    </section>
  `);
}

/* ============ MINHA CONTA ============ */

async function pageConta(user) {
  shell(user, loadingSection());

  let fresh = user;
  try {
    const data = await apiFetch('/api/me');
    fresh = data.user;
    localStorage.setItem('host_user', JSON.stringify(fresh));
  } catch (err) {
    return;
  }

  shell(user, `
    <section class="panel">
      <div class="panel-title">
        <div><h2>Minha conta</h2><p>Seus dados de cadastro.</p></div>
      </div>

      <form id="form-nome" class="account-form">
        <label>Nome</label>
        <input id="input-nome" value="${escapeHtml(fresh.name || '')}" maxlength="80" required>

        <label>E-mail atual</label>
        <input value="${escapeHtml(fresh.email)}" disabled>

        <button type="submit">Salvar nome</button>
        <p class="ok" id="nome-ok"></p>
        <p class="error" id="nome-error"></p>
      </form>
    </section>

    <section class="panel">
      <div class="panel-title">
        <div><h2>Alterar e-mail</h2><p>Enviaremos um código de confirmação para o novo e-mail.</p></div>
      </div>

      <form id="form-email" class="account-form">
        <label>Novo e-mail</label>
        <input id="input-novo-email" type="email" required>
        <button type="submit">Enviar código</button>
        <p class="error" id="email-error"></p>
      </form>

      <form id="form-confirma-email" class="account-form" style="display:none">
        <label>Código recebido no novo e-mail</label>
        <input id="input-codigo-email" maxlength="6" inputmode="numeric" required>
        <button type="submit">Confirmar troca</button>
        <p class="error" id="confirma-email-error"></p>
      </form>
    </section>
  `);

  document.querySelector('#form-nome').onsubmit = async (e) => {
    e.preventDefault();
    const ok = document.querySelector('#nome-ok');
    const error = document.querySelector('#nome-error');
    ok.textContent = ''; error.textContent = '';

    try {
      const name = document.querySelector('#input-nome').value.trim();
      const data = await apiFetch('/api/me', { method: 'PUT', body: JSON.stringify({ name }) });
      localStorage.setItem('host_user', JSON.stringify(data.user));
      ok.textContent = 'Nome atualizado.';
    } catch (err) {
      error.textContent = err.message;
    }
  };

  document.querySelector('#form-email').onsubmit = async (e) => {
    e.preventDefault();
    const error = document.querySelector('#email-error');
    error.textContent = '';

    try {
      const new_email = document.querySelector('#input-novo-email').value.trim().toLowerCase();
      await apiFetch('/api/me/email/request-change', { method: 'POST', body: JSON.stringify({ new_email }) });
      document.querySelector('#form-confirma-email').style.display = 'grid';
    } catch (err) {
      error.textContent = err.message;
    }
  };

  document.querySelector('#form-confirma-email').onsubmit = async (e) => {
    e.preventDefault();
    const error = document.querySelector('#confirma-email-error');
    error.textContent = '';

    try {
      const code = document.querySelector('#input-codigo-email').value.trim();
      const data = await apiFetch('/api/me/email/confirm-change', { method: 'POST', body: JSON.stringify({ code }) });
      localStorage.setItem('host_user', JSON.stringify(data.user));
      pageConta(data.user);
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

/* ============ SUPORTE ============ */

const CATEGORIAS = ['Conta', 'Hospedagem', 'Site', 'Domínio', 'Pagamento', 'Erro técnico', 'Outro'];

const STATUS_LABEL = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  aguardando_usuario: 'Aguardando você',
  resolvido: 'Resolvido',
  fechado: 'Fechado'
};

async function pageSuporte(user) {
  shell(user, loadingSection());

  let tickets = [];
  try {
    const data = await apiFetch('/api/tickets');
    tickets = data.tickets;
  } catch (err) {
    return;
  }

  const list = tickets.length === 0
    ? `<p class="muted">Você ainda não abriu nenhum chamado.</p>`
    : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Assunto</th><th>Categoria</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${tickets.map(t => `
              <tr>
                <td>#${t.id}</td>
                <td>${escapeHtml(t.subject)}</td>
                <td>${escapeHtml(t.category)}</td>
                <td>${STATUS_LABEL[t.status] || t.status}</td>
                <td><button data-open-ticket="${t.id}">Abrir</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  shell(user, `
    <section class="panel">
      <div class="panel-title">
        <div><h2>Abrir novo chamado</h2><p>Nossa equipe responde por aqui mesmo.</p></div>
      </div>

      <form id="form-ticket" class="account-form">
        <label>Categoria</label>
        <select id="ticket-categoria">
          ${CATEGORIAS.map(c => `<option>${c}</option>`).join('')}
        </select>

        <label>Assunto</label>
        <input id="ticket-assunto" maxlength="150" required>

        <label>Mensagem</label>
        <textarea id="ticket-mensagem" rows="4" maxlength="5000" required></textarea>

        <button type="submit">Enviar chamado</button>
        <p class="error" id="ticket-error"></p>
      </form>
    </section>

    <section class="panel">
      <div class="panel-title"><div><h2>Meus chamados</h2></div></div>
      ${list}
    </section>

    <div id="ticket-modal"></div>
  `);

  document.querySelector('#form-ticket').onsubmit = async (e) => {
    e.preventDefault();
    const error = document.querySelector('#ticket-error');
    error.textContent = '';

    try {
      await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: document.querySelector('#ticket-categoria').value,
          subject: document.querySelector('#ticket-assunto').value.trim(),
          message: document.querySelector('#ticket-mensagem').value.trim()
        })
      });
      pageSuporte(user);
    } catch (err) {
      error.textContent = err.message;
    }
  };

  document.querySelectorAll('[data-open-ticket]').forEach(btn => {
    btn.onclick = () => abrirTicket(user, btn.dataset.openTicket);
  });
}

async function abrirTicket(user, ticketId) {
  const modal = document.querySelector('#ticket-modal');
  modal.innerHTML = `<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;

  let ticket, messages;
  try {
    const data = await apiFetch(`/api/tickets/${ticketId}`);
    ticket = data.ticket;
    messages = data.messages;
  } catch (err) {
    modal.innerHTML = '';
    return;
  }

  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <h3>#${ticket.id} — ${escapeHtml(ticket.subject)}</h3>
        <p class="muted">${STATUS_LABEL[ticket.status]}</p>

        <div class="messages">
          ${messages.map(m => `
            <div class="message ${m.author_role}">
              <strong>${m.author_role === 'admin' ? 'Suporte' : escapeHtml(m.author_name)}</strong>
              <p>${escapeHtml(m.message)}</p>
            </div>
          `).join('')}
        </div>

        ${ticket.status !== 'fechado' ? `
          <form id="form-reply" class="account-form">
            <textarea id="reply-message" rows="3" maxlength="5000" required placeholder="Responder..."></textarea>
            <button type="submit">Enviar</button>
            <p class="error" id="reply-error"></p>
          </form>
          <button id="close-ticket" class="secondary">Fechar chamado</button>
        ` : ''}

        <button id="close-modal" class="secondary">Fechar</button>
      </div>
    </div>
  `;

  document.querySelector('#close-modal').onclick = () => { modal.innerHTML = ''; };

  const replyForm = document.querySelector('#form-reply');
  if (replyForm) {
    replyForm.onsubmit = async (e) => {
      e.preventDefault();
      const error = document.querySelector('#reply-error');
      try {
        await apiFetch(`/api/tickets/${ticketId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message: document.querySelector('#reply-message').value.trim() })
        });
        abrirTicket(user, ticketId);
      } catch (err) {
        error.textContent = err.message;
      }
    };
  }

  const closeBtn = document.querySelector('#close-ticket');
  if (closeBtn) {
    closeBtn.onclick = async () => {
      await apiFetch(`/api/tickets/${ticketId}/close`, { method: 'POST' });
      modal.innerHTML = '';
      pageSuporte(user);
    };
  }
}

function dashboard(user) {
  paginaAtual = 'dashboard';
  pageDashboard(user);
}

const token = localStorage.getItem('host_token');
const savedUser = localStorage.getItem('host_user');

if (token && savedUser) {
  try {
    dashboard(JSON.parse(savedUser));
  } catch {
    telaLogin();
  }
} else {
  telaLogin();
}

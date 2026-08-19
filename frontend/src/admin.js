import './admin.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

const app = document.querySelector('#admin-app');

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
  return localStorage.getItem('host_admin_token');
}

async function apiFetch(pathUrl, options = {}) {
  const token = getToken();

  const response = await fetch(`${API}${pathUrl}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('host_admin_token');
    localStorage.removeItem('host_admin_user');
    loginTela();
    throw new Error('Sessão administrativa expirada.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

function loginTela() {
  app.innerHTML = `
    <div class="admin-login">
      <div class="admin-card">

        <div class="brand">
          HOST<span>BYGDEALL</span>
        </div>

        <div class="admin-badge">
          PAINEL ADMINISTRATIVO
        </div>

        <h1>Entrar</h1>

        <p class="muted">
          Acesse o painel de controle da plataforma.
        </p>

        <form id="admin-login-form">

          <label>E-mail</label>

          <input
            id="admin-email"
            type="email"
            placeholder="admin@gmail.com"
            autocomplete="username"
            required
          >

          <label>Senha</label>

          <input
            id="admin-password"
            type="password"
            placeholder="Sua senha"
            autocomplete="current-password"
            required
          >

          <button type="submit">
            Entrar no painel
          </button>

          <p id="admin-error"></p>

        </form>

        <button id="back-login" class="secondary">
          Voltar para o login
        </button>

      </div>
    </div>
  `;

  document.querySelector('#admin-login-form')
    .onsubmit = fazerLogin;

  document.querySelector('#back-login')
    .onclick = () => {
      window.location.href = '/';
    };
}

async function fazerLogin(event) {
  event.preventDefault();

  const email = document
    .querySelector('#admin-email')
    .value
    .trim()
    .toLowerCase();

  const password = document
    .querySelector('#admin-password')
    .value;

  const button = event.submitter;
  const error = document.querySelector('#admin-error');

  button.disabled = true;
  button.textContent = 'Entrando...';
  error.textContent = '';

  try {
    const response = await fetch(
      `${API}/api/admin/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível entrar');
    }

    if (!data.token || !['admin', 'super_admin'].includes(data.user?.role)) {
      throw new Error('Conta sem permissão administrativa');
    }

    localStorage.setItem('host_admin_token', data.token);
    localStorage.setItem('host_admin_user', JSON.stringify(data.user));

    paginaAtual = 'dashboard';
    renderAdmin(data.user);

  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Entrar no painel';
  }
}

const NAV_ITEMS = [
  { id: 'dashboard', label: '◈ Dashboard', ready: true },
  { id: 'usuarios', label: '◉ Usuários', ready: true },
  { id: 'suporte', label: '🎧 Suporte', ready: true },
  { id: 'servicos', label: '▣ Hospedagens', ready: false },
  { id: 'bots', label: '⚡ Bots', ready: false },
  { id: 'musica', label: '♪ Música', ready: false },
  { id: 'logs', label: '◫ Logs', ready: false }
];

function adminShell(user, contentHtml) {
  app.innerHTML = `
    <div class="admin-layout">

      <aside class="admin-sidebar">

        <div class="brand">HOST<span>BYGDEALL</span></div>
        <div class="admin-label">ADMIN</div>

        <nav>
          ${NAV_ITEMS.map(item => `
            <button data-page="${item.id}" class="${paginaAtual === item.id ? 'active' : ''}">
              ${item.label}
            </button>
          `).join('')}
        </nav>

        <button id="admin-logout" class="logout">Sair</button>

      </aside>

      <main class="admin-main">

        <header class="admin-header">
          <div>
            <p class="eyebrow">HOSTBYGDEALL / ADMIN</p>
            <h1>Painel administrativo</h1>
            <p class="muted">Bem-vindo, ${escapeHtml(user.name || user.email)}.</p>
          </div>

          <div class="admin-status">
            <span>●</span>
            SISTEMA ONLINE
          </div>
        </header>

        ${contentHtml}

        <footer>
          <span>HostBygdeall Admin</span>
          <span>bygdëall ♪</span>
        </footer>

      </main>
    </div>
  `;

  document.querySelector('#admin-logout').onclick = () => {
    localStorage.removeItem('host_admin_token');
    localStorage.removeItem('host_admin_user');
    loginTela();
  };

  document.querySelectorAll('nav [data-page]').forEach(btn => {
    btn.onclick = () => {
      paginaAtual = btn.dataset.page;
      renderAdmin(user);
    };
  });
}

async function renderAdmin(user) {
  if (paginaAtual === 'dashboard') return pageDashboard(user);
  if (paginaAtual === 'usuarios') return pageUsuarios(user);
  if (paginaAtual === 'suporte') return pageSuporte(user);
  return pageEmConstrucao(user);
}

function loadingPanel() {
  return `<section class="admin-panel"><p class="muted" style="padding:20px">Carregando...</p></section>`;
}

function pageEmConstrucao(user) {
  adminShell(user, `
    <section class="admin-panel">
      <div class="panel-header">
        <div>
          <h2>Módulo em desenvolvimento</h2>
          <p>Esta área ainda não tem funcionalidade real implementada — por isso não mostramos dados aqui.</p>
        </div>
      </div>
    </section>
  `);
}

/* ============ DASHBOARD ============ */

async function pageDashboard(user) {
  adminShell(user, loadingPanel());

  let stats;
  try {
    const data = await apiFetch('/api/admin/stats');
    stats = data.stats;
  } catch (err) {
    return;
  }

  adminShell(user, `
    <section class="admin-cards">
      <div class="admin-stat">
        <small>USUÁRIOS</small>
        <strong>${stats.users_total}</strong>
        <span>${stats.users_verified} verificados</span>
      </div>

      <div class="admin-stat">
        <small>USUÁRIOS BLOQUEADOS</small>
        <strong>${stats.users_blocked}</strong>
        <span>contas suspensas</span>
      </div>

      <div class="admin-stat">
        <small>SERVIÇOS</small>
        <strong>${stats.services_total}</strong>
        <span>${stats.services_online} online</span>
      </div>

      <div class="admin-stat">
        <small>CHAMADOS</small>
        <strong>${stats.tickets_open}</strong>
        <span>${stats.tickets_pending} aguardando você</span>
      </div>
    </section>

    <section class="admin-panel">
      <div class="panel-header">
        <div>
          <h2>Sobre estes números</h2>
          <p>Todos os valores acima vêm de consultas reais ao banco de dados no momento do carregamento.</p>
        </div>
      </div>
    </section>
  `);
}

/* ============ USUÁRIOS ============ */

async function pageUsuarios(user) {
  adminShell(user, loadingPanel());

  let users;
  try {
    const data = await apiFetch('/api/admin/users');
    users = data.users;
  } catch (err) {
    return;
  }

  const rows = users.length === 0
    ? `<tr><td colspan="6">Nenhum usuário cadastrado.</td></tr>`
    : users.map(u => {
      const status = u.blocked
        ? '<span class="blocked">BLOQUEADO</span>'
        : '<span class="online">ATIVO</span>';

      const lastLogin = u.last_login
        ? new Date(u.last_login).toLocaleString('pt-BR')
        : 'Nunca';

      return `
        <tr>
          <td>#${u.id}</td>
          <td>
            <strong>${escapeHtml(u.name || 'Sem nome')}</strong>
            <small class="private-email">${escapeHtml(u.email)}</small>
          </td>
          <td><span class="role">${u.role.toUpperCase()}</span></td>
          <td>${status}</td>
          <td>${lastLogin}</td>
          <td>
            <button class="action-btn" data-view="${u.id}">Ver</button>
            <button class="action-btn ${u.blocked ? '' : 'danger'}" data-toggle-block="${u.id}" data-blocked="${u.blocked}">
              ${u.blocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

  adminShell(user, `
    <section class="admin-panel">
      <div class="panel-header">
        <div>
          <h2>Usuários</h2>
          <p>Contas registradas na plataforma. O e-mail é visível apenas para a equipe.</p>
        </div>
        <button id="refresh-users">Atualizar</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>USUÁRIO</th><th>FUNÇÃO</th><th>STATUS</th><th>ÚLTIMO LOGIN</th><th>AÇÕES</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>

    <div id="user-modal"></div>
  `);

  document.querySelector('#refresh-users').onclick = () => pageUsuarios(user);

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => verUsuario(user, btn.dataset.view);
  });

  document.querySelectorAll('[data-toggle-block]').forEach(btn => {
    btn.onclick = async () => {
      const currentlyBlocked = btn.dataset.blocked === 'true';
      try {
        await apiFetch(`/api/admin/users/${btn.dataset.toggleBlock}/block`, {
          method: 'PATCH',
          body: JSON.stringify({ blocked: !currentlyBlocked })
        });
        pageUsuarios(user);
      } catch (err) {
        alert(err.message);
      }
    };
  });
}

async function verUsuario(user, userId) {
  const modal = document.querySelector('#user-modal');
  modal.innerHTML = `<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;

  let detail;
  try {
    detail = await apiFetch(`/api/admin/users/${userId}`);
  } catch (err) {
    modal.innerHTML = '';
    return;
  }

  const { user: u, tickets, services } = detail;
  const isSuperAdmin = user.role === 'super_admin';

  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${escapeHtml(u.name || 'Sem nome')}</h3>
        <p class="private-email">${escapeHtml(u.email)}</p>
        <p class="muted">Cadastrado em ${new Date(u.created_at).toLocaleString('pt-BR')}</p>

        ${isSuperAdmin ? `
          <label>Função</label>
          <select id="user-role">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuário</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
          <button class="action-btn" id="save-role" style="margin-top:10px">Salvar função</button>
          <p class="error" id="role-error"></p>

          ${['admin', 'super_admin'].includes(u.role) ? `
            <label style="margin-top:14px">Definir senha de acesso ao painel</label>
            <input id="set-password" type="password" minlength="8" placeholder="Mínimo 8 caracteres">
            <button class="action-btn" id="save-password" style="margin-top:10px">Definir senha</button>
            <p class="ok" id="password-ok"></p>
            <p class="error" id="password-error"></p>
          ` : ''}
        ` : ''}

        <h3 style="margin-top:24px">Chamados</h3>
        ${tickets.length === 0
          ? '<p class="muted">Nenhum chamado.</p>'
          : `<ul>${tickets.map(t => `<li>#${t.id} — ${escapeHtml(t.subject)} (${t.status})</li>`).join('')}</ul>`
        }

        <h3>Serviços</h3>
        ${services.length === 0
          ? '<p class="muted">Nenhum serviço hospedado.</p>'
          : `<ul>${services.map(s => `<li>${escapeHtml(s.name)} — ${s.type} (${s.status})</li>`).join('')}</ul>`
        }

        <button id="close-user-modal" class="secondary" style="margin-top:16px">Fechar</button>
      </div>
    </div>
  `;

  document.querySelector('#close-user-modal').onclick = () => { modal.innerHTML = ''; };

  const saveRoleBtn = document.querySelector('#save-role');
  if (saveRoleBtn) {
    saveRoleBtn.onclick = async () => {
      const role = document.querySelector('#user-role').value;
      const error = document.querySelector('#role-error');
      try {
        await apiFetch(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role })
        });
        modal.innerHTML = '';
        pageUsuarios(user);
      } catch (err) {
        error.textContent = err.message;
      }
    };
  }

  const savePasswordBtn = document.querySelector('#save-password');
  if (savePasswordBtn) {
    savePasswordBtn.onclick = async () => {
      const password = document.querySelector('#set-password').value;
      const error = document.querySelector('#password-error');
      const ok = document.querySelector('#password-ok');
      error.textContent = '';
      ok.textContent = '';

      try {
        await apiFetch(`/api/admin/users/${userId}/set-password`, {
          method: 'POST',
          body: JSON.stringify({ password })
        });
        ok.textContent = 'Senha definida com sucesso.';
        document.querySelector('#set-password').value = '';
      } catch (err) {
        error.textContent = err.message;
      }
    };
  }
}

/* ============ SUPORTE ============ */

const STATUS_LABEL = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  aguardando_usuario: 'Aguardando usuário',
  resolvido: 'Resolvido',
  fechado: 'Fechado'
};

async function pageSuporte(user, filtroStatus = '') {
  adminShell(user, loadingPanel());

  let tickets;
  try {
    const qs = filtroStatus ? `?status=${encodeURIComponent(filtroStatus)}` : '';
    const data = await apiFetch(`/api/admin/tickets${qs}`);
    tickets = data.tickets;
  } catch (err) {
    return;
  }

  const rows = tickets.length === 0
    ? `<tr><td colspan="6">Nenhum chamado encontrado.</td></tr>`
    : tickets.map(t => `
      <tr>
        <td>#${t.id}</td>
        <td>
          <strong>${escapeHtml(t.subject)}</strong>
          <small class="private-email">${escapeHtml(t.user.email)}</small>
        </td>
        <td>${escapeHtml(t.category)}</td>
        <td>${STATUS_LABEL[t.status] || t.status}</td>
        <td>${new Date(t.updated_at).toLocaleString('pt-BR')}</td>
        <td><button class="action-btn" data-open-ticket="${t.id}">Abrir</button></td>
      </tr>
    `).join('');

  adminShell(user, `
    <section class="admin-panel">
      <div class="panel-header">
        <div>
          <h2>Suporte</h2>
          <p>Chamados abertos pelos usuários.</p>
        </div>
      </div>

      <div class="filters">
        <select id="filter-status">
          <option value="">Todos os status</option>
          ${Object.entries(STATUS_LABEL).map(([k, v]) =>
            `<option value="${k}" ${filtroStatus === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>ASSUNTO / USUÁRIO</th><th>CATEGORIA</th><th>STATUS</th><th>ATUALIZADO</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>

    <div id="ticket-modal"></div>
  `);

  document.querySelector('#filter-status').onchange = (e) => {
    pageSuporte(user, e.target.value);
  };

  document.querySelectorAll('[data-open-ticket]').forEach(btn => {
    btn.onclick = () => abrirTicketAdmin(user, btn.dataset.openTicket, filtroStatus);
  });
}

async function abrirTicketAdmin(user, ticketId, filtroStatus) {
  const modal = document.querySelector('#ticket-modal');
  modal.innerHTML = `<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;

  let ticket, messages;
  try {
    const data = await apiFetch(`/api/admin/tickets/${ticketId}`);
    ticket = data.ticket;
    messages = data.messages;
  } catch (err) {
    modal.innerHTML = '';
    return;
  }

  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>#${ticket.id} — ${escapeHtml(ticket.subject)}</h3>
        <p class="private-email">${escapeHtml(ticket.user.name)} · ${escapeHtml(ticket.user.email)}</p>

        <label>Status</label>
        <select id="ticket-status">
          ${Object.entries(STATUS_LABEL).map(([k, v]) =>
            `<option value="${k}" ${ticket.status === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>

        <div class="messages">
          ${messages.map(m => `
            <div class="message ${m.author_role}">
              <strong>${m.author_role === 'admin' ? 'Equipe' : escapeHtml(m.author_name)}</strong>
              <p>${escapeHtml(m.message)}</p>
            </div>
          `).join('')}
        </div>

        <form id="form-admin-reply" class="account-form">
          <textarea id="admin-reply-message" rows="3" maxlength="5000" required placeholder="Responder ao usuário..."></textarea>
          <button type="submit">Enviar resposta</button>
          <p class="error" id="admin-reply-error"></p>
        </form>

        <button id="close-ticket-modal" class="secondary">Fechar</button>
      </div>
    </div>
  `;

  document.querySelector('#close-ticket-modal').onclick = () => { modal.innerHTML = ''; };

  document.querySelector('#ticket-status').onchange = async (e) => {
    try {
      await apiFetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: e.target.value })
      });
      modal.innerHTML = '';
      pageSuporte(user, filtroStatus);
    } catch (err) {
      alert(err.message);
    }
  };

  document.querySelector('#form-admin-reply').onsubmit = async (e) => {
    e.preventDefault();
    const error = document.querySelector('#admin-reply-error');
    try {
      await apiFetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: document.querySelector('#admin-reply-message').value.trim() })
      });
      abrirTicketAdmin(user, ticketId, filtroStatus);
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

const token = localStorage.getItem('host_admin_token');
const savedUser = localStorage.getItem('host_admin_user');

if (token && savedUser) {
  try {
    const user = JSON.parse(savedUser);

    if (['admin', 'super_admin'].includes(user.role)) {
      paginaAtual = 'dashboard';
      renderAdmin(user);
    } else {
      loginTela();
    }
  } catch {
    loginTela();
  }
} else {
  loginTela();
}

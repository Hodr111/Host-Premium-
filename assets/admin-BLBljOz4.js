import"./modulepreload-polyfill-P2Xu9kJm.js";var e=`http://127.0.0.1:3000`,t=document.querySelector(`#admin-app`),n=`dashboard`;function r(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function i(){return localStorage.getItem(`host_admin_token`)}async function a(t,n={}){let r=i(),a=await fetch(`${e}${t}`,{...n,headers:{...n.body?{"Content-Type":`application/json`}:{},...r?{Authorization:`Bearer ${r}`}:{},...n.headers||{}}});if(a.status===401)throw localStorage.removeItem(`host_admin_token`),localStorage.removeItem(`host_admin_user`),o(),Error(`Sessão administrativa expirada.`);let s=await a.json().catch(()=>({}));if(!a.ok)throw Error(s.error||`Erro na requisição`);return s}function o(){t.innerHTML=`
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
  `,document.querySelector(`#admin-login-form`).onsubmit=s,document.querySelector(`#back-login`).onclick=()=>{window.location.href=`./`}}async function s(t){t.preventDefault();let r=document.querySelector(`#admin-email`).value.trim().toLowerCase(),i=document.querySelector(`#admin-password`).value,a=t.submitter,o=document.querySelector(`#admin-error`);a.disabled=!0,a.textContent=`Entrando...`,o.textContent=``;try{let t=await fetch(`${e}/api/admin/login`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:r,password:i})}),a=await t.json();if(!t.ok)throw Error(a.error||`Não foi possível entrar`);if(!a.token||![`admin`,`super_admin`].includes(a.user?.role))throw Error(`Conta sem permissão administrativa`);localStorage.setItem(`host_admin_token`,a.token),localStorage.setItem(`host_admin_user`,JSON.stringify(a.user)),n=`dashboard`,u(a.user)}catch(e){o.textContent=e.message,a.disabled=!1,a.textContent=`Entrar no painel`}}var c=[{id:`dashboard`,label:`◈ Dashboard`,ready:!0},{id:`usuarios`,label:`◉ Usuários`,ready:!0},{id:`suporte`,label:`🎧 Suporte`,ready:!0},{id:`servicos`,label:`▣ Hospedagens`,ready:!1},{id:`bots`,label:`⚡ Bots`,ready:!1},{id:`musica`,label:`♪ Música`,ready:!1},{id:`logs`,label:`◫ Logs`,ready:!1}];function l(e,i){t.innerHTML=`
    <div class="admin-layout">

      <aside class="admin-sidebar">

        <div class="brand">HOST<span>BYGDEALL</span></div>
        <div class="admin-label">ADMIN</div>

        <nav>
          ${c.map(e=>`
            <button data-page="${e.id}" class="${n===e.id?`active`:``}">
              ${e.label}
            </button>
          `).join(``)}
        </nav>

        <button id="admin-logout" class="logout">Sair</button>

      </aside>

      <main class="admin-main">

        <header class="admin-header">
          <div>
            <p class="eyebrow">HOSTBYGDEALL / ADMIN</p>
            <h1>Painel administrativo</h1>
            <p class="muted">Bem-vindo, ${r(e.name||e.email)}.</p>
          </div>

          <div class="admin-status">
            <span>●</span>
            SISTEMA ONLINE
          </div>
        </header>

        ${i}

        <footer>
          <span>HostBygdeall Admin</span>
          <span>bygdëall ♪</span>
        </footer>

      </main>
    </div>
  `,document.querySelector(`#admin-logout`).onclick=()=>{localStorage.removeItem(`host_admin_token`),localStorage.removeItem(`host_admin_user`),o()},document.querySelectorAll(`nav [data-page]`).forEach(t=>{t.onclick=()=>{n=t.dataset.page,u(e)}})}async function u(e){return n===`dashboard`?p(e):n===`usuarios`?m(e):n===`suporte`?_(e):f(e)}function d(){return`<section class="admin-panel"><p class="muted" style="padding:20px">Carregando...</p></section>`}function f(e){l(e,`
    <section class="admin-panel">
      <div class="panel-header">
        <div>
          <h2>Módulo em desenvolvimento</h2>
          <p>Esta área ainda não tem funcionalidade real implementada — por isso não mostramos dados aqui.</p>
        </div>
      </div>
    </section>
  `)}async function p(e){l(e,d());let t;try{t=(await a(`/api/admin/stats`)).stats}catch{return}l(e,`
    <section class="admin-cards">
      <div class="admin-stat">
        <small>USUÁRIOS</small>
        <strong>${t.users_total}</strong>
        <span>${t.users_verified} verificados</span>
      </div>

      <div class="admin-stat">
        <small>USUÁRIOS BLOQUEADOS</small>
        <strong>${t.users_blocked}</strong>
        <span>contas suspensas</span>
      </div>

      <div class="admin-stat">
        <small>SERVIÇOS</small>
        <strong>${t.services_total}</strong>
        <span>${t.services_online} online</span>
      </div>

      <div class="admin-stat">
        <small>CHAMADOS</small>
        <strong>${t.tickets_open}</strong>
        <span>${t.tickets_pending} aguardando você</span>
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
  `)}async function m(e){l(e,d());let t;try{t=(await a(`/api/admin/users`)).users}catch{return}l(e,`
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
          <tbody>${t.length===0?`<tr><td colspan="6">Nenhum usuário cadastrado.</td></tr>`:t.map(e=>{let t=e.blocked?`<span class="blocked">BLOQUEADO</span>`:`<span class="online">ATIVO</span>`,n=e.last_login?new Date(e.last_login).toLocaleString(`pt-BR`):`Nunca`;return`
        <tr>
          <td>#${e.id}</td>
          <td>
            <strong>${r(e.name||`Sem nome`)}</strong>
            <small class="private-email">${r(e.email)}</small>
          </td>
          <td><span class="role">${e.role.toUpperCase()}</span></td>
          <td>${t}</td>
          <td>${n}</td>
          <td>
            <button class="action-btn" data-view="${e.id}">Ver</button>
            <button class="action-btn ${e.blocked?``:`danger`}" data-toggle-block="${e.id}" data-blocked="${e.blocked}">
              ${e.blocked?`Desbloquear`:`Bloquear`}
            </button>
          </td>
        </tr>
      `}).join(``)}</tbody>
        </table>
      </div>
    </section>

    <div id="user-modal"></div>
  `),document.querySelector(`#refresh-users`).onclick=()=>m(e),document.querySelectorAll(`[data-view]`).forEach(t=>{t.onclick=()=>h(e,t.dataset.view)}),document.querySelectorAll(`[data-toggle-block]`).forEach(t=>{t.onclick=async()=>{let n=t.dataset.blocked===`true`;try{await a(`/api/admin/users/${t.dataset.toggleBlock}/block`,{method:`PATCH`,body:JSON.stringify({blocked:!n})}),m(e)}catch(e){alert(e.message)}}})}async function h(e,t){let n=document.querySelector(`#user-modal`);n.innerHTML=`<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;let i;try{i=await a(`/api/admin/users/${t}`)}catch{n.innerHTML=``;return}let{user:o,tickets:s,services:c}=i,l=e.role===`super_admin`;n.innerHTML=`
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${r(o.name||`Sem nome`)}</h3>
        <p class="private-email">${r(o.email)}</p>
        <p class="muted">Cadastrado em ${new Date(o.created_at).toLocaleString(`pt-BR`)}</p>

        ${l?`
          <label>Função</label>
          <select id="user-role">
            <option value="user" ${o.role===`user`?`selected`:``}>Usuário</option>
            <option value="admin" ${o.role===`admin`?`selected`:``}>Admin</option>
            <option value="super_admin" ${o.role===`super_admin`?`selected`:``}>Super Admin</option>
          </select>
          <button class="action-btn" id="save-role" style="margin-top:10px">Salvar função</button>
          <p class="error" id="role-error"></p>

          ${[`admin`,`super_admin`].includes(o.role)?`
            <label style="margin-top:14px">Definir senha de acesso ao painel</label>
            <input id="set-password" type="password" minlength="8" placeholder="Mínimo 8 caracteres">
            <button class="action-btn" id="save-password" style="margin-top:10px">Definir senha</button>
            <p class="ok" id="password-ok"></p>
            <p class="error" id="password-error"></p>
          `:``}
        `:``}

        <h3 style="margin-top:24px">Chamados</h3>
        ${s.length===0?`<p class="muted">Nenhum chamado.</p>`:`<ul>${s.map(e=>`<li>#${e.id} — ${r(e.subject)} (${e.status})</li>`).join(``)}</ul>`}

        <h3>Serviços</h3>
        ${c.length===0?`<p class="muted">Nenhum serviço hospedado.</p>`:`<ul>${c.map(e=>`<li>${r(e.name)} — ${e.type} (${e.status})</li>`).join(``)}</ul>`}

        <button id="close-user-modal" class="secondary" style="margin-top:16px">Fechar</button>
      </div>
    </div>
  `,document.querySelector(`#close-user-modal`).onclick=()=>{n.innerHTML=``};let u=document.querySelector(`#save-role`);u&&(u.onclick=async()=>{let r=document.querySelector(`#user-role`).value,i=document.querySelector(`#role-error`);try{await a(`/api/admin/users/${t}/role`,{method:`PATCH`,body:JSON.stringify({role:r})}),n.innerHTML=``,m(e)}catch(e){i.textContent=e.message}});let d=document.querySelector(`#save-password`);d&&(d.onclick=async()=>{let e=document.querySelector(`#set-password`).value,n=document.querySelector(`#password-error`),r=document.querySelector(`#password-ok`);n.textContent=``,r.textContent=``;try{await a(`/api/admin/users/${t}/set-password`,{method:`POST`,body:JSON.stringify({password:e})}),r.textContent=`Senha definida com sucesso.`,document.querySelector(`#set-password`).value=``}catch(e){n.textContent=e.message}})}var g={aberto:`Aberto`,em_atendimento:`Em atendimento`,aguardando_usuario:`Aguardando usuário`,resolvido:`Resolvido`,fechado:`Fechado`};async function _(e,t=``){l(e,d());let n;try{n=(await a(`/api/admin/tickets${t?`?status=${encodeURIComponent(t)}`:``}`)).tickets}catch{return}let i=n.length===0?`<tr><td colspan="6">Nenhum chamado encontrado.</td></tr>`:n.map(e=>`
      <tr>
        <td>#${e.id}</td>
        <td>
          <strong>${r(e.subject)}</strong>
          <small class="private-email">${r(e.user.email)}</small>
        </td>
        <td>${r(e.category)}</td>
        <td>${g[e.status]||e.status}</td>
        <td>${new Date(e.updated_at).toLocaleString(`pt-BR`)}</td>
        <td><button class="action-btn" data-open-ticket="${e.id}">Abrir</button></td>
      </tr>
    `).join(``);l(e,`
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
          ${Object.entries(g).map(([e,n])=>`<option value="${e}" ${t===e?`selected`:``}>${n}</option>`).join(``)}
        </select>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>ASSUNTO / USUÁRIO</th><th>CATEGORIA</th><th>STATUS</th><th>ATUALIZADO</th><th></th></tr>
          </thead>
          <tbody>${i}</tbody>
        </table>
      </div>
    </section>

    <div id="ticket-modal"></div>
  `),document.querySelector(`#filter-status`).onchange=t=>{_(e,t.target.value)},document.querySelectorAll(`[data-open-ticket]`).forEach(n=>{n.onclick=()=>v(e,n.dataset.openTicket,t)})}async function v(e,t,n){let i=document.querySelector(`#ticket-modal`);i.innerHTML=`<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;let o,s;try{let e=await a(`/api/admin/tickets/${t}`);o=e.ticket,s=e.messages}catch{i.innerHTML=``;return}i.innerHTML=`
    <div class="modal-backdrop">
      <div class="modal">
        <h3>#${o.id} — ${r(o.subject)}</h3>
        <p class="private-email">${r(o.user.name)} · ${r(o.user.email)}</p>

        <label>Status</label>
        <select id="ticket-status">
          ${Object.entries(g).map(([e,t])=>`<option value="${e}" ${o.status===e?`selected`:``}>${t}</option>`).join(``)}
        </select>

        <div class="messages">
          ${s.map(e=>`
            <div class="message ${e.author_role}">
              <strong>${e.author_role===`admin`?`Equipe`:r(e.author_name)}</strong>
              <p>${r(e.message)}</p>
            </div>
          `).join(``)}
        </div>

        <form id="form-admin-reply" class="account-form">
          <textarea id="admin-reply-message" rows="3" maxlength="5000" required placeholder="Responder ao usuário..."></textarea>
          <button type="submit">Enviar resposta</button>
          <p class="error" id="admin-reply-error"></p>
        </form>

        <button id="close-ticket-modal" class="secondary">Fechar</button>
      </div>
    </div>
  `,document.querySelector(`#close-ticket-modal`).onclick=()=>{i.innerHTML=``},document.querySelector(`#ticket-status`).onchange=async r=>{try{await a(`/api/admin/tickets/${t}/status`,{method:`PATCH`,body:JSON.stringify({status:r.target.value})}),i.innerHTML=``,_(e,n)}catch(e){alert(e.message)}},document.querySelector(`#form-admin-reply`).onsubmit=async r=>{r.preventDefault();let i=document.querySelector(`#admin-reply-error`);try{await a(`/api/admin/tickets/${t}/messages`,{method:`POST`,body:JSON.stringify({message:document.querySelector(`#admin-reply-message`).value.trim()})}),v(e,t,n)}catch(e){i.textContent=e.message}}}var y=localStorage.getItem(`host_admin_token`),b=localStorage.getItem(`host_admin_user`);if(y&&b)try{let e=JSON.parse(b);[`admin`,`super_admin`].includes(e.role)?(n=`dashboard`,u(e)):o()}catch{o()}else o();
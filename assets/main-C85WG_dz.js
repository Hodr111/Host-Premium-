import"./modulepreload-polyfill-P2Xu9kJm.js";var e=`http://127.0.0.1:3000`,t=document.querySelector(`#app`),n=``,r=`dashboard`;function i(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function a(){return localStorage.getItem(`host_token`)}async function o(t,n={}){let r=a(),i=await fetch(`${e}${t}`,{...n,headers:{...n.body&&!(n.body instanceof FormData)?{"Content-Type":`application/json`}:{},...r?{Authorization:`Bearer ${r}`}:{},...n.headers||{}}});if(i.status===401)throw localStorage.removeItem(`host_token`),localStorage.removeItem(`host_user`),l(),Error(`Sessão expirada. Faça login novamente.`);let o=await i.json().catch(()=>({}));if(!i.ok)throw Error(o.error||`Erro na requisição`);return o}function s(e){localStorage.setItem(`host_token`,e.token),localStorage.setItem(`host_user`,JSON.stringify(e.user)),M(e.user)}function c(e){localStorage.setItem(`host_setup_token`,e.setup_token),localStorage.setItem(`host_setup_user`,JSON.stringify(e.user)),h(e.user)}function l(){t.innerHTML=`
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
  `,document.querySelector(`#login-form`).onsubmit=u,document.querySelector(`#create`).onclick=d,document.querySelector(`#forgot`).onclick=_,document.querySelector(`#admin-menu`).onclick=()=>{let e=document.querySelector(`#admin-popup`);if(e){e.remove();return}let t=document.createElement(`div`);t.id=`admin-popup`,t.className=`admin-popup`,t.innerHTML=`
      <div class="admin-popup-title">Área administrativa</div>
      <div class="admin-popup-text">
        Acesso restrito à equipe autorizada.
      </div>
      <button id="open-admin" type="button">
        Acessar painel ADM
      </button>
    `,document.body.appendChild(t),document.querySelector(`#open-admin`).onclick=()=>{window.location.href=`/admin.html`}}}async function u(t){t.preventDefault();let n=document.querySelector(`#email`).value.trim().toLowerCase(),r=document.querySelector(`#password`).value,i=document.querySelector(`#error`),a=t.submitter;a.disabled=!0,a.textContent=`Entrando...`,i.textContent=``;try{let t=await fetch(`${e}/api/auth/login`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:n,password:r})}),i=await t.json();if(!t.ok)throw Error(i.error||`Não foi possível entrar`);s(i)}catch(e){i.textContent=e.message,a.disabled=!1,a.textContent=`Entrar`}}function d(){t.innerHTML=`
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
  `,document.querySelector(`#signup-form`).onsubmit=f,document.querySelector(`#back`).onclick=l}async function f(t){t.preventDefault();let r=document.querySelector(`#email`).value.trim().toLowerCase(),i=document.querySelector(`#error`),a=t.submitter;a.disabled=!0,a.textContent=`Enviando código...`,i.textContent=``;try{let t=await fetch(`${e}/api/auth/request-code`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:r})}),i=await t.json();if(!t.ok)throw Error(i.error||`Não foi possível enviar o código`);n=r,p()}catch(e){i.textContent=e.message,a.disabled=!1,a.textContent=`Enviar código`}}function p(){t.innerHTML=`
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <div class="code-icon">✉</div>
        <h2>Confira seu e-mail</h2>
        <p class="muted">
          Enviamos um código de 6 dígitos para <strong>${i(n)}</strong>.
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
  `,document.querySelector(`#code-form`).onsubmit=m,document.querySelector(`#back`).onclick=d,document.querySelector(`#code`).focus()}async function m(t){t.preventDefault();let r=document.querySelector(`#code`).value.trim(),i=document.querySelector(`#error`),a=t.submitter;a.disabled=!0,a.textContent=`Verificando...`,i.textContent=``;try{let t=await fetch(`${e}/api/auth/verify-code`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:n,code:r})}),i=await t.json();if(!t.ok)throw Error(i.error||`Código inválido`);c(i)}catch(e){i.textContent=e.message,a.disabled=!1,a.textContent=`Verificar código`}}function h(e){t.innerHTML=`
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
  `,document.querySelector(`#password-form`).onsubmit=g}async function g(t){t.preventDefault();let n=document.querySelector(`#password`).value,r=document.querySelector(`#password2`).value,i=document.querySelector(`#recovery`).value.trim().toLowerCase(),a=document.querySelector(`#error`),o=t.submitter;if(a.textContent=``,n.length<8){a.textContent=`A senha precisa ter pelo menos 8 caracteres.`;return}if(n!==r){a.textContent=`As senhas não são iguais.`;return}let c=localStorage.getItem(`host_setup_token`);o.disabled=!0,o.textContent=`Salvando...`;try{let t=await fetch(`${e}/api/auth/set-initial-password`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${c}`},body:JSON.stringify({password:n,recovery_email:i})}),r=await t.json();if(!t.ok)throw Error(r.error||`Não foi possível salvar a senha`);localStorage.removeItem(`host_setup_token`),localStorage.removeItem(`host_setup_user`),s(r)}catch(e){a.textContent=e.message,o.disabled=!1,o.textContent=`Salvar senha e entrar`}}function _(){t.innerHTML=`
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
  `,document.querySelector(`#reset-request-form`).onsubmit=v,document.querySelector(`#back`).onclick=l}async function v(t){t.preventDefault();let r=document.querySelector(`#email`).value.trim().toLowerCase(),i=document.querySelector(`#error`),a=t.submitter;a.disabled=!0,a.textContent=`Enviando...`,i.textContent=``;try{let t=await fetch(`${e}/api/auth/request-reset`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:r})}),i=await t.json();if(!t.ok)throw Error(i.error||`Não foi possível enviar o código`);n=r,y(i.recovery_hint)}catch(e){i.textContent=e.message,a.disabled=!1,a.textContent=`Enviar código de recuperação`}}function y(e){t.innerHTML=`
    <div class="login">
      <div class="login-card">
        <div class="brand">HOST<span>BYGDEALL</span></div>
        <h2>Digite o código</h2>
        <p class="muted">
          Enviamos o código para seu e-mail de recuperação <strong>${i(e||``)}</strong>.
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
  `,document.querySelector(`#reset-form`).onsubmit=b,document.querySelector(`#back`).onclick=l,document.querySelector(`#code`).focus()}async function b(t){t.preventDefault();let r=document.querySelector(`#code`).value.trim(),i=document.querySelector(`#password`).value,a=document.querySelector(`#password2`).value,o=document.querySelector(`#error`),c=t.submitter;if(i.length<8){o.textContent=`A senha precisa ter pelo menos 8 caracteres.`;return}if(i!==a){o.textContent=`As senhas não são iguais.`;return}c.disabled=!0,c.textContent=`Redefinindo...`,o.textContent=``;try{let t=await fetch(`${e}/api/auth/reset-password`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({email:n,code:r,password:i})}),a=await t.json();if(!t.ok)throw Error(a.error||`Não foi possível redefinir a senha`);s(a)}catch(e){o.textContent=e.message,c.disabled=!1,c.textContent=`Redefinir senha`}}var x=[{id:`dashboard`,label:`⌂ Dashboard`,ready:!0},{id:`servicos`,label:`▣ Meus serviços`,ready:!1},{id:`suporte`,label:`🎧 Suporte`,ready:!0},{id:`conta`,label:`⚙ Minha conta`,ready:!0}];function S(e,a){t.innerHTML=`
    <div class="user-layout">
      <aside>
        <div class="brand">HOST<span>BYGDEALL</span></div>

        <nav>
          ${x.map(e=>`
            <button data-page="${e.id}" class="${r===e.id?`active`:``}">
              ${e.label}
            </button>
          `).join(``)}
        </nav>

        <button id="logout" class="logout">Sair</button>
      </aside>

      <main>
        <header>
          <div>
            <h1>Olá, ${i(e.name||`usuário`)} 👋</h1>
            <p>${i(e.email)}</p>
          </div>
          <div class="status">● ONLINE</div>
        </header>

        ${a}

        <footer>
          <span>HostBygdeall</span>
          <span>bygdëall ♪</span>
        </footer>
      </main>
    </div>
  `,document.querySelector(`#logout`).onclick=()=>{localStorage.removeItem(`host_token`),localStorage.removeItem(`host_user`),n=``,l()},document.querySelectorAll(`nav [data-page]`).forEach(t=>{t.onclick=()=>{r=x.find(e=>e.id===t.dataset.page).id,C(e)}})}async function C(e){return r===`dashboard`?T(e):r===`suporte`?A(e):r===`conta`?D(e):E(e)}function w(){return`<section class="panel"><p class="muted">Carregando...</p></section>`}async function T(e){S(e,w());let t={tickets_open:0,services_total:0};try{t=(await o(`/api/me/summary`)).summary}catch{}S(e,`
    <section class="cards">
      <div class="card">
        <small>SERVIÇOS</small>
        <strong>${t.services_total}</strong>
        <span>hospedados</span>
      </div>

      <div class="card">
        <small>CHAMADOS</small>
        <strong>${t.tickets_open}</strong>
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
  `)}function E(e){S(e,`
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Módulo em desenvolvimento</h2>
          <p>Esta área ainda não está disponível.</p>
        </div>
      </div>
    </section>
  `)}async function D(e){S(e,w());let t=e;try{t=(await o(`/api/me`)).user,localStorage.setItem(`host_user`,JSON.stringify(t))}catch{return}S(e,`
    <section class="panel">
      <div class="panel-title">
        <div><h2>Minha conta</h2><p>Seus dados de cadastro.</p></div>
      </div>

      <form id="form-nome" class="account-form">
        <label>Nome</label>
        <input id="input-nome" value="${i(t.name||``)}" maxlength="80" required>

        <label>E-mail atual</label>
        <input value="${i(t.email)}" disabled>

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
  `),document.querySelector(`#form-nome`).onsubmit=async e=>{e.preventDefault();let t=document.querySelector(`#nome-ok`),n=document.querySelector(`#nome-error`);t.textContent=``,n.textContent=``;try{let e=document.querySelector(`#input-nome`).value.trim(),n=await o(`/api/me`,{method:`PUT`,body:JSON.stringify({name:e})});localStorage.setItem(`host_user`,JSON.stringify(n.user)),t.textContent=`Nome atualizado.`}catch(e){n.textContent=e.message}},document.querySelector(`#form-email`).onsubmit=async e=>{e.preventDefault();let t=document.querySelector(`#email-error`);t.textContent=``;try{let e=document.querySelector(`#input-novo-email`).value.trim().toLowerCase();await o(`/api/me/email/request-change`,{method:`POST`,body:JSON.stringify({new_email:e})}),document.querySelector(`#form-confirma-email`).style.display=`grid`}catch(e){t.textContent=e.message}},document.querySelector(`#form-confirma-email`).onsubmit=async e=>{e.preventDefault();let t=document.querySelector(`#confirma-email-error`);t.textContent=``;try{let e=document.querySelector(`#input-codigo-email`).value.trim(),t=await o(`/api/me/email/confirm-change`,{method:`POST`,body:JSON.stringify({code:e})});localStorage.setItem(`host_user`,JSON.stringify(t.user)),D(t.user)}catch(e){t.textContent=e.message}}}var O=[`Conta`,`Hospedagem`,`Site`,`Domínio`,`Pagamento`,`Erro técnico`,`Outro`],k={aberto:`Aberto`,em_atendimento:`Em atendimento`,aguardando_usuario:`Aguardando você`,resolvido:`Resolvido`,fechado:`Fechado`};async function A(e){S(e,w());let t=[];try{t=(await o(`/api/tickets`)).tickets}catch{return}let n=t.length===0?`<p class="muted">Você ainda não abriu nenhum chamado.</p>`:`
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Assunto</th><th>Categoria</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${t.map(e=>`
              <tr>
                <td>#${e.id}</td>
                <td>${i(e.subject)}</td>
                <td>${i(e.category)}</td>
                <td>${k[e.status]||e.status}</td>
                <td><button data-open-ticket="${e.id}">Abrir</button></td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    `;S(e,`
    <section class="panel">
      <div class="panel-title">
        <div><h2>Abrir novo chamado</h2><p>Nossa equipe responde por aqui mesmo.</p></div>
      </div>

      <form id="form-ticket" class="account-form">
        <label>Categoria</label>
        <select id="ticket-categoria">
          ${O.map(e=>`<option>${e}</option>`).join(``)}
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
      ${n}
    </section>

    <div id="ticket-modal"></div>
  `),document.querySelector(`#form-ticket`).onsubmit=async t=>{t.preventDefault();let n=document.querySelector(`#ticket-error`);n.textContent=``;try{await o(`/api/tickets`,{method:`POST`,body:JSON.stringify({category:document.querySelector(`#ticket-categoria`).value,subject:document.querySelector(`#ticket-assunto`).value.trim(),message:document.querySelector(`#ticket-mensagem`).value.trim()})}),A(e)}catch(e){n.textContent=e.message}},document.querySelectorAll(`[data-open-ticket]`).forEach(t=>{t.onclick=()=>j(e,t.dataset.openTicket)})}async function j(e,t){let n=document.querySelector(`#ticket-modal`);n.innerHTML=`<div class="modal-backdrop"><div class="modal">Carregando...</div></div>`;let r,a;try{let e=await o(`/api/tickets/${t}`);r=e.ticket,a=e.messages}catch{n.innerHTML=``;return}n.innerHTML=`
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <h3>#${r.id} — ${i(r.subject)}</h3>
        <p class="muted">${k[r.status]}</p>

        <div class="messages">
          ${a.map(e=>`
            <div class="message ${e.author_role}">
              <strong>${e.author_role===`admin`?`Suporte`:i(e.author_name)}</strong>
              <p>${i(e.message)}</p>
            </div>
          `).join(``)}
        </div>

        ${r.status===`fechado`?``:`
          <form id="form-reply" class="account-form">
            <textarea id="reply-message" rows="3" maxlength="5000" required placeholder="Responder..."></textarea>
            <button type="submit">Enviar</button>
            <p class="error" id="reply-error"></p>
          </form>
          <button id="close-ticket" class="secondary">Fechar chamado</button>
        `}

        <button id="close-modal" class="secondary">Fechar</button>
      </div>
    </div>
  `,document.querySelector(`#close-modal`).onclick=()=>{n.innerHTML=``};let s=document.querySelector(`#form-reply`);s&&(s.onsubmit=async n=>{n.preventDefault();let r=document.querySelector(`#reply-error`);try{await o(`/api/tickets/${t}/messages`,{method:`POST`,body:JSON.stringify({message:document.querySelector(`#reply-message`).value.trim()})}),j(e,t)}catch(e){r.textContent=e.message}});let c=document.querySelector(`#close-ticket`);c&&(c.onclick=async()=>{await o(`/api/tickets/${t}/close`,{method:`POST`}),n.innerHTML=``,A(e)})}function M(e){r=`dashboard`,T(e)}var N=localStorage.getItem(`host_token`),P=localStorage.getItem(`host_user`);if(N&&P)try{M(JSON.parse(P))}catch{l()}else l();
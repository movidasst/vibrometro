(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SUPABASE_URL = 'https://lfdmbkzghnwvsapxypvt.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRnkA6PA8-v073nrw9zxiQ_8rVGiOn1';
  const ACCESS_SESSION_KEY = 'movida-sst-vibrometro-session';
  const ACCESS_ATTEMPTS_KEY = 'movida-sst-vibrometro-attempts';
  const ACCESS_DURATION = 20 * 60 * 1000;
  const BLOCK_DURATION = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 5;
  let accessTimer = null;

  function readStoredJson(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key) || 'null') || fallback; }
    catch { return fallback; }
  }

  function writeStoredJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); }
    catch {}
  }

  function setLoginMessage(message, type = 'error') {
    const box = $('loginMessage');
    box.textContent = message;
    box.classList.toggle('success', type === 'success');
  }

  function getAttemptState() {
    const stored = readStoredJson(localStorage, ACCESS_ATTEMPTS_KEY, { count: 0, blockedUntil: 0 });
    if (stored.blockedUntil && stored.blockedUntil <= Date.now()) {
      localStorage.removeItem(ACCESS_ATTEMPTS_KEY);
      return { count: 0, blockedUntil: 0 };
    }
    return stored;
  }

  function blockedMessage(blockedUntil) {
    const minutes = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
    return `Demasiados intentos. Espera ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} antes de volver a intentar.`;
  }

  function recordFailedAttempt() {
    const current = getAttemptState();
    const count = (current.count || 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      const blockedUntil = Date.now() + BLOCK_DURATION;
      writeStoredJson(localStorage, ACCESS_ATTEMPTS_KEY, { count: 0, blockedUntil });
      return blockedMessage(blockedUntil);
    }
    writeStoredJson(localStorage, ACCESS_ATTEMPTS_KEY, { count, blockedUntil: 0 });
    const remaining = MAX_ATTEMPTS - count;
    return `No pudimos validar esos datos. Revisa la cédula y la clave. Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`;
  }

  function scheduleAccessExpiry(expiresAt) {
    clearTimeout(accessTimer);
    accessTimer = setTimeout(() => closeSession(true), Math.max(0, expiresAt - Date.now()));
  }

  function openSimulator(member, persist = true) {
    const name = [member?.nombres, member?.apellidos].filter(Boolean).join(' ').trim() || member?.name || 'integrante';
    const expiresAt = member?.expiresAt || Date.now() + ACCESS_DURATION;
    if (persist) writeStoredJson(sessionStorage, ACCESS_SESSION_KEY, { name, expiresAt });
    $('memberName').textContent = name;
    $('loginGate').hidden = true;
    $('appShell').hidden = false;
    $('appShell').setAttribute('aria-hidden', 'false');
    document.body.classList.remove('auth-locked');
    document.documentElement.scrollTop = 0;
    scheduleAccessExpiry(expiresAt);
  }

  function closeSession(expired = false) {
    clearTimeout(accessTimer);
    sessionStorage.removeItem(ACCESS_SESSION_KEY);
    if (expired) sessionStorage.setItem('movida-sst-vibrometro-expired', '1');
    window.location.reload();
  }

  async function submitMemberLogin(event) {
    event.preventDefault();
    const cedulaInput = $('memberId');
    const passwordInput = $('memberPassword');
    const submit = $('loginSubmit');
    const cedula = cedulaInput.value.replace(/\D/g, '');
    const codigo = passwordInput.value.trim();

    cedulaInput.setAttribute('aria-invalid', String(!cedula));
    passwordInput.setAttribute('aria-invalid', String(!codigo));

    const attempts = getAttemptState();
    if (attempts.blockedUntil > Date.now()) {
      setLoginMessage(blockedMessage(attempts.blockedUntil));
      return;
    }
    if (!cedula || !codigo) {
      setLoginMessage('Escribe tu cédula y tu clave para continuar.');
      (!cedula ? cedulaInput : passwordInput).focus();
      return;
    }

    submit.disabled = true;
    submit.querySelector('span').textContent = 'Verificando acceso…';
    setLoginMessage('', 'success');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/acceso_integrante`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_cedula: cedula, p_codigo: codigo })
      });
      if (!response.ok) throw new Error(`Access service returned ${response.status}`);
      const payload = await response.json();
      const member = Array.isArray(payload) ? payload[0] : payload;
      if (!member) {
        passwordInput.value = '';
        passwordInput.focus();
        setLoginMessage(recordFailedAttempt());
        return;
      }

      localStorage.removeItem(ACCESS_ATTEMPTS_KEY);
      cedulaInput.removeAttribute('aria-invalid');
      passwordInput.removeAttribute('aria-invalid');
      $('memberLogin').reset();
      openSimulator(member);
    } catch (error) {
      console.error('No fue posible validar el acceso', error);
      setLoginMessage('El servicio de acceso no está disponible en este momento. Intenta nuevamente en unos minutos.');
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Abrir laboratorio';
    }
  }

  function initializeAccessGate() {
    $('memberLogin').addEventListener('submit', submitMemberLogin);
    $('togglePassword').addEventListener('click', () => {
      const field = $('memberPassword');
      const show = field.type === 'password';
      field.type = show ? 'text' : 'password';
      $('togglePassword').textContent = show ? 'Ocultar' : 'Mostrar';
      $('togglePassword').setAttribute('aria-pressed', String(show));
    });
    $('logoutBtn').addEventListener('click', () => closeSession(false));

    const session = readStoredJson(sessionStorage, ACCESS_SESSION_KEY, null);
    if (session?.expiresAt > Date.now()) {
      openSimulator(session, false);
      return;
    }

    sessionStorage.removeItem(ACCESS_SESSION_KEY);
    const attempts = getAttemptState();
    const expired = sessionStorage.getItem('movida-sst-vibrometro-expired') === '1';
    sessionStorage.removeItem('movida-sst-vibrometro-expired');
    if (expired) setLoginMessage('Tu sesión de 20 minutos finalizó. Ingresa nuevamente para continuar.');
    else if (attempts.blockedUntil > Date.now()) setLoginMessage(blockedMessage(attempts.blockedUntil));
    $('memberId').focus();
  }

  initializeAccessGate();
})();

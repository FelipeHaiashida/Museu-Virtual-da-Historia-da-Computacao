/* ================================================================
   MUSEU VIRTUAL DA HISTÓRIA DA COMPUTAÇÃO — script.js
   Firebase Authentication + Site Interativo
   ================================================================ */

/* ----------------------------------------------------------------
   1. IMPORTAÇÕES DO FIREBASE
   ---------------------------------------------------------------- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getAnalytics,
  isSupported
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";

/* ----------------------------------------------------------------
   2. CONFIGURAÇÃO DO SEU FIREBASE
   ---------------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyACU2e2XRbrVH4_iYjF9_memwqxcxBvTzg",
  authDomain: "mvhc-d8cde.firebaseapp.com",
  projectId: "mvhc-d8cde",
  storageBucket: "mvhc-d8cde.firebasestorage.app",
  messagingSenderId: "520624726072",
  appId: "1:520624726072:web:801b9ede2d99dec62186cd",
  measurementId: "G-3VH596CJLF"
};

/* Inicializa Firebase */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* Inicializa Analytics somente se o navegador permitir */
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

/* ----------------------------------------------------------------
   3. VARIÁVEL DE CONTROLE DO MODO: LOGIN OU CADASTRO
   ---------------------------------------------------------------- */

let isRegisterMode = false;

/* ----------------------------------------------------------------
   4. PREPARA A TELA DE LOGIN PARA TER LOGIN + CADASTRO
   ---------------------------------------------------------------- */

function prepareAuthScreen() {
  const loginCard = document.querySelector(".login-card");
  const passGroup = document.getElementById("login-pass")?.closest(".form-group");
  const loginHint = document.querySelector(".login-hint");
  const btnLogin = document.getElementById("btn-login");

  if (!loginCard || !passGroup || !btnLogin) return;

  const userLabel = document.querySelector('label[for="login-user"]');
  const userInput = document.getElementById("login-user");

  if (userLabel) userLabel.textContent = "E-mail";
  if (userInput) {
    userInput.placeholder = "Digite seu e-mail";
    userInput.type = "email";
    userInput.autocomplete = "email";
  }

  if (loginHint) {
    loginHint.innerHTML = "Entre com seu e-mail e senha ou crie uma nova conta.";
  }

  /* Campo de nome para cadastro */
  if (!document.getElementById("register-name")) {
    const nameGroup = document.createElement("div");
    nameGroup.className = "form-group hidden";
    nameGroup.id = "name-group";

    nameGroup.innerHTML = `
      <label for="register-name">Nome</label>
      <input type="text" id="register-name" placeholder="Digite seu nome" autocomplete="name" />
      <span class="field-error" id="err-name"></span>
    `;

    loginCard.insertBefore(nameGroup, passGroup);
  }

  /* Área de botões extras */
  if (!document.getElementById("auth-extra-actions")) {
    const extraActions = document.createElement("div");
    extraActions.id = "auth-extra-actions";
    extraActions.style.marginTop = "16px";
    extraActions.style.display = "flex";
    extraActions.style.flexDirection = "column";
    extraActions.style.gap = "10px";

    extraActions.innerHTML = `
      <button type="button" class="btn-ghost btn-full" id="btn-toggle-register">
        Criar conta
      </button>

      <button type="button" class="btn-ghost btn-full" id="btn-reset-password">
        Esqueci minha senha
      </button>
    `;

    btnLogin.insertAdjacentElement("afterend", extraActions);

    document
      .getElementById("btn-toggle-register")
      .addEventListener("click", toggleRegisterMode);

    document
      .getElementById("btn-reset-password")
      .addEventListener("click", handlePasswordReset);
  }

  btnLogin.onclick = handleLogin;
}

/* ----------------------------------------------------------------
   5. ALTERNA ENTRE LOGIN E CADASTRO
   ---------------------------------------------------------------- */

function toggleRegisterMode() {
  isRegisterMode = !isRegisterMode;

  const nameGroup = document.getElementById("name-group");
  const btnLogin = document.getElementById("btn-login");
  const btnToggle = document.getElementById("btn-toggle-register");
  const btnReset = document.getElementById("btn-reset-password");
  const title = document.querySelector(".login-title");
  const subtitle = document.querySelector(".login-sub");
  const loginError = document.getElementById("login-error");

  if (loginError) loginError.textContent = "";

  if (isRegisterMode) {
    nameGroup?.classList.remove("hidden");
    btnLogin.querySelector("span:not(.btn-arrow)").textContent = "Cadastrar";
    btnToggle.textContent = "Já tenho conta";
    btnReset.style.display = "none";

    if (title) title.textContent = "Criar Conta";
    if (subtitle) subtitle.textContent = "Cadastre-se para acessar o Museu Virtual";
  } else {
    nameGroup?.classList.add("hidden");
    btnLogin.querySelector("span:not(.btn-arrow)").textContent = "Entrar";
    btnToggle.textContent = "Criar conta";
    btnReset.style.display = "block";

    if (title) title.textContent = "Acesso ao Portal";
    if (subtitle) subtitle.textContent = "Museu Virtual da História da Computação";
  }
}

/* ----------------------------------------------------------------
   6. LOGIN OU CADASTRO COM FIREBASE
   ---------------------------------------------------------------- */

async function handleLogin() {
  const emailInput = document.getElementById("login-user");
  const passInput = document.getElementById("login-pass");
  const nameInput = document.getElementById("register-name");

  const errUser = document.getElementById("err-user");
  const errPass = document.getElementById("err-pass");
  const errName = document.getElementById("err-name");
  const errLogin = document.getElementById("login-error");
  const btnLogin = document.getElementById("btn-login");

  clearError(emailInput, errUser);
  clearError(passInput, errPass);

  if (errName && nameInput) clearError(nameInput, errName);
  if (errLogin) errLogin.textContent = "";

  const email = emailInput.value.trim();
  const password = passInput.value;
  const name = nameInput?.value.trim();

  let hasError = false;

  if (isRegisterMode && !name) {
    setError(nameInput, errName, "Informe seu nome.");
    hasError = true;
  }

  if (!email) {
    setError(emailInput, errUser, "Informe seu e-mail.");
    hasError = true;
  }

  if (!password) {
    setError(passInput, errPass, "Informe sua senha.");
    hasError = true;
  }

  if (isRegisterMode && password.length < 6) {
    setError(passInput, errPass, "A senha deve ter pelo menos 6 caracteres.");
    hasError = true;
  }

  if (hasError) return;

  setButtonLoading(btnLogin, isRegisterMode ? "Cadastrando..." : "Entrando...");

  try {
    if (isRegisterMode) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: name
      });

      loginSuccess();
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      loginSuccess();
    }
  } catch (error) {
    resetButton(btnLogin);
    showFirebaseError(error);
  }
}

/* ----------------------------------------------------------------
   7. RECUPERAÇÃO DE SENHA
   ---------------------------------------------------------------- */

async function handlePasswordReset() {
  const emailInput = document.getElementById("login-user");
  const errUser = document.getElementById("err-user");
  const errLogin = document.getElementById("login-error");

  clearError(emailInput, errUser);
  errLogin.textContent = "";

  const email = emailInput.value.trim();

  if (!email) {
    setError(emailInput, errUser, "Digite seu e-mail para recuperar a senha.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    errLogin.style.color = "#0CFFE1";
    errLogin.textContent = "E-mail de recuperação enviado. Verifique sua caixa de entrada.";
  } catch (error) {
    errLogin.style.color = "#ff5f6b";
    showFirebaseError(error);
  }
}

/* ----------------------------------------------------------------
   8. CONTROLE DE SESSÃO
   ---------------------------------------------------------------- */

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSuccess();
  } else {
    const loginScreen = document.getElementById("login-screen");
    const mainSite = document.getElementById("main-site");

    if (loginScreen) loginScreen.classList.remove("hidden");
    if (mainSite) mainSite.classList.add("hidden");

    document.body.style.overflow = "hidden";
  }
});

/* ----------------------------------------------------------------
   9. LOGOUT
   ---------------------------------------------------------------- */

async function logout() {
  try {
    await signOut(auth);
    location.reload();
  } catch (error) {
    alert("Erro ao sair da conta.");
    console.error(error);
  }
}

/* Deixa a função disponível para usar no HTML */
window.logout = logout;

/* ----------------------------------------------------------------
   10. MENSAGENS DE ERRO DO FIREBASE
   ---------------------------------------------------------------- */

function showFirebaseError(error) {
  const errLogin = document.getElementById("login-error");
  if (!errLogin) return;

  errLogin.style.color = "#ff5f6b";

  const errorMessages = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente."
  };

  errLogin.textContent = errorMessages[error.code] || "Erro ao autenticar. Tente novamente.";
}

/* ----------------------------------------------------------------
   11. FUNÇÕES DE ERRO E BOTÃO
   ---------------------------------------------------------------- */

function setError(input, errEl, msg) {
  if (!input || !errEl) return;
  input.classList.add("input-error");
  errEl.textContent = msg;
}

function clearError(input, errEl) {
  if (!input || !errEl) return;
  input.classList.remove("input-error");
  errEl.textContent = "";
}

function setButtonLoading(button, text) {
  if (!button) return;
  button.querySelector("span:not(.btn-arrow)").textContent = text;
  button.disabled = true;
}

function resetButton(button) {
  if (!button) return;
  button.querySelector("span:not(.btn-arrow)").textContent = isRegisterMode ? "Cadastrar" : "Entrar";
  button.disabled = false;
}

/* ----------------------------------------------------------------
   12. SUCESSO NO LOGIN
   ---------------------------------------------------------------- */

let siteAlreadyStarted = false;

function loginSuccess() {
  const loginScreen = document.getElementById("login-screen");
  const mainSite = document.getElementById("main-site");

  if (!loginScreen || !mainSite) return;

  loginScreen.style.transition = "opacity .5s ease, transform .5s ease";
  loginScreen.style.opacity = "0";
  loginScreen.style.transform = "scale(1.03)";

  setTimeout(() => {
    loginScreen.classList.add("hidden");
    mainSite.classList.remove("hidden");
    document.body.style.overflow = "";

    if (!siteAlreadyStarted) {
      siteAlreadyStarted = true;
      initHeroCanvas();
      initScrollReveal();
    }
  }, 500);
}

/* ----------------------------------------------------------------
   13. LOGIN COM ENTER
   ---------------------------------------------------------------- */

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("login-screen")) {
    handleLogin();
  }
});

/* ----------------------------------------------------------------
   14. NAVBAR — scroll shadow + menu mobile
   ---------------------------------------------------------------- */

function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
}

function toggleMenu() {
  const links = document.getElementById("nav-links");
  const toggle = document.getElementById("nav-toggle");
  if (!links || !toggle) return;

  links.classList.toggle("open");
  const isOpen = links.classList.contains("open");

  const spans = toggle.querySelectorAll("span");

  if (isOpen) {
    spans[0].style.transform = "translateY(7px) rotate(45deg)";
    spans[1].style.opacity = "0";
    spans[2].style.transform = "translateY(-7px) rotate(-45deg)";
  } else {
    spans[0].style.transform = "";
    spans[1].style.opacity = "";
    spans[2].style.transform = "";
  }
}

function closeMenu() {
  const links = document.getElementById("nav-links");
  const toggle = document.getElementById("nav-toggle");
  if (!links || !toggle) return;

  links.classList.remove("open");

  const spans = toggle.querySelectorAll("span");
  spans[0].style.transform = "";
  spans[1].style.opacity = "";
  spans[2].style.transform = "";
}

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;

document.addEventListener("click", (e) => {
  const links = document.getElementById("nav-links");
  const toggle = document.getElementById("nav-toggle");

  if (!links || !toggle || !links.classList.contains("open")) return;

  if (!links.contains(e.target) && !toggle.contains(e.target)) {
    closeMenu();
  }
});

/* ----------------------------------------------------------------
   15. CANVAS DE PARTÍCULAS — hero
   ---------------------------------------------------------------- */

function initHeroCanvas() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W, H, particles, animId;

  const PARTICLE_COUNT = 70;
  const MAX_DISTANCE = 140;
  const SPEED = 0.35;

  const COLORS = ["#0CFFE1", "#5B4EFF", "#8B7EFF", "#3DCEFF"];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildParticles();
  }

  function buildParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r: Math.random() * 2 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.5 + 0.3
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DISTANCE) {
          const alpha = (1 - dist / MAX_DISTANCE) * 0.25;

          ctx.beginPath();
          ctx.strokeStyle = `rgba(92,105,255,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    animId = requestAnimationFrame(draw);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      draw();
    }
  });

  window.addEventListener("resize", resize, { passive: true });

  resize();
  draw();
}

/* ----------------------------------------------------------------
   16. SCROLL REVEAL
   ---------------------------------------------------------------- */

function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ----------------------------------------------------------------
   17. LINK DA APLICAÇÃO UNITY WEBGL
   ---------------------------------------------------------------- */

const UNITY_URL = "https://seu-link-da-unity-webgl.com";

function applyUnityLinks() {
  const links = document.querySelectorAll('a[href="https://seu-link-da-unity-webgl.com"]');

  links.forEach((link) => {
    link.setAttribute("href", UNITY_URL);
  });
}

/* ----------------------------------------------------------------
   18. SMOOTH SCROLL
   ---------------------------------------------------------------- */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      e.preventDefault();

      const navH =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68;

      const top = target.getBoundingClientRect().top + window.scrollY - navH;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

/* ----------------------------------------------------------------
   19. TYPEWRITER
   ---------------------------------------------------------------- */

function initTypewriter() {
  const badge = document.querySelector(".hero-badge");
  if (!badge) return;

  const original = badge.textContent.trim();
  badge.textContent = "";

  let i = 0;

  const interval = setInterval(() => {
    badge.textContent = original.slice(0, ++i);

    if (i >= original.length) {
      clearInterval(interval);
    }
  }, 38);
}

/* ----------------------------------------------------------------
   19b. FEEDBACK
   ---------------------------------------------------------------- */

const FEEDBACKS_KEY = "mvhc_feedbacks";

function loadFeedbacks() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACKS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFeedbacks(list) {
  localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(list));
}

function switchFeedbackTab(tab, btn) {
  document.querySelectorAll(".feedback-tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".feedback-panel").forEach((p) => p.classList.add("hidden"));

  btn.classList.add("active");
  btn.setAttribute("aria-selected", "true");
  document.getElementById("tab-" + tab)?.classList.remove("hidden");
}

function updateCharCount() {
  const textarea = document.getElementById("fb-msg");
  const counter = document.getElementById("char-count");
  if (textarea && counter) {
    counter.textContent = textarea.value.length;
  }
}

function submitFeedback() {
  const nome = document.getElementById("fb-nome")?.value.trim() || "Anônimo";
  const categoria = document.getElementById("fb-categoria")?.value;
  const msg = document.getElementById("fb-msg")?.value.trim();

  const errCategoria = document.getElementById("err-categoria");
  const errMsg = document.getElementById("err-msg");

  if (errCategoria) errCategoria.textContent = "";
  if (errMsg) errMsg.textContent = "";

  let hasError = false;

  if (!categoria) {
    if (errCategoria) errCategoria.textContent = "Selecione uma categoria.";
    hasError = true;
  }

  if (!msg) {
    if (errMsg) errMsg.textContent = "Escreva uma mensagem antes de enviar.";
    hasError = true;
  }

  if (hasError) return;

  const btn = document.getElementById("btn-feedback");
  const label = document.getElementById("btn-feedback-label");
  if (btn) btn.disabled = true;
  if (label) label.textContent = "Enviando…";

  setTimeout(() => {
    const feedbacks = loadFeedbacks();
    feedbacks.unshift({ nome, categoria, msg, data: new Date().toISOString() });
    saveFeedbacks(feedbacks);

    const badge = document.getElementById("feedback-count");
    if (badge) badge.textContent = feedbacks.length;

    const nomeEl = document.getElementById("fb-nome");
    const catEl = document.getElementById("fb-categoria");
    const msgEl = document.getElementById("fb-msg");
    const charCount = document.getElementById("char-count");
    if (nomeEl) nomeEl.value = "";
    if (catEl) catEl.value = "";
    if (msgEl) msgEl.value = "";
    if (charCount) charCount.textContent = "0";

    const successEl = document.getElementById("feedback-success");
    if (successEl) successEl.classList.remove("hidden");

    setTimeout(() => {
      if (btn) btn.disabled = false;
      if (label) label.textContent = "Enviar Feedback";
      if (successEl) successEl.classList.add("hidden");
    }, 3000);

    renderFeedbackList();
  }, 800);
}

function renderFeedbackList() {
  const list = document.getElementById("feedback-list");
  const empty = document.getElementById("feedback-empty");
  if (!list) return;

  const feedbacks = loadFeedbacks();

  const categoriaLabels = {
    design: "Design Visual",
    conteudo: "Conteúdo Histórico",
    usabilidade: "Usabilidade",
    desempenho: "Desempenho",
    sugestao: "Sugestão de Melhoria",
    outro: "Outro"
  };

  if (feedbacks.length === 0) {
    if (empty) empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  if (empty) empty.classList.add("hidden");

  list.innerHTML = feedbacks.map((fb) => `
    <li class="feedback-item">
      <div class="feedback-item-header">
        <strong class="feedback-item-nome">${escapeHtml(fb.nome)}</strong>
        <span class="feedback-item-categoria">${categoriaLabels[fb.categoria] || fb.categoria}</span>
      </div>
      <p class="feedback-item-msg">${escapeHtml(fb.msg)}</p>
    </li>
  `).join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.switchFeedbackTab = switchFeedbackTab;
window.updateCharCount = updateCharCount;
window.submitFeedback = submitFeedback;

/* ----------------------------------------------------------------
   20. INICIALIZAÇÃO GERAL
   ---------------------------------------------------------------- */

function initSite() {
  initNavbar();
  initSmoothScroll();
  applyUnityLinks();
  initTypewriter();
  prepareAuthScreen();

  // Carrega feedbacks salvos
  const saved = loadFeedbacks();
  const badge = document.getElementById("feedback-count");
  if (badge) badge.textContent = saved.length;
  renderFeedbackList();
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.style.overflow = "hidden";
  initSite();
});

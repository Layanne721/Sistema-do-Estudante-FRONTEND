<script setup>
import axios from 'axios';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { fetchInitialData, initAuth, logout, marcarAvisoComoLido, store } from './components/js/store.js';

const router = useRouter();
const route = useRoute();

const menuToggleRef = ref(null);
const mobileNavRef = ref(null);
const desktopBellRef = ref(null);
const mobileBellRef = ref(null);
const desktopDropdownRef = ref(null);
const mobileDropdownRef = ref(null);

const isMobileMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const backendOnline = ref(false);
const checkingBackend = ref(true);

const unreadAvisos = computed(() => store.avisos.filter(aviso => !aviso.lidoPeloUsuarioAtual));
const isAuthPage = computed(() => ['login', 'registro', 'recuperar-senha'].includes(route.name));

function handleNotificationClick(avisoId) {
  marcarAvisoComoLido(avisoId);
  isNotificationsOpen.value = false;
  isMobileMenuOpen.value = false;
  router.push('/avisos');
}

function fazerLogout() {
  logout(router);
  isMobileMenuOpen.value = false;
}

async function checkBackendStatus() {
  checkingBackend.value = true;
  try {
    await axios.get('http://localhost:8080/api/health');
    backendOnline.value = true;
  } catch (error) {
    console.error("Falha ao conectar com o backend:", error);
    backendOnline.value = false;
  } finally {
    checkingBackend.value = false;
  }
}

function handleOutsideClick(event) {
    const isClickInsideMenu = menuToggleRef.value?.contains(event.target) || mobileNavRef.value?.contains(event.target);
    if (isMobileMenuOpen.value && !isClickInsideMenu) {
        isMobileMenuOpen.value = false;
    }
    const isClickInsideNotifications =
        desktopBellRef.value?.contains(event.target) ||
        desktopDropdownRef.value?.contains(event.target) ||
        mobileBellRef.value?.contains(event.target) ||
        mobileDropdownRef.value?.contains(event.target);
    if (isNotificationsOpen.value && !isClickInsideNotifications) {
        isNotificationsOpen.value = false;
    }
}

onMounted(async () => {
  await checkBackendStatus();
  initAuth();
  if (backendOnline.value && store.user.isLoggedIn) {
    await fetchInitialData(router);
  }
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

watch(() => route.path, () => {
  isMobileMenuOpen.value = false;
  isNotificationsOpen.value = false;
});

watch(() => store.user.isLoggedIn, (isLoggedIn) => {
    if (isLoggedIn && backendOnline.value) {
        fetchInitialData(router);
    }
});
</script>

<template>
  <div id="app-container">
    <div v-if="checkingBackend" class="loading-screen">
      <p>Verificando conexão com o servidor...</p>
      <div class="spinner"></div>
    </div>
    <div v-else-if="!backendOnline && !isAuthPage" class="error-screen">
      <h1>Ops!</h1>
      <p>Não foi possível conectar ao servidor.</p>
      <button @click="checkBackendStatus" class="retry-button">Tentar Novamente</button>
    </div>
    <div v-else-if="store.user.isLoggedIn && !store.isInitialDataLoaded" class="loading-screen">
      <p>Carregando seus dados...</p>
      <div class="spinner"></div>
    </div>
    
    <template v-else>
      <header v-if="store.user.isLoggedIn && !isAuthPage" class="app-header">
        <div class="wrapper">
          <div class="logo">
            <!-- LOGO E TEXTO JUNTOS -->
            <RouterLink to="/home">
              <img src="https://i.ibb.co/BHZck9sk/LOGO.png" alt="Logo SEE" />
              <span class="logo-text">SEE | Sistema do Estudante |LC|</span>
            </RouterLink>
          </div>
          
          <nav class="desktop-nav">
            <RouterLink to="/home">Meu Painel</RouterLink>
            <RouterLink v-if="store.user.role === 'ALUNO'" to="/certificados">Certificados</RouterLink>
            <RouterLink v-else-if="store.user.role === 'PROFESSOR'" to="/revisao">Revisão</RouterLink>
            <RouterLink v-else-if="store.user.role === 'ADMINISTRADOR'" to="/usuarios">Usuários</RouterLink>
            <RouterLink to="/avisos">Avisos</RouterLink>
            
            <div class="notification-container">
              <button ref="desktopBellRef" class="notification-bell" @click="isNotificationsOpen = !isNotificationsOpen">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span v-if="unreadAvisos.length > 0" class="badge">{{ unreadAvisos.length }}</span>
              </button>
              <div ref="desktopDropdownRef" v-if="isNotificationsOpen" class="notifications-dropdown">
                <div v-if="unreadAvisos.length > 0">
                  <div v-for="aviso in unreadAvisos" :key="aviso.id" class="notification-item" @click="handleNotificationClick(aviso.id)">
                    <strong>{{ aviso.tipoAtividade }}:</strong> {{ aviso.titulo }}
                  </div>
                </div>
                <div v-else class="notification-item empty">Nenhum aviso novo.</div>
              </div>
            </div>

            <a href="#" @click.prevent="fazerLogout">Logout</a>
          </nav>

          <div class="mobile-controls">
            <button ref="menuToggleRef" class="menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen" aria-label="Abrir menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </header>

      <nav v-if="isMobileMenuOpen" ref="mobileNavRef" class="mobile-nav">
        <RouterLink to="/home">Meu Painel</RouterLink>
        <RouterLink v-if="store.user.role === 'ALUNO'" to="/certificados">Certificados</RouterLink>
        <RouterLink v-else-if="store.user.role === 'PROFESSOR'" to="/revisao">Revisão</RouterLink>
        <RouterLink v-else-if="store.user.role === 'ADMINISTRADOR'" to="/usuarios">Usuários</RouterLink>
        <RouterLink to="/avisos">Avisos</RouterLink>
        <a href="#" @click.prevent="fazerLogout">Logout</a>
      </nav>

      <main class="app-main">
        <RouterView />
      </main>

      <footer v-if="store.user.isLoggedIn && !isAuthPage" class="app-footer">
        <p>&copy; 2025 SEE | Sistema do Estudante.</p>
      </footer>
    </template>
  </div>
</template>

<style>
/* Estilos globais e de layout principal da aplicação */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

:root {
  --cor-principal: #f8c0c8;
  --cor-texto: #5a5a5a;
  --cor-fundo: #fdf6f7;
  --cor-destaque: #e9a2ac;
  --cor-branco: #ffffff;
  --cor-sucesso: #28a745;
  --cor-aviso: #ffc107;
  --cor-perigo: #dc3545;
  --cor-cinza: #6c757d;
}

body {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  background-color: var(--cor-fundo);
  color: var(--cor-texto);
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex-grow: 1;
}

.app-header {
  background-color: var(--cor-branco);
  border-bottom: 1px solid #f0d8db;
  padding: 0 1rem;
  position: relative;
  z-index: 10;
}

.app-header .wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  height: 70px;
}

/* ESTILO DA LOGO ATUALIZADO */
.logo a {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 0.75rem; /* Espaço entre a imagem e o texto */
  text-decoration: none;
}

.logo img {
  height: 45px; /* Altura da logo */
  width: auto; /* Largura automática para manter proporção */
  object-fit: contain;
}

.logo .logo-text {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--cor-destaque);
  display: none; /* Esconde o texto em telas muito pequenas */
}

@media (min-width: 400px) {
  .logo .logo-text {
    display: inline; /* Mostra o texto em telas um pouco maiores */
  }
}


.desktop-nav {
  display: none; /* Escondido em telas pequenas */
  align-items: center;
  gap: 0.5rem;
}

.desktop-nav a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  color: var(--cor-texto);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
}

.desktop-nav a.router-link-exact-active,
.desktop-nav a:hover {
  color: var(--cor-principal);
}

/* Estilos de notificação */
.notification-container { position: relative; }
.notification-bell { background: none; border: none; cursor: pointer; position: relative; padding: 0.5rem; color: var(--cor-texto); font-size: 1.2rem; }
.notification-bell:hover { color: var(--cor-principal); }
.badge { position: absolute; top: 0; right: 0; background-color: var(--cor-perigo); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.notifications-dropdown { position: absolute; top: calc(100% + 5px); right: 0; background-color: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 300px; max-height: 400px; overflow-y: auto; z-index: 20; border: 1px solid #eee; }
.notification-item { padding: 1rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background-color 0.2s; font-size: 0.9rem; }
.notification-item:last-child { border-bottom: none; }
.notification-item:hover { background-color: #fdf6f7; }
.notification-item.empty { text-align: center; color: #999; cursor: default; }
.notification-item strong { color: var(--cor-destaque); }

/* Controles e menu mobile */
.mobile-controls { display: flex; align-items: center; gap: 0.5rem; }
.menu-toggle { display: block; background: none; border: none; cursor: pointer; padding: 0; color: var(--cor-destaque); }
.mobile-nav { display: flex; flex-direction: column; background-color: var(--cor-branco); position: absolute; top: 70px; left: 0; right: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.mobile-nav a { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; text-align: center; text-decoration: none; color: var(--cor-texto); border-top: 1px solid #f0d8db; }
.mobile-nav a.router-link-exact-active { background-color: var(--cor-fundo); color: var(--cor-destaque); font-weight: 600; }

.app-footer { background-color: var(--cor-branco); text-align: center; padding: 1.5rem 1rem; margin-top: 2rem; border-top: 1px solid #f0d8db; font-size: 0.9rem; color: #888; }

/* Telas de estado (loading/error) */
.loading-screen, .error-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; background-color: var(--cor-fundo); color: var(--cor-texto); }
.spinner { border: 4px solid rgba(0, 0, 0, 0.1); border-left-color: var(--cor-destaque); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-top: 20px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.error-screen h1 { color: var(--cor-perigo); }
.retry-button { background-color: var(--cor-destaque); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: background-color 0.3s ease; }
.retry-button:hover { background-color: var(--cor-principal); }

/* Media query para responsividade */
@media (min-width: 768px) {
  .app-header { padding: 0 2rem; }
  .desktop-nav { display: flex; }
  .mobile-controls { display: none; }
  .mobile-nav { display: none !important; } /* Garante que o menu mobile suma em telas grandes */
}
</style>

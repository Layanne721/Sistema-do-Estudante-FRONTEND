import { createRouter, createWebHistory } from 'vue-router';
import { store, initAuth } from '../components/js/store.js';

// Views Públicas
import LoginView from '../views/LoginView.vue';
import RegistroView from '../views/RegistroView.vue';
import RecuperarSenhaView from '../views/RecuperarSenhaView.vue';
// CORREÇÃO: Corrigido o nome do arquivo importado
import RedefinirSenhaView from '../views/RedefinirSenhaView.vue';

// Views Autenticadas
import HomeView from '../views/HomeView.vue';
import CertificadosView from '../views/CertificadosView.vue';
import AvisosView from '../views/AvisosView.vue';
import RevisaoView from '../views/RevisaoView.vue';
import UsuariosView from '../views/UsuariosView.vue';
import UsuarioCreateView from '../views/UsuarioCreateView.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    // --- Rotas Públicas ---
    { path: '/login', name: 'login', component: LoginView },
    { path: '/registro', name: 'registro', component: RegistroView },
    { path: '/recuperar-senha', name: 'recuperar-senha', component: RecuperarSenhaView },
    
    // CORREÇÃO: Rota ajustada para corresponder ao link do e-mail
    { 
      path: '/reset-password', // Caminho correto
      name: 'reset-password',   // Nome correto
      component: RedefinirSenhaView // Componente correto, sem .vue
    },
    
    // --- Rotas Autenticadas Comuns ---
    { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/avisos', name: 'avisos', component: AvisosView, meta: { requiresAuth: true } },
    
    // --- Rota de Aluno ---
    { 
      path: '/certificados', 
      name: 'certificados', 
      component: CertificadosView, 
      meta: { requiresAuth: true, role: 'ALUNO' } 
    },
    
    // --- Rota de Professor ---
    { 
      path: '/revisao', 
      name: 'revisao', 
      component: RevisaoView, 
      meta: { requiresAuth: true, role: 'PROFESSOR' } 
    },

    // --- Rotas de Administrador ---
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: { requiresAuth: true, role: 'ADMINISTRADOR' }
    },
    {
      path: '/usuarios/criar',
      name: 'usuarios-criar',
      component: UsuarioCreateView,
      meta: { requiresAuth: true, role: 'ADMINISTRADOR' }
    }
  ]
});

// Guarda de Rota Global (Navigation Guard)
router.beforeEach((to, from, next) => {
  // CORREÇÃO: Adicionado o caminho correto à lista de páginas públicas
  const publicPages = ['/login', '/registro', '/recuperar-senha', '/reset-password'];
  const authRequired = !publicPages.includes(to.path);
  const isLoggedIn = store.user.isLoggedIn;

  if (authRequired && !isLoggedIn) {
    return next('/login');
  }

  if (to.meta.role) {
    const userRole = store.user.role;
    if (to.meta.role !== userRole) {
      return next('/home'); 
    }
  }
  
  if (!authRequired && isLoggedIn) {
    return next('/home');
  }

  next();
});

export default router;
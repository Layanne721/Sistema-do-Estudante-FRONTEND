import { reactive } from 'vue';
import axios from 'axios';

export const store = reactive({
  user: {
    token: null,
    name: '',
    role: null,
    modality: null,
    isLoggedIn: false,
    avatarUrl: null,
  },
  avisos: [],
  certificados: [],
  certificadosParaRevisar: [],
  isInitialDataLoaded: false,
});

const API_BASE_URL = 'http://localhost:8080';

export function login(data, router) {
  const { token, nome, perfil, tipoAtividadeGerenciada, avatarUrl } = data;

  store.user.token = token;
  store.user.name = nome;
  store.user.role = perfil;
  store.user.modality = tipoAtividadeGerenciada;
  store.user.avatarUrl = (avatarUrl && avatarUrl !== 'null') ? avatarUrl : null; // CORREÇÃO: Garante que o avatar seja nulo se inválido
  store.user.isLoggedIn = true;

  localStorage.setItem('userToken', token);
  localStorage.setItem('userName', nome);
  localStorage.setItem('userRole', perfil);
  
  if (tipoAtividadeGerenciada) {
    localStorage.setItem('userModality', tipoAtividadeGerenciada);
  } else {
    localStorage.removeItem('userModality');
  }

  // CORREÇÃO: Lógica mais robusta para salvar ou remover o avatar
  if (store.user.avatarUrl) {
    localStorage.setItem('userAvatarUrl', store.user.avatarUrl);
  } else {
    localStorage.removeItem('userAvatarUrl');
  }

  router.push('/home');
}

export function logout(router) {
  Object.assign(store.user, {
    token: null,
    name: '',
    role: null,
    modality: null,
    isLoggedIn: false,
    avatarUrl: null,
  });
  
  store.avisos = [];
  store.certificados = [];
  store.certificadosParaRevisar = [];
  store.isInitialDataLoaded = false;

  localStorage.clear();
  router.push('/login');
}

export function initAuth() {
  const token = localStorage.getItem('userToken');
  if (token) {
    store.user.token = token;
    store.user.name = localStorage.getItem('userName') || '';
    store.user.role = localStorage.getItem('userRole') || null;
    store.user.modality = localStorage.getItem('userModality') || null;
    
    // CORREÇÃO: Verifica se o avatar salvo é a string "null"
    const storedAvatar = localStorage.getItem('userAvatarUrl');
    store.user.avatarUrl = (storedAvatar && storedAvatar !== 'null') ? storedAvatar : null;
    
    store.user.isLoggedIn = true;
  }
}

export function updateUserAvatar(newAvatarUrl) {
    store.user.avatarUrl = newAvatarUrl;
    if (newAvatarUrl) {
        localStorage.setItem('userAvatarUrl', newAvatarUrl);
    } else {
        localStorage.removeItem('userAvatarUrl');
    }
}

export async function fetchInitialData(router) {
  if (!store.user.isLoggedIn) return;
  store.isInitialDataLoaded = false;
  try {
    const headers = { headers: { Authorization: `Bearer ${store.user.token}` } };
    const promises = [
      axios.get(`${API_BASE_URL}/api/avisos`, headers)
    ];

    if (store.user.role === 'ALUNO') {
      promises.push(axios.get(`${API_BASE_URL}/api/certificados/meus`, headers));
    } else if (store.user.role === 'PROFESSOR') {
      promises.push(axios.get(`${API_BASE_URL}/api/certificados/revisao/pendentes`, headers));
    }

    const responses = await Promise.all(promises);

    store.avisos = responses[0].data;
    if (responses.length > 1) {
      if (store.user.role === 'ALUNO') {
        store.certificados = responses[1].data;
      } else if (store.user.role === 'PROFESSOR') {
        store.certificadosParaRevisar = responses[1].data;
      }
    }
  } catch (error) {
    console.error("Falha ao buscar dados iniciais:", error);
    if (error.response && [401, 403].includes(error.response.status)) {
      logout(router);
    }
  } finally {
    store.isInitialDataLoaded = true;
  }
}

export async function marcarAvisoComoLido(avisoId, router) {
    if (!store.user.isLoggedIn) return;
    try {
        await axios.post(`${API_BASE_URL}/api/avisos/${avisoId}/ler`, {}, {
            headers: { Authorization: `Bearer ${store.user.token}` }
        });
        await fetchInitialData(router);
    } catch (error) {
        console.error("Falha ao marcar aviso como lido:", error);
    }
}


import { reactive } from 'vue';
import axios from 'axios';

/**
 * @description O estado reativo central da aplicação.
 */
export const store = reactive({
  user: {
    token: null,
    name: '',
    role: null,
    modality: null,
    isLoggedIn: false,
  },
  avisos: [],
  certificados: [],
  certificadosParaRevisar: [],
  isInitialDataLoaded: false,
});

/**
 * @description Processa os dados de login, atualiza o estado e o localStorage.
 * @param {object} data - Os dados recebidos da API de login.
 * @param {object} router - A instância do Vue Router para redirecionamento.
 */
export function login(data, router) {
  const { token, nome, perfil, tipoAtividadeGerenciada } = data;

  store.user.token = token;
  store.user.name = nome;
  store.user.role = perfil;
  store.user.modality = tipoAtividadeGerenciada;
  store.user.isLoggedIn = true;

  localStorage.setItem('authToken', token);
  localStorage.setItem('userName', nome);
  localStorage.setItem('userRole', perfil);
  if (tipoAtividadeGerenciada) {
    localStorage.setItem('userModality', tipoAtividadeGerenciada);
  }

  router.push('/home');
}

/**
 * @description Efetua o logout do usuário, limpando o estado e o localStorage.
 * @param {object} router - A instância do Vue Router para redirecionamento.
 */
export function logout(router) {
  store.user.token = null;
  store.user.name = '';
  store.user.role = null;
  store.user.modality = null;
  store.user.isLoggedIn = false;
  store.avisos = [];
  store.certificados = [];
  store.certificadosParaRevisar = [];
  store.isInitialDataLoaded = false;

  localStorage.clear();
  router.push('/login');
}

/**
 * @description Inicializa o estado de autenticação a partir do localStorage ao carregar a aplicação.
 */
export function initAuth() {
  const token = localStorage.getItem('authToken');
  if (token) {
    store.user.token = token;
    store.user.name = localStorage.getItem('userName') || '';
    store.user.role = localStorage.getItem('userRole') || null;
    store.user.modality = localStorage.getItem('userModality') || null;
    store.user.isLoggedIn = true;
  }
}

/**
 * @description Busca TODOS os dados iniciais essenciais para o usuário logado (avisos, certificados, etc.).
 * @param {object} router - A instância do Vue Router para redirecionamento em caso de erro.
 */
export async function fetchInitialData(router) {
  if (!store.user.isLoggedIn) return;

  store.isInitialDataLoaded = false;

  try {
    const headers = { headers: { Authorization: `Bearer ${store.user.token}` } };
    const promises = [];

    // Todos os usuários logados recebem avisos
    promises.push(axios.get('http://localhost:8080/api/avisos', headers));

    // Busca dados específicos do perfil
    if (store.user.role === 'ALUNO') {
      promises.push(axios.get('http://localhost:8080/api/certificados/meus', headers));
    } else if (store.user.role === 'PROFESSOR') {
      promises.push(axios.get('http://localhost:8080/api/certificados/revisao/pendentes', headers));
    }

    const responses = await Promise.all(promises);

    // Atribui os dados ao estado global
    store.avisos = responses[0].data;
    if (store.user.role === 'ALUNO') {
      store.certificados = responses[1].data;
    } else if (store.user.role === 'PROFESSOR') {
      store.certificadosParaRevisar = responses[1].data;
    }

  } catch (error) {
    console.error("Falha ao buscar dados iniciais:", error);
    // Se o token for inválido ou expirado, desloga o usuário
    if (error.response && [401, 403].includes(error.response.status)) {
      logout(router);
    }
  } finally {
    store.isInitialDataLoaded = true;
  }
}

/**
 * @description Marca um aviso específico como lido e atualiza a lista de avisos.
 * @param {number} avisoId - O ID do aviso a ser marcado como lido.
 * @param {object} router - A instância do Vue Router para ser passada ao fetchInitialData.
 */
export async function marcarAvisoComoLido(avisoId, router) {
    if (!store.user.isLoggedIn) return;
    try {
        await axios.post(`http://localhost:8080/api/avisos/${avisoId}/ler`, {}, {
            headers: { Authorization: `Bearer ${store.user.token}` }
        });
        // Após marcar como lido, busca novamente os dados para garantir que a lista de avisos não lidos seja atualizada.
        // Esta é a forma mais segura de garantir a consistência dos dados.
        await fetchInitialData(router);
    } catch (error) {
        console.error("Falha ao marcar aviso como lido:", error);
        // Opcional: Adicionar feedback de erro para o usuário
    }
}
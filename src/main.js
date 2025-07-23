import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Importa o router que acabamos de corrigir

// Importa a função de inicialização do nosso store
import { initAuth } from './components/js/store';

// ✅ CHAMADA CRUCIAL: Inicializa o estado de autenticação a partir do localStorage
// Faça isso ANTES de criar e montar a aplicação.
initAuth();

const app = createApp(App);

app.use(router);

app.mount('#app');
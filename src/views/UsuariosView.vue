<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
// ✅ SEGURANÇA: Importar o store para verificar o perfil do usuário
import { store } from '../components/js/store.js';

const router = useRouter();
const usuarios = ref([]);
const erro = ref(null);
const isLoading = ref(true); // ✅ MELHORIA: Estado de carregamento

onMounted(async () => {
  // ✅ SEGURANÇA: Protege a rota no lado do cliente
  if (store.user.role !== 'ADMINISTRADOR') {
    router.push('/home'); // Ou para uma página de "acesso negado"
    return;
  }

  try {
    const token = store.user.token;
    if (!token) throw new Error("Token não encontrado");

    // ✅ SEGURANÇA: Envia o token de autorização na requisição
    const response = await axios.get('http://localhost:8080/usuarios', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    usuarios.value = response.data;
  } catch (e) {
    erro.value = 'Falha ao carregar os usuários. Você precisa ser um administrador.';
    console.error(e);
  } finally {
    isLoading.value = false; // ✅ MELHORIA: Para o carregamento
  }
});
</script>

<template>
  <div class="usuarios-container">
    <h1>Lista de Usuários</h1>

    <div v-if="isLoading">Carregando...</div>
    <div v-else-if="erro" class="erro">{{ erro }}</div>
    <ul v-else>
      <li v-for="usuario in usuarios" :key="usuario.id">
        <strong>{{ usuario.nome }}</strong> ({{ usuario.email }}) - Perfil: {{ usuario.perfil }}
      </li>
    </ul>
    <router-link to="/usuarios/criar" class="btn-criar">Cadastrar Novo Usuário</router-link>
  </div>
</template>

<style scoped>
/* Estilos permanecem os mesmos, adicionei apenas o .btn-criar se necessário */
.usuarios-container { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
.erro { color: red; font-weight: bold; }
ul { list-style-type: none; padding: 0; }
li { background-color: #f4f4f4; padding: 10px; margin-bottom: 5px; border-radius: 5px; }
.btn-criar { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
.btn-criar:hover { background-color: #0056b3; }
</style>
<script setup>
import { ref, onMounted } from 'vue'; // Adicionado onMounted
import axios from 'axios';
import { useRouter } from 'vue-router';
// ✅ SEGURANÇA: Importar o store para verificar o perfil
import { store } from '../components/js/store.js';

const router = useRouter();
const nome = ref('');
const email = ref('');
const senha = ref('');
const perfil = ref('ALUNO');
const erro = ref(null);
const sucesso = ref(null);
const isSubmitting = ref(false); // ✅ MELHORIA: Estado de carregamento do botão

// ✅ SEGURANÇA: Protege a rota no lado do cliente
onMounted(() => {
  if (store.user.role !== 'ADMINISTRADOR') {
    router.push('/home');
  }
});

async function cadastrarUsuario() {
  erro.value = null;
  sucesso.value = null;
  isSubmitting.value = true;

  if (!nome.value || !email.value || !senha.value) {
    erro.value = 'Por favor, preencha todos os campos obrigatórios.';
    isSubmitting.value = false;
    return;
  }

  try {
    const dadosNovoUsuario = {
      nome: nome.value, email: email.value, senha: senha.value, perfil: perfil.value
    };

    const token = store.user.token;
    if (!token) throw new Error("Token de administrador não encontrado");
    
    // ✅ SEGURANÇA: Envia o token na requisição de criação
    await axios.post('http://localhost:8080/usuarios', dadosNovoUsuario, {
      headers: { Authorization: `Bearer ${token}` }
    });

    sucesso.value = 'Usuário cadastrado com sucesso! Redirecionando...';
    setTimeout(() => {
      router.push('/usuarios');
    }, 2000);

  } catch (e) {
    erro.value = e.response?.data?.message || 'Falha ao cadastrar usuário. O e-mail pode já estar em uso.';
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="form-container">
    <h1>Cadastrar Novo Usuário (Admin)</h1>
    <form @submit.prevent="cadastrarUsuario">
      <div class="form-group">
        <label for="nome">Nome:</label>
        <input type="text" id="nome" v-model="nome" required>
      </div>
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" v-model="email" required>
      </div>
      <div class="form-group">
        <label for="senha">Senha:</label>
        <input type="password" id="senha" v-model="senha" required>
      </div>
      <div class="form-group">
        <label for="perfil">Perfil:</label>
        <select id="perfil" v-model="perfil">
          <option value="ALUNO">Aluno</option>
          <option value="PROFESSOR">Professor</option>
          <option value="ADMINISTRADOR">Administrador</option>
        </select>
      </div>
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Cadastrando...' : 'Cadastrar' }}
      </button>
    </form>
    <div v-if="sucesso" class="mensagem sucesso">{{ sucesso }}</div>
    <div v-if="erro" class="mensagem erro">{{ erro }}</div>
  </div>
</template>

<style scoped>
/* Estilos permanecem os mesmos */
.form-container { font-family: sans-serif; padding: 20px; max-width: 500px; margin: 40px auto; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.form-group { margin-bottom: 15px; }
label { display: block; margin-bottom: 5px; }
input, select { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
button { width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
button:hover { background-color: #218838; }
button:disabled { background-color: #aaa; }
.mensagem { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; }
.sucesso { color: #155724; background-color: #d4edda; border-color: #c3e6cb; }
.erro { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }
</style>
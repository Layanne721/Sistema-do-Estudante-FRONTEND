<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios'; // Importar axios


const route = useRoute();
const router = useRouter();

const token = ref(null);
const novaSenha = ref('');
const confirmarSenha = ref('');

const sucesso = ref(null);
const erro = ref(null);
const isSubmitting = ref(false);

// Ao carregar a página, pegamos o token da URL
onMounted(() => {
  token.value = route.query.token;
  if (!token.value) {
    erro.value = 'Token de redefinição inválido ou ausente. Por favor, solicite um novo link.';
  }
});

async function redefinirSenha() {
  sucesso.value = null;
  erro.value = null;

  if (novaSenha.value !== confirmarSenha.value) {
    erro.value = 'As senhas não coincidem.';
    return;
  }
  if (novaSenha.value.length < 6) {
    erro.value = 'A nova senha deve ter pelo menos 6 caracteres.';
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      token: token.value,
      newPassword: novaSenha.value
    };

    // Faz a chamada para o endpoint do backend que efetivamente redefine a senha

await axios.post('http://localhost:8080/auth/resetar-senha', payload);
    
    sucesso.value = 'Senha redefinida com sucesso! Você será redirecionado para o login em 3 segundos.';
    setTimeout(() => {
      router.push('/login');
    }, 3000);

  } catch (e) {
    erro.value = e.response?.data?.error || e.response?.data?.message || 'Token inválido/expirado ou erro ao redefinir a senha.';
    console.error("Erro ao redefinir senha:", e);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="form-wrapper">
      <h1>Redefinir Senha</h1>
      <p v-if="token">Crie uma nova senha para sua conta.</p>
      
      <form v-if="token" @submit.prevent="redefinirSenha">
        <div class="form-group">
          <label for="nova-senha">Nova Senha:</label>
          <input type="password" id="nova-senha" v-model="novaSenha" required>
        </div>
        <div class="form-group">
          <label for="confirmar-senha">Confirmar Nova Senha:</label>
          <input type="password" id="confirmar-senha" v-model="confirmarSenha" required>
        </div>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Salvando...' : 'Redefinir Senha' }}
        </button>
      </form>
      
      <div v-if="sucesso" class="mensagem sucesso">{{ sucesso }}</div>
      <div v-if="erro" class="mensagem erro">{{ erro }}</div>
      
      <div class="extra-links">
        <router-link to="/login">Voltar para o Login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/auth.css';
</style>
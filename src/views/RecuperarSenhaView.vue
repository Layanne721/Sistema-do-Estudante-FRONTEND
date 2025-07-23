<script setup>
import { ref } from 'vue';
import axios from 'axios'; // Importar axios

const email = ref('');
const mensagem = ref(null);
const erro = ref(null);
const isSubmitting = ref(false);

async function solicitarRecuperacao() {
  mensagem.value = null;
  erro.value = null;
  isSubmitting.value = true;

  try {
    // ✅ LÓGICA REAL: Faz a chamada para o backend
    await axios.post('http://localhost:8080/auth/recuperar-senha', { email: email.value });
    mensagem.value = `Se um usuário com o e-mail ${email.value} existir, um link de recuperação foi enviado.`;
  } catch (e) {
    console.error("Erro na solicitação de recuperação:", e);
    // Mostra um erro genérico para não confirmar se um e-mail existe ou não (por segurança)
    erro.value = "Não foi possível processar a solicitação. Tente novamente mais tarde.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="form-wrapper">
      <h1>Recuperar Senha</h1>
      <p>Digite seu e-mail e enviaremos um link para você redefinir sua senha.</p>
      <form @submit.prevent="solicitarRecuperacao">
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" v-model="email" required>
        </div>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Enviando...' : 'Enviar Link de Recuperação' }}
        </button>
      </form>
      <div v-if="mensagem" class="mensagem sucesso">{{ mensagem }}</div>
      <div v-if="erro" class="mensagem erro">{{ erro }}</div>
      <div class="extra-links">
        <router-link to="/login">Voltar para o Login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/auth.css';
/* As classes de mensagem 'sucesso' e 'erro' devem estar no seu auth.css */
</style>
<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { login } from '../components/js/store.js';

const router = useRouter();
const email = ref('');
const senha = ref('');
const erro = ref(null);
const isSubmitting = ref(false);

async function fazerLogin() {
  erro.value = null;
  isSubmitting.value = true;
  try {
    const response = await axios.post('http://localhost:8080/auth/login', {
      email: email.value,
      senha: senha.value
    });
    
    login(response.data, router);

  } catch (e) {
    erro.value = e.response?.data?.error || 'Credenciais inválidas ou erro no servidor.';
    console.error("Erro no login:", e);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="form-wrapper">
      <h1>Login</h1>
      <p>Bem-vindo de volta! Faça login para continuar.</p>
      <form @submit.prevent="fazerLogin">
        <div class="form-group">
          <label for="login-email">Email:</label>
          <input type="email" id="login-email" v-model="email" required>
        </div>
        <div class="form-group">
          <label for="login-senha">Senha:</label>
          <input type="password" id="login-senha" v-model="senha" required>
        </div>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
      <div v-if="erro" class="mensagem erro">{{ erro }}</div>
      <div class="extra-links">
        <router-link to="/recuperar-senha">Esqueceu sua senha?</router-link>
        <router-link to="/registro">Não tem uma conta?</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/auth.css';
</style>
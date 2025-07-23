<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const nome = ref('');
const email = ref('');
const senha = ref('');
const perfilSelecionado = ref('ALUNO');
const matricula = ref('');
const codigoDisciplina = ref('');
const tipoAtividadeGerenciada = ref('ENSINO'); // Valor inicial

const erro = ref(null);
const sucesso = ref(null);
const isSubmitting = ref(false);

const tiposDeAtividade = [
    { value: 'ENSINO', text: 'Ensino' },
    { value: 'PESQUISA', text: 'Pesquisa' },
    { value: 'EXTENSAO', text: 'Extensão' },
    { value: 'GESTAO_REPRESENTACAO', text: 'Gestão e Representação' }
];

async function registrar() {
    erro.value = null;
    sucesso.value = null;
    isSubmitting.value = true;
    
    try {
        const dadosNovoUsuario = {
            nome: nome.value,
            email: email.value,
            senha: senha.value,
            perfil: perfilSelecionado.value,
            matricula: perfilSelecionado.value === 'ALUNO' ? matricula.value : null,
            codigoDisciplina: perfilSelecionado.value === 'PROFESSOR' ? codigoDisciplina.value : null,
            tipoAtividadeGerenciada: perfilSelecionado.value === 'PROFESSOR' ? tipoAtividadeGerenciada.value : null
        };
        
        await axios.post('http://localhost:8080/auth/register', dadosNovoUsuario);
        
        sucesso.value = 'Registro realizado com sucesso! Redirecionando para o login...';
        setTimeout(() => {
            router.push('/login');
        }, 2000);
    } catch (e) {
        erro.value = e.response?.data?.message || 'Falha ao registrar. O e-mail já pode estar em uso ou dados inválidos.';
        console.error("Erro no registro:", e);
    } finally {
        isSubmitting.value = false;
    }
}
</script>

<template>
  <div class="auth-container">
    <div class="form-wrapper">
      <h1>Crie sua Conta</h1>
      <p>Preencha os campos abaixo para começar.</p>
      <form @submit.prevent="registrar">
        <div class="form-group">
          <label for="registro-nome">Nome Completo:</label>
          <input type="text" id="registro-nome" v-model="nome" required>
        </div>
        <div class="form-group">
          <label for="registro-email">Email:</label>
          <input type="email" id="registro-email" v-model="email" required>
        </div>
        <div class="form-group">
          <label for="registro-senha">Senha:</label>
          <input type="password" id="registro-senha" v-model="senha" required>
        </div>

        <div class="form-group">
            <label for="registro-perfil">Eu sou:</label>
            <select id="registro-perfil" v-model="perfilSelecionado">
                <option value="ALUNO">Aluno</option>
                <option value="PROFESSOR">Professor</option>
            </select>
        </div>

        <div v-if="perfilSelecionado === 'ALUNO'">
            <div class="form-group">
              <label for="registro-matricula">Número de Matrícula:</label>
              <input type="text" id="registro-matricula" v-model="matricula" required>
            </div>
        </div>

        <div v-else-if="perfilSelecionado === 'PROFESSOR'">
            <div class="form-group">
              <label for="registro-codigoDisciplina">Código da Disciplina:</label>
              <input type="text" id="registro-codigoDisciplina" v-model="codigoDisciplina" required>
            </div>
            <div class="form-group">
              <label for="registro-tipoAtividade">Gerenciar Modalidade de:</label>
              <select id="registro-tipoAtividade" v-model="tipoAtividadeGerenciada">
                  <option v-for="tipo in tiposDeAtividade" :key="tipo.value" :value="tipo.value">{{ tipo.text }}</option>
              </select>
            </div>
        </div>
        
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Registrando...' : 'Registrar' }}
        </button>
      </form>
      <div v-if="sucesso" class="mensagem sucesso">{{ sucesso }}</div>
      <div v-if="erro" class="mensagem erro">{{ erro }}</div>
      <div class="extra-links">
        <router-link to="/login">Já tem uma conta? Faça login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/auth.css';
</style>
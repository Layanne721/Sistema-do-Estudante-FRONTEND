<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import AvatarSelectorModal from '@/components/AvatarSelectorModal.vue';

const router = useRouter();

const nome = ref('');
const email = ref('');
const senha = ref('');
const perfilSelecionado = ref('ALUNO');
const matricula = ref('');
const codigoDisciplina = ref('');
const tipoAtividadeGerenciada = ref('ENSINO');
const selectedAvatarUrl = ref(null);
const isAvatarModalOpen = ref(false);

const erro = ref(null);
const sucesso = ref(null);
const isSubmitting = ref(false);

const tiposDeAtividade = [
    { value: 'ENSINO', text: 'Ensino' },
    { value: 'PESQUISA', text: 'Pesquisa' },
    { value: 'EXTENSAO', text: 'Extensão' },
    { value: 'GESTAO_REPRESENTACAO', text: 'Gestão e Representação' }
];

function handleAvatarSelected(url) {
  selectedAvatarUrl.value = url;
  isAvatarModalOpen.value = false;
}

async function registrar() {
    erro.value = null;
    sucesso.value = null;
    isSubmitting.value = true;
    
    const payload = {
      nome: nome.value,
      email: email.value,
      senha: senha.value,
      perfil: perfilSelecionado.value,
      matricula: perfilSelecionado.value === 'ALUNO' ? matricula.value : null,
      codigoDisciplina: perfilSelecionado.value === 'PROFESSOR' ? codigoDisciplina.value : null,
      tipoAtividadeGerenciada: perfilSelecionado.value === 'PROFESSOR' ? tipoAtividadeGerenciada.value : null,
      avatarUrl: selectedAvatarUrl.value
    };
    
    try {
        await axios.post('http://localhost:8080/auth/register', payload);
        sucesso.value = 'Registro realizado com sucesso! Redirecionando para o login...';
        setTimeout(() => router.push('/login'), 2000);
    } catch (e) {
        erro.value = e.response?.data?.message || 'Falha ao registrar.';
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
        <div class="form-group avatar-section">
          <label>Avatar (Opcional)</label>
          <div class="avatar-display" @click="isAvatarModalOpen = true" title="Clique para escolher um avatar">
             <img v-if="selectedAvatarUrl" :src="selectedAvatarUrl" alt="Avatar Selecionado" class="avatar-image">
             <div v-else class="avatar-placeholder">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-user-pink"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             </div>
          </div>
          <div class="avatar-actions">
            <button type="button" @click="isAvatarModalOpen = true">Escolher um Avatar</button>
          </div>
        </div>

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

  <AvatarSelectorModal 
    v-if="isAvatarModalOpen" 
    @close="isAvatarModalOpen = false"
    @avatar-selected="handleAvatarSelected"
  />
</template>

<style scoped>
@import '@/assets/styles/auth.css';

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.avatar-display {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid var(--cor-principal);
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.3s;
}

.avatar-display:hover {
    border-color: var(--cor-destaque);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 4rem; /* Mantemos o tamanho do div para centralizar o SVG */
  color: #ccc;
  display: flex; /* Adiciona flexbox para centralizar o SVG */
  justify-content: center;
  align-items: center;
  width: 100%; /* Ocupa todo o espaço do container */
  height: 100%; /* Ocupa todo o espaço do container */
}

/* Novo estilo para o ícone SVG */
.icon-user-pink {
    stroke: var(--cor-destaque); /* Usa a cor de destaque do seu tema */
    width: 60px; /* Ajusta o tamanho do SVG */
    height: 60px; /* Ajusta o tamanho do SVG */
}

.avatar-actions button {
  background-color: var(--cor-destaque);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  font-family: 'Poppins', sans-serif;
  transition: all 0.2s ease;
}

.avatar-actions button:hover {
  background-color: #c17c86;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
</style>
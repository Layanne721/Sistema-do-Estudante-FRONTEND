<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { store, logout, updateUserAvatar } from '../components/js/store.js'; // Ajuste o caminho se necessário
import { useRouter } from 'vue-router';
import AvatarSelectorModal from '@/components/AvatarSelectorModal.vue'; // Ajuste o caminho se necessário

const router = useRouter();
const perfil = ref(null);
const isLoading = ref(true);
const isAvatarModalOpen = ref(false);

const API_URL = 'http://localhost:8080/auth';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${store.user.token}` } });

const formattedRole = computed(() => {
  if (!store.user.role) return '';
  const role = store.user.role.toLowerCase();
  return role.charAt(0).toUpperCase() + role.slice(1);
});

// --- FUNÇÕES PARA O BADGE DE MODALIDADE ---
function formatModalidade(modalidade) {
  if (!modalidade) return '';
  switch (modalidade) {
    case 'ENSINO': return 'Ensino';
    case 'PESQUISA': return 'Pesquisa';
    case 'EXTENSAO': return 'Extensão';
    case 'GESTAO_REPRESENTACAO': return 'Gestão & Representação';
    default: return modalidade.charAt(0).toUpperCase() + modalidade.slice(1).toLowerCase();
  }
}

function getModalidadeClass(modalidade) {
  if (!modalidade) return '';
  return `modalidade-${modalidade.toLowerCase()}`;
}

// --- LISTAS DE MEDALHAS E AVATARES ---
const medalhasAluno = [
    { nome: "Semente do Saber", descricao: "Concedida por alcançar o Nível 2.", imagemUrl: "🌱" },
    { nome: "Guardião dos Certificados", descricao: "Concedida por alcançar o Nível 5.", imagemUrl: "🛡️" },
    { nome: "Mestre do Conhecimento", descricao: "Concedida por alcançar o Nível 10.", imagemUrl: "🏆" },
    { nome: "Lenda Acadêmica", descricao: "Concedida por alcançar o Nível 20.", imagemUrl: "💎" }
];
const medalhasProfessor = [
    { nome: "Revisor Iniciante", descricao: "Concedida por revisar 10 certificados.", imagemUrl: "✍️" },
    { nome: "Mentor Dedicado", descricao: "Concedida por revisar 50 certificados.", imagemUrl: "🧑‍🏫" },
    { nome: "Mestre Avaliador", descricao: "Concedida por revisar 100 certificados.", imagemUrl: "🧐" },
    { nome: "Pilar da Academia", descricao: "Concedida por revisar 200 certificados.", imagemUrl: "🏛️" }
];
const avataresAluno = ['/avatares/aluno/aluno1.png', '/avatares/aluno/aluno2.png', '/avatares/aluno/aluno3.png', '/avatares/aluno/aluno4.png'];
const avataresProfessor = ['/avatares/professor/prof1.png', '/avatares/professor/prof2.png', '/avatares/professor/prof3.png', '/avatares/professor/prof4.png'];
const medalhasDisponiveis = computed(() => store.user.role === 'PROFESSOR' ? medalhasProfessor : medalhasAluno);
const avataresDisponiveis = computed(() => store.user.role === 'PROFESSOR' ? avataresProfessor : avataresAluno);

const usuarioPossuiMedalha = (nomeMedalha) => {
    if (!perfil.value || !perfil.value.medalhas) return false;
    return perfil.value.medalhas.some(medalha => medalha.nome === nomeMedalha);
};

onMounted(async () => {
  if (!store.user.token) {
    logout(router);
    return;
  }
  try {
    const response = await axios.get(`${API_URL}/meu-perfil`, getAuthHeaders());
    perfil.value = response.data;
    if (response.data.avatarUrl !== store.user.avatarUrl) {
      updateUserAvatar(response.data.avatarUrl);
    }
  } catch (error) {
    console.error("Erro ao buscar dados do perfil", error);
    if (error.response?.status === 401) {
      logout(router);
    }
  } finally {
    isLoading.value = false;
  }
});

async function handleAvatarSelected(newAvatarUrl) {
  isAvatarModalOpen.value = false;
  try {
    const response = await axios.put(`${API_URL}/meu-perfil/avatar`,
      { avatarUrl: newAvatarUrl },
      getAuthHeaders()
    );
    updateUserAvatar(response.data.avatarUrl);
    alert('Avatar atualizado com sucesso!');
  } catch (error) {
    console.error("Erro ao atualizar o avatar", error);
    alert('Falha ao atualizar o avatar.');
  }
}
</script>

<template>
  <div class="page-container">
    <div v-if="isLoading" class="loading-state">Carregando perfil...</div>
    <div v-else-if="perfil" class="perfil-container">

      <div class="perfil-header card">
        <div class="avatar-container">
          <img
            v-if="store.user.avatarUrl"
            :src="store.user.avatarUrl"
            alt="Avatar"
            class="avatar-img"
            @click="isAvatarModalOpen = true"
            title="Clique para trocar o avatar"
          >
          <div
            v-else
            class="avatar-img-placeholder"
            @click="isAvatarModalOpen = true"
            title="Clique para escolher um avatar"
          >
            <span>{{ store.user.name.charAt(0) }}</span>
          </div>
        </div>
        <div class="info-container">
          <h1 class="profile-name">{{ perfil.nome }}</h1>
          <p class="profile-email">{{ perfil.email }}</p>
          <div class="badges-container">
            <div class="level-badge">Nível {{ perfil.nivel }}</div>
            <div class="role-badge">{{ formattedRole }}</div>
            <div v-if="store.user.role === 'PROFESSOR' && store.user.modality"
                 class="base-badge"
                 :class="getModalidadeClass(store.user.modality)">
              {{ formatModalidade(store.user.modality) }}
            </div>
          </div>
        </div>
      </div>

      <div class="progresso-card card">
        <h2>Progresso para o Nível {{ perfil.nivel + 1 }}</h2>
        <p>{{ perfil.xp % 10 }} / 10 Pontos de XP neste nível</p>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: (perfil.xp % 10) / 10 * 100 + '%' }"></div>
        </div>
      </div>

      <div class="progresso-total-card card">
        <h2>Progresso Geral</h2>
        <p v-if="store.user.role === 'ALUNO'">{{ perfil.xp }} / {{ perfil.metaXp }} Horas Concluídas</p>
        <p v-else>{{ perfil.xp }} XP Total</p>
        <div v-if="store.user.role === 'ALUNO'" class="progress-bar-container">
          <div class="progress-bar" :style="{ width: (perfil.xp / perfil.metaXp) * 100 + '%' }"></div>
        </div>
      </div>

      <div class="medalhas-card card">
        <h2>Minha Sala de Troféus</h2>
        <div class="medalhas-grid">
          <div v-for="medalha in medalhasDisponiveis" :key="medalha.nome" class="medalha-item" :class="{ 'locked': !usuarioPossuiMedalha(medalha.nome) }" :title="medalha.descricao">
            <div class="medalha-imagem-container">
              <div class="medalha-emoji">{{ medalha.imagemUrl }}</div>
              <div v-if="!usuarioPossuiMedalha(medalha.nome)" class="lock-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>
            <strong>{{ medalha.nome }}</strong>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="error-state">
      Não foi possível carregar os dados do perfil. Tente fazer login novamente.
    </div>
  </div>

  <AvatarSelectorModal
    v-if="isAvatarModalOpen"
    :avatares="avataresDisponiveis"
    @close="isAvatarModalOpen = false"
    @avatar-selected="handleAvatarSelected"
  />
</template>

<style scoped>
.page-container {
    width: 100%;
    max-width: 900px;
    margin: 2rem auto;
    padding: 1rem;
}
.perfil-container {
    display: grid;
    gap: 1.5rem;
}
.card {
    background-color: #fff;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border: 1px solid #f0d8db;
}
.perfil-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
}
@media (min-width: 600px) {
    .perfil-header {
        flex-direction: row;
        text-align: left;
    }
}
.avatar-container {
    text-align: center;
    position: relative;
}
.avatar-img, .avatar-img-placeholder {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid var(--cor-principal);
    object-fit: cover;
    cursor: pointer;
    transition: all 0.3s ease;
}
.avatar-img-placeholder {
    background-color: var(--cor-destaque);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: 600;
    text-transform: uppercase;
}
.avatar-img:hover, .avatar-img-placeholder:hover {
    transform: scale(1.05);
    opacity: 0.9;
    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}
.info-container .profile-name {
    margin: 0;
    font-size: 1.8rem;
    color: #333;
}
.info-container .profile-email {
    margin: 0.25rem 0 1rem 0;
    color: #666;
}
.badges-container {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}
@media (min-width: 600px) {
  .badges-container {
    justify-content: flex-start;
  }
}

/* --- ESTILOS PARA OS BADGES --- */
.level-badge,
.role-badge,
.base-badge {
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  display: inline-block;
  font-weight: bold;
  font-size: 0.9rem;
}
.level-badge { background-color: var(--cor-destaque); }
.role-badge { background-color: #76c7c0; }

/* Cores de referência para cada modalidade */
.modalidade-ensino { background-color: #2a7aef; }
.modalidade-pesquisa { background-color: #28a745; }
.modalidade-extensao { background-color: #fd7e14; }
.modalidade-gestao_representacao { background-color: #6c757d; }
/* --- FIM DOS ESTILOS --- */

.progresso-card h2, .progresso-total-card h2 {
    margin-top: 0;
    font-size: 1.2rem;
    color: #333;
}
.progress-bar-container {
    background-color: #e9ecef;
    border-radius: 10px;
    height: 12px;
    overflow: hidden;
    margin-top: 0.5rem;
}
.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #e9a2ac, #c17c86);
    border-radius: 10px;
    transition: width 0.5s ease;
}
.medalhas-card h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #7c4d54;
    font-size: 1.5rem;
}
.medalhas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 2rem;
    margin-top: 1rem;
}
.medalha-item {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.3s ease;
}
.medalha-item:not(.locked):hover {
    transform: translateY(-5px);
}
.medalha-imagem-container {
    position: relative;
    margin-bottom: 0.75rem;
    width: 80px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fdf6f7;
    border-radius: 50%;
    border: 2px solid var(--cor-principal);
}
.medalha-emoji {
    font-size: 40px;
    line-height: 1;
}
.medalha-item strong {
    font-size: 0.9rem;
    color: #333;
    font-weight: 600;
    margin-top: 0.25rem;
}
.medalha-item.locked .medalha-imagem-container {
    filter: grayscale(100%);
    opacity: 0.5;
}
.medalha-item.locked strong {
    color: #999;
}
.lock-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255, 255, 255, 0.8);
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    padding: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
}
</style>
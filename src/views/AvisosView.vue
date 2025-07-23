<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { store, fetchInitialData, marcarAvisoComoLido } from '../components/js/store.js';

const router = useRouter();

// --- DADOS DO USUÁRIO ---
const user = computed(() => store.user);

// --- ESTADOS LOCAIS ---
const avisosNaoLidos = computed(() => store.avisos);
const avisosLidos = ref([]);
const showHistory = ref(false);
const isLoadingHistory = ref(false);

// --- ESTADOS DO FORMULÁRIO ---
const tituloAviso = ref('');
const conteudoAviso = ref('');
const statusAviso = ref('NORMAL');
const relevanciaAviso = ref('OUTROS');
const errorAviso = ref(null);
const isSubmittingAviso = ref(false);
const editingAvisoId = ref(null);

const statusDeAviso = ['NORMAL', 'IMPORTANTE', 'URGENTE'];
const relevanciasDeAviso = ['CARGA_HORARIA', 'CERTIFICADOS', 'DUVIDAS', 'OUTROS'];

// --- FUNÇÕES AUXILIARES ---
const formatarData = (data) => new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${user.value.token}` } });

// --- LÓGICA DE BUSCA DE DADOS ---
async function toggleHistory() {
  if (showHistory.value) {
    showHistory.value = false;
    return;
  }
  if (avisosLidos.value.length > 0 && !showHistory.value) {
    showHistory.value = true;
    return;
  }
  isLoadingHistory.value = true;
  try {
    const url = `http://localhost:8080/api/avisos/historico?t=${new Date().getTime()}`;
    const response = await axios.get(url, getAuthHeaders());
    avisosLidos.value = response.data;
    showHistory.value = true;
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    alert("Não foi possível carregar o histórico.");
  } finally {
    isLoadingHistory.value = false;
  }
}

onMounted(async () => {
  if (!store.isInitialDataLoaded) {
    await fetchInitialData(router);
  }
});

// --- LÓGICA DE AÇÕES ---
async function handleMarcarComoLido(avisoId) {
    // Chama a função centralizada no store.js
    await marcarAvisoComoLido(avisoId, router);
    avisosLidos.value = [];
    showHistory.value = false;
}

async function saveAviso() {
  errorAviso.value = null;
  if (!tituloAviso.value || !conteudoAviso.value) {
    errorAviso.value = "Título e conteúdo são obrigatórios.";
    return;
  }
  isSubmittingAviso.value = true;
  const avisoData = {
    titulo: tituloAviso.value,
    conteudo: conteudoAviso.value,
    status: statusAviso.value,
    relevancia: relevanciaAviso.value,
    tipoAtividade: user.value.modality 
  };
  try {
    if (editingAvisoId.value) {
      await axios.put(`http://localhost:8080/api/avisos/${editingAvisoId.value}`, avisoData, getAuthHeaders());
    } else {
      await axios.post('http://localhost:8080/api/avisos', avisoData, getAuthHeaders());
    }
    resetForm();
    await fetchInitialData(router);
  } catch (e) {
    errorAviso.value = e.response?.data?.message || "Erro ao salvar o aviso.";
    console.error(e);
  } finally {
    isSubmittingAviso.value = false;
  }
}

async function deleteAviso(avisoId) {
  if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
  try {
    await axios.delete(`http://localhost:8080/api/avisos/${avisoId}`, getAuthHeaders());
    await fetchInitialData(router);
  } catch (e) {
    errorAviso.value = "Falha ao excluir o aviso.";
  }
}

function resetForm() {
    editingAvisoId.value = null;
    tituloAviso.value = '';
    conteudoAviso.value = '';
    statusAviso.value = 'NORMAL';
    relevanciaAviso.value = 'OUTROS';
    errorAviso.value = null;
}
function editAviso(aviso) {
    editingAvisoId.value = aviso.id;
    tituloAviso.value = aviso.titulo;
    conteudoAviso.value = aviso.conteudo;
    statusAviso.value = aviso.status;
    relevanciaAviso.value = aviso.relevancia;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
const getStatusClass = (status) => `status-${status?.toLowerCase() || 'normal'}`;
const getRelevanciaClass = (relevancia) => `relevancia-${relevancia?.toLowerCase().replace(/_/g, '-') || 'outros'}`;
const getTipoAtividadeClass = (tipo) => `tipo-${tipo?.toLowerCase().replace(/_/g, '-') || 'ensino'}`;
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>📢 Central de Avisos</h1>
      <p>Fique por dentro de todas as novidades e comunicados importantes.</p>
    </header>
    <div v-if="user.role?.toUpperCase() === 'PROFESSOR'" class="card form-section">
      <h2>{{ editingAvisoId ? 'Editar Aviso' : 'Publicar Novo Aviso' }}</h2>
      <form @submit.prevent="saveAviso">
        <div class="form-group"><label for="tituloAviso">Título:</label><input type="text" id="tituloAviso" v-model="tituloAviso" required></div>
        <div class="form-group"><label for="conteudoAviso">Conteúdo:</label><textarea id="conteudoAviso" v-model="conteudoAviso" rows="4" required></textarea></div>
        <div class="form-grid-2"> 
          <div class="form-group"><label for="statusAviso">Prioridade:</label><select id="statusAviso" v-model="statusAviso"><option v-for="s in statusDeAviso" :key="s" :value="s">{{ s }}</option></select></div>
          <div class="form-group"><label for="relevanciaAviso">Categoria:</label><select id="relevanciaAviso" v-model="relevanciaAviso"><option v-for="r in relevanciasDeAviso" :key="r" :value="r">{{ r.replace('_', ' ') }}</option></select></div>
        </div>
        <div v-if="errorAviso" class="mensagem erro">{{ errorAviso }}</div>
        <div class="form-actions">
          <button type="button" class="button-cancel" @click="resetForm" v-if="editingAvisoId">Cancelar</button>
          <button type="submit" :disabled="isSubmittingAviso">{{ isSubmittingAviso ? 'Salvando...' : (editingAvisoId ? 'Salvar Alterações' : 'Publicar Aviso') }}</button>
        </div>
      </form>
    </div>
    
    <!-- Tela de Carregamento -->
    <div v-if="!store.isInitialDataLoaded" class="loading-message">Carregando avisos...</div>
    
    <!-- Conteúdo Principal Após Carregamento -->
    <div v-else>
      <!-- Seção de Novos Avisos -->
      <section class="avisos-section" v-if="avisosNaoLidos.length > 0">
        <h2>Novos Avisos</h2>
        <div class="aviso-card" v-for="aviso in avisosNaoLidos" :key="aviso.id">
           <div class="aviso-header">
               <div class="aviso-tags">
                   <span class="tag" :class="getTipoAtividadeClass(aviso.tipoAtividade)">{{ aviso.tipoAtividade.replace(/_/g, ' ') }}</span>
                   <span class="tag" :class="getStatusClass(aviso.status)">{{ aviso.status }}</span>
                   <span class="tag" :class="getRelevanciaClass(aviso.relevancia)">{{ aviso.relevancia.replace(/_/g, ' ') }}</span>
               </div>
               <span class="aviso-data">{{ formatarData(aviso.dataPublicacao) }}</span>
           </div>
           <div class="aviso-body">
               <h3>{{ aviso.titulo }}</h3>
               <p v-html="aviso.conteudo.replace(/\n/g, '<br>')"></p>
           </div>
           <div class="aviso-footer">
               <span class="aviso-autor">Publicado por: <strong>{{ aviso.autorNome || 'Professor(a)' }}</strong></span>
               <div class="aviso-actions">
                   <button v-if="user.role?.toUpperCase() === 'ALUNO'" @click="handleMarcarComoLido(aviso.id)" class="button-marcar-lido">Marcar como lido</button>
                   <div v-if="user.role?.toUpperCase() === 'PROFESSOR'" class="professor-actions">
                       <button @click="editAviso(aviso)" class="button-edit">Editar</button>
                       <button @click="deleteAviso(aviso.id)" class="button-delete">Excluir</button>
                   </div>
               </div>
           </div>
        </div>
      </section>
      
      <!-- Mensagem para quando não há novos avisos -->
      <div v-if="avisosNaoLidos.length === 0" class="card empty-state">
          <p>Você está em dia! Nenhum aviso novo.</p>
      </div>
      
      <!-- Botão de Histórico (apenas para alunos) -->
      <div class="history-toggle" v-if="user.role?.toUpperCase() === 'ALUNO'">
        <button @click="toggleHistory" :disabled="isLoadingHistory">
          <span v-if="isLoadingHistory">Carregando...</span>
          <span v-else>{{ showHistory ? 'Ocultar Histórico' : 'Ver Avisos Lidos' }}</span>
        </button>
      </div>
      
      <!-- Seção de Histórico (mostrada ao clicar no botão) -->
      <section class="avisos-section" v-if="showHistory">
        <h2>Histórico de Avisos Lidos</h2>
        <div v-if="avisosLidos.length === 0 && !isLoadingHistory" class="empty-state-text"><p>Seu histórico de avisos lidos está vazio.</p></div>
        <div class="aviso-card lido" v-for="aviso in avisosLidos" :key="aviso.id">
           <div class="aviso-header">
               <div class="aviso-tags">
                   <span class="tag" :class="getTipoAtividadeClass(aviso.tipoAtividade)">{{ aviso.tipoAtividade.replace(/_/g, ' ') }}</span>
                   <span class="tag" :class="getStatusClass(aviso.status)">{{ aviso.status }}</span>
                   <span class="tag" :class="getRelevanciaClass(aviso.relevancia)">{{ aviso.relevancia.replace(/_/g, ' ') }}</span>
               </div>
               <span class="aviso-data">{{ formatarData(aviso.dataPublicacao) }}</span>
           </div>
           <div class="aviso-body">
               <h3>{{ aviso.titulo }}</h3>
               <p v-html="aviso.conteudo.replace(/\n/g, '<br>')"></p>
           </div>
           <div class="aviso-footer">
               <span class="aviso-lido-indicator">✔ Lido</span>
               <span class="aviso-autor">Publicado por: <strong>{{ aviso.autorNome || 'Professor(a)' }}</strong></span>
               <div v-if="user.role?.toUpperCase() === 'PROFESSOR'" class="professor-actions">
                   <button @click="editAviso(aviso)" class="button-edit">Editar</button>
                   <button @click="deleteAviso(aviso.id)" class="button-delete">Excluir</button>
               </div>
           </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
:root {
    --cor-principal: #c17c86;
    --cor-destaque: #e9a2ac;
    --cor-texto: #333;
    --cor-cinza: #6c757d;
    --cor-branco: #ffffff;
    --cor-sucesso: #28a745;
    --cor-aviso: #ffc107;
    --cor-perigo: #dc3545;
}
.page-container { max-width: 900px; margin: 0 auto; padding: 1.5rem; font-family: 'Poppins', sans-serif; }
.page-header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: var(--cor-destaque); }
.page-header p { color: var(--cor-texto); margin-bottom: 2rem; }
.loading-message, .empty-state { text-align: center; padding: 2rem; background: var(--cor-branco); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.07); margin-bottom: 1rem;}
.card { background: var(--cor-branco); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
.form-section { padding: 2rem; margin-bottom: 2rem; }
.form-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
input[type="text"], select, textarea { width: 100%; padding: 0.75rem; font-family: inherit; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; box-sizing: border-box; }
.form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.mensagem { margin-top: 1.5rem; padding: 0.8rem; border-radius: 8px; font-weight: 500; }
.mensagem.erro { background-color: #f8d7da; color: #721c24; }
.avisos-section { margin-top: 2rem; }
.avisos-section h2 { font-size: 1.5rem; color: var(--cor-destaque); border-bottom: 2px solid var(--cor-principal); padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
.aviso-card { background: var(--cor-branco); border-left: 5px solid var(--cor-principal); padding: 1.5rem; margin-bottom: 1rem; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
.aviso-card.lido { border-left-color: var(--cor-sucesso); opacity: 0.9; }
.aviso-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem; }
.aviso-data { color: var(--cor-cinza); font-size: 0.85rem; white-space: nowrap; }
.aviso-body h3 { margin: 0 0 0.75rem 0; font-size: 1.25rem; color: #333; }
.aviso-body p { margin: 0 0 1rem 0; line-height: 1.6; white-space: pre-wrap; overflow-wrap: break-word; }
.aviso-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-top: 1px solid #f0f0f0; padding-top: 1rem; margin-top: 1rem; }
.aviso-autor { font-size: 0.9rem; color: #777; }
.aviso-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag { padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.75rem; font-weight: 600; color: white; text-transform: uppercase; }
.tag.status-normal { background-color: #17a2b8; }
.tag.status-importante { background-color: #ffc107; color: #212529; }
.tag.status-urgente { background-color: #dc3545; }
.tag.relevancia-carga-horaria { background-color: #6f42c1; }
.tag.relevancia-certificados { background-color: #28a745; }
.tag.relevancia-duvidas { background-color: #fd7e14; }
.tag.relevancia-outros { background-color: #6c757d; }
.tag.tipo-ensino { background-color: #007bff; }
.tag.tipo-pesquisa { background-color: #6610f2; }
.tag.tipo-extensao { background-color: #20c997; }
.tag.tipo-gestao-representacao { background-color: #343a40; }
button { border-radius: 8px; cursor: pointer; transition: all 0.2s ease; font-weight: 600; padding: 0.75rem 1.5rem; border: none; }
button[type="submit"] { background-color: var(--cor-destaque); color: white; }
button[type="submit"]:hover { background-color: var(--cor-principal); }
.button-cancel { background-color: #6c757d; color: white; }
.aviso-actions { display: flex; gap: 0.75rem; }
.aviso-actions button { padding: 0.6rem 1.2rem; font-size: 0.9rem; color: white; }
.button-marcar-lido { background-color: var(--cor-destaque); }
.button-marcar-lido:hover { background-color: var(--cor-principal); transform: translateY(-2px); }
.button-edit { background-color: var(--cor-aviso); color: #212529; }
.button-delete { background-color: var(--cor-perigo); }
.aviso-lido-indicator { color: var(--cor-sucesso); font-weight: 600; font-size: 0.9rem; }
.history-toggle { text-align: center; margin: 2rem 0 1rem 0; }
.history-toggle button { background-color: var(--cor-destaque); color: white; } /* COR ATUALIZADA */
.history-toggle button:hover { filter: brightness(1.1); }
.history-toggle button:disabled { background-color: #aaa; cursor: not-allowed; }
.empty-state-text { color: #777; text-align: center; padding: 1rem; }
</style>

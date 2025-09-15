<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { store } from '../components/js/store.js';

const router = useRouter();
const historico = ref([]);
const isLoading = ref(true);
const error = ref(null);

const getAuthHeaders = () => {
  if (!store.user.isLoggedIn) {
    router.push('/login');
    throw new Error('Usuário não autenticado.');
  }
  return { headers: { Authorization: `Bearer ${store.user.token}` } };
};

// --- FUNÇÕES DE FORMATAÇÃO E ESTILO (MAIS ROBUSTAS) ---

const getStatusClass = (status) => {
  if (status === 'APROVADO') return 'status-aprovado';
  if (status === 'REPROVADO' || status === 'REVISAO_NECESSARIA') return 'status-reprovado';
  return 'status-pendente';
};

const getStatusText = (status) => {
    if (!status) return '';
    return status.replace('_', ' ');
}

// CORREÇÃO: Função segura para formatar datas, evitando erros com valores nulos.
const formatarData = (data) => {
    if (!data) {
        return 'N/A'; // Retorna 'Não aplicável' se a data for nula
    }
    // Adiciona verificação para garantir que a data é válida antes de formatar
    try {
        const d = new Date(data);
        if (isNaN(d.getTime())) return "Data inválida";
        return d.toLocaleDateString('pt-BR');
    } catch (e) {
        return "Erro na data";
    }
};

// --- PROPRIEDADE COMPUTADA PARA O CABEÇALHO ---
const totalRevisado = computed(() => historico.value.length);


onMounted(async () => {
  if (store.user.role !== 'PROFESSOR') {
    router.push('/home');
    return;
  }
  try {
    const response = await axios.get('http://localhost:8080/api/certificados/revisao/historico', getAuthHeaders());
    historico.value = response.data;
  } catch (e) {
    console.error("Erro ao buscar histórico de revisões:", e);
    error.value = "Não foi possível carregar o histórico. Tente novamente mais tarde.";
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>Histórico de Revisões</h1>
      <p>Você já avaliou um total de {{ totalRevisado }} certificado(s).</p>
    </header>

    <div v-if="isLoading" class="loading-message">Carregando histórico...</div>
    <div v-if="error" class="mensagem erro">{{ error }}</div>
    
    <div v-if="!isLoading && historico.length === 0 && !error" class="card empty-state">
        <p>Você ainda não revisou nenhum certificado.</p>
    </div>

    <div v-if="historico.length > 0" class="card">
        <ul class="history-list">
            <li v-for="cert in historico" :key="cert.id" class="history-item">
                <div class="cert-info">
                    <!-- ADIÇÃO: Container da imagem do certificado -->
                    <div class="cert-image-container">
                      <a v-if="cert.fotoBase64" :href="cert.fotoBase64" target="_blank" title="Clique para abrir imagem">
                        <img :src="cert.fotoBase64" alt="Comprovante" class="cert-image">
                      </a>
                      <div v-else class="no-image-placeholder">Sem Imagem</div>
                    </div>

                    <div class="cert-details">
                        <h3>{{ cert.titulo }}</h3>
                        <p><strong>Aluno:</strong> {{ cert.usuarioNome }}</p>
                        <p v-if="cert.usuarioMatricula"><strong>Matrícula:</strong> {{ cert.usuarioMatricula }}</p>
                        <p><strong>Carga Horária:</strong> {{ cert.cargaHoraria }} horas</p>
                        <p><strong>Data da Revisão:</strong> {{ formatarData(cert.dataRevisao) }}</p>
                    </div>
                    <div class="cert-status">
                        <span :class="['status-badge', getStatusClass(cert.status)]">
                            {{ getStatusText(cert.status) }}
                        </span>
                    </div>
                </div>
                 <div v-if="cert.observacoesProfessor" class="observation-box">
                    <strong>Sua Observação:</strong>
                    <p>{{ cert.observacoesProfessor }}</p>
                </div>
            </li>
        </ul>
    </div>
  </div>
</template>

<style scoped>
.page-container { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
.page-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
.page-header p { font-size: 1rem; color: #666; margin-bottom: 2rem; }
.card { background-color: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); padding: 1.5rem; }
.loading-message, .empty-state { text-align: center; padding: 2rem; font-size: 1.2rem; }
.mensagem.erro { color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }

.history-list { list-style: none; padding: 0; margin: 0; }
.history-item { padding: 1.5rem; border-bottom: 1px solid #f0f0f0; transition: background-color 0.3s ease; border-radius: 8px; }
.history-item:hover { background-color: #fafafa; }
.history-item:last-child { border-bottom: none; }

.cert-info {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    flex-wrap: nowrap;
}

/* --- ESTILOS ADICIONADOS PARA A IMAGEM --- */
.cert-image-container {
    flex-shrink: 0;
    width: 100px;
    height: 70px;
}
.cert-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #eee;
    transition: transform 0.3s ease;
}
.cert-image:hover {
    transform: scale(1.05);
}
.no-image-placeholder {
    width: 100%;
    height: 100%;
    background-color: #f0f0f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: #999;
}
/* --- FIM DOS ESTILOS DA IMAGEM --- */


.cert-details { 
    flex-grow: 1; 
}
.cert-details h3 { margin: 0 0 0.75rem 0; font-size: 1.1rem; color: #333; }
.cert-details p { margin: 0.3rem 0; color: #555; font-size: 0.9rem; }
.cert-status { flex-shrink: 0; margin-top: 4px; }
.status-badge { padding: 0.35em 0.75em; border-radius: 20px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; color: #fff; }
.status-aprovado { background-color: #28a745; }
.status-reprovado { background-color: #dc3545; }
.observation-box { margin-top: 1rem; padding: 1rem; background-color: #f8f9fa; border-radius: 8px; font-size: 0.9rem; border-left: 3px solid #6a8d73; }
.observation-box strong { display: block; margin-bottom: 0.5rem; color: #333; }
.observation-box p { margin: 0; color: #555; white-space: pre-wrap; }

@media (max-width: 600px) {
    .cert-info {
        flex-direction: column;
    }
}
</style>


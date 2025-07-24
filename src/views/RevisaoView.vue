<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { store, fetchInitialData } from '../components/js/store.js';

const router = useRouter();
const error = ref(null);
const success = ref(null);
const observacoes = ref({});

const certificadosParaRevisar = computed(() => store.certificadosParaRevisar);

const getAuthHeaders = () => {
  if (!store.user.isLoggedIn) {
    router.push('/login');
    throw new Error('Usuário não autenticado.');
  }
  return { headers: { Authorization: `Bearer ${store.user.token}` } };
};

async function submitReview(certId, novoStatus) {
  error.value = null;
  success.value = null;
  const obsText = observacoes.value[certId] || '';

  if (novoStatus === 'REPROVADO' && !obsText.trim()) {
    error.value = 'Para REPROVAR um certificado, é obrigatório adicionar uma observação.';
    return;
  }

  try {
    await axios.put(`http://localhost:8080/api/certificados/${certId}/revisar`, {
      observacoesProfessor: obsText,
      status: novoStatus
    }, getAuthHeaders());
    
    success.value = 'Revisão enviada com sucesso!';
    setTimeout(() => success.value = null, 3000);

    await fetchInitialData(router);

  } catch (e) {
    console.error("Erro ao enviar revisão:", e);
    error.value = e.response?.data?.message || 'Erro ao enviar revisão. Tente novamente.';
  }
}

onMounted(() => {
  if (store.user.role !== 'PROFESSOR') {
    router.push('/home');
  }
});
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>Revisão de Certificados</h1>
      <p>Certificados pendentes da sua modalidade: <strong>{{ store.user.modality || 'Não definida' }}</strong></p>
    </header>

    <div v-if="success" class="mensagem sucesso">{{ success }}</div>
    <div v-if="error" class="mensagem erro">{{ error }}</div>

    <div v-if="!store.isInitialDataLoaded" class="loading-message">Carregando certificados...</div>

    <div v-else-if="certificadosParaRevisar.length === 0" class="card empty-state">
        <p>🎉 Nenhum certificado pendente para revisão nesta modalidade no momento.</p>
    </div>

    <div v-else>
      <div v-for="cert in certificadosParaRevisar" :key="cert.id" class="card certificate-card">
        
        <div class="card-content">
            <div class="cert-image-container">
              <a v-if="cert.fotoBase64" :href="cert.fotoBase64" target="_blank" title="Clique para abrir em nova aba">
                <img :src="cert.fotoBase64" alt="click" class="cert-image">
              </a>
              <div v-else class="no-image-placeholder">Sem Imagem</div>
            </div>
            <div class="cert-details">
              <h3>{{ cert.titulo }}</h3>
              <p><strong>Aluno:</strong> {{ cert.alunoNome || 'Não informado' }}</p>
              <p><strong>Carga Horária:</strong> {{ cert.cargaHoraria }} horas</p>
              <p><strong>Data de Envio:</strong> {{ new Date(cert.dataEnvio).toLocaleDateString('pt-BR') }}</p>
            </div>
        </div>
        
        <div class="observation-section">
          <label :for="'obs-' + cert.id">Observações (obrigatório para reprovar):</label>
          <textarea :id="'obs-' + cert.id" v-model="observacoes[cert.id]" placeholder="Adicione suas observações..."></textarea>
          <div class="review-actions">
            <button @click="submitReview(cert.id, 'REPROVADO')" class="btn-action btn-reject">Reprovar</button>
            <button @click="submitReview(cert.id, 'APROVADO')" class="btn-action btn-approve">Aprovar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
.page-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
.page-header p { font-size: 1rem; color: #666; margin-bottom: 2rem; }
.card { background-color: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1.5rem; }
.loading-message, .empty-state { text-align: center; padding: 2rem; font-size: 1.2rem; }
.certificate-card { display: flex; flex-direction: column; gap: 1rem; }
.card-content { display: flex; flex-direction: column; gap: 1.5rem; }
.cert-image-container { width: 100%; max-width: 200px; align-self: center; flex-shrink: 0; }
.cert-image-container a { display: block; }
.cert-image { width: 100%; border-radius: 8px; border: 1px solid #eee; transition: transform 0.3s ease; }
.cert-image:hover { transform: scale(1.05); }
.no-image-placeholder { width: 100%; height: 120px; background-color: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; }
.cert-details { flex-grow: 1; }
.cert-details h3 { margin: 0 0 0.75rem 0; font-size: 1.2rem; color: #333; }
.cert-details p { margin: 0.4rem 0; color: #555; }
.observation-section { border-top: 1px solid #f0f0f0; padding-top: 1.5rem; margin-top: 1rem; }
.observation-section label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
.observation-section textarea { width: 100%; min-height: 80px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; resize: vertical; }
.review-actions { display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: flex-end; }
.btn-action { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: white; }
.btn-approve { background-color: #E9A2AC; }
.btn-approve:hover { background-color: #d68fa0; }
.btn-reject { background-color: #6c757d; }
.btn-reject:hover { background-color: #5a6268; }
.mensagem { margin-bottom: 1rem; padding: 10px; border-radius: 4px; text-align: center; }
.sucesso { color: #155724; background-color: #d4edda; border-color: #c3e6cb; }
.erro { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }

@media (min-width: 768px) {
  .page-header h1 { font-size: 2.5rem; }
  .card-content { flex-direction: row; }
  .cert-image-container { align-self: flex-start; }
}
</style>
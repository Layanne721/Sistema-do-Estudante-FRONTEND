<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { store, fetchInitialData } from '../components/js/store.js';
import AvatarSelectorModal from '@/components/AvatarSelectorModal.vue';
// --- Importações para o Gráfico (Visão do Aluno) ---
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const router = useRouter();
const API_BASE_URL = 'http://localhost:8080/api/certificados';

const progresso = ref(null);

const getAuthHeaders = () => {
  if (!store.user.token) {
    throw new Error('Usuário não autenticado');
  }
  return { headers: { Authorization: `Bearer ${store.user.token}` } };
};

// --- Lógica para buscar dados do Dashboard ---
const fetchProgresso = async () => {
  if (store.user.role !== 'ALUNO') return;
  try {
    const response = await axios.get(`${API_BASE_URL}/meus/progresso`, getAuthHeaders());
    progresso.value = response.data;
  } catch (e) {
    console.error("Erro ao buscar progresso para o dashboard", e);
  }
};

// --- Computed Properties para a Visão do Aluno ---
const totalHorasValidadas = computed(() => progresso.value?.totalHorasValidadas ?? 0);
const metaHoras = computed(() => progresso.value?.metaHoras ?? 200);
const totalCertificadosValidados = computed(() => store.certificados.filter(c => c.status === 'APROVADO').length);

const progressoPercentual = computed(() => {
  if (metaHoras.value === 0) return 0;
  const percentage = (totalHorasValidadas.value / metaHoras.value) * 100;
  return Math.min(percentage, 100);
});

const metaConcluida = computed(() => totalHorasValidadas.value >= metaHoras.value);

// --- Computed Properties para a Visão do Professor ---
const pendingReviewCount = computed(() => store.certificadosParaRevisar.length);
const studentCount = computed(() => new Set(store.certificadosParaRevisar.map(cert => cert.usuarioId)).size);

const proximoEvento = computed(() => {
  if (store.avisos.length > 0) {
    // Retorna o aviso mais recente
    return store.avisos.slice().sort((a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao))[0];
  }
  // Retorna um objeto padrão se não houver avisos
  return { titulo: 'Nenhum aviso recente', dataPublicacao: null };
});

// --- Computed Properties Gerais ---
const formatarData = (data) => {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const atividadesRecentes = computed(() => {
  let atividades = [];
  if (store.user.role === 'ALUNO') {
    const atividadesCertificados = store.certificados.map(c => ({
      id: `cert-${c.id}`,
      data: c.dataRevisao || c.dataEnvio,
      descricao: c.status === 'APROVADO' ? `Certificado "${c.titulo}" foi APROVADO.` :
        c.status === 'REPROVADO' ? `Certificado "${c.titulo}" foi REPROVADO.` :
        `Você enviou o certificado "${c.titulo}".`
    }));
    const atividadesAvisos = store.avisos.map(a => ({
      id: `aviso-${a.id}`,
      data: a.dataPublicacao,
      descricao: `Novo aviso de ${a.modalidadeNome || 'Sistema'}: "${a.titulo}"`
    }));
    atividades = [...atividadesCertificados, ...atividadesAvisos];
  } else if (store.user.role === 'PROFESSOR') {
    atividades = store.certificadosParaRevisar.map(c => ({
      id: `cert-${c.id}`,
      data: c.dataEnvio,
      descricao: `Novo envio de ${c.usuarioNome || 'Aluno'}: "${c.titulo}".`
    }));
  }

  return atividades
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 5);
});

// --- Lógica para o Gráfico de Pizza (Visão do Aluno) ---
const dadosDoGrafico = computed(() => {
  if (!progresso.value || !progresso.value.progressoPorCategoria) {
    return null;
  }
  const categorias = progresso.value.progressoPorCategoria;
  const labels = Object.keys(categorias);
  const data = labels.map(label => categorias[label]?.horasValidadas ?? 0);

  if (data.every(item => item === 0)) {
    return null;
  }

  return {
    labels: labels,
    datasets: [
      {
        backgroundColor: ['#E9A2AC', '#6A8D73', '#F3D5A3', '#A0C1D1', '#C3A5D1'],
        data: data,
        hoverOffset: 10
      },
    ],
  };
});

const opcoesDoGrafico = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
    title: {
      display: true,
      text: 'Distribuição de Horas por Modalidade',
      font: { size: 16 }
    },
  },
});

// --- Dados da Equipe de Desenvolvedores ---
const teamMembers = ref([
  { name: 'Aliandra Lopes', id: 'liandra', imageUrl: 'https://i.ibb.co/KxfhXDkY/1.png' },
  { name: 'Izabel Yasmin', id: 'izabel', imageUrl: 'https://i.ibb.co/rG2QNDfG/2.png' },
  { name: 'Layanne Caetano', id: 'layanne', imageUrl: 'https://i.ibb.co/ZpHVKfHG/3.png' },
  { name: 'Sarah Cristina', id: 'sarah', imageUrl: 'https://i.ibb.co/wZt5cqR6/4.png' }
]);

// --- Ciclo de Vida do Componente ---
onMounted(async () => {
  if (!store.isInitialDataLoaded) {
    await fetchInitialData(router);
  }
  // Apenas busca o progresso se for aluno, professor não precisa
  if (store.user.role === 'ALUNO') {
      await fetchProgresso();
  }
});
</script>

<template>
  <div class="page-container">
    <!-- Card de Perfil do Usuário -->
    <div class="user-profile-card">
      <div class="profile-icon">
        <span v-if="store.user.role === 'PROFESSOR'">🧑‍🏫</span>
        <span v-else>🎓</span>
      </div>
      <div class="profile-info">
        <h2 class="profile-name">{{ store.user.name }}</h2>
        <p v-if="store.user.role === 'PROFESSOR'" class="profile-role">Docente | Modalidade: {{ store.user.modality }}</p>
        <p v-else class="profile-role">Discente</p>
      </div>
    </div>

    <header class="page-header">
      <h1>Meu Painel</h1>
      <p>Acompanhe seu progresso e atividades recentes.</p>
    </header>

    <div v-if="!store.isInitialDataLoaded" class="loading-state">Carregando dados do painel...</div>

    <div v-else class="dashboard-content">

      <!-- ==================================================== -->
      <!-- ============== PAINEL DO PROFESSOR ================= -->
      <!-- ==================================================== -->
      <div v-if="store.user.role === 'PROFESSOR'" class="professor-dashboard-grid">
        
        <!-- Card 1: Certificados Pendentes -->
        <div class="widget card interactive-widget" @click="router.push('/revisao')">
          <div class="widget-icon">📬</div>
          <h3>Certificados Pendentes</h3>
          <p class="widget-value">{{ pendingReviewCount }}</p>
          <span class="widget-cta">Revisar agora &rarr;</span>
        </div>

        <!-- Card 2: Alunos Distintos -->
        <div class="widget card">
          <div class="widget-icon">👥</div>
          <h3>Alunos Distintos</h3>
          <p class="widget-value">{{ studentCount }}</p>
          <span class="widget-description">Enviaram certificados</span>
        </div>

        <!-- Card 3: Último Aviso -->
        <div class="widget card">
          <div class="widget-icon">📢</div>
          <h3>Último Aviso</h3>
          <p class="widget-title">{{ proximoEvento.titulo }}</p>
          <span v-if="proximoEvento.dataPublicacao" class="widget-description">
            Em {{ formatarData(proximoEvento.dataPublicacao) }}
          </span>
        </div>

        <!-- Card 4: Atividades Recentes (Largura Total) -->
        <div class="card recent-activity">
          <h2>Atividades Recentes</h2>
          <ul v-if="atividadesRecentes.length > 0">
            <li v-for="atividade in atividadesRecentes" :key="atividade.id">
              <strong>{{ formatarData(atividade.data) }}:</strong> {{ atividade.descricao }}
            </li>
          </ul>
          <p v-else>Nenhuma atividade recente para mostrar.</p>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- ================ PAINEL DO ALUNO =================== -->
      <!-- ==================================================== -->
      <div v-if="store.user.role === 'ALUNO'" class="aluno-dashboard-grid">
        <main class="main-column">
          <!-- Widget de Progresso -->
          <div class="card progress-widget">
            <div class="progress-header">
              <h2>Seu Progresso de Horas</h2>
              <span v-if="metaConcluida" class="status-concluido">Concluído! 🎉</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: progressoPercentual + '%' }">
                <span>{{ progressoPercentual.toFixed(0) }}%</span>
              </div>
            </div>
            <div class="progress-details">
              <div class="detail-item">
                <span>Horas Validadas</span>
                <strong>{{ totalHorasValidadas }} / {{ metaHoras }}h</strong>
              </div>
              <div class="detail-item">
                <span>Certificados Validados</span>
                <strong>{{ totalCertificadosValidados }}</strong>
              </div>
            </div>
          </div>
          <!-- Atividades Recentes -->
          <div class="card recent-activity">
            <h2>Atividades Recentes</h2>
            <ul v-if="atividadesRecentes.length > 0">
              <li v-for="atividade in atividadesRecentes" :key="atividade.id">
                <strong>{{ formatarData(atividade.data) }}:</strong> {{ atividade.descricao }}
              </li>
            </ul>
            <p v-else>Nenhuma atividade recente para mostrar.</p>
          </div>
        </main>
        <aside class="sidebar-column">
          <!-- Gráfico de Pizza -->
          <div class="card chart-card">
            <div v-if="dadosDoGrafico" class="chart-container">
              <Doughnut :data="dadosDoGrafico" :options="opcoesDoGrafico" />
            </div>
            <div v-else class="no-chart-data">
              <p>📊</p>
              <p>O gráfico de horas aparecerá aqui assim que seus primeiros certificados forem aprovados.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Seção da Equipe de Desenvolvedores -->
    <section class="team-section">
      <h2>Desenvolvedores</h2>
      <div class="team-members-grid">
        <div v-for="member in teamMembers" :key="member.id" class="team-member-card">
          <div class="member-image-placeholder" tabindex="0" role="button" :aria-label="`Ver perfil de ${member.name}`">
            <img :src="member.imageUrl" :alt="member.name" class="member-image" />
          </div>
          <p class="member-name">{{ member.name }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Estilos Gerais */
.page-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
}

.card {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #f0d8db;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.page-header h1 { font-size: 2rem; margin: 0 0 0.25rem 0; color: #333; }
.page-header p { margin: 0 0 1.5rem 0; font-size: 1rem; color: #666; }

.loading-state { text-align: center; padding: 2rem; color: #666; }

/* Card de Perfil */
.user-profile-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #fdebed, #f8c0c8);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  color: #8c5b62;
}
.profile-icon { font-size: 2.5rem; }
.profile-info { 
  line-height: 1.3;
  min-width: 0; /* Permite que o container encolha para quebrar o texto */
}
.profile-name { 
  margin: 0; 
  font-size: 1.3rem; 
  font-weight: 600; 
  color: #7c4d54;
  overflow-wrap: break-word; /* Quebra palavras longas para evitar overflow */
}
.profile-role { margin: 0; font-size: 0.9rem; }

/* =========================================== */
/* ========== LAYOUT PAINEL PROFESSOR ======== */
/* =========================================== */
.professor-dashboard-grid {
  display: grid;
  /* Cria colunas responsivas. Em telas pequenas, elas quebram para uma única coluna. */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Em telas maiores (desktops), força o layout de 3 colunas */
@media (min-width: 992px) {
  .professor-dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Estilos dos Widgets do Professor */
.widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.widget.interactive-widget {
  cursor: pointer;
}

.widget.interactive-widget:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(193, 124, 134, 0.2);
}

.widget-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  line-height: 1;
}

.widget h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #555;
}

.widget .widget-value {
  font-size: 3.5rem;
  font-weight: 700;
  color: #c17c86;
  margin: 0;
  line-height: 1;
}

.widget .widget-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0.5rem 0;
  /* Garante que o texto não quebre e ocupe muito espaço */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 2.5rem; /* Altura para duas linhas */
}

.widget .widget-description {
  font-size: 0.85rem;
  color: #777;
  margin-top: 0.5rem;
}

.widget .widget-cta {
  margin-top: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #c17c86;
}

/* Card de Atividades Recentes (para ambas as visões) */
.recent-activity {
  /* No grid do professor, este card ocupará a largura total */
  grid-column: 1 / -1;
}
.recent-activity h2 { font-size: 1.3rem; margin-top: 0; margin-bottom: 1rem; color: #333; }
.recent-activity ul { list-style: none; padding: 0; margin: 0; }
.recent-activity li { 
    padding: 0.75rem 0; 
    border-bottom: 1px solid #eee; 
    font-size: 0.9rem; 
    color: #555;
}
.recent-activity li:last-child { border-bottom: none; }
.recent-activity strong { color: #333; }


/* =========================================== */
/* =========== LAYOUT PAINEL ALUNO =========== */
/* =========================================== */
.aluno-dashboard-grid {
  display: grid;
  grid-template-columns: 1fr; /* Uma coluna por padrão */
  gap: 1.5rem;
}
.main-column, .sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
@media (min-width: 768px) {
  .aluno-dashboard-grid {
    grid-template-columns: 2fr 1fr; /* Coluna principal 2x maior que a lateral */
  }
}

/* Widget de Progresso do Aluno */
.progress-widget { padding: 1.5rem; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.progress-header h2 { margin: 0; font-size: 1.1rem; color: #333; }
.status-concluido { background-color: #28a745; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.progress-bar-container { background-color: #e9ecef; border-radius: 10px; height: 24px; overflow: hidden; margin-bottom: 1rem; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #e9a2ac, #c17c86); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8rem; transition: width 0.5s ease-in-out; }
.progress-details { display: flex; justify-content: space-around; padding-top: 1rem; border-top: 1px solid #eee; margin-top: 1rem; }
.detail-item { display: flex; flex-direction: column; align-items: center; }
.detail-item span { font-size: 0.85rem; color: #666; }
.detail-item strong { font-size: 1.1rem; color: #333; }

/* Card do Gráfico */
.chart-card { height: 100%; min-height: 320px; display: flex; flex-direction: column; }
.chart-container { position: relative; height: 100%; flex-grow: 1; }
.no-chart-data { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%; color: #888; flex-grow: 1; }
.no-chart-data p:first-child { font-size: 2.5rem; margin: 0; }
.no-chart-data p { margin: 0.5rem 0; max-width: 80%; font-size: 0.9rem; }

/* =========================================== */
/* ======== SEÇÃO DESENVOLVEDORES ========== */
/* =========================================== */
.team-section {
  margin-top: 4rem;
  text-align: center;
}
.team-section h2 {
  font-size: 1.8rem;
  color: #7c4d54;
  margin-bottom: 2.5rem;
  font-weight: 700;
}
.team-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 2rem;
  justify-items: center;
}
.team-member-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 160px;
}
.member-image-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #c17c86;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}
.member-image-placeholder:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}
.member-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.member-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}
</style>

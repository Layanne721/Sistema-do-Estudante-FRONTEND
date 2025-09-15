<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { store, fetchInitialData } from '../components/js/store.js';

// --- Importações para geração de PDF no front-end ---
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const router = useRouter();
const API_BASE_URL = 'http://localhost:8080/api/certificados';
const NOME_DO_SITE = 'SEE | Sistema do Estudante |LC|';

// --- Estados Gerais ---
const error = ref(null);
const progresso = ref(null);
const modalidades = ref([]);
const subcategorias = ref([]);
const isSubmitting = ref(false); // <-- NOVO ESTADO: Controla o estado de envio

// --- Estados do Formulário ---
const modalidadeSelecionadaId = ref(null);
const subcategoriaSelecionadaId = ref(null);
const loteCertificados = ref([]);
const editingCertId = ref(null);

const getAuthHeaders = () => {
    if (!store.user.isLoggedIn) {
        router.push('/login');
        throw new Error('Token não encontrado.');
    }
    return { headers: { Authorization: `Bearer ${store.user.token}` } };
};

// --- Lógica de Dados e Progresso ---
const fetchProgresso = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/meus/progresso`, getAuthHeaders());
        progresso.value = response.data;
    } catch (e) {
        console.error("Erro ao buscar progresso do aluno", e);
    }
};

const totalHorasValidadas = computed(() => progresso.value?.totalHorasValidadas ?? 0);
const totalHorasBrutas = computed(() => progresso.value?.totalHorasBrutas ?? 0);
const metaHoras = computed(() => progresso.value?.metaHoras ?? 200);
const progressoPercentual = computed(() => {
    if (metaHoras.value === 0) return 0;
    return Math.min((totalHorasValidadas.value / metaHoras.value) * 100, 100);
});
const metaConcluida = computed(() => totalHorasValidadas.value >= metaHoras.value);
const totalCertificadosValidados = computed(() => store.certificados.filter(c => getNormalizedStatus(c.status) === 'APROVADO').length);

// --- Lógica de Modalidades e Subcategorias ---
const fetchModalidades = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/modalidades`, getAuthHeaders());
        modalidades.value = response.data;
    } catch (e) { console.error("Erro ao buscar modalidades", e); }
};

const fetchSubcategorias = async (modId) => {
    subcategoriaSelecionadaId.value = null;
    if (!modId) {
        subcategorias.value = [];
        return;
    }
    try {
        const response = await axios.get(`${API_BASE_URL}/modalidades/${modId}/subcategorias`, getAuthHeaders());
        subcategorias.value = response.data;
    } catch (e) {
        console.error("Erro ao buscar subcategorias", e);
        subcategorias.value = [];
    }
};

watch(modalidadeSelecionadaId, fetchSubcategorias);

// --- Lógica do Formulário (Adicionar, Editar, Enviar) ---
const adicionarCertificadoAoLote = () => {
    loteCertificados.value.push({
        id: Date.now(),
        titulo: '',
        cargaHoraria: null,
        fotoBase64: null,
        fileKey: Date.now(),
    });
};

const removerCertificadoDoLote = (id) => {
    loteCertificados.value = loteCertificados.value.filter(cert => cert.id !== id);
    if (loteCertificados.value.length === 0) {
        adicionarCertificadoAoLote();
    }
};

const handleLoteFileUpload = (event, certId) => {
    const file = event.target.files[0];
    const cert = loteCertificados.value.find(c => c.id === certId);

    if (!file || !cert) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.some(type => file.type.startsWith(type.replace('*', '')))) {
        error.value = `Tipo de arquivo inválido. Por favor, selecione apenas arquivos de imagem (JPG, PNG, etc.) ou PDF.`;
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => { 
        cert.fotoBase64 = e.target.result; 
        error.value = null;
    };
    reader.readAsDataURL(file);
};


const handleSubmit = async () => {
    if (isSubmitting.value) return; // <-- MUDANÇA 1: Previne cliques múltiplos

    error.value = null;
    if (!subcategoriaSelecionadaId.value) {
        error.value = "Selecione a modalidade e a atividade.";
        return;
    }
    if (loteCertificados.value.length === 0) {
        error.value = "Adicione pelo menos um certificado.";
        return;
    }

    for (const [index, cert] of loteCertificados.value.entries()) {
        if (!cert.titulo || !cert.cargaHoraria || cert.cargaHoraria <= 0 || !cert.fotoBase64) {
            error.value = `O Certificado #${index + 1} está incompleto. Todos os campos são obrigatórios.`;
            return;
        }
    }

    isSubmitting.value = true; // <-- MUDANÇA 2: Desabilita o botão

    try {
        if (editingCertId.value) {
            const certParaEditar = loteCertificados.value[0];
            const certificadoDTO = {
                titulo: certParaEditar.titulo,
                cargaHoraria: parseFloat(certParaEditar.cargaHoraria),
                subcategoriaId: subcategoriaSelecionadaId.value,
                fotoBase64: certParaEditar.fotoBase64,
            };
            await axios.put(`${API_BASE_URL}/meus/${editingCertId.value}`, certificadoDTO, getAuthHeaders());
        } else {
            const loteDTO = {
                subcategoriaId: subcategoriaSelecionadaId.value,
                certificados: loteCertificados.value.map(cert => ({
                    titulo: cert.titulo,
                    cargaHoraria: parseFloat(cert.cargaHoraria),
                    fotoBase64: cert.fotoBase64
                }))
            };
            await axios.post(`${API_BASE_URL}/enviar-em-lote`, loteDTO, getAuthHeaders());
        }
        resetForm();
        await fetchInitialData(router);
        await fetchProgresso();
    } catch (e) {
        error.value = e.response?.data?.error || e.response?.data?.message || 'Ocorreu um erro ao enviar.';
    } finally {
        isSubmitting.value = false; // <-- MUDANÇA 3: Reabilita o botão
    }
};

const editCertificado = async (cert) => {
    resetForm();
    editingCertId.value = cert.id;
    const modalidadeDoCertificado = modalidades.value.find(m => m.nome === cert.modalidadeNome);
    if (modalidadeDoCertificado) {
        modalidadeSelecionadaId.value = modalidadeDoCertificado.id;
        await fetchSubcategorias(modalidadeDoCertificado.id);
        const subcategoriaDoCertificado = subcategorias.value.find(s => s.descricao === cert.subcategoriaDescricao);
        if (subcategoriaDoCertificado) {
            subcategoriaSelecionadaId.value = subcategoriaDoCertificado.id;
        }
    }
    loteCertificados.value = [{
        id: cert.id,
        titulo: cert.titulo,
        cargaHoraria: cert.cargaHoraria,
        fotoBase64: cert.fotoBase64,
        fileKey: Date.now()
    }];
    document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
};

const resetForm = () => {
    error.value = null;
    modalidadeSelecionadaId.value = null;
    subcategoriaSelecionadaId.value = null;
    subcategorias.value = [];
    loteCertificados.value = [];
    editingCertId.value = null;
    adicionarCertificadoAoLote();
};

const deleteCertificado = async (cert) => {
    if (confirm('Tem certeza que deseja excluir este certificado?')) {
        try {
            await axios.delete(`${API_BASE_URL}/meus/${cert.id}`, getAuthHeaders());
            await fetchInitialData(router);
            await fetchProgresso();
        } catch (e) {
            error.value = e.response?.data?.message || 'Falha ao excluir.';
        }
    }
};

const gerarCertificado = async () => {
    if (!metaConcluida.value) {
        alert('Você ainda não atingiu a meta de horas para gerar o certificado.');
        return;
    }

    try {
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const padding = 20;
        let yPos = padding;

        const approvedCertificates = store.certificados.filter(c => getNormalizedStatus(c.status) === 'APROVADO');
        
        const logoUrl = 'https://i.ibb.co/BHZck9sk/LOGO.png';

        // --- 1. CAPA E DETALHES (páginas verticais) ---
        if (logoUrl) {
            try {
                const logoImage = new Image();
                logoImage.crossOrigin = 'Anonymous';
                logoImage.src = logoUrl;
                await new Promise(resolve => {
                    logoImage.onload = () => resolve();
                    logoImage.onerror = () => { console.error('Erro ao carregar a imagem do logo.'); resolve(); };
                });
                const logoWidth = 30;
                const logoHeight = logoImage.height * (logoWidth / logoImage.width);
                pdf.addImage(logoImage, 'PNG', (pdfWidth - logoWidth) / 2, yPos, logoWidth, logoHeight, '', 'FAST');
                yPos += logoHeight + 10;
            } catch (e) {
                console.error("Erro ao adicionar logo:", e);
            }
        }
        
        pdf.setFontSize(26);
        pdf.setTextColor('#E9A2AC');
        pdf.text('Certificado de Conclusão', pdfWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        pdf.setFontSize(12);
        pdf.setTextColor('#333333');
        const studentName = store.user.nome || '________________________________________________';
        const fullText = `Certificamos que o(a) Discente ${studentName} concluiu com sucesso as atividades complementares, totalizando ${totalHorasValidadas.value} horas.`;
        const splitText = pdf.splitTextToSize(fullText, pdfWidth - padding * 2);
        pdf.text(splitText, padding, yPos);
        yPos += (splitText.length * 7) + 10;
        
        pdf.setFontSize(18);
        pdf.setTextColor('#6A8D73');
        pdf.text('Detalhes dos Certificados Aprovados', pdfWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        pdf.setFontSize(10);
        pdf.setTextColor('#555555');
        const lineHeight = 5;
        approvedCertificates.forEach((cert) => {
            const certDetails = [
                `• Título: ${cert.titulo}`,
                `  Carga Horária: ${cert.cargaHoraria}h`,
                `  Categoria: ${cert.modalidadeNome}`
            ];
            if (cert.observacoesProfessor) {
                certDetails.push(`  Observação do Professor: ${cert.observacoesProfessor}`);
            }
            if (cert.professorNome && cert.dataRevisao) {
                const dataAprovacao = new Date(cert.dataRevisao).toLocaleDateString('pt-BR');
                certDetails.push(`  Aprovado por: ${cert.professorNome} em ${dataAprovacao}`);
            }

            let currentCertHeight = 0;
            certDetails.forEach(line => {
                currentCertHeight += pdf.splitTextToSize(line, pdfWidth - 2 * padding - 10).length * lineHeight;
            });

            if (yPos + currentCertHeight > pdfHeight - 60) {
                pdf.addPage();
                yPos = padding;
                pdf.setFontSize(18);
                pdf.setTextColor('#6A8D73');
                pdf.text('Detalhes dos Certificados (continuação)', pdfWidth / 2, yPos, { align: 'center' });
                yPos += 10;
                pdf.setFontSize(10);
                pdf.setTextColor('#555555');
            }

            certDetails.forEach(line => {
                const lines = pdf.splitTextToSize(line, pdfWidth - 2 * padding - 10);
                pdf.text(lines, padding + 5, yPos, { align: 'justify' });
                yPos += lines.length * lineHeight;
            });
            yPos += 5;
        });
        
        // --- 2. PÁGINAS INDIVIDUAIS DE COMPROVANTES (LÓGICA CORRIGIDA) ---
        const totalComprovantes = approvedCertificates.filter(c => c.fotoBase64).length;
        let comprovanteCounter = 1;
        for (const cert of approvedCertificates) {
            if (cert.fotoBase64) {
                pdf.addPage('a4', 'landscape');
                const landscapeWidth = pdf.internal.pageSize.getWidth();
                const landscapeHeight = pdf.internal.pageSize.getHeight();
                const imgPadding = 15;

                pdf.setFontSize(18);
                pdf.setTextColor('#333333');
                pdf.text(`Comprovante ${comprovanteCounter++} de ${totalComprovantes}: ${cert.titulo}`, landscapeWidth / 2, imgPadding + 10, { align: 'center' });
                pdf.setDrawColor('#E9A2AC');
                pdf.setLineWidth(0.3);
                pdf.line(imgPadding, imgPadding + 20, landscapeWidth - imgPadding, imgPadding + 20);

                if (cert.fotoBase64.startsWith('data:image')) {
                    const img = new Image();
                    img.src = cert.fotoBase64;
                    await new Promise(resolve => {
                        img.onload = () => resolve();
                        img.onerror = () => { console.error('Erro ao carregar imagem do comprovante:', cert.titulo); resolve(); };
                    });

                    const imgContentWidth = landscapeWidth - 2 * imgPadding;
                    const imgContentHeight = landscapeHeight - 2 * imgPadding - 40;
                    const aspectRatio = img.width / img.height;
                    let newWidth, newHeight;

                    if (aspectRatio > imgContentWidth / imgContentHeight) {
                        newWidth = imgContentWidth;
                        newHeight = imgContentWidth / aspectRatio;
                    } else {
                        newHeight = imgContentHeight;
                        newWidth = imgContentHeight * aspectRatio;
                    }

                    const x = (landscapeWidth - newWidth) / 2;
                    const y = (landscapeHeight - newHeight) / 2 + 10;
                    
                    pdf.addImage(img, 'JPEG', x, y, newWidth, newHeight, null, 'FAST');
                
                } else if (cert.fotoBase64.startsWith('data:application/pdf')) {
                    pdf.setFontSize(14);
                    pdf.setTextColor('#555');
                    const textYPos = landscapeHeight / 2 - 20;
                    pdf.text('Este comprovante é um documento PDF.', landscapeWidth / 2, textYPos, { align: 'center' });
                    pdf.text(`Título do Documento: ${cert.titulo}`, landscapeWidth / 2, textYPos + 10, { align: 'center' });
                    pdf.text(`Carga Horária: ${cert.cargaHoraria}h`, landscapeWidth / 2, textYPos + 20, { align: 'center' });
                    pdf.text('O arquivo original foi anexado no sistema.', landscapeWidth / 2, textYPos + 30, { align: 'center' });
                
                } else {
                    pdf.setFontSize(14);
                    pdf.setTextColor('#888');
                    pdf.text(`Comprovante para "${cert.titulo}" com formato inválido.`, landscapeWidth / 2, landscapeHeight / 2, { align: 'center' });
                }

                pdf.line(imgPadding, landscapeHeight - imgPadding - 5, landscapeWidth - imgPadding, landscapeHeight - imgPadding - 5);
                pdf.setFontSize(8);
                pdf.setTextColor('#555555');
                pdf.text(`Página ${pdf.internal.getNumberOfPages()}`, landscapeWidth - imgPadding, landscapeHeight - imgPadding, { align: 'right' });
                pdf.text(`${NOME_DO_SITE} | ${cert.titulo}`, imgPadding, landscapeHeight - imgPadding);
            }
        }

        const nomeDoArquivo = store.user.nome ? store.user.nome.split(' ')[0] : 'aluno';
        pdf.save(`relatorio_atividades_complementares_${nomeDoArquivo}.pdf`);

    } catch (e) {
        console.error("Erro ao gerar certificado:", e);
        alert('Erro ao gerar certificado. Verifique o console para mais detalhes.');
    }
};

// --- Lógica de Status e Filtros ---
const getNormalizedStatus = (status) => {
    if (!status || !status.trim()) {
        return 'PENDENTE';
    }
    return status.trim().toUpperCase();
}

const getStatusText = (status) => {
    return getNormalizedStatus(status).replace('_', ' ');
}

const getStatusClass = (status) => {
    const s = getNormalizedStatus(status);
    if (s === 'APROVADO') return 'status-aprovado';
    if (s === 'REPROVADO' || s === 'REVISAO_NECESSARIA') return 'status-reprovado';
    return 'status-pendente';
};

const isEditable = (cert) => {
    const status = getNormalizedStatus(cert.status);
    return status === 'PENDENTE' || status === 'REVISAO_NECESSARIA';
};

const isDeletable = (cert) => {
    const status = getNormalizedStatus(cert.status);
    return status !== 'APROVADO';
};

const filtroModalidade = ref('todos');
const filtroStatus = ref('todos');

const certificadosFiltrados = computed(() => {
    return store.certificados.filter(cert => {
        const certStatus = getNormalizedStatus(cert.status);

        const statusMatch = filtroStatus.value === 'todos' ||
            (filtroStatus.value === 'APROVADO' && certStatus === 'APROVADO') ||
            (filtroStatus.value === 'PENDENTE' && certStatus === 'PENDENTE') ||
            (filtroStatus.value === 'REPROVADO' && (certStatus === 'REPROVADO' || certStatus === 'REVISAO_NECESSARIA'));

        const mod = modalidades.value.find(m => m.nome === cert.modalidadeNome);
        const modalidadeMatch = filtroModalidade.value === 'todos' || (mod && mod.id == filtroModalidade.value);

        return statusMatch && modalidadeMatch;
    });
});

const limiteHorasSubcategoria = computed(() => {
    if (!subcategoriaSelecionadaId.value) return null;
    const sub = subcategorias.value.find(s => s.id === subcategoriaSelecionadaId.value);
    return sub ? sub.horas : null;
});

onMounted(async () => {
    await fetchModalidades();
    await fetchProgresso();
    if (!store.isInitialDataLoaded) {
        await fetchInitialData(router);
    }
    if (loteCertificados.value.length === 0) {
        adicionarCertificadoAoLote();
    }
});
</script>

<template>
    <div class="page-container">
        <header class="page-header">
            <h1>Painel de Atividades Complementares</h1>
            <p>Acompanhe seu progresso e gerencie seus certificados.</p>
        </header>

        <div class="card summary-progress-card">
            <div class="section-header">
                <h2>Progresso Geral</h2>
                <span v-if="metaConcluida" class="status-badge status-aprovado">Meta Concluída! 🎉</span>
            </div>
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-label">Certificados Validados</span>
                    <span class="stat-value">{{ totalCertificadosValidados }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Horas Válidas</span>
                    <span class="stat-value" :title="'Total de horas brutas (sem teto) enviadas: ' + totalHorasBrutas + 'h'">{{ totalHorasValidadas }} / {{ metaHoras }}</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: progressoPercentual + '%' }">
                    <span v-if="progressoPercentual > 10">{{ progressoPercentual.toFixed(0) }}%</span>
                </div>
            </div>

            <div class="action-footer">
                <button 
                    type="button" 
                    class="btn-action generate-button"
                    :disabled="!metaConcluida"
                    @click="gerarCertificado"
                    :title="metaConcluida ? 'Gerar seu certificado de conclusão' : `Faltam ${metaHoras - totalHorasValidadas} horas para poder gerar o certificado.`">
                    Gerar Certificado de Conclusão
                </button>
            </div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2>Resumo por Categoria</h2>
            </div>
            <div v-if="progresso" class="category-summary-list">
                <div v-for="(cat, type) in progresso.progressoPorCategoria" :key="type" class="category-item">
                    <span class="category-name">{{ type }}</span>
                    <div class="category-progress">
                        <div class="category-bar-container">
                            <div class="category-bar" :style="{ width: (cat.horasValidadas / (cat.maxHoras || metaHoras)) * 100 + '%' }"></div>
                        </div>
                        <span class="category-hours">{{ cat.horasValidadas }} / {{ cat.maxHoras }}h</span>
                    </div>
                    <span v-if="cat.horasBrutas > cat.horasValidadas" class="category-raw-hours" :title="'Total de horas enviadas nesta categoria: ' + cat.horasBrutas + 'h'">(Excedente: {{ (cat.horasBrutas - cat.horasValidadas).toFixed(1) }}h)</span>
                </div>
            </div>
            <div v-else class="no-data">Carregando resumo...</div>
        </div>

        <div class="card form-section">
            <h2>{{ editingCertId ? 'Editar Certificado' : 'Adicionar Novos Certificados' }}</h2>
            <form @submit.prevent="handleSubmit">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="modalidade">Modalidade:</label>
                        <select id="modalidade" v-model="modalidadeSelecionadaId" required>
                            <option :value="null" disabled>Selecione</option>
                            <option v-for="mod in modalidades" :key="mod.id" :value="mod.id">{{ mod.nome }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="subcategoria">Atividade Específica:</label>
                        <select id="subcategoria" v-model="subcategoriaSelecionadaId" :disabled="!modalidadeSelecionadaId" required>
                            <option :value="null" disabled>Selecione</option>
                            <option v-for="sub in subcategorias" :key="sub.id" :value="sub.id">{{ sub.descricao }}</option>
                        </select>
                    </div>
                </div>

                <div v-if="limiteHorasSubcategoria" class="horas-limite-info">
                    Limite máximo de horas para esta atividade: <strong>{{ limiteHorasSubcategoria }} horas</strong>
                </div>

                <hr class="form-divider">

                <div class="lote-items-container">
                    <div v-for="(cert, index) in loteCertificados" :key="cert.id" class="lote-item">
                        <div class="lote-item-header">
                            <h4>{{ editingCertId ? 'Dados do Certificado' : `Certificado #${index + 1}` }}</h4>
                            <button v-if="loteCertificados.length > 1 && !editingCertId" type="button" @click="removerCertificadoDoLote(cert.id)" class="lote-item-remove-btn" title="Remover este item">&times;</button>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label :for="'titulo-' + cert.id">Título do Certificado:</label>
                                <input :id="'titulo-' + cert.id" type="text" v-model="cert.titulo" required>
                            </div>
                            <div class="form-group">
                                <label :for="'horas-' + cert.id">Carga Horária (h):</label>
                                <input :id="'horas-' + cert.id" type="number" v-model="cert.cargaHoraria" min="1" step="0.5" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label :for="'foto-' + cert.id">Comprovante (imagem ou PDF):</label>
                            <input :id="'foto-' + cert.id" type="file" @change="handleLoteFileUpload($event, cert.id)" accept="image/*,.pdf" :key="cert.fileKey" :required="!cert.fotoBase64">
                            <div v-if="cert.fotoBase64 && cert.fotoBase64.startsWith('data:image')" class="image-preview small">
                                <img :src="cert.fotoBase64" alt="Preview">
                            </div>
                            <div v-if="cert.fotoBase64 && cert.fotoBase64.startsWith('data:application/pdf')" class="pdf-preview">
                                <span>📄 PDF Carregado</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="!editingCertId" class="lote-actions">
                    <button type="button" @click="adicionarCertificadoAoLote" class="btn-action add-button">
                        &#43; Adicionar Novo Certificado
                    </button>
                </div>

                <div v-if="error" class="mensagem erro">{{ error }}</div>

                <div class="form-actions">
                    <!-- MUDANÇA 4: Botão agora usa o estado 'isSubmitting' -->
                    <button type="submit" class="btn-action submit-button" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Enviando...' : (editingCertId ? 'Salvar Edição' : 'Enviar Certificados') }}
                    </button>
                    <button type="button" @click="resetForm" class="btn-action cancel-button">
                        {{ editingCertId ? 'Cancelar Edição' : 'Limpar Tudo' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="card list-section">
            <div class="section-header">
                <h2>Meus Envios</h2>
            </div>

            <div class="filtros-container">
                <div class="form-group">
                    <label for="filtro-modalidade">Filtrar por Modalidade</label>
                    <select id="filtro-modalidade" v-model="filtroModalidade">
                        <option value="todos">Todas as Modalidades</option>
                        <option v-for="mod in modalidades" :key="mod.id" :value="mod.id">{{ mod.nome }}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtro-status">Filtrar por Status</label>
                    <select id="filtro-status" v-model="filtroStatus">
                        <option value="todos">Todos os Status</option>
                        <option value="APROVADO">Aprovado</option>
                        <option value="PENDENTE">Pendente</option>
                        <option value="REPROVADO">Reprovado</option>
                    </select>
                </div>
            </div>

            <div v-if="!store.isInitialDataLoaded" class="no-data">Carregando...</div>
            <ul v-else-if="certificadosFiltrados.length > 0" class="certificados-list">
                <li v-for="cert in certificadosFiltrados" :key="cert.id" class="certificado-item">
                    <div class="cert-info">
                        <div class="cert-image-wrapper">
                            <img v-if="cert.fotoBase64 && cert.fotoBase64.startsWith('data:image')" :src="cert.fotoBase64" alt="Certificado" class="cert-image">
                            <div v-else-if="cert.fotoBase64 && cert.fotoBase64.startsWith('data:application/pdf')" class="no-image pdf-icon">📄</div>
                            <div v-else class="no-image">Sem Foto</div>
                        </div>
                        <div class="cert-details">
                            <h3>{{ cert.titulo }}</h3>
                            <p><strong>Modalidade:</strong> {{ cert.modalidadeNome }}</p>
                            <p><strong>Atividade:</strong> {{ cert.subcategoriaDescricao }}</p>
                            <p>Carga Horária: <strong>{{ cert.cargaHoraria }} horas</strong></p>
                            <div class="status-wrapper">
                                <span :class="['status-badge', getStatusClass(cert.status)]">
                                    {{ getStatusText(cert.status) }}
                                </span>
                            </div>
                            <div v-if="cert.observacoesProfessor" class="observacao-box">
                                <strong>Observação do Professor:</strong>
                                <p>{{ cert.observacoesProfessor }}</p>
                            </div>
                        </div>
                    </div>
                    <div class="cert-actions">
                        <button v-if="isEditable(cert)" @click="editCertificado(cert)" class="btn-action edit-button">Editar</button>
                        <button v-if="isDeletable(cert)" @click="deleteCertificado(cert)" class="btn-action delete-button">Excluir</button>
                    </div>
                </li>
            </ul>
            <div v-else class="no-data">
                <p>Nenhum certificado encontrado.</p>
                <p v-if="store.certificados.length > 0">Tente ajustar os filtros.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import '@/assets/styles/certificado.css';

.page-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.summary-progress-card {
    background-color: #f8f9fa;
    border-left: 5px solid #E9A2AC;
}

.progress-stats {
    display: flex;
    justify-content: space-around;
    margin: 1.5rem 0;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-label {
    font-size: 0.9rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
}

.stat-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: #343a40;
}

.progress-bar-container {
    width: 100%;
    background-color: #e9ecef;
    border-radius: 20px;
    height: 28px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #6a8d73, #8fbc8f);
    border-radius: 20px;
    transition: width 0.8s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.9rem;
}

.action-footer {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e9ecef;
}

.category-summary-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.category-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #eee;
}

.category-item:last-child {
    border-bottom: none;
}

.category-name,
.category-hours,
.category-raw-hours {
    white-space: normal;
    word-break: break-word;
}

.category-name {
    font-weight: bold;
    color: #333;
    font-size: 1rem;
}

.category-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.category-bar-container {
    flex-grow: 1;
    background-color: #e9ecef;
    border-radius: 5px;
    height: 15px;
    overflow: hidden;
}

.category-bar {
    height: 100%;
    background-color: #E9A2AC;
    border-radius: 5px;
    transition: width 0.5s ease-in-out;
}

.category-hours {
    font-size: 0.9rem;
    font-weight: 500;
    color: #555;
}

.category-raw-hours {
    font-size: 0.8rem;
    color: #888;
    font-style: italic;
}

@media (min-width: 768px) {
    .category-item {
        display: grid;
        grid-template-columns: minmax(150px, 1.5fr) 2fr auto;
        align-items: center;
        gap: 1.5rem;
    }
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

@media (min-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr 1fr;
    }
}

.horas-limite-info {
    padding: 10px;
    margin-top: 1rem;
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    text-align: center;
    font-size: 0.9rem;
}

.form-divider {
    border: none;
    border-top: 1px solid #eee;
    margin: 2rem 0;
}

.lote-item {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    background-color: #fcfcfc;
}

.lote-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
}

.lote-item-header h4 {
    margin: 0;
    color: #333;
}

.image-preview.small {
    max-width: 150px;
    margin-top: 0.5rem;
}

.pdf-preview {
    font-size: 0.9rem;
    color: #555;
    margin-top: 0.5rem;
}

.lote-actions {
    display: flex;
    justify-content: center;
    margin: 1rem 0 2rem 0;
}

.pdf-icon {
    font-size: 3rem;
}

.generate-button {
    width: 100%;
    background-color: #E9A2AC;
    color: white;
    font-weight: bold;
    border: none;
    transition: background-color 0.3s ease, opacity 0.3s ease;
}
.generate-button:hover:not(:disabled) {
    background-color: #d98fa0;
}
.generate-button:disabled {
    background-color: #cccccc;
    color: #666666;
    cursor: not-allowed;
    opacity: 0.6;
}

.lote-item-remove-btn {
    background-color: #6a8d73;
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    font-size: 1.2rem;
    font-weight: bold;
    line-height: 28px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.lote-item-remove-btn:hover {
    background-color: #587861;
}

.add-button {
    background-color: #f4f4f4; 
    color: #444; 
    border: 1px solid #ddd; 
    font-weight: 600; 
}

.add-button:hover {
    background-color: #e9e9e9;
    border-color: #ccc;
}

.form-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    flex-wrap: wrap;
}

.filtros-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 2rem;
    border: 1px solid #e9ecef;
}

.filtros-container .form-group {
    margin-bottom: 0;
    flex-grow: 1;
    min-width: 200px;
}

.certificado-item {
    flex-direction: column;
}

.cert-info {
    flex-direction: column;
    width: 100%;
}

.cert-actions {
    width: 100%;
    margin-top: 1rem;
    justify-content: flex-end;
}

.status-badge {
    padding: 0.35em 0.75em;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    display: inline-block;
    text-align: center;
}

.status-aprovado {
    background-color: #28a745;
}

.status-reprovado {
    background-color: #dc3545;
}

.status-pendente {
    background-color: #ffc107;
    color: #212529;
}

.mensagem.erro {
    color: #721c24;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1.5rem;
    text-align: center;
}

@media (min-width: 768px) {
    .certificado-item {
        flex-direction: row;
    }

    .cert-info {
        flex-direction: row;
    }

    .cert-actions {
        width: auto;
        margin-top: 0;
    }
}
</style>

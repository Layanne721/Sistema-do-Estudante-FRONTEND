<script setup>
import { defineProps, defineEmits, computed } from 'vue';

// --- ALTERAÇÃO 1: O componente agora recebe o 'perfil' do usuário ---
const props = defineProps({
  perfil: {
    type: String,
    required: true,
    validator: (value) => ['ALUNO', 'PROFESSOR'].includes(value)
  }
});

const emit = defineEmits(['close', 'avatar-selected']);

// --- ALTERAÇÃO 2: Listas de avatares agora vivem dentro do modal ---

// Avatares para Alunos (estilo "adventurer")
const avataresAluno = [
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Bella',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Zoe',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Sam',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Luna',
];

// Avatares para Professores (estilo "micah", mais profissional)
const avataresProfessor = [
  'https://api.dicebear.com/8.x/micah/svg?seed=DrSilva',
  'https://api.dicebear.com/8.x/micah/svg?seed=ProfaSouza',
  'https://api.dicebear.com/8.x/micah/svg?seed=MestreAlves',
  'https://api.dicebear.com/8.x/micah/svg?seed=DraCosta',
  'https://api.dicebear.com/8.x/micah/svg?seed=SrRibeiro',
  'https://api.dicebear.com/8.x/micah/svg?seed=SraPereira',
];

// --- ALTERAÇÃO 3: Lógica para escolher a lista correta ---
const avataresDisponiveis = computed(() => {
  return props.perfil === 'PROFESSOR' ? avataresProfessor : avataresAluno;
});

const selectAvatar = (avatarUrl) => {
  emit('avatar-selected', avatarUrl);
};
</script>

<template>
  <div class="modal-backdrop" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <!-- ALTERAÇÃO 4: Título dinâmico com base no perfil -->
        <h2>Escolha seu novo Avatar de {{ perfil === 'PROFESSOR' ? 'Professor(a)' : 'Aluno(a)' }}</h2>
        <button @click="$emit('close')" class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <div class="avatar-grid">
          <!-- O loop agora usa a lista de avatares dinâmica interna -->
          <div 
            v-for="avatarUrl in avataresDisponiveis" 
            :key="avatarUrl" 
            class="avatar-item" 
            @click="selectAvatar(avatarUrl)"
          >
            <img :src="avatarUrl" alt="Avatar">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px; /* Aumentado para melhor visualização */
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}
.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
}
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1.5rem;
}
.avatar-item {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-radius: 50%;
}
.avatar-item:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.avatar-item img {
  width: 100%;
  border-radius: 50%;
  border: 3px solid transparent;
  background-color: #f0f0f0; /* Fundo para avatares com transparência */
}
.avatar-item:hover img {
  border-color: var(--cor-principal);
}
</style>


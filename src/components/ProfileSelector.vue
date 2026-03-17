<script setup>
import { ref } from 'vue'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'

const { profiles, activeProfileId, setActiveProfile, updateProfileInfo } = useVisitedCountries()

const editingId = ref(null)
const editName = ref('')

function startEdit(profile) {
  editingId.value = profile.id
  editName.value = profile.name
}

function saveEdit() {
  if (editName.value.trim()) updateProfileInfo(editingId.value, { name: editName.value.trim() })
  editingId.value = null
}
</script>

<template>
  <div class="profile-selector">
    <button
      v-for="(profile, idx) in profiles"
      :key="profile.id"
      class="profile-btn"
      :class="[{ active: profile.id === activeProfileId }, idx === 0 ? 'color-p1' : 'color-p2']"
      @click="setActiveProfile(profile.id)"
      @dblclick.stop="startEdit(profile)"
    >
      <span class="emoji">{{ profile.emoji }}</span>
      <template v-if="editingId === profile.id">
        <input v-model="editName" class="edit-input" @keyup.enter="saveEdit" @blur="saveEdit" @click.stop autofocus />
      </template>
      <template v-else>
        <span class="name">{{ profile.name }}</span>
      </template>
    </button>
  </div>
</template>

<style scoped>
.profile-selector { display: flex; gap: 0.4rem; }

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 24px;
  color: #64748b;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.profile-btn:hover { background: #f1f5f9; color: #475569; }

.profile-btn.active.color-p1 { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
.profile-btn.active.color-p2 { border-color: #ec4899; color: #db2777; background: #fdf2f8; }

.emoji { font-size: 1rem; }
.name { font-weight: 600; }

.edit-input {
  background: transparent; border: none;
  border-bottom: 1px solid currentColor;
  color: inherit; font-size: 0.82rem;
  width: 70px; padding: 0; outline: none; font-weight: 600;
}

/* Mobile: emoji-only compact pills */
@media (max-width: 768px) {
  .profile-btn {
    padding: 0.3rem;
    width: 36px; height: 36px;
    border-radius: 50%;
    justify-content: center;
  }
  .name, .edit-input { display: none; }
  .emoji { font-size: 1.1rem; }
}
</style>

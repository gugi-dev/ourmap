<script setup>
import { ref } from 'vue'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import Avatar from './Avatar.vue'

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
  <div class="selector">
    <button
      v-for="(profile, idx) in profiles"
      :key="profile.id"
      class="pill"
      :class="[{ active: profile.id === activeProfileId }, idx === 0 ? 'p1' : 'p2']"
      @click="setActiveProfile(profile.id)"
      @dblclick.stop="startEdit(profile)"
      :title="`${profile.name} — double-click to rename`"
    >
      <Avatar :name="profile.name" :variant="idx === 0 ? 'p1' : 'p2'" :size="22"
              :solid="profile.id === activeProfileId" />
      <input
        v-if="editingId === profile.id"
        v-model="editName"
        class="edit"
        @keyup.enter="saveEdit"
        @blur="saveEdit"
        @click.stop
        autofocus
      />
      <span v-else class="name">{{ profile.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  gap: var(--s-1);
}

.pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.26rem 0.6rem 0.26rem 0.4rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-full);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 550;
  white-space: nowrap;
  letter-spacing: -0.008em;
  transition: background var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out),
    border-color var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
}
.pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.pill:active {
  transform: scale(0.97);
}

.pill.active.p1 {
  border-color: var(--profile-1);
  color: var(--profile-1-text);
  background: var(--profile-1-soft);
}
.pill.active.p2 {
  border-color: var(--profile-2);
  color: var(--profile-2-text);
  background: var(--profile-2-soft);
}

.edit {
  background: transparent;
  border: none;
  border-bottom: 1px solid currentColor;
  color: inherit;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 550;
  width: 68px;
  padding: 0;
  outline: none;
}

@media (max-width: 768px) {
  .pill {
    padding: 0;
    width: 34px;
    height: 34px;
    border-radius: var(--r-full);
    justify-content: center;
  }
  .name,
  .edit {
    display: none;
  }
}
</style>

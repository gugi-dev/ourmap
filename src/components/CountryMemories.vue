<script setup>
import { ref, watch } from 'vue'
import { countryFlag } from '../utils/flags.js'
import { toDirectImageUrl } from '../utils/imageUrl.js'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import * as api from '../api.js'

const props = defineProps({
  country: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const { toggleCountry, activeProfileId } = useVisitedCountries()

const memories = ref([])
const loading = ref(false)
const newUrl = ref('')
const newCaption = ref('')
const adding = ref(false)
const lightboxImg = ref(null)
const imgErrors = ref(new Set())

watch(() => props.country, async (c) => {
  if (!c) return
  loading.value = true
  imgErrors.value = new Set()
  try {
    memories.value = await api.getMemories(c.id)
  } catch (e) {
    console.error('Failed to load memories:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function addMemory() {
  const url = toDirectImageUrl(newUrl.value.trim())
  if (!url) return
  try {
    const m = await api.addMemory(props.country.id, url, newCaption.value.trim())
    memories.value.unshift(m)
    newUrl.value = ''
    newCaption.value = ''
    adding.value = false
  } catch (e) {
    console.error('Failed to add memory:', e)
  }
}

async function removeMemory(id) {
  try {
    await api.deleteMemory(id)
    memories.value = memories.value.filter(m => m.id !== id)
  } catch (e) {
    console.error('Failed to delete memory:', e)
  }
}

function handleImgError(id) {
  imgErrors.value.add(id)
  imgErrors.value = new Set(imgErrors.value)
}

function handleUnvisit() {
  toggleCountry(props.country.id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="emit('close')">
      <div class="modal" @click.stop>
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-flag">{{ countryFlag(country.id) }}</span>
            <h2>{{ country.name }}</h2>
          </div>
          <div class="modal-actions">
            <button class="unvisit-btn" @click="handleUnvisit" title="Remove from visited">
              Remove
            </button>
            <button class="close-btn" @click="emit('close')">&#x2715;</button>
          </div>
        </div>

        <!-- Add photo — always visible and prominent -->
        <div class="add-section">
          <div v-if="!adding" class="add-prompt" @click="adding = true">
            <span class="add-icon">&#128247;</span>
            <div>
              <strong>Add a photo memory</strong>
              <span class="add-sub">Paste any image URL</span>
            </div>
          </div>
          <form v-else class="add-form" @submit.prevent="addMemory">
            <input v-model="newUrl" type="url" placeholder="https://example.com/photo.jpg" class="input" autofocus required />
            <input v-model="newCaption" type="text" placeholder="Caption (optional)" class="input" />
            <div class="add-actions">
              <button type="submit" class="btn-save">Add photo</button>
              <button type="button" class="btn-cancel" @click="adding = false; newUrl = ''; newCaption = ''">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Gallery -->
        <div class="gallery" v-if="!loading">
          <div v-if="memories.length === 0 && !adding" class="empty">
            <p>No photos yet</p>
          </div>
          <div v-for="m in memories" :key="m.id" class="memory-card">
            <div v-if="imgErrors.has(m.id)" class="img-error" @click="lightboxImg = m.image_url">
              <span>&#128444;</span>
              <span class="img-error-text">Can't load image</span>
              <a class="img-error-link" :href="m.image_url" target="_blank" @click.stop>Open URL</a>
            </div>
            <img
              v-else
              :src="toDirectImageUrl(m.image_url)"
              :alt="m.caption"
              class="memory-img"
              loading="lazy"
              @click="lightboxImg = m.image_url"
              @error="handleImgError(m.id)"
            />
            <div class="memory-footer">
              <span class="memory-caption">{{ m.caption || '' }}</span>
              <button class="memory-delete" @click="removeMemory(m.id)" title="Delete">&#128465;</button>
            </div>
          </div>
        </div>
        <div v-else class="loading-state">Loading...</div>

        <!-- Lightbox -->
        <div v-if="lightboxImg" class="lightbox" @click="lightboxImg = null">
          <img :src="toDirectImageUrl(lightboxImg)" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}

.modal {
  background: #ffffff;
  border-radius: 16px;
  width: 100%; max-width: 520px; max-height: 85vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.modal-title { display: flex; align-items: center; gap: 0.5rem; }
.modal-flag { font-size: 1.5rem; }
h2 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight: 700; }

.modal-actions { display: flex; align-items: center; gap: 0.4rem; }

.unvisit-btn {
  padding: 0.3rem 0.65rem;
  background: none; border: 1px solid #e2e8f0;
  border-radius: 6px; color: #94a3b8;
  font-size: 0.72rem; cursor: pointer;
  transition: all 0.15s;
}
.unvisit-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

.close-btn {
  background: #f1f5f9; border: none; color: #64748b;
  cursor: pointer; font-size: 1rem;
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover { background: #e2e8f0; color: #1e293b; }

/* Add section — prominent */
.add-section { padding: 0.75rem 1.25rem; }

.add-prompt {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 12px; cursor: pointer;
  transition: all 0.15s;
}
.add-prompt:hover { background: #dbeafe; border-color: #93c5fd; }
.add-icon { font-size: 1.5rem; }
.add-prompt strong { display: block; font-size: 0.9rem; color: #1e293b; }
.add-sub { font-size: 0.75rem; color: #64748b; }

.add-form { display: flex; flex-direction: column; gap: 0.5rem; }
.input {
  padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0;
  border-radius: 8px; font-size: 0.9rem; color: #1e293b;
  outline: none; transition: border-color 0.2s;
}
.input:focus { border-color: #3b82f6; }
.input::placeholder { color: #cbd5e1; }
.add-actions { display: flex; gap: 0.4rem; }
.btn-save {
  padding: 0.45rem 1rem; background: #3b82f6; color: white;
  border: none; border-radius: 8px; font-size: 0.85rem;
  font-weight: 600; cursor: pointer; transition: background 0.15s;
}
.btn-save:hover { background: #2563eb; }
.btn-cancel {
  padding: 0.45rem 1rem; background: #f1f5f9; color: #64748b;
  border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
}
.btn-cancel:hover { background: #e2e8f0; }

/* Gallery */
.gallery {
  padding: 0 1.25rem 1.25rem; overflow-y: auto; flex: 1;
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem; align-content: start;
}

.empty { grid-column: 1 / -1; text-align: center; padding: 1.5rem 0; color: #cbd5e1; }
.empty p { margin: 0; font-size: 0.9rem; }

.memory-card {
  border-radius: 10px; overflow: hidden;
  border: 1px solid #f1f5f9; background: #f8fafc;
}
.memory-img {
  width: 100%; aspect-ratio: 4/3; object-fit: cover;
  display: block; cursor: pointer; transition: opacity 0.15s;
}
.memory-img:hover { opacity: 0.9; }

.img-error {
  width: 100%; aspect-ratio: 4/3;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.25rem; background: #f1f5f9; color: #94a3b8;
  cursor: pointer;
}
.img-error span:first-child { font-size: 1.5rem; }
.img-error-text { font-size: 0.7rem; }
.img-error-link {
  font-size: 0.65rem; color: #3b82f6;
  text-decoration: underline;
}

.memory-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.55rem; gap: 0.25rem;
}
.memory-caption {
  font-size: 0.75rem; color: #64748b;
  overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; flex: 1;
}
.memory-delete {
  background: none; border: none; cursor: pointer;
  font-size: 0.8rem; padding: 0;
  opacity: 0.3; transition: opacity 0.15s;
}
.memory-delete:hover { opacity: 1; }

.loading-state {
  padding: 2rem; text-align: center;
  color: #94a3b8;
}

/* Lightbox */
.lightbox {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0, 0, 0, 0.85);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out; padding: 2rem;
}
.lightbox img { max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain; }
</style>

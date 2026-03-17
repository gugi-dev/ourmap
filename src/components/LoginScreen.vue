<script setup>
import { ref } from 'vue'

const emit = defineEmits(['authenticated'])

const word = ref('')
const error = ref(false)
const shaking = ref(false)

function submit() {
  if (word.value.trim().toLowerCase() === 'mucmaz') {
    localStorage.setItem('ourmap-auth', 'true')
    emit('authenticated')
  } else {
    error.value = true
    shaking.value = true
    setTimeout(() => { shaking.value = false }, 500)
  }
}
</script>

<template>
  <div class="login">
    <div class="login-card" :class="{ shake: shaking }">
      <span class="login-icon">&#127758;</span>
      <h1>OurMap</h1>
      <p class="subtitle">Enter our word</p>
      <form @submit.prevent="submit">
        <input
          v-model="word"
          type="password"
          placeholder="Our secret word..."
          class="login-input"
          :class="{ error }"
          autofocus
          @input="error = false"
        />
        <button type="submit" class="login-btn">Enter</button>
      </form>
      <p v-if="error" class="error-msg">That's not it &#128064;</p>
    </div>
  </div>
</template>

<style scoped>
.login {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.login-card {
  text-align: center;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 340px;
}

.login-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.8rem;
  color: #1e293b;
  font-weight: 800;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-input {
  padding: 0.7rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  color: #1e293b;
  outline: none;
  text-align: center;
  transition: border-color 0.2s;
  background: #ffffff;
}

.login-input:focus {
  border-color: #3b82f6;
}

.login-input.error {
  border-color: #f87171;
}

.login-btn {
  padding: 0.7rem;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.login-btn:hover {
  background: #2563eb;
}

.error-msg {
  color: #f87171;
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}

.shake {
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
</style>

# Frontend Integration Examples

## API Client Setup (for your Nuxt.js app)

### 1. Create API Service (`/services/api.ts`)

```typescript
// services/api.ts
const API_BASE_URL = 'http://localhost:3005';

export class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // User endpoints
  async getUsers() {
    return this.request('/users');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  // Health check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
```

### 2. Nuxt Plugin (`/plugins/api.client.ts`)

```typescript
// plugins/api.client.ts
import { apiService } from '~/services/api';

export default defineNuxtPlugin(() => {
  return {
    provide: {
      api: apiService,
    },
  };
});
```

### 3. Composable for Auth (`/composables/useAuth.ts`)

```typescript
// composables/useAuth.ts
export const useAuth = () => {
  const { $api } = useNuxtApp();
  const user = ref(null);
  const token = ref(null);

  const login = async (email: string, password: string) => {
    try {
      const response = await $api.login(email, password);
      token.value = response.accessToken;
      user.value = response.user;

      // Store in localStorage
      if (process.client) {
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    if (process.client) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const isAuthenticated = computed(() => !!token.value);

  return {
    user: readonly(user),
    token: readonly(token),
    isAuthenticated,
    login,
    logout,
  };
};
```

### 4. Environment Variables (`.env`)

```env
# .env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3005
```

### 5. Usage in Components

```vue
<!-- pages/login.vue -->
<template>
  <div>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script setup>
const { login } = useAuth();
const email = ref('');
const password = ref('');

const handleLogin = async () => {
  try {
    await login(email.value, password.value);
    await navigateTo('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
</script>
```

## Available API Endpoints

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get current user profile
- `GET /users` - Get all users (requires auth)
- `GET /users/:id` - Get user by ID (requires auth)
- `POST /users` - Create user (requires auth)
- `PATCH /users/:id` - Update user (requires auth)
- `DELETE /users/:id` - Delete user (requires auth)
- `GET /health` - Health check
- `GET /health/detailed` - Detailed health metrics
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## CORS Configuration

The backend is configured to accept requests from:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `http://127.0.0.1:3002`

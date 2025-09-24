# Frontend Project Reference

## Project Location

`/Users/vishnusharma/Vue/SunooApp`

## Key Frontend Files

### Pages

- `pages/index.vue` - Home page
- `pages/login.vue` - Login page
- `pages/register.vue` - Registration page
- `pages/dashboard.vue` - Dashboard page

### Components

- `components/` - Vue components directory
- `components/ui/` - UI components
- `components/forms/` - Form components

### Composables

- `composables/useAuth.ts` - Authentication composable
- `composables/useApi.ts` - API composable
- `composables/` - Other Vue composables

### Services

- `services/api.ts` - API service
- `services/auth.ts` - Authentication service
- `services/` - Other services

### Configuration

- `nuxt.config.ts` - Nuxt configuration
- `tailwind.config.js` - Tailwind CSS config
- `tsconfig.json` - TypeScript config
- `package.json` - Dependencies

### Assets

- `assets/` - Static assets
- `public/` - Public assets
- `layouts/` - Layout components

### Store

- `store/` - Pinia/Vuex store
- `store/auth.ts` - Auth store
- `store/user.ts` - User store

## How to Reference in Cursor

1. **Use file paths**: `/Users/vishnusharma/Vue/SunooApp/pages/login.vue`
2. **Use @-mentions**: `@/Users/vishnusharma/Vue/SunooApp/composables/useAuth.ts`
3. **Reference by name**: "In my login page..." or "In my auth composable..."

## Example Questions

- "How should I integrate this API with my login page at `/Users/vishnusharma/Vue/SunooApp/pages/login.vue`?"
- "Can you help me update my auth composable to work with this backend?"
- "How should I structure my API calls in my Nuxt app?"

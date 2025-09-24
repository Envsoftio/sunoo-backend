import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

async function createSuperAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  const email = process.argv[2] || 'admin@sunoo.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Super Admin';

  try {
    const superAdmin = await authService.createSuperAdmin(email, password, name);
    console.log('✅ Superadmin created successfully!');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`👤 Name: ${superAdmin.name}`);
    console.log(`🔑 Role: ${superAdmin.role}`);
    console.log(`🆔 ID: ${superAdmin.id}`);
  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
  }

  await app.close();
}

createSuperAdmin();

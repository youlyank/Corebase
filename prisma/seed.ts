import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@corebase.dev' },
    update: {},
    create: {
      email: 'admin@corebase.dev',
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@corebase.dev' },
    update: {},
    create: {
      email: 'test@corebase.dev',
      name: 'Test User',
      role: 'USER',
      emailVerified: true,
    },
  });

  console.log('✅ Test user created:', testUser.email);

  // Create demo project
  const demoProject = await prisma.project.upsert({
    where: { 
      ownerId_name: {
        ownerId: admin.id,
        name: 'Demo Project'
      }
    },
    update: {},
    create: {
      name: 'Demo Project',
      description: 'A demonstration project showcasing CoreBase features',
      ownerId: admin.id,
      settings: {
        theme: 'light',
        language: 'en',
        notifications: true,
      },
    },
  });

  console.log('✅ Demo project created:', demoProject.name);

  // Create sample API keys
  const adminApiKey = await prisma.apiKey.create({
    data: {
      name: 'Admin API Key',
      key: 'cb_admin_' + Math.random().toString(36).substring(2, 15),
      userId: admin.id,
      permissions: JSON.stringify(['read', 'write', 'delete']),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  console.log('✅ Admin API key created');

  const testApiKey = await prisma.apiKey.create({
    data: {
      name: 'Test API Key',
      key: 'cb_test_' + Math.random().toString(36).substring(2, 15),
      userId: testUser.id,
      permissions: JSON.stringify(['read']),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Test API key created');

  // Create sample tables for the demo project
  const sampleTables = [
    {
      name: 'users',
      schema: {
        id: { type: 'string', primary: true },
        email: { type: 'string', unique: true },
        name: { type: 'string' },
        created_at: { type: 'datetime' },
      },
    },
    {
      name: 'posts',
      schema: {
        id: { type: 'string', primary: true },
        title: { type: 'string' },
        content: { type: 'text' },
        author_id: { type: 'string' },
        published: { type: 'boolean' },
        created_at: { type: 'datetime' },
      },
    },
    {
      name: 'comments',
      schema: {
        id: { type: 'string', primary: true },
        post_id: { type: 'string' },
        user_id: { type: 'string' },
        content: { type: 'text' },
        created_at: { type: 'datetime' },
      },
    },
  ];

  for (const table of sampleTables) {
    await prisma.databaseTable.create({
      data: {
        name: table.name,
        schema: table.schema,
        projectId: demoProject.id,
      },
    });
    console.log(`✅ Table '${table.name}' created`);
  }

  // Create sample auth providers
  try {
    await prisma.authProvider.createMany({
      data: [
        {
          name: 'EMAIL',
          displayName: 'Email Authentication',
          enabled: true,
          config: {},
        },
        {
          name: 'GOOGLE',
          displayName: 'Google OAuth',
          enabled: false,
          config: {},
        },
      ],
    });
    console.log('✅ Auth providers created');
  } catch (error) {
    console.log('⚠️  Auth providers may already exist');
  }

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SIGNUP',
        userId: admin.id,
        resource: 'user',
        resourceId: admin.id,
        details: { email: admin.email },
        ipAddress: '127.0.0.1',
        userAgent: 'CoreBase Seeder',
      },
      {
        action: 'CREATE',
        userId: admin.id,
        resource: 'project',
        resourceId: demoProject.id,
        details: { projectName: demoProject.name },
        ipAddress: '127.0.0.1',
        userAgent: 'CoreBase Seeder',
      },
      {
        action: 'CREATE',
        userId: admin.id,
        resource: 'api_key',
        resourceId: adminApiKey.id,
        details: { keyName: adminApiKey.name },
        ipAddress: '127.0.0.1',
        userAgent: 'CoreBase Seeder',
      },
    ],
  });

  console.log('✅ Audit logs created');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Created entities:');
  console.log('   • Users: admin@corebase.dev, test@corebase.dev');
  console.log('   • Project: Demo Project');
  console.log('   • API Keys: Admin (full access), Test (read-only)');
  console.log('   • Tables: users, posts, comments');
  console.log('   • Auth Providers: Email, Google');
  console.log('   • Audit Logs: Sample entries');
  
  console.log('\n🔑 Test users created:');
  console.log('   Admin: admin@corebase.dev');
  console.log('   Test:  test@corebase.dev');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.practice.findFirst()
  .then(r => console.log('OK:', r))
  .catch(e => console.log('ERR:', e.message))
  .finally(() => p.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const problems = [
    {
      title: 'Parking Lot',
      description: 'Design a parking lot system.',
      requirements: 'Must support different vehicle types (Car, Truck, Motorcycle). Must assign tickets at entry and calculate fee at exit. Should track available spots per floor.',
      difficulty: 'Medium',
    },
    {
      title: 'Vending Machine',
      description: 'Design a state-based vending machine.',
      requirements: 'Must handle states (Idle, HasMoney, Dispensing, ReturnChange). Must support multiple products and track inventory. Should accept different denominations.',
      difficulty: 'Medium',
    },
    {
      title: 'Elevator System',
      description: 'Design the control system for a bank of elevators.',
      requirements: 'Must handle internal and external requests. Should optimize for minimal wait times. Must support different states (Moving Up, Moving Down, Idle) and handle concurrent requests safely.',
      difficulty: 'Hard',
    },
    {
      title: 'Rate Limiter',
      description: 'Design an API rate limiter.',
      requirements: 'Must limit requests per user per time window. Support different algorithms (Token Bucket, Sliding Window). Must be thread-safe for concurrent requests.',
      difficulty: 'Hard',
    },
  ];

  for (const prob of problems) {
    await prisma.problem.create({
      data: prob,
    });
  }

  console.log('Seeded exactly 4 problems.');
}

// Ensure idempotent seeding:
prisma.problem.count().then(async (count) => {
  if (count === 0) {
    await main();
  } else {
    console.log('Database already seeded with problems.');
  }
  await prisma.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

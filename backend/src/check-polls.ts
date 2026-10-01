import { prisma } from "./src/config/database";

async function main() {
  const polls = await prisma.poll.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      isPublic: true,
      positionId: true,
      targetCountyId: true,
      targetConstituencyId: true,
      targetWardId: true,
      startsAt: true,
      endsAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.dir(polls, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
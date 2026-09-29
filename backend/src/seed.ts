import "dotenv/config";
import bcrypt from "bcryptjs";

import {
  getCounties,
  getConstituenciesByCounty,
  getWardsByConstituency,
} from "osm-kenya-boundaries";

import { prisma } from "./config/database";

async function seedGeography() {
  console.log("\n🌍 Seeding Kenya geography...\n");

  const counties = getCounties();

  let constituencyCount = 0;
  let wardCount = 0;

  for (const countyData of counties) {
    const county = await prisma.county.upsert({
      where: {
        code: Number(countyData.code),
      },
      update: {
        name: countyData.name,
      },
      create: {
        code: Number(countyData.code),
        name: countyData.name,
      },
    });

    console.log(`County: ${county.name}`);

    const constituencies = getConstituenciesByCounty(county.name);

    for (const constituencyData of constituencies) {
      const constituency = await prisma.constituency.upsert({
        where: {
          code: constituencyData.code,
        },
        update: {
          name: constituencyData.name,
          countyId: county.id,
        },
        create: {
          code: constituencyData.code,
          name: constituencyData.name,
          countyId: county.id,
        },
      });

      constituencyCount++;

      const wards = getWardsByConstituency(constituency.name);

      for (const wardData of wards) {
        await prisma.ward.upsert({
          where: {
            code: wardData.code,
          },
          update: {
            name: wardData.name,
            constituencyId: constituency.id,
          },
          create: {
            code: wardData.code,
            name: wardData.name,
            constituencyId: constituency.id,
          },
        });

        wardCount++;
      }
    }
  }

  return {
    counties: counties.length,
    constituencies: constituencyCount,
    wards: wardCount,
  };
}

async function seedPositions() {
  console.log("\n🏛️ Seeding positions...\n");

  const positions = [
    {
      name: "President",
      scope: "NATIONAL" as const,
      description: "National presidential opinion poll",
    },
    {
      name: "Governor",
      scope: "COUNTY" as const,
      description: "County governor opinion poll",
    },
    {
      name: "Senator",
      scope: "COUNTY" as const,
      description: "County senator opinion poll",
    },
    {
      name: "Women Representative",
      scope: "COUNTY" as const,
      description: "County women representative opinion poll",
    },
    {
      name: "Member of National Assembly",
      scope: "CONSTITUENCY" as const,
      description: "Constituency member of parliament opinion poll",
    },
    {
      name: "Member of County Assembly",
      scope: "WARD" as const,
      description: "Ward member of county assembly opinion poll",
    },
  ];

  for (const position of positions) {
    await prisma.position.upsert({
      where: {
        name: position.name,
      },
      update: {
        scope: position.scope,
        description: position.description,
        isActive: true,
      },
      create: {
        name: position.name,
        scope: position.scope,
        description: position.description,
      },
    });

    console.log(`Position: ${position.name}`);
  }

  return positions.length;
}

async function seedAdmin() {
  console.log("\n👤 Seeding admin account...\n");

  const email = "admin@kenyaopinionpolls.com";
  const password = "Admin@123456";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: {
      email,
    },
    update: {
      passwordHash,
      isActive: true,
      role: "SUPER_ADMIN",
    },
    create: {
      name: "System Administrator",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);

  return 1;
}

async function main() {
  console.log("==========================================");
  console.log("   KENYA OPINION POLLS - DATABASE SEED");
  console.log("==========================================");

  try {
    const geography = await seedGeography();
    const positions = await seedPositions();
    const admins = await seedAdmin();

    console.log("\n==========================================");
    console.log("       SEED COMPLETED SUCCESSFULLY");
    console.log("==========================================");
    console.log(`Counties:          ${geography.counties}`);
    console.log(`Constituencies:    ${geography.constituencies}`);
    console.log(`Wards:             ${geography.wards}`);
    console.log(`Positions:         ${positions}`);
    console.log(`Admins:             ${admins}`);
    console.log("==========================================\n");
  } catch (error) {
    console.error("\n❌ SEED FAILED\n");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Pilot pharmacy access codes (Geneva). A pharmacy is provisioned here with a
 * memorable code; the patient enters that code in the app (Pharmacy → "I have a
 * pharmacy code") to link it. Orders/refill requests are then emailed to the
 * pharmacy's address in its language.
 *
 * Idempotent: upsert by `code`, never resets usageCount/isActive on re-run.
 */
const PHARMACIES: Array<{
  code: string;
  pharmacyName: string;
  pharmacyEmail: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  pharmacyWebsite?: string;
  language: string;
}> = [
  {
    // Contact details verified against the official pharmacieplus.ch listing
    // (the screenshot's "progres.ge@" / "...53 20" came from a stale Google AI
    // overview that used the old "du Progrès" name — corrected here).
    code: 'PHARMACY-GENEVA-010',
    pharmacyName: 'Pharmacie de Grenus (du Progrès)',
    pharmacyEmail: 'grenus.ge@pharmacieplus.ch',
    pharmacyAddress: 'Place Grenus 12, 1201 Genève, Switzerland',
    pharmacyPhone: '+41 22 732 53 29',
    pharmacyWebsite: 'https://www.pharmacieplus.ch',
    language: 'fr',
  },
];

async function seedPharmacies() {
  console.log('🏥 Seeding pharmacy access codes...');
  for (const p of PHARMACIES) {
    await prisma.pharmacyAccessCode.upsert({
      where: { code: p.code },
      // Keep contact details fresh on re-run, but never reset usage/active flags.
      update: {
        pharmacyName: p.pharmacyName,
        pharmacyEmail: p.pharmacyEmail,
        pharmacyAddress: p.pharmacyAddress,
        pharmacyPhone: p.pharmacyPhone,
        pharmacyWebsite: p.pharmacyWebsite || null,
        language: p.language,
      },
      create: {
        code: p.code,
        pharmacyName: p.pharmacyName,
        pharmacyEmail: p.pharmacyEmail,
        pharmacyAddress: p.pharmacyAddress,
        pharmacyPhone: p.pharmacyPhone,
        pharmacyWebsite: p.pharmacyWebsite || null,
        language: p.language,
      },
    });
    console.log(`   └─ Pharmacy code ensured: ${p.code} → ${p.pharmacyName}`);
  }
  console.log('\n✨ Pharmacy seeding completed!');
}

seedPharmacies()
  .catch((error) => {
    console.error('❌ Pharmacy seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

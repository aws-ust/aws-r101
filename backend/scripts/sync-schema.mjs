import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE applicant_gender AS ENUM (
        'male',
        'female',
        'non_binary',
        'prefer_not_to_say'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sql.unsafe(
    "ALTER TABLE applicants ADD COLUMN IF NOT EXISTS birthday date",
  );
  await sql.unsafe(
    "ALTER TABLE applicants ADD COLUMN IF NOT EXISTS gender applicant_gender",
  );

  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'applications_applicant_id_recruitment_year_unique'
    ) AS exists
  `;
  if (!exists) {
    const dupes = await sql`
      SELECT applicant_id, recruitment_year, COUNT(*)::int AS count
      FROM applications
      GROUP BY applicant_id, recruitment_year
      HAVING COUNT(*) > 1
    `;
    if (dupes.length === 0) {
      await sql.unsafe(`
        ALTER TABLE applications
          ADD CONSTRAINT applications_applicant_id_recruitment_year_unique
          UNIQUE (applicant_id, recruitment_year)
      `);
    } else {
      console.warn(
        "Skipped applications unique constraint: duplicate applicant/year rows exist.",
      );
    }
  }

  console.log("Schema sync complete.");
} finally {
  await sql.end();
}

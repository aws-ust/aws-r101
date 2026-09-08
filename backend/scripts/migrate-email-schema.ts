import postgres from "postgres";
import { generateApplicationCode } from "../src/lib/application-code";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE email_message_type AS ENUM (
        'application_submitted',
        'applicant_otp',
        'interview_booking',
        'result_accepted',
        'result_rejected'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE email_delivery_status AS ENUM ('pending', 'sent', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sql.unsafe(`
    ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS application_code varchar(20);
  `);

  const rows = await sql<{ id: string }[]>`
    SELECT id FROM applications WHERE application_code IS NULL
  `;

  for (const row of rows) {
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = generateApplicationCode();
      try {
        await sql`
          UPDATE applications
          SET application_code = ${code}
          WHERE id = ${row.id} AND application_code IS NULL
        `;
        inserted = true;
      } catch {
        // unique collision — retry
      }
    }
    if (!inserted) {
      throw new Error(`Could not backfill application code for ${row.id}`);
    }
  }

  await sql.unsafe(`
    ALTER TABLE applications
    ALTER COLUMN application_code SET NOT NULL;
  `);

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS applications_application_code_unique
    ON applications (application_code);
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
      message_type email_message_type NOT NULL,
      recipient varchar(255) NOT NULL,
      status email_delivery_status NOT NULL DEFAULT 'pending',
      attempts integer NOT NULL DEFAULT 0,
      provider_message_id text,
      last_error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz
    );
  `);

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_email_notifications_application
    ON email_notifications (application_id);
  `);

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_email_notifications_status_created
    ON email_notifications (status, created_at);
  `);

  console.log("Email schema migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });

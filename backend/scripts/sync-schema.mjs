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
      CREATE TYPE applicant_gender AS ENUM ('male', 'female');
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
  await sql.unsafe(
    "ALTER TABLE applicants ADD COLUMN IF NOT EXISTS student_number varchar(10)",
  );
  await sql.unsafe(
    "ALTER TABLE applicants ADD COLUMN IF NOT EXISTS contact_number varchar(14)",
  );
  await sql.unsafe(
    "ALTER TABLE applicants ADD COLUMN IF NOT EXISTS facebook_url text",
  );

  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'registration';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sql.unsafe(
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS data_privacy_agreed_at timestamptz",
  );
  await sql.unsafe(
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS portfolio_url text",
  );
  await sql.unsafe(
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS github_url text",
  );

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE application_type AS ENUM ('position', 'member');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sql.unsafe(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS application_type application_type NOT NULL DEFAULT 'position'
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TYPE application_type ADD VALUE IF NOT EXISTS 'officer';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sql.unsafe(
    "CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type)",
  );

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE officer_kind AS ENUM ('eb', 'director', 'adviser');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS officer_seats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      application_id uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE cascade,
      recruitment_year integer NOT NULL,
      kind officer_kind NOT NULL,
      seat_key varchar(150) NOT NULL,
      title varchar(150) NOT NULL,
      committee varchar(150),
      sort_order integer NOT NULL DEFAULT 0,
      CONSTRAINT officer_seats_year_seat_unique UNIQUE (recruitment_year, seat_key)
    )
  `);

  await sql.unsafe(
    "ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS file_size_bytes integer NOT NULL DEFAULT 0",
  );
  await sql.unsafe(
    "ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS available_until timestamptz",
  );

  // Recruitment tracks: R101 and the officer hunt run side by side, so one person
  // may hold one application per year in each, and positions carry their track.
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE recruitment_track AS ENUM ('r101', 'officer_hunt');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TYPE officer_kind ADD VALUE IF NOT EXISTS 'ea';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sql.unsafe(
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS track recruitment_track NOT NULL DEFAULT 'r101'",
  );
  await sql.unsafe(
    "ALTER TABLE positions ADD COLUMN IF NOT EXISTS track recruitment_track NOT NULL DEFAULT 'r101'",
  );
  await sql.unsafe(
    "ALTER TABLE positions ADD COLUMN IF NOT EXISTS seat_kind officer_kind",
  );
  await sql.unsafe(
    "ALTER TABLE interview_slots ADD COLUMN IF NOT EXISTS track recruitment_track NOT NULL DEFAULT 'r101'",
  );
  await sql.unsafe(
    "CREATE INDEX IF NOT EXISTS idx_applications_track ON applications(track)",
  );
  await sql.unsafe(
    "ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_applicant_id_recruitment_year_unique",
  );
  await sql.unsafe(
    "ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_committee_id_name_unique",
  );
  for (const [table, name, columns] of [
    ["applications", "applications_applicant_year_track_unique", "applicant_id, recruitment_year, track"],
    ["positions", "positions_committee_name_track_unique", "committee_id, name, track"],
  ]) {
    const [{ present }] = await sql`
      SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ${name}) AS present
    `;
    if (present) continue;
    try {
      await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE (${columns})`);
    } catch (error) {
      console.warn(`Skipped ${name}: ${error.message}`);
    }
  }
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS officer_hunt_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      singleton integer DEFAULT 1 NOT NULL,
      term_year integer NOT NULL,
      applications_open_at timestamptz,
      applications_close_at timestamptz,
      interviews_start_at timestamptz,
      interviews_end_at timestamptz,
      updated_by uuid REFERENCES users(id) ON DELETE set null,
      updated_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT officer_hunt_settings_singleton_unique UNIQUE (singleton),
      CONSTRAINT officer_hunt_settings_singleton_check CHECK (singleton = 1),
      CONSTRAINT officer_hunt_settings_term_year_check CHECK (term_year BETWEEN 2000 AND 9999)
    )
  `);

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE upload_session_status AS ENUM ('active', 'consumed', 'expired');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS upload_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      status upload_session_status NOT NULL DEFAULT 'active',
      application_id uuid REFERENCES applications(id) ON DELETE set null,
      resume_file_name varchar(255) NOT NULL,
      resume_size_bytes integer NOT NULL,
      resume_checksum_sha256 varchar(44) NOT NULL,
      registration_file_name varchar(255) NOT NULL,
      registration_size_bytes integer NOT NULL,
      registration_checksum_sha256 varchar(44) NOT NULL,
      upload_expires_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      consumed_at timestamptz
    )
  `);

  await sql.unsafe(
    "ALTER TABLE upload_sessions DROP COLUMN IF EXISTS transcript_file_name",
  );
  await sql.unsafe(
    "ALTER TABLE upload_sessions DROP COLUMN IF EXISTS transcript_size_bytes",
  );
  await sql.unsafe(
    "ALTER TABLE upload_sessions DROP COLUMN IF EXISTS transcript_checksum_sha256",
  );

  await sql.unsafe(
    "CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status)",
  );
  await sql.unsafe(
    "CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at ON upload_sessions(expires_at)",
  );

  const [{ uploadSessionsUniqueExists }] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'upload_sessions_application_id_unique'
    ) AS "uploadSessionsUniqueExists"
  `;
  if (!uploadSessionsUniqueExists) {
    await sql.unsafe(`
      ALTER TABLE upload_sessions
        ADD CONSTRAINT upload_sessions_application_id_unique UNIQUE (application_id)
    `);
  }

  await sql.unsafe(
    "ALTER TABLE interview_bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz",
  );
  await sql.unsafe(
    "ALTER TABLE interview_bookings ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz",
  );

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS interview_windows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      singleton integer DEFAULT 1 NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      updated_by uuid REFERENCES users(id) ON DELETE set null,
      updated_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT interview_windows_singleton_unique UNIQUE (singleton),
      CONSTRAINT interview_windows_singleton_check CHECK (singleton = 1),
      CONSTRAINT interview_windows_range_check CHECK (ends_at > starts_at)
    )
  `);

  for (const value of [
    "interview_reminder_24h",
    "interview_reminder_1h",
    "officer_application_notice",
    "officer_first_choice_left",
    "officer_first_choice_joined",
    "officer_interview_rescheduled",
    "applicant_dev_exam",
    "member_registration",
    "membership_verified",
    "officer_welcome",
    "payment_deadline_extended",
    "payment_resubmission_needed",
  ]) {
    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TYPE email_message_type ADD VALUE IF NOT EXISTS '${value}';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  console.log("Schema sync complete.");
} finally {
  await sql.end();
}

import {Pool, type PoolClient} from "pg";

export type OnboardingStatus = "active" | "inactive" | "pending_approval" | "failed";
export type ResolveFlow = "ACTIVE" | "FORM_REQUIRED" | "PENDING_ONLY" | "PROVIDER_CONFLICT" | "INACTIVE";

export type SocialProvider = "google" | "facebook" | "linkedin" | "azure-ad";

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  companyId: string;
  countryCode: string;
  country: string;
  department: string;
  city: string;
  dni: string;
  birthDate: string;
  gender: string;
  status: OnboardingStatus;
  provider: SocialProvider;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingSubmitInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyId: string;
  countryCode: string;
  country: string;
  department: string;
  city: string;
  dni: string;
  birthDate: string;
  gender: string;
  provider: SocialProvider;
  avatar?: string;
  metadata?: any;
};

export type OnboardingCancelInput = {
  email: string;
  provider: SocialProvider;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyId?: string;
  countryCode?: string;
  country?: string;
  department?: string;
  city?: string;
  dni?: string;
  birthDate?: string;
  gender?: string;
  avatar?: string;
  metadata?: any;
};

type CatalogDb = {
  companies: Array<{id: string; name: string}>;
  countries: Array<{code: string; label: string; prefixArea: string}>;
  departmentsByCountry: Record<string, Array<{code: string; label: string}>>;
  citiesByDepartment: Record<string, Array<{code: string; label: string}>>;
  multidataByGroup: Record<string, Array<{value: string; label: string}>>;
};

const defaultCatalogDb: CatalogDb = {
  companies: [
    {id: "company-generic-su", name: "Compania Generica SU"},
    {id: "company-demo-001", name: "Company Demo 001"}
  ],
  countries: [
    {code: "CO", label: "Colombia", prefixArea: "+57"},
    {code: "MX", label: "Mexico", prefixArea: "+52"}
  ],
  departmentsByCountry: {},
  citiesByDepartment: {},
  multidataByGroup: {
    gender: [
      {value: "male", label: "Masculino"},
      {value: "female", label: "Femenino"},
      {value: "other", label: "Otro"}
    ],
    countryCode: [
      {value: "+57", label: "+57"},
      {value: "+52", label: "+52"}
    ]
  }
};

const REQUIRED_USER_STATUS_VALUES = [
  {value: "active", label: "Activo"},
  {value: "inactive", label: "Inactivo"},
  {value: "pending_approval", label: "Pendiente de aprobacion"},
  {value: "failed", label: "Fallido"}
];

let pool: Pool | null = null;

function normalizePgConnectionString(raw: string) {
  try {
    const url = new URL(raw);
    const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
    const useLibpqCompat = url.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";
    if (!useLibpqCompat && (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca")) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({connectionString: normalizePgConnectionString(connectionString)});
  }
  return pool;
}

function normalizeStatus(status: string | null | undefined): OnboardingStatus {
  const raw = String(status ?? "").trim().toLowerCase();
  if (raw === "active") return "active";
  if (raw === "pending_approval") return "pending_approval";
  if (raw === "failed") return "failed";
  return "inactive";
}

function mapRowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id_user_pk),
    email: String(row.user_email),
    firstName: String(row.name ?? ""),
    lastName: String(row.last_name ?? ""),
    fullName: `${String(row.name ?? "")} ${String(row.last_name ?? "")}`.trim(),
    phone: String(row.phone_number ?? ""),
    companyId: String(row.companyId ?? ""),
    countryCode: String(row.country_code),
    country: String(row.country_iso ?? ""),
    department: String(row.department_code ?? ""),
    city: String(row.city_code ?? ""),
    dni: String(row.dni),
    birthDate: String(row.birth_date),
    gender: String(row.gender),
    status: normalizeStatus(String(row.status)),
    provider: String(row.provider ?? "google") as SocialProvider,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

let userStatusCatalogPromise: Promise<void> | undefined;

function ensureUserStatusCatalog() {
  userStatusCatalogPromise ??= seedUserStatusCatalog().catch((error) => {
    userStatusCatalogPromise = undefined;
    throw error;
  });
  return userStatusCatalogPromise;
}

async function seedUserStatusCatalog() {
  const rows = await getPool().query('SELECT value FROM "st_Multidata" WHERE type=$1', ["userStatus"]);
  const existing = new Set(rows.rows.map((row) => String(row.value).toLowerCase()));

  for (const item of REQUIRED_USER_STATUS_VALUES) {
    if (!existing.has(item.value)) {
      await getPool().query(
        'INSERT INTO "st_Multidata" ("Initials_PK", name, value, type, "typeDescription", "typeUse", created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT (value, type) DO NOTHING',
        [item.value, item.label, item.value, "userStatus", "Estado de usuario onboarding", "Admin"]
      );
    }
  }
}


type CatalogCache = {
  data: CatalogDb;
  expiresAt: number;
} | null;

let catalogCache: CatalogCache = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateCatalogCache() {
  catalogCache = null;
}

async function readCatalogDb(): Promise<CatalogDb> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.data;
  }

  try {
    const [companyRows, multidataRows, countryRows, stateRows, cityRows] = await Promise.all([
      getPool().query('SELECT id, "commercialName" FROM "Company" ORDER BY "commercialName" ASC'),
      getPool().query('SELECT name, value, type FROM "st_Multidata"'),
      getPool().query('SELECT prefix_area, iso, nombre FROM "st_Country"'),
      getPool().query('SELECT id_state, state, iso_country FROM "st_State"'),
      getPool().query('SELECT id_city, city, iso_country, state_id FROM "st_City"')
    ]);

    const rowsToStrings = (value: unknown) => String(value ?? "").trim();
    const countries = countryRows.rows
      .map((row) => {
        const prefixRaw = rowsToStrings(row.prefix_area);
        const prefixArea = prefixRaw.length > 0 ? `+${prefixRaw.replace(/^\+/, "")}` : "";
        return {code: rowsToStrings(row.iso), label: rowsToStrings(row.nombre), prefixArea};
      })
      .filter((row) => row.code.length > 0);

    const departmentsByCountry: Record<string, Array<{code: string; label: string}>> = {};
    for (const row of stateRows.rows) {
      const countryCode = rowsToStrings(row.iso_country);
      const code = rowsToStrings(row.id_state);
      const label = rowsToStrings(row.state);
      if (!countryCode || !code || !label) continue;
      departmentsByCountry[countryCode] ??= [];
      departmentsByCountry[countryCode].push({code, label});
    }

    const citiesByDepartment: Record<string, Array<{code: string; label: string}>> = {};
    for (const row of cityRows.rows) {
      const stateCode = rowsToStrings(row.state_id);
      const code = rowsToStrings(row.id_city);
      const label = rowsToStrings(row.city);
      if (!stateCode || !code || !label) continue;
      citiesByDepartment[stateCode] ??= [];
      citiesByDepartment[stateCode].push({code, label});
    }

    const multidataByGroup: Record<string, Array<{value: string; label: string}>> = {};
    for (const row of multidataRows.rows) {
      const group = rowsToStrings(row.type);
      const value = rowsToStrings(row.value);
      const label = rowsToStrings(row.name);
      if (!group || !value || !label) continue;
      multidataByGroup[group] ??= [];
      multidataByGroup[group].push({value, label});
    }

    const companies = companyRows.rows.map((row) => ({
      id: String(row.id),
      name: String(row.commercialName ?? row.id)
    }));

    const result: CatalogDb = {
      companies: companies.length > 0 ? companies : defaultCatalogDb.companies,
      countries: countries.length > 0 ? countries : defaultCatalogDb.countries,
      departmentsByCountry: Object.keys(departmentsByCountry).length > 0 ? departmentsByCountry : defaultCatalogDb.departmentsByCountry,
      citiesByDepartment: Object.keys(citiesByDepartment).length > 0 ? citiesByDepartment : defaultCatalogDb.citiesByDepartment,
      multidataByGroup: Object.keys(multidataByGroup).length > 0 ? multidataByGroup : defaultCatalogDb.multidataByGroup
    };

    catalogCache = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    return result;
  } catch {
    return defaultCatalogDb;
  }
}


function assertCatalogValue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function getCatalogCompanies() {
  const db = await readCatalogDb();
  return db.companies;
}

export async function getCatalogCountries() {
  const db = await readCatalogDb();
  return db.countries;
}

export async function getCatalogDepartments(countryCode: string) {
  const db = await readCatalogDb();
  return db.departmentsByCountry[countryCode] ?? [];
}

export async function getCatalogCities(departmentCode: string, countryCode?: string) {
  const db = await readCatalogDb();
  const cities = db.citiesByDepartment[departmentCode] ?? [];
  if (!countryCode) return cities;
  const validDepartmentCodes = new Set((db.departmentsByCountry[countryCode] ?? []).map((item) => item.code));
  return validDepartmentCodes.has(departmentCode) ? cities : [];
}

export async function getCatalogMultidata(group: string) {
  const db = await readCatalogDb();
  return db.multidataByGroup[group] ?? [];
}

const ONBOARDING_STATUS_SQL = 'lower(btrim("status"))';
const CURRENT_ONBOARDING_SQL = `${ONBOARDING_STATUS_SQL} IN ('pending_approval', 'active')`;
const ONBOARDING_ORDER_SQL = `ORDER BY CASE ${ONBOARDING_STATUS_SQL}
  WHEN 'pending_approval' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
  COALESCE("updated_at", "created_at") DESC NULLS LAST, "created_at" DESC NULLS LAST, "id"`;

async function withOnboardingWrite<T>(email: string, write: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // The same email can have requests for multiple companies, including no company.
    await client.query("SELECT pg_advisory_xact_lock(1, hashtext($1))", [email]);
    const result = await write(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readOnboardingForWrite(client: PoolClient, email: string, companyId: string | null) {
  const {rows} = await client.query(
    `SELECT "id", "email", "status", "provider", "companyId", "country_code", "dni",
            (${CURRENT_ONBOARDING_SQL}) AS is_current
       FROM "Onboarding"
      WHERE lower("email")=lower($1)
        AND (${CURRENT_ONBOARDING_SQL} OR "companyId" IS NOT DISTINCT FROM $2)
      ${ONBOARDING_ORDER_SQL} FOR UPDATE`,
    [email, companyId]
  );
  return {
    current: rows[0]?.is_current ? rows[0] : undefined,
    target: rows.find((row) => row.companyId === companyId)
  };
}

export async function resolveSocialOnboarding(email: string, provider: SocialProvider): Promise<{flow: ResolveFlow; user: UserRecord | null}> {
  // 1. Check PlatformUser first
  const userRow = await getPool().query('SELECT * FROM "PlatformUser" WHERE lower("user_email")=lower($1) LIMIT 1', [email]);
  if ((userRow.rowCount ?? 0) > 0) {
    const user = mapRowToUser(userRow.rows[0]);
    if (user.status === "inactive") {
      return {flow: "INACTIVE", user};
    }
    if (user.provider !== provider) {
      return {flow: "PROVIDER_CONFLICT", user};
    }
    if (user.status === "pending_approval") {
      return {flow: "PENDING_ONLY", user};
    }
    return {flow: user.status === "active" ? "ACTIVE" : "FORM_REQUIRED", user};
  }

  // 2. Check Onboarding table
  const onboardingRow = await getPool().query(
    `SELECT * FROM "Onboarding" WHERE lower("email")=lower($1) AND ${CURRENT_ONBOARDING_SQL}
     ${ONBOARDING_ORDER_SQL} LIMIT 1`,
    [email]
  );
  if ((onboardingRow.rowCount ?? 0) > 0) {
    const ob = onboardingRow.rows[0];
    const obProvider = ob.provider as SocialProvider;
    
    const obUser: UserRecord = {
      id: String(ob.id),
      email: String(ob.email),
      firstName: String(ob.name ?? ""),
      lastName: String(ob.last_name ?? ""),
      fullName: `${String(ob.name ?? "")} ${String(ob.last_name ?? "")}`.trim(),
      phone: String(ob.phone_number ?? ""),
      companyId: String(ob.companyId ?? ""),
      countryCode: String(ob.country_code ?? ""),
      country: String(ob.country_iso ?? ""),
      department: String(ob.department_code ?? ""),
      city: String(ob.city_code ?? ""),
      dni: String(ob.dni ?? ""),
      birthDate: ob.birth_date ? new Date(ob.birth_date).toISOString() : "",
      gender: String(ob.gender ?? ""),
      status: normalizeStatus(String(ob.status)),
      provider: obProvider,
      avatar: ob.avatar ? String(ob.avatar) : undefined,
      createdAt: new Date(ob.created_at).toISOString(),
      updatedAt: new Date(ob.updated_at).toISOString()
    };

    if (obProvider !== provider) {
      return {flow: "PROVIDER_CONFLICT", user: obUser};
    }
    // Access still requires a corresponding active PlatformUser.
    return {flow: "PENDING_ONLY", user: obUser};
  }

  return {flow: "FORM_REQUIRED", user: null};
}

export async function submitSocialOnboarding(input: OnboardingSubmitInput) {
  await ensureUserStatusCatalog();

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedDni = input.dni.trim();
  const allRequired = [
    input.firstName,
    input.lastName,
    input.phone,
    input.companyId,
    input.countryCode,
    input.country,
    input.department,
    input.city,
    normalizedDni,
    input.birthDate,
    input.gender,
    normalizedEmail
  ].every((value) => value.trim().length > 0);
  if (!allRequired) {
    throw new Error("All required fields must be provided");
  }

  const catalogs = await readCatalogDb();
  const validCountryCodes = new Set<string>([
    ...(catalogs.multidataByGroup.countryCode ?? []).map((item) => item.value),
    ...catalogs.countries.map((item) => item.prefixArea)
  ]);
  assertCatalogValue(catalogs.companies.some((c) => c.id === input.companyId), "Invalid company");
  assertCatalogValue(validCountryCodes.has(input.countryCode), "Invalid country code");
  assertCatalogValue(catalogs.countries.some((item) => item.code === input.country), "Invalid country");
  assertCatalogValue((catalogs.departmentsByCountry[input.country] ?? []).some((item) => item.code === input.department), "Invalid department");
  assertCatalogValue((catalogs.citiesByDepartment[input.department] ?? []).some((item) => item.code === input.city), "Invalid city");
  assertCatalogValue((catalogs.multidataByGroup.gender ?? []).some((item) => item.value === input.gender), "Invalid gender");

  return withOnboardingWrite(normalizedEmail, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(2, hashtext($1))", [JSON.stringify([input.countryCode, normalizedDni])]);

    const duplicateUser = await client.query(
      'SELECT "provider" FROM "PlatformUser" WHERE "country_code"=$1 AND "dni"=$2 AND lower("user_email")<>lower($3) LIMIT 1',
      [input.countryCode, normalizedDni, normalizedEmail]
    );
    const duplicateOnboarding = await client.query(
      `SELECT "provider" FROM "Onboarding"
       WHERE "country_code"=$1 AND "dni"=$2 AND lower("email")<>lower($3)
         AND ${ONBOARDING_STATUS_SQL} IS DISTINCT FROM 'failed'
       ${ONBOARDING_ORDER_SQL} LIMIT 1`,
      [input.countryCode, normalizedDni, normalizedEmail]
    );
    if ((duplicateUser.rowCount ?? 0) > 0) {
      const existingProvider = duplicateUser.rows[0].provider || "google";
      throw new Error(`DNI_CONFLICT:${existingProvider}`);
    }
    if ((duplicateOnboarding.rowCount ?? 0) > 0) {
      const existingProvider = duplicateOnboarding.rows[0].provider || "google";
      throw new Error(`DNI_CONFLICT:${existingProvider}`);
    }

    // Verify that the user is not already fully active in PlatformUser
    const existingUserResult = await client.query('SELECT * FROM "PlatformUser" WHERE lower("user_email")=lower($1) LIMIT 1', [normalizedEmail]);
    if ((existingUserResult.rowCount ?? 0) > 0) {
      throw new Error("User is already fully registered on the platform");
    }

    const {current, target} = await readOnboardingForWrite(client, normalizedEmail, input.companyId);
    if (current && current.provider !== input.provider) {
      throw new Error(`User already linked with provider ${current.provider}`);
    }
    if (current && (current.id !== target?.id || normalizeStatus(current.status) === "active")) {
      throw new Error("User already has an onboarding request");
    }

    const id = target?.id ?? nextId("ONB");
    const previousStatus = target ? normalizeStatus(target.status) : null;

    // A failed request can still occupy the unique document/company key.
    await client.query(
      `UPDATE "Onboarding"
          SET "metadata"=COALESCE("metadata", '{}'::jsonb) || jsonb_build_object('releasedDni', "dni"),
              "dni"=NULL
        WHERE "country_code"=$1 AND "dni"=$2 AND "companyId"=$3 AND "id"<>$4
          AND ${ONBOARDING_STATUS_SQL}='failed'`,
      [input.countryCode, normalizedDni, input.companyId, id]
    );

    const birthDateValue = input.birthDate ? input.birthDate : null;
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    const saved = await client.query(
      `
        INSERT INTO "Onboarding" (
          "id","email","name","last_name","phone_number","companyId","country_code","country_iso","department_code","city_code","dni","birth_date","gender","status","provider","avatar","metadata","created_at","updated_at"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "name"=EXCLUDED."name",
          "last_name"=EXCLUDED."last_name",
          "phone_number"=EXCLUDED."phone_number",
          "country_code"=EXCLUDED."country_code",
          "country_iso"=EXCLUDED."country_iso",
          "department_code"=EXCLUDED."department_code",
          "city_code"=EXCLUDED."city_code",
          "dni"=EXCLUDED."dni",
          "birth_date"=EXCLUDED."birth_date",
          "gender"=EXCLUDED."gender",
          "status"=EXCLUDED."status",
          "provider"=EXCLUDED."provider",
          "avatar"=EXCLUDED."avatar",
          "metadata"=EXCLUDED."metadata",
          "updated_at"=NOW()
        WHERE "Onboarding"."email"=EXCLUDED."email"
          AND "Onboarding"."companyId"=EXCLUDED."companyId"
        RETURNING *
      `,
      [
        id,
        target?.email ?? normalizedEmail,
        input.firstName,
        input.lastName,
        input.phone,
        input.companyId,
        input.countryCode,
        input.country,
        input.department,
        input.city,
        normalizedDni,
        birthDateValue,
        input.gender,
        "pending_approval",
        input.provider,
        input.avatar ?? null,
        metadataJson
      ]
    );

    const row = saved.rows[0];
    if (!row) throw new Error("Unable to save onboarding request");

    await client.query(
      `INSERT INTO "AuditLog" (id,"actorType","actorId",action,entity,"entityId",metadata,"createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())`,
      [
        nextId("ONAUDIT"),
        "system",
        normalizedEmail,
        target ? "update-onboarding" : "create-onboarding",
        "Onboarding",
        id,
        JSON.stringify({provider: input.provider, fromStatus: previousStatus, toStatus: "pending_approval"})
      ]
    );

    return {
      id: String(row.id),
      email: String(row.email),
      firstName: String(row.name ?? ""),
      lastName: String(row.last_name ?? ""),
      fullName: `${String(row.name ?? "")} ${String(row.last_name ?? "")}`.trim(),
      phone: String(row.phone_number ?? ""),
      companyId: String(row.companyId ?? ""),
      countryCode: String(row.country_code),
      country: String(row.country_iso ?? ""),
      department: String(row.department_code ?? ""),
      city: String(row.city_code ?? ""),
      dni: String(row.dni),
      birthDate: String(row.birth_date),
      gender: String(row.gender),
      status: normalizeStatus(String(row.status)),
      provider: String(row.provider ?? "google") as SocialProvider,
      avatar: row.avatar ? String(row.avatar) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  });
}

export async function cancelSocialOnboarding(input: OnboardingCancelInput) {
  await ensureUserStatusCatalog();
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedDni = input.dni?.trim() || null;

  await withOnboardingWrite(normalizedEmail, async (client) => {
    const companyId = input.companyId || null;
    const {current, target} = await readOnboardingForWrite(client, normalizedEmail, companyId);
    // Cancellation is an action on the form, which closes once a request is current.
    if (current) return;

    const id = target?.id ?? nextId("ONB");
    const previousStatus = target ? normalizeStatus(target.status) : null;
    let countryCode = input.countryCode || target?.country_code || null;
    let dni = normalizedDni || target?.dni || null;
    if (companyId && countryCode && dni) {
      const occupied = await client.query(
        'SELECT 1 FROM "Onboarding" WHERE "country_code"=$1 AND "dni"=$2 AND "companyId"=$3 AND "id"<>$4 LIMIT 1',
        [countryCode, dni, companyId, id]
      );
      // The duplicate-document dialog also submits the draft on cancellation.
      if (occupied.rows.length > 0) {
        countryCode = target?.country_code ?? countryCode;
        dni = target?.dni ?? null;
      }
    }

    const birthDateValue = input.birthDate ? input.birthDate : null;
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    const saved = await client.query(
      `
        INSERT INTO "Onboarding" (
          "id","email","name","last_name","phone_number","companyId","country_code","country_iso","department_code","city_code","dni","birth_date","gender","status","provider","avatar","metadata","created_at","updated_at"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "name"=COALESCE(EXCLUDED."name", "Onboarding"."name"),
          "last_name"=COALESCE(EXCLUDED."last_name", "Onboarding"."last_name"),
          "phone_number"=COALESCE(EXCLUDED."phone_number", "Onboarding"."phone_number"),
          "country_code"=EXCLUDED."country_code",
          "country_iso"=COALESCE(EXCLUDED."country_iso", "Onboarding"."country_iso"),
          "department_code"=COALESCE(EXCLUDED."department_code", "Onboarding"."department_code"),
          "city_code"=COALESCE(EXCLUDED."city_code", "Onboarding"."city_code"),
          "dni"=EXCLUDED."dni",
          "birth_date"=COALESCE(EXCLUDED."birth_date", "Onboarding"."birth_date"),
          "gender"=COALESCE(EXCLUDED."gender", "Onboarding"."gender"),
          "status"=EXCLUDED."status",
          "provider"=EXCLUDED."provider",
          "avatar"=COALESCE(EXCLUDED."avatar", "Onboarding"."avatar"),
          "metadata"=EXCLUDED."metadata",
          "updated_at"=NOW()
        WHERE "Onboarding"."email"=EXCLUDED."email"
          AND "Onboarding"."companyId" IS NOT DISTINCT FROM EXCLUDED."companyId"
        RETURNING "id"
      `,
      [
        id,
        target?.email ?? normalizedEmail,
        input.firstName || null,
        input.lastName || null,
        input.phone || null,
        companyId,
        countryCode,
        input.country || null,
        input.department || null,
        input.city || null,
        dni,
        birthDateValue,
        input.gender || null,
        "failed",
        input.provider,
        input.avatar || null,
        metadataJson
      ]
    );

    if (!saved.rows[0]) throw new Error("Unable to cancel onboarding request");

    await client.query(
      `INSERT INTO "AuditLog" (id,"actorType","actorId",action,entity,"entityId",metadata,"createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())`,
      [
        nextId("ONAUDIT"),
        "system",
        normalizedEmail,
        "cancel-onboarding",
        "Onboarding",
        id,
        JSON.stringify({provider: input.provider, fromStatus: previousStatus, toStatus: "failed"})
      ]
    );
  });
}

export async function listPendingApprovals() {
  const rows = await getPool().query('SELECT * FROM "Onboarding" WHERE "status"=$1 ORDER BY "created_at" DESC', ["pending_approval"]);
  return rows.rows.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    firstName: String(row.name ?? ""),
    lastName: String(row.last_name ?? ""),
    fullName: `${String(row.name ?? "")} ${String(row.last_name ?? "")}`.trim(),
    phone: String(row.phone_number ?? ""),
    companyId: String(row.companyId ?? ""),
    countryCode: String(row.country_code),
    country: String(row.country_iso ?? ""),
    department: String(row.department_code ?? ""),
    city: String(row.city_code ?? ""),
    dni: String(row.dni),
    birthDate: String(row.birth_date),
    gender: String(row.gender),
    status: normalizeStatus(String(row.status)),
    provider: String(row.provider ?? "google") as SocialProvider,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));
}

export async function updateApprovalStatus(userId: string, actor: string, action: "approve" | "reject", approvalRoleId?: string | null) {
  await ensureUserStatusCatalog();
  
  const current = await getPool().query('SELECT * FROM "Onboarding" WHERE "id"=$1 LIMIT 1', [userId]);
  if ((current.rowCount ?? 0) === 0) {
    throw new Error("Onboarding record not found");
  }
  const ob = current.rows[0];

  const nextStatus = action === "approve" ? "active" : "inactive";

  await getPool().query('UPDATE "Onboarding" SET "status"=$1, "updated_at"=NOW() WHERE "id"=$2', [nextStatus, userId]);

  if (action === "approve") {
    const existingUser = await getPool().query('SELECT * FROM "PlatformUser" WHERE lower("user_email")=lower($1) LIMIT 1', [ob.email]);
    const userAlreadyExists = (existingUser.rowCount ?? 0) > 0;
    const platformUserId = userAlreadyExists ? String(existingUser.rows[0].id_user_pk) : nextId("USR");

    // Resolver el ID del aprobador para asignarlo como jefe inmediato
    const approverRes = await getPool().query(
      'SELECT "id_user_pk" FROM "PlatformUser" WHERE lower("user_email")=lower($1) LIMIT 1',
      [actor]
    );
    const approverId = approverRes.rows.length > 0 ? String(approverRes.rows[0].id_user_pk) : null;

    if (!userAlreadyExists) {
      // Usuario nuevo: crear PlatformUser con empresa principal = la del onboarding
      await getPool().query(
        `
        INSERT INTO "PlatformUser" (
          "id_user_pk","user_email","username","name","last_name","phone_number","companyId","country_code","country_iso","department_code","city_code","dni","birth_date","gender","status","provider","avatar","id_jefe_inm_fk","created_at","updated_at"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()
        )
        `,
        [
          platformUserId,
          ob.email,
          ob.email,
          ob.name,
          ob.last_name,
          ob.phone_number,
          ob.companyId,
          ob.country_code,
          ob.country_iso,
          ob.department_code,
          ob.city_code,
          ob.dni,
          ob.birth_date,
          ob.gender,
          "active",
          ob.provider,
          ob.avatar,
          approverId
        ]
      );
    } else {
      // Usuario existente: NO sobreescribir su PlatformUser.
      // Solo actualizar jefe inmediato y asegurar que esté activo.
      await getPool().query(
        `UPDATE "PlatformUser" SET "status"='active', "id_jefe_inm_fk"=COALESCE($1, "id_jefe_inm_fk"), "updated_at"=NOW() WHERE "id_user_pk"=$2`,
        [approverId, platformUserId]
      );
    }

    await getPool().query(
      `INSERT INTO "AuditLog" (id,"actorType","actorId",action,entity,"entityId",metadata,"createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())`,
      [
        nextId("ONAUDIT"),
        "system",
        actor,
        userAlreadyExists ? "approve-company-association" : "approve-user",
        "PlatformUser",
        platformUserId,
        JSON.stringify({fromStatus: "pending_approval", toStatus: "active", companyId: ob.companyId, isNewUser: !userAlreadyExists})
      ]
    );

    // Determinar roleId: primero el parámetro de la API, luego metadata como fallback
    let roleId: string | null = approvalRoleId || null;
    if (!roleId && ob.metadata) {
      try {
        const meta = typeof ob.metadata === "string" ? JSON.parse(ob.metadata) : ob.metadata;
        roleId = meta?.roleId || null;
      } catch (err) {
        console.error("Error parsing onboarding metadata", err);
      }
    }

    if (roleId) {
      const { calculateRoleAssignmentSecurityHash } = await import("@/server/pgDynamicDbStore");
      const hashPermission = await calculateRoleAssignmentSecurityHash(platformUserId, roleId, ob.companyId);
      const userRoleId = `UR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      await getPool().query(
        `INSERT INTO public."UserRole" (id, platform_user_id, "roleId", hash_permission, company_id, "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (platform_user_id, "roleId", company_id) 
         DO UPDATE SET hash_permission = EXCLUDED.hash_permission`,
        [userRoleId, platformUserId, roleId, hashPermission, ob.companyId]
      );

      // Solo actualizar position si es usuario nuevo (no sobreescribir el cargo existente)
      if (!userAlreadyExists) {
        const roleRow = await getPool().query('SELECT name FROM public."Role" WHERE id = $1 LIMIT 1', [roleId]);
        if (roleRow.rows.length > 0) {
          const roleName = roleRow.rows[0].name;
          await getPool().query('UPDATE public."PlatformUser" SET position = $1 WHERE id_user_pk = $2', [roleName, platformUserId]);
        }
      }
    }
  }

  await getPool().query(
    `INSERT INTO "AuditLog" (id,"actorType","actorId",action,entity,"entityId",metadata,"createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())`,
    [
      nextId("ONAUDIT"),
      "system",
      actor,
      action === "approve" ? "approve-onboarding" : "reject-onboarding",
      "Onboarding",
      userId,
      JSON.stringify({fromStatus: String(ob.status), toStatus: nextStatus})
    ]
  );

  const updated = await getPool().query('SELECT * FROM "Onboarding" WHERE "id"=$1', [userId]);
  const row = updated.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: String(row.name ?? ""),
    lastName: String(row.last_name ?? ""),
    fullName: `${String(row.name ?? "")} ${String(row.last_name ?? "")}`.trim(),
    phone: String(row.phone_number ?? ""),
    companyId: String(row.companyId ?? ""),
    countryCode: String(row.country_code),
    country: String(row.country_iso ?? ""),
    department: String(row.department_code ?? ""),
    city: String(row.city_code ?? ""),
    dni: String(row.dni),
    birthDate: String(row.birth_date),
    gender: String(row.gender),
    status: normalizeStatus(String(row.status)),
    provider: String(row.provider ?? "google") as SocialProvider,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

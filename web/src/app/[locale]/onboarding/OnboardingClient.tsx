"use client";

import {useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode} from "react";
import {signOut} from "next-auth/react";
import {useTranslations} from "next-intl";

type Props = {
  locale: string;
  email: string;
  provider: "google" | "facebook" | "linkedin" | "azure-ad";
  defaultFullName: string;
  defaultAvatar?: string;
  conflictingProvider?: "google" | "facebook" | "linkedin" | "azure-ad" | null;
};

const steps = [
  {title: "personal", fields: ["firstName", "lastName", "dni", "birthDate", "gender"]},
  {title: "contact", fields: ["country", "department", "city", "countryCode", "phone"]},
  {title: "company", fields: ["companyId", "roleId"]}
] as const;

type RequiredField = (typeof steps)[number]["fields"][number];

const fieldClass = "w-full min-w-0 rounded-xl border border-white/20 bg-slate-950/35 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-300 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 disabled:opacity-60 aria-invalid:border-rose-300 [color-scheme:dark]";
const buttonClass = "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60";

export function OnboardingClient({locale, email, provider, defaultFullName, defaultAvatar, conflictingProvider}: Props) {
  const t = useTranslations("onboardingSteps");
  const [companies, setCompanies] = useState<Array<{id: string; name: string}>>([]);
  const [genders, setGenders] = useState<Array<{value: string; label: string}>>([]);
  const [countries, setCountries] = useState<Array<{code: string; label: string; prefixArea?: string}>>([]);
  const [departments, setDepartments] = useState<Array<{code: string; label: string}>>([]);
  const [cities, setCities] = useState<Array<{code: string; label: string}>>([]);
  const [roles, setRoles] = useState<Array<{id: string; name: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "cancel" | null>(null);
  const saving = pendingAction !== null;
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(!!conflictingProvider);
  const [showDniConflictModal, setShowDniConflictModal] = useState(false);
  const [dniConflictProvider, setDniConflictProvider] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [invalidFields, setInvalidFields] = useState<RequiredField[]>([]);
  const focusTarget = useRef<string | null>(null);

  const defaultNameParts = defaultFullName.trim().split(/\s+/).filter(Boolean);
  const defaultFirstName = defaultNameParts.slice(0, 1).join(" ");
  const defaultLastName = defaultNameParts.slice(1).join(" ");

  const [form, setForm] = useState({
    firstName: defaultFirstName,
    lastName: defaultLastName,
    phone: "",
    companyId: "",
    roleId: "",
    countryCode: "",
    country: "",
    department: "",
    city: "",
    dni: "",
    birthDate: "",
    gender: "",
    avatar: (typeof defaultAvatar === "string" ? defaultAvatar : "") as string
  });

  useEffect(() => {
    if (avatarPreview) return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    if (conflictingProvider) return;

    async function loadBaseCatalogs() {
      const cacheKey = "onboarding_bootstrap";
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setCompanies(data.companies ?? []);
            setGenders(data.genders ?? []);
            setCountries(data.countries ?? []);
            return;
          } catch {
            // Ignore parse error
          }
        }
      }

      const response = await fetch("/api/v1/auth/social/onboarding/bootstrap");
      const data = await response.json();

      const uniqueByValue = <T extends {value: string}>(items: T[]) => {
        const seen = new Set<string>();
        return items.filter((item) => {
          if (seen.has(item.value)) return false;
          seen.add(item.value);
          return true;
        });
      };

      const rawGenders = (data.genders ?? []) as Array<{value: string; label: string}>;
      const finalGenders = uniqueByValue(rawGenders);
      setCompanies(data.companies ?? []);
      setGenders(finalGenders);
      setCountries(data.countries ?? []);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            companies: data.companies ?? [],
            genders: finalGenders,
            countries: data.countries ?? []
          })
        );
      }
    }
    void loadBaseCatalogs();
  }, [conflictingProvider]);

  useEffect(() => {
    if (!form.country) {
      return;
    }
    async function loadDepartments() {
      const cacheKey = `onboarding_deps_${form.country}`;
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setDepartments(data ?? []);
            return;
          } catch {
            // Ignore parse error
          }
        }
      }

      const response = await fetch(`/api/v1/auth/social/onboarding/departments?countryCode=${encodeURIComponent(form.country)}`);
      const data = await response.json();
      const items = data.items ?? [];
      setDepartments(items);

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(items));
      }
    }
    void loadDepartments();
  }, [form.country]);

  useEffect(() => {
    if (!form.department) {
      return;
    }
    async function loadCities() {
      const cacheKey = `onboarding_cities_${form.country}_${form.department}`;
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setCities(data ?? []);
            return;
          } catch {
            // Ignore parse error
          }
        }
      }

      const response = await fetch(
        `/api/v1/auth/social/onboarding/cities?countryCode=${encodeURIComponent(form.country)}&departmentCode=${encodeURIComponent(form.department)}`
      );
      const data = await response.json();
      const items = data.items ?? [];
      setCities(items);

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(items));
      }
    }
    void loadCities();
  }, [form.country, form.department]);

  useEffect(() => {
    if (!form.companyId) {
      setRoles([]);
      setForm((p) => ({ ...p, roleId: "" }));
      return;
    }
    async function loadRoles() {
      try {
        const response = await fetch(`/api/v1/auth/social/onboarding/roles?companyId=${encodeURIComponent(form.companyId)}`);
        const data = await response.json();
        setRoles(data.items ?? []);
      } catch (err) {
        console.error("Error loading roles", err);
      }
    }
    void loadRoles();
  }, [form.companyId]);

  useLayoutEffect(() => {
    if (focusTarget.current) {
      document.getElementById(focusTarget.current)?.focus();
      focusTarget.current = null;
    }
  }, [step, invalidFields]);

  const currentStep = steps.at(step) ?? steps[0];
  const isLastStep = step === steps.length - 1;

  function goToStep(nextStep: number) {
    focusTarget.current = "onboarding-step";
    setInvalidFields([]);
    setError(null);
    setStep(nextStep);
  }

  function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploadingAvatar) return;

    const missingFields = currentStep.fields.filter((field) => {
      const {[field]: value} = form;
      return !value.trim();
    });
    if (missingFields.length > 0) {
      focusTarget.current = `onboarding-${missingFields[0]}`;
      setInvalidFields(missingFields);
      return;
    }

    if (isLastStep) {
      void submit();
    } else {
      goToStep(step + 1);
    }
  }

  function renderField(
    field: RequiredField,
    renderControl: (props: {
      id: string;
      value: string;
      className: string;
      "aria-required": true;
      "aria-invalid": boolean;
      "aria-describedby"?: string;
    }) => ReactNode
  ) {
    const id = `onboarding-${field}`;
    const {[field]: value} = form;
    const invalid = invalidFields.includes(field) && !value.trim();
    return (
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium">
          {t(`fields.${field}`)} <span className="font-normal text-slate-300">{t("required")}</span>
        </label>
        {renderControl({
          id,
          value,
          className: fieldClass,
          "aria-required": true,
          "aria-invalid": invalid,
          "aria-describedby": invalid ? `${id}-error` : undefined
        })}
        {invalid && (
          <p id={`${id}-error`} className="text-sm text-rose-200">
            {t(field === "countryCode" ? "missingCountryCode" : "missingField")}
          </p>
        )}
      </div>
    );
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setUploadingAvatar(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/auth/social/onboarding/avatar", {
        method: "POST",
        body: formData
      });

      const resBody = await response.json();
      if (!response.ok) {
        throw new Error(resBody.message || "Error al subir la imagen");
      }

      setForm((prev) => ({ ...prev, avatar: resBody.url }));
      setAvatarPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  async function submit() {
    setPendingAction("save");
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/social/onboarding/submit", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          email,
          provider,
          ...form,
          phone: form.phone,
          metadata: {
            roleId: form.roleId
          }
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setPendingAction(null);
        if (data.message && data.message.startsWith("DNI_CONFLICT:")) {
          const parts = data.message.split(":");
          const confProvider = parts[1] || "google";
          setDniConflictProvider(confProvider);
          setShowDniConflictModal(true);
          return;
        }
        setError(t("saveError"));
        return;
      }

      window.location.href = `/${locale}/pending-approval`;
    } catch {
      setError(t("saveError"));
      setPendingAction(null);
    }
  }

  async function handleCancel() {
    setPendingAction("cancel");
    setError(null);
    try {
      if (conflictingProvider) {
        await signOut({callbackUrl: `/${locale}`});
        return;
      }

      const response = await fetch("/api/v1/auth/social/onboarding/cancel", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          email,
          provider,
          ...form,
          phone: form.phone
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "No fue posible cancelar el registro");
      }
      await signOut({callbackUrl: `/${locale}`});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar el registro");
      setPendingAction(null);
    }
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-y-auto bg-cover bg-center bg-no-repeat py-8 px-4 flex items-center justify-center text-white"
      style={{backgroundImage: "url('/images/onboarding-brackgorund.png')"}}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />

      <main className="relative z-10 my-auto w-full max-w-xl">
        <section className="rounded-3xl border border-white/15 bg-slate-950/80 p-5 shadow-xl backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("description")}</p>

          <div className="mt-6 border-t border-white/15 pt-5">
            <h2 id="onboarding-step" tabIndex={-1} className="text-base font-semibold text-cyan-100">
              {t("progress", {current: step + 1, total: steps.length, title: t(currentStep.title)})}
            </h2>
            <div
              role="progressbar"
              aria-labelledby="onboarding-step"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={step + 1}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"
            >
              <div
                className="h-full origin-left rounded-full bg-cyan-300 transition-transform duration-200 motion-reduce:transition-none"
                style={{transform: `scaleX(${(step + 1) / steps.length})`}}
              />
            </div>
          </div>

          <form noValidate onSubmit={handleStepSubmit} aria-labelledby="onboarding-step" className="mt-5">
            <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
              {step === 0 && (
                <>
                  {renderField("firstName", (props) => (
                    <input {...props} autoComplete="given-name" onChange={(e) => setForm((p) => ({...p, firstName: e.target.value}))} />
                  ))}
                  {renderField("lastName", (props) => (
                    <input {...props} autoComplete="family-name" onChange={(e) => setForm((p) => ({...p, lastName: e.target.value}))} />
                  ))}
                  <div className="sm:col-span-2">
                    {renderField("dni", (props) => (
                      <input {...props} onChange={(e) => setForm((p) => ({...p, dni: e.target.value}))} />
                    ))}
                  </div>
                  {renderField("birthDate", (props) => (
                    <input {...props} type="date" autoComplete="bday" onChange={(e) => setForm((p) => ({...p, birthDate: e.target.value}))} />
                  ))}
                  {renderField("gender", (props) => (
                    <select {...props} onChange={(e) => setForm((p) => ({...p, gender: e.target.value}))}>
                      <option value="">{t("selectOption")}</option>
                      {genders.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  ))}
                  <div className="flex min-w-0 items-center gap-3 border-t border-white/15 pt-4 sm:col-span-2">
                    <div aria-hidden="true" className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-300/15 text-sm font-semibold text-cyan-100">
                      {avatarPreview || /^(https?:\/\/|\/)/.test(form.avatar) ? (
                        <img src={avatarPreview ?? form.avatar} alt="" className="size-full object-cover" />
                      ) : (
                        `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label htmlFor="avatar-file-input" className="block text-sm font-medium">{t("photo")}</label>
                      <input
                        id="avatar-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="block w-full min-w-0 rounded-lg text-sm text-slate-300 file:me-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2 file:py-2 file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
                      />
                      {uploadingAvatar && <p role="status" className="text-sm text-slate-300">{t("uploadingPhoto")}</p>}
                      {defaultAvatar && form.avatar !== defaultAvatar && (
                        <button
                          type="button"
                          disabled={uploadingAvatar}
                          onClick={() => {
                            setAvatarPreview(null);
                            setForm((p) => ({...p, avatar: defaultAvatar}));
                          }}
                          className="rounded text-sm text-cyan-200 underline underline-offset-4"
                        >
                          {t("useSocialPhoto")}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {renderField("country", (props) => (
                    <select
                      {...props}
                      autoComplete="country"
                      onChange={(e) => {
                        const nextCountry = e.target.value;
                        const selectedCountry = countries.find((item) => item.code === nextCountry);
                        setDepartments([]);
                        setCities([]);
                        setForm((p) => ({
                          ...p,
                          country: nextCountry,
                          countryCode: selectedCountry?.prefixArea ?? p.countryCode,
                          department: "",
                          city: ""
                        }));
                      }}
                    >
                      <option value="">{t("selectOption")}</option>
                      {countries.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                  ))}
                  {renderField("department", (props) => (
                    <select
                      {...props}
                      autoComplete="address-level1"
                      onChange={(e) => {
                        setCities([]);
                        setForm((p) => ({...p, department: e.target.value, city: ""}));
                      }}
                    >
                      <option value="">{t("selectOption")}</option>
                      {departments.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                  ))}
                  {renderField("city", (props) => (
                    <select {...props} autoComplete="address-level2" onChange={(e) => setForm((p) => ({...p, city: e.target.value}))}>
                      <option value="">{t("selectOption")}</option>
                      {cities.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                  ))}
                  {renderField("countryCode", (props) => <input {...props} readOnly />)}
                  {renderField("phone", (props) => (
                    <input
                      {...props}
                      type="tel"
                      autoComplete="tel-national"
                      onChange={(e) => setForm((p) => ({...p, phone: e.target.value.replace(/\D/g, "")}))}
                    />
                  ))}
                </>
              )}

              {isLastStep && (
                <>
                  {renderField("companyId", (props) => (
                    <select {...props} onChange={(e) => setForm((p) => ({...p, companyId: e.target.value}))}>
                      <option value="">{t("selectOption")}</option>
                      {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  ))}
                  {renderField("roleId", (props) => (
                    <select {...props} disabled={!form.companyId} onChange={(e) => setForm((p) => ({...p, roleId: e.target.value}))}>
                      <option value="">{t(form.companyId ? "selectOption" : "selectCompanyFirst")}</option>
                      {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  ))}
                </>
              )}
            </fieldset>

            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/25 bg-rose-950/60 px-3 py-2 text-sm text-rose-100">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/15 pt-4">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className={`${buttonClass} w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200 sm:w-auto`}
              >
                {pendingAction === "save" ? t("saving") : t(isLastStep ? "submit" : "next")}
              </button>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2 sm:justify-end">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => goToStep(step - 1)}
                    disabled={saving}
                    className={`${buttonClass} border border-white/20 hover:bg-white/10`}
                  >
                    {t("back")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving || uploadingAvatar}
                  onClick={() => void handleCancel()}
                  className={`${buttonClass} text-slate-300 hover:bg-white/10 hover:text-white`}
                >
                  {pendingAction === "cancel" ? t("cancelling") : t("cancel")}
                </button>
              </div>
            </div>
            <p role="status" className="sr-only">{pendingAction === "save" ? t("saving") : ""}</p>
          </form>
        </section>
      </main>

      {showConflictModal && conflictingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md liquid-card rounded-[2rem] p-6 sm:p-8 text-white">
            <span className="pointer-events-none absolute inset-[1px] rounded-[1.95rem] border-2 border-white/20" />
            <span className="pointer-events-none absolute inset-[1px] rounded-[1.95rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-12px_28px_rgba(255,255,255,0.05),0_18px_40px_rgba(2,23,56,0.2)]" />
            
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-amber-400 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold mb-2">Registro existente</h2>
              
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Tu correo electrónico ya está registrado en Relum con la red social{" "}
                <span className="font-semibold text-sky-300">
                  {conflictingProvider === "google"
                    ? "Google"
                    : conflictingProvider === "facebook"
                    ? "Facebook"
                    : conflictingProvider === "azure-ad"
                    ? "Microsoft"
                    : "LinkedIn"}
                </span>
                .
              </p>

              <div className="w-full">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void handleCancel();
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:from-cyan-500 active:to-blue-600 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Procesando..." : "Ir a iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDniConflictModal && dniConflictProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md liquid-card rounded-[2rem] p-6 sm:p-8 text-white">
            <span className="pointer-events-none absolute inset-[1px] rounded-[1.95rem] border-2 border-white/20" />
            <span className="pointer-events-none absolute inset-[1px] rounded-[1.95rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-12px_28px_rgba(255,255,255,0.05),0_18px_40px_rgba(2,23,56,0.2)]" />
            
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-amber-400 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold mb-2">DNI ya registrado</h2>
              
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Este DNI ya se encuentra registrado con la red social{" "}
                <span className="font-semibold text-sky-300">
                  {dniConflictProvider === "google"
                    ? "Google"
                    : dniConflictProvider === "facebook"
                    ? "Facebook"
                    : "LinkedIn"}
                </span>
                . Cancela este registro e ingresa con esa red social.
              </p>

              <div className="w-full">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void handleCancel();
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:from-cyan-500 active:to-blue-600 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Procesando..." : "Ir a iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { signOut, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { selectSidebarModulesFromDbRows, type DynamicModuleNav } from "@/lib/sidebar-access";
import { getSecureItem, setSecureItem } from "@/lib/secure-store";

type SidebarMode = "compact" | "auto" | "fixed";

const mobileTabLabels = {
  "/home": "home",
  "/dashboard": "dashboard",
  "/companies": "companies",
  "/users": "users",
  "/setting": "settings",
  "/workflow": "workflow",
  "/pending-users": "pendingUsers",
} as const;

function isImageIcon(value: string) {
  const icon = value.trim().toLowerCase();
  return icon.startsWith("data:image/") || icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/");
}

function normalizeTextIcon(value: string) {
  const icon = value.trim();
  if (icon.length === 1 || icon.length === 2) return icon;
  return "◦";
}

type ProtectedSidebarLayoutProps = {
  locale: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  actorId: string;
  actorRole: "SU" | "cliente" | string;
  companyId?: string | null;
  companyName?: string | null;
  userCargo?: string | null;
  roleScope?: string | null;
  initialModules?: DynamicModuleNav[];
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

// Persistent client-side flag to identify if hydration has already occurred.
// This prevents layout shift and animation flashes on subsequent client-side navigations.
let globalHasHydrated = false;

export function ProtectedSidebarLayout({
  locale,
  userName,
  userEmail,
  userImage,
  actorId,
  actorRole,
  companyId = null,
  companyName = null,
  userCargo = null,
  roleScope = null,
  initialModules,
  title,
  children
}: ProtectedSidebarLayoutProps) {
  const pathname = usePathname();
  const mobileMenuText = useTranslations("mobileMenu");
  const sidebarId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath !== null && mobileMenuPath === pathname;
  if (mobileMenuPath !== null && !mobileMenuOpen) setMobileMenuPath(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const menuButton = menuButtonRef.current;
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuPath(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileMenuPath(null);
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    // El panel pasa de invisible a visible con una transición: se enfoca en el siguiente cuadro,
    // cuando ya es visible (un elemento invisible no puede recibir el foco).
    let focusFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => closeMenuButtonRef.current?.focus({ preventScroll: true }));
    });
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      cancelAnimationFrame(focusFrame);
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = originalOverflow;
      if (!desktop.matches) menuButton?.focus({ preventScroll: true });
    };
  }, [mobileMenuOpen]);

  const [mode, setMode] = useState<SidebarMode>(() => {
    if (globalHasHydrated && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sidebar_pref_mode") as SidebarMode | null;
        if (saved && ["compact", "auto", "fixed"].includes(saved)) {
          return saved;
        }
      } catch { }
    }
    return "fixed";
  });
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [darkPanel, setDarkPanel] = useState<boolean>(() => {
    if (globalHasHydrated && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sidebar_pref_dark_panel");
        if (saved !== null) return saved === "true";
      } catch { }
    }
    return true;
  });
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [automaticTheme, setAutomaticTheme] = useState<boolean>(() => {
    if (globalHasHydrated && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sidebar_pref_automatic_theme");
        if (saved !== null) return saved === "true";
      } catch { }
    }
    return false;
  });
  const [isSystemDark, setIsSystemDark] = useState(() => {
    if (globalHasHydrated && typeof window !== "undefined") {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch { }
    }
    return false;
  });
  const [isMounted, setIsMounted] = useState(() => {
    return typeof window !== "undefined" && globalHasHydrated;
  });

  useEffect(() => {
    if (!globalHasHydrated) {
      try {
        const savedMode = localStorage.getItem("sidebar_pref_mode") as SidebarMode | null;
        if (savedMode && ["compact", "auto", "fixed"].includes(savedMode)) {
          setMode(savedMode);
        }
        const savedDark = localStorage.getItem("sidebar_pref_dark_panel");
        if (savedDark !== null) {
          setDarkPanel(savedDark === "true");
        }
        const savedAutoTheme = localStorage.getItem("sidebar_pref_automatic_theme");
        if (savedAutoTheme !== null) {
          setAutomaticTheme(savedAutoTheme === "true");
        }
      } catch { }
      setIsMounted(true);
      globalHasHydrated = true;
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("sidebar_pref_mode", mode);
    } catch { }
  }, [mode, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("sidebar_pref_dark_panel", String(darkPanel));
    } catch { }
  }, [darkPanel, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("sidebar_pref_automatic_theme", String(automaticTheme));
    } catch { }
  }, [automaticTheme, isMounted]);

  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [dynamicModules, setDynamicModules] = useState<DynamicModuleNav[]>(initialModules ?? []);
  const [modulesLoading, setModulesLoading] = useState(initialModules === undefined);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const normalizedActorRole: "SU" | "cliente" = String(actorRole).trim().toLowerCase() === "su" ? "SU" : "cliente";

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileView, setProfileView] = useState<"info" | "edit" | "company">("info");
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [confirmCompanyChange, setConfirmCompanyChange] = useState<any>(null);

  // Geographical lists
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [statesList, setStatesList] = useState<any[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"personal" | "system">("personal");

  // Initialize profile data from props fallback ONLY, to avoid hydration mismatch
  const [profileData, setProfileData] = useState<any>(() => {
    const parts = userName.split(" ");
    const fallbackName = parts[0] || "";
    const fallbackLastName = parts.slice(1).join(" ") || "";
    return {
      name: fallbackName,
      last_name: fallbackLastName,
      user_email: userEmail,
      avatar: userImage,
      phone_number: "",
      position: userCargo || "Miembro",
      dni: "",
      country_code: "+57",
      country_iso: "CO",
      department_code: "",
      city_code: "",
      gender: "male",
      birth_date: ""
    };
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    last_name: "",
    phone_number: "",
    avatar: "",
    dni: "",
    country_code: "+57",
    country_iso: "CO",
    department_code: "",
    city_code: "",
    gender: "male",
    birth_date: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const filteredStates = useMemo(() => {
    return statesList.filter(
      (s) => String(s.iso_country || s.isoCountry || s.iso || "").toLowerCase() === String(editForm.country_iso || "").toLowerCase()
    );
  }, [statesList, editForm.country_iso]);

  const filteredCities = useMemo(() => {
    return citiesList.filter(
      (c) => String(c.state_id || c.stateId || "") === String(editForm.department_code || "")
    );
  }, [citiesList, editForm.department_code]);

  const viewCountryName = useMemo(() => {
    const iso = profileData?.country_iso || profileData?.countryIso || "CO";
    const found = countriesList.find(c => c.iso === iso);
    return found ? `${found.nombre} (${found.prefix_area || found.prefix || found.iso})` : "Colombia";
  }, [countriesList, profileData?.country_iso, profileData?.countryIso]);

  const viewStateName = useMemo(() => {
    const code = profileData?.department_code || profileData?.departmentCode;
    if (!code) return "No especificado";
    const found = statesList.find(s => String(s.id_state || s.idState || s.id) === String(code));
    return found ? found.state : "No especificado";
  }, [statesList, profileData?.department_code, profileData?.departmentCode]);

  const viewCityName = useMemo(() => {
    const code = profileData?.city_code || profileData?.cityCode;
    if (!code) return "No especificado";
    const found = citiesList.find(c => String(c.id_city || c.idCity || c.id) === String(code));
    return found ? found.city : "No especificado";
  }, [citiesList, profileData?.city_code, profileData?.cityCode]);

  const viewBirthDateFormatted = useMemo(() => {
    const raw = profileData?.birth_date || profileData?.birthDate;
    if (!raw) return "No especificada";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "No especificada";
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "No especificada";
    }
  }, [profileData?.birth_date, profileData?.birthDate]);

  const handleProfileAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/storage/upload", {
        method: "POST",
        body: formData
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.message || "Error uploading image");
      // Actualiza avatar en el formulario
      setEditForm((prev) => ({ ...prev, avatar: resBody.url }));
      // Actualiza avatar en profileData y persiste en Secure Store usando la versión actualizada del estado
      setProfileData((prev: any) => {
        const updated = { ...prev, avatar: resBody.url };
        setSecureItem("user_profile_data", updated, actorId);
        return updated;
      });
    } catch (err) {
      console.error(err);
      alert("No se pudo cargar la imagen");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!isProfileModalOpen || profileView !== "company") return;
    let active = true;
    setCompaniesLoading(true);
    fetch("/api/v1/db/companies", {
      headers: {
        "x-actor-id": actorId,
        "x-actor-role": normalizedActorRole,
        "x-company-id": companyId ?? ""
      }
    })
      .then(r => r.json())
      .then(body => {
        if (!active) return;
        if (body && Array.isArray(body.data)) {
          setCompanies(body.data);
        }
      })
      .catch(err => console.error("Error loading companies:", err))
      .finally(() => {
        if (active) setCompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isProfileModalOpen, profileView, actorId, normalizedActorRole, companyId]);

  useEffect(() => {
    let active = true;

    // Load cached profile data if available
    const cached = getSecureItem<any>("user_profile_data", actorId);
    if (cached) {
      const finalCachedAvatar = cached.avatar || userImage || "";
      setProfileData({ ...cached, avatar: finalCachedAvatar });
      setEditForm({
        name: cached.name || "",
        last_name: cached.last_name || cached.lastName || "",
        phone_number: cached.phone_number || cached.phoneNumber || "",
        avatar: finalCachedAvatar,
        dni: cached.dni || "",
        country_code: cached.country_code || cached.countryCode || "+57",
        country_iso: cached.country_iso || cached.countryIso || "CO",
        department_code: cached.department_code || cached.departmentCode || "",
        city_code: cached.city_code || cached.cityCode || "",
        gender: cached.gender || "male",
        birth_date: cached.birth_date || cached.birthDate ? String(cached.birth_date || cached.birthDate).slice(0, 10) : ""
      });
    }

    const headers = {
      "x-actor-id": actorId,
      "x-actor-role": normalizedActorRole,
      "x-company-id": companyId ?? ""
    };

    setProfileLoading(true);

    Promise.all([
      fetch(`/api/v1/db/users?id=${encodeURIComponent(actorId)}`, { headers }).then(r => r.json()),
      fetch("/api/v1/db/st_country", { headers }).then(r => r.json()).catch(() => null),
      fetch("/api/v1/db/st_state", { headers }).then(r => r.json()).catch(() => null),
      fetch("/api/v1/db/st_city", { headers }).then(r => r.json()).catch(() => null)
    ])
      .then(([userBody, countriesBody, statesBody, citiesBody]) => {
        if (!active) return;

        let countriesData = countriesBody && Array.isArray(countriesBody?.data) ? countriesBody.data : [];
        if (countriesData.length === 0) {
          countriesData = [
            { prefix_area: "+57", iso: "CO", nombre: "Colombia" },
            { prefix_area: "+54", iso: "AR", nombre: "Argentina" },
            { prefix_area: "+56", iso: "CL", nombre: "Chile" },
            { prefix_area: "+52", iso: "MX", nombre: "México" },
            { prefix_area: "+51", iso: "PE", nombre: "Perú" },
            { prefix_area: "+1", iso: "US", font: "Estados Unidos", nombre: "Estados Unidos" },
            { prefix_area: "+34", iso: "ES", nombre: "España" }
          ];
        }
        setCountriesList(countriesData);
        if (statesBody?.data) setStatesList(statesBody.data);
        if (citiesBody?.data) setCitiesList(citiesBody.data);

        if (userBody && userBody.data) {
          const userData = Array.isArray(userBody.data) ? userBody.data[0] : userBody.data;
          if (userData) {
            const cached = getSecureItem<any>("user_profile_data", actorId);
            const finalAvatar = cached?.avatar || userData.avatar || userImage || "";
            const finalUserData = { ...userData, avatar: finalAvatar };
            setProfileData(finalUserData);
            setSecureItem("user_profile_data", finalUserData, actorId);
            setEditForm({
              name: userData.name || "",
              last_name: userData.last_name || userData.lastName || "",
              phone_number: userData.phone_number || userData.phoneNumber || "",
              avatar: finalAvatar,
              dni: userData.dni || "",
              country_code: userData.country_code || userData.countryCode || "+57",
              country_iso: userData.country_iso || userData.countryIso || "CO",
              department_code: userData.department_code || userData.departmentCode || "",
              city_code: userData.city_code || userData.cityCode || "",
              gender: userData.gender || "male",
              birth_date: userData.birth_date || userData.birthDate ? String(userData.birth_date || userData.birthDate).slice(0, 10) : ""
            });
          }
        }
      })
      .catch(err => console.error("Error loading user profile on mount:", err))
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [actorId, normalizedActorRole, companyId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/db/users", {
        method: "PATCH",
        headers: {
          "x-actor-id": actorId,
          "x-actor-role": normalizedActorRole,
          "x-company-id": companyId ?? "",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          id: actorId,
          name: editForm.name,
          last_name: editForm.last_name,
          phone_number: editForm.phone_number,
          avatar: editForm.avatar,
          dni: editForm.dni,
          country_code: editForm.country_code,
          country_iso: editForm.country_iso,
          department_code: editForm.department_code,
          city_code: editForm.city_code,
          gender: editForm.gender,
          birth_date: editForm.birth_date ? new Date(editForm.birth_date).toISOString() : null
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "No se pudo actualizar el perfil.");

      const updatedUser = Array.isArray(body.data) ? body.data[0] : body.data;
      if (updatedUser) {
        setProfileData(updatedUser);
        setSecureItem("user_profile_data", updatedUser, actorId);
      }
      setProfileView("info");
      window.location.reload();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setSaveError(err.message || "Error al guardar los cambios.");
    } finally {
      setSavingProfile(false);
    }
  };

  const sortedCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = companies.filter(c =>
      String(c.commercialName || "").toLowerCase().includes(q) ||
      String(c.id || "").toLowerCase().includes(q) ||
      String(c.city || "").toLowerCase().includes(q)
    );
    // Sort active company to the top
    return [...filtered].sort((a, b) => {
      if (a.id === companyId) return -1;
      if (b.id === companyId) return 1;
      return 0;
    });
  }, [companies, searchQuery, companyId]);

  const handleSelectCompany = (cId: string) => {
    document.cookie = `active_company_id=${encodeURIComponent(cId)}; path=/; max-age=604800`;
    if (typeof window !== "undefined") {
      localStorage.removeItem(`sidebar_modules_${actorId}_${companyId ?? ""}`);
      localStorage.removeItem(`sidebar_modules_${actorId}_${cId}`);
    }
    setIsProfileModalOpen(false);
    setConfirmCompanyChange(null);
    // Send user to home page with filtered data
    window.location.href = `/${locale}/home`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsSystemDark(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const desktopExpanded = !isMounted || mode === "fixed" || (mode === "auto" && hoverExpanded);
  const expanded = mobileMenuOpen || desktopExpanded;
  const compact = !expanded;

  const isNightActive = !isMounted ? false : (automaticTheme && isSystemDark);
  const isSidebarDark = !isMounted ? true : (automaticTheme ? isSystemDark : darkPanel);

  const bgImage = !isMounted
    ? "/images/home-brackgorund_light.png"
    : (automaticTheme
      ? (isSystemDark ? "/images/home-brackgorund_dark.png" : "/images/home-brackgorund_light.png")
      : "/images/home-brackgorund_light.png");

  // Synchronize HTML tag class for zero-flash transitions
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNightActive) {
      document.documentElement.classList.add("theme-dark-active");
    } else {
      document.documentElement.classList.remove("theme-dark-active");
    }
  }, [isNightActive]);

  const sidebarWidthClass = desktopExpanded ? "md:w-[256px]" : "md:w-[72px]";

  const sidebarItems = useMemo(() => {
    // 1. Get all root-level items (parent is "/")
    const roots = dynamicModules
      .filter((item) => item.parent === "/")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // 2. Map roots, attaching children to sections
    return roots.map((root) => {
      const isSection = root.pageContent === "section";
      const children = isSection
        ? dynamicModules
          .filter((item) => item.parent === root.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        : [];
      return {
        ...root,
        isSection,
        children
      };
    });
  }, [dynamicModules]);

  const mobileLinks = !modulesLoading && !modulesError
    ? sidebarItems.flatMap((group) => group.isSection ? group.children : [group]).filter((item) => item.route)
    : [];
  const mobileTabs = mobileLinks.slice(0, 4);
  const mobileTabRoutes = new Set(mobileTabs.map((item) => item.route));
  const activeMobileLink = mobileLinks.reduce<DynamicModuleNav | undefined>((active, item) => {
    const href = `/${locale}${item.route}`;
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    return matches && (!active || (item.route?.length ?? 0) > (active.route?.length ?? 0)) ? item : active;
  }, undefined);
  const activeMobileHref = activeMobileLink ? `/${locale}${activeMobileLink.route}` : null;
  const mobileTitle = (pathname === activeMobileHref ? activeMobileLink?.name : title || activeMobileLink?.name)
    || (pathname === `/${locale}/home` ? mobileMenuText("tabs.home") : "Relum");
  const moreActive = mobileMenuOpen || (activeMobileLink && !mobileTabRoutes.has(activeMobileLink.route));
  const mobileTabClass = "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300";

  useEffect(() => {
    if (initialModules !== undefined) {
      setDynamicModules(initialModules);
      setModulesLoading(false);
      return;
    }

    const cacheKey = `sidebar_modules_${actorId}_${companyId ?? ""}`;
    let hasLoadedFromCache = false;

    if (typeof window !== "undefined") {
      const rows = getSecureItem<Array<Record<string, unknown>>>(cacheKey, actorId);
      if (rows && Array.isArray(rows)) {
        setDynamicModules(selectSidebarModulesFromDbRows(rows));
        setModulesLoading(false);
        hasLoadedFromCache = true;
      }
    }

    let cancelled = false;
    const loadModules = async () => {
      if (!hasLoadedFromCache) {
        setModulesLoading(true);
      }
      setModulesError(null);
      try {
        const params = new URLSearchParams();
        params.append("table", "modules");
        const response = await fetch(`/api/v1/db/multi?${params.toString()}`, {
          headers: {
            "x-actor-id": actorId,
            "x-actor-role": normalizedActorRole,
            "x-company-id": companyId ?? ""
          }
        });
        const body = (await response.json()) as { modules?: Array<Record<string, unknown>>; message?: string };
        if (!response.ok) {
          throw new Error(body.message ?? "No se pudo cargar el menú");
        }
        if (cancelled) return;
        const rows = Array.isArray(body.modules) ? body.modules : [];
        const normalizedFetched = selectSidebarModulesFromDbRows(rows);

        setDynamicModules((prev) => {
          const isSame = JSON.stringify(prev) === JSON.stringify(normalizedFetched);
          return isSame ? prev : normalizedFetched;
        });

        if (typeof window !== "undefined") {
          setSecureItem(cacheKey, rows, actorId);
        }
      } catch (error) {
        if (!cancelled && !hasLoadedFromCache) {
          setDynamicModules([]);
          setModulesError(error instanceof Error ? error.message : "No se pudo cargar el menú");
        }
      } finally {
        if (!cancelled) {
          setModulesLoading(false);
        }
      }
    };
    void loadModules();
    return () => {
      cancelled = true;
    };
  }, [actorId, normalizedActorRole, companyId, initialModules]);

  const updateScrollHints = () => {
    const element = navScrollRef.current;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    setCanScrollUp(scrollTop > 6);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
  };

  useEffect(() => {
    updateScrollHints();
  }, [expanded, compact, mode, mobileMenuOpen]);

  const scrollModules = (direction: "up" | "down") => {
    const element = navScrollRef.current;
    if (!element) return;
    const amount = Math.max(120, Math.round(element.clientHeight * 0.45));
    element.scrollBy({ top: direction === "up" ? -amount : amount, behavior: "smooth" });
  };
  const fallbackParts = userName.split(" ");
  const fallbackName = fallbackParts[0] || "";
  const fallbackLastName = fallbackParts.slice(1).join(" ") || "";
  const finalName = profileData?.name || fallbackName;
  const finalLastName = profileData?.last_name || fallbackLastName;
  const finalEmail = profileData?.user_email || userEmail;
  const finalDni = profileData?.dni || "";
  const finalPhone = profileData?.phone_number || "";
  const finalPosition = profileData?.position || userCargo || "Miembro";

  return (
    <main
      className={`relative flex h-dvh overflow-hidden bg-cover bg-center bg-no-repeat md:bg-(image:--home-bg) max-md:[--mobile-header:calc(3.5rem+env(safe-area-inset-top))] max-md:[--mobile-tabs:calc(3.75rem+env(safe-area-inset-bottom))] ${isMounted ? "md:transition-[background-image] md:duration-500" : ""
        } ${isNightActive ? "theme-dark-active" : ""
        } ${isNightActive ? "max-md:bg-[#0B192C]" : "max-md:bg-slate-50"}`}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 hidden bg-white/5 md:block" />

      <header
        inert={mobileMenuOpen}
        className="fixed inset-x-0 top-0 z-20 flex h-(--mobile-header) items-center border-b border-white/15 bg-slate-950 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] text-white md:hidden"
      >
        <p className="truncate text-lg font-semibold">{mobileTitle}</p>
      </header>

      <nav
        aria-label={mobileMenuText("navigation")}
        inert={mobileMenuOpen}
        className="fixed inset-x-0 bottom-0 z-20 flex h-(--mobile-tabs) gap-1 border-t border-white/15 bg-slate-950 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pr-[max(0.25rem,env(safe-area-inset-right))] pl-[max(0.25rem,env(safe-area-inset-left))] md:hidden"
      >
        {mobileTabs.map((item) => {
          const href = `/${locale}${item.route}`;
          const labelKey = mobileTabLabels[item.route as keyof typeof mobileTabLabels];
          const active = item === activeMobileLink;
          const textIcon = item.icon && normalizeTextIcon(item.icon);
          return (
            <Link
              key={item.id}
              href={href}
              title={item.name}
              aria-current={active ? (pathname === href ? "page" : "location") : undefined}
              className={`${mobileTabClass} ${active ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-white/10"}`}
            >
              <span aria-hidden="true" className="grid size-5 place-items-center text-lg leading-none">
                {item.icon && isImageIcon(item.icon) ? (
                  <Image src={item.icon.trim()} alt="" width={20} height={20} unoptimized className="size-5 object-contain" />
                ) : textIcon && textIcon !== "◦" ? (
                  textIcon
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <path d="M8 10h8m-8 4h5" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <span className="w-full truncate text-center">{labelKey ? mobileMenuText(`tabs.${labelKey}`) : item.name}</span>
            </Link>
          );
        })}
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls={sidebarId}
          onClick={() => setMobileMenuPath(pathname)}
          aria-haspopup="dialog"
          className={`${mobileTabClass} ${moreActive ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-white/10"}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
            <circle cx="5" cy="12" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="19" cy="12" r="1.75" />
          </svg>
          {mobileMenuText("more")}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileMenuPath(null)}
          className="fixed inset-0 z-30 touch-none bg-slate-950/65 md:hidden"
        />
      )}

      <aside
        id={sidebarId}
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen ? true : undefined}
        aria-label={mobileMenuOpen ? mobileMenuText("open") : undefined}
        onKeyDown={(event) => {
          if (!mobileMenuOpen || event.key !== "Tab") return;
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button, input"))
            .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey ? event.target === first : event.target === last) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }}
        onMouseEnter={() => mode === "auto" && setHoverExpanded(true)}
        onMouseLeave={() => mode === "auto" && setHoverExpanded(false)}
        className={`fixed inset-y-0 left-0 z-40 h-full w-[min(20rem,calc(100%-3rem))] shrink-0 overflow-hidden border-r border-white/20 transition-[width,translate,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:max-md:transition-none md:relative md:z-20 md:duration-500 ${sidebarWidthClass} ${mobileMenuOpen ? "translate-x-0" : "max-md:invisible max-md:-translate-x-full"
          }`}
        suppressHydrationWarning
      >
        <div
          className={`h-full max-md:pt-[calc(0.5rem+env(safe-area-inset-top))] max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))] max-md:pl-[max(0.5rem,env(safe-area-inset-left))] ${compact ? "p-2" : "p-2"} ${isSidebarDark
            ? "bg-gradient-to-b from-[#0B192C]/90 via-[#1E3E62]/70 to-[#0A0F1D]/95"
            : "bg-gradient-to-b from-sky-700/45 via-indigo-700/30 to-slate-900/56"
            } backdrop-blur-xl ${isMounted ? "transition-all duration-500" : ""}`}
          suppressHydrationWarning
        >
          <div
            className={`relative flex h-full flex-col overflow-hidden ${isMounted ? "transition-all duration-500" : ""
              } ${compact
                ? "rounded-none border-0 bg-transparent backdrop-blur-none"
                : isSidebarDark
                  ? "glass-shell rounded-2xl border border-white/10 bg-[#0B192C]/30 backdrop-blur-xl"
                  : "glass-shell rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl"
              }`}
            suppressHydrationWarning
          >
            {compact ? null : (
              <>
                <span className="glass-sheen pointer-events-none absolute -left-14 top-[-24%] h-[52%] w-[145%] rotate-[14deg] bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 via-white/7 to-transparent" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/55" />
                <span className="pointer-events-none absolute inset-[2px] rounded-[14px] border border-white/12" />
              </>
            )}
            <button
              ref={closeMenuButtonRef}
              type="button"
              onClick={() => setMobileMenuPath(null)}
              className="z-10 m-2 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300 md:hidden"
            >
              <span aria-hidden="true" className="text-xl leading-none">×</span>
              {mobileMenuText("close")}
            </button>
            <div className={`shrink-0 ${compact ? "p-2 px-1" : "border-b border-white/18 p-4"}`}>
              <div className={`flex items-center ${expanded ? "gap-3" : "justify-center"}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (mobileMenuOpen) setMobileMenuPath(null);
                    setProfileView("info");
                    setIsProfileModalOpen(true);
                  }}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition cursor-pointer select-none"
                  title="Ver perfil y opciones"
                >
                  {profileData?.avatar || userImage ? (
                    <img
                      src={profileData.avatar || userImage || ""}
                      alt={userName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm font-semibold text-white">
                      {userName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </button>
                {expanded ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-[0.01em] text-white">
                      {profileData?.name || profileData?.lastName ? `${profileData?.name || ""} ${profileData?.last_name || profileData?.lastName || ""}`.trim() : userName}
                    </p>
                    <p className="truncate text-[11px] text-white/70">
                      {profileData?.user_email || profileData?.userEmail || userEmail}
                    </p>
                    <div className="mt-1.5 border-t border-white/10 pt-1.5 space-y-0.5">
                      {normalizedActorRole === "SU" || roleScope === "Multicompany" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (mobileMenuOpen) setMobileMenuPath(null);
                            setProfileView("company");
                            setIsProfileModalOpen(true);
                          }}
                          className="group/comp flex w-full items-center gap-1 text-left text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 transition duration-150"
                          title="Cambiar de compañía activa"
                        >
                          <span className="truncate">🏢 {companyName || "Seleccionar..."}</span>
                          <span className="text-[9px] text-cyan-300/65 group-hover/comp:text-cyan-200">✎</span>
                        </button>
                      ) : (
                        <p className="truncate text-[11px] font-medium text-white/80">🏢 {companyName || "Sin Empresa"}</p>
                      )}
                      <p className="truncate text-[10px] text-white/60">💼 {userCargo || "Miembro"}</p>
                      <p className="inline-block text-[9px] font-semibold text-cyan-400 bg-cyan-400/10 rounded px-1.5 py-0.5 mt-0.5">{roleScope || "User"}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={`relative min-h-0 flex-1 ${compact ? "px-0 py-4" : "px-2 py-3"}`}>
              <button
                type="button"
                aria-label="Subir modulos"
                tabIndex={mobileMenuOpen && !canScrollUp ? -1 : undefined}
                onClick={() => scrollModules("up")}
                className={`absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full border border-white/30 bg-slate-900/35 px-3 py-0.5 text-xs text-white backdrop-blur-md transition ${canScrollUp ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Bajar modulos"
                tabIndex={mobileMenuOpen && !canScrollDown ? -1 : undefined}
                onClick={() => scrollModules("down")}
                className={`absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/30 bg-slate-900/35 px-3 py-0.5 text-xs text-white backdrop-blur-md transition ${canScrollDown ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
              >
                ↓
              </button>
              <span
                className={`pointer-events-none absolute inset-x-1 top-0 z-[5] h-14 rounded-t-xl bg-gradient-to-b from-slate-950/42 to-transparent transition ${canScrollUp ? "opacity-100" : "opacity-0"
                  }`}
              />
              <span
                className={`pointer-events-none absolute inset-x-1 bottom-0 z-[5] h-14 rounded-b-xl bg-gradient-to-t from-slate-950/42 to-transparent transition ${canScrollDown ? "opacity-100" : "opacity-0"
                  }`}
              />
              <div
                ref={navScrollRef}
                onScroll={updateScrollHints}
                className="hide-scrollbar relative h-full overflow-y-auto max-md:overscroll-contain"
              >

                {modulesError ? (
                  <div className="rounded-xl border border-rose-300/35 bg-rose-950/35 px-3 py-2 text-xs text-rose-100">
                    No se pudo cargar el menú. Recarga la página para intentarlo de nuevo.
                  </div>
                ) : null}
                {modulesLoading ? (
                  <div className="space-y-2 px-2 py-1">
                    <div className="h-8 animate-pulse rounded-lg bg-white/12" />
                    <div className="h-8 animate-pulse rounded-lg bg-white/12" />
                    <div className="h-8 animate-pulse rounded-lg bg-white/12" />
                  </div>
                ) : null}
                {!modulesLoading && !modulesError && sidebarItems.length === 0 ? (
                  <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/85">Sin modulos disponibles</div>
                ) : null}
                {!modulesLoading && !modulesError ? (
                  <nav className={compact ? "space-y-2" : "space-y-1"}>
                    {sidebarItems.map((group) => {
                      if (group.isSection) {
                        const hasChildren = group.children && group.children.length > 0;

                        if (!hasChildren) {
                          // Rule: -section sin hijo, =>titulo
                          return (
                            <div key={group.id} className="px-2 pb-1 pt-4 select-none max-md:hidden">
                              {compact ? (
                                <div className="mx-auto mb-3 h-px w-12 bg-white/10" />
                              ) : (
                                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 font-semibold">
                                  {group.name}
                                </p>
                              )}
                            </div>
                          );
                        } else {
                          // Rule: -section con hijos, dropdown
                          const isCollapsed = collapsedSections[group.id] === true;
                          const hasActiveChild = group.children.some((child) => pathname === `/${locale}${child.route}`);
                          const hasMoreChildren = group.children.some((child) => !mobileTabRoutes.has(child.route));

                          return (
                            <div key={group.id} className={`space-y-1 ${hasMoreChildren ? "" : "max-md:hidden"}`}>
                              {compact ? <div className="mx-auto mb-3 h-px w-12 bg-white/10" /> : null}

                              <div
                                onClick={() => setCollapsedSections(prev => ({
                                  ...prev,
                                  [group.id]: !prev[group.id]
                                }))}
                                className={`group flex w-full items-center text-left text-white/90 transition duration-300 select-none cursor-pointer max-md:min-h-11 ${hasActiveChild
                                    ? expanded
                                      ? "gap-3 rounded-xl border border-cyan-300/30 bg-white/8 px-2 py-2"
                                      : "justify-center rounded-lg bg-white/10 px-0 py-2.5"
                                    : expanded
                                      ? "gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-white/20 hover:bg-white/12"
                                      : "justify-center rounded-lg px-0 py-2.5 hover:bg-white/10 hover:text-white"
                                  }`}
                              >
                                {group.icon && group.icon.trim().length > 0 ? (
                                  <span className={`grid place-items-center text-[22px] leading-none text-white/95 ${expanded ? "h-9 w-9" : "h-7 w-7"}`}>
                                    {isImageIcon(group.icon) ? (
                                      <img src={group.icon} alt="icon" className="h-5 w-5 object-contain" />
                                    ) : (
                                      normalizeTextIcon(group.icon)
                                    )}
                                  </span>
                                ) : null}

                                {expanded ? (
                                  <>
                                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.name}</span>
                                    <span className="text-[10px] text-white/40 group-hover:text-white/75 transition duration-200 ml-1">
                                      {isCollapsed ? "›" : "⌄"}
                                    </span>
                                  </>
                                ) : null}
                              </div>

                              {/* Dropdown Children */}
                              {!isCollapsed && group.children.map((child) => {
                                const href = `/${locale}${child.route}`;
                                const isActive = pathname === href;
                                return (
                                  <Link
                                    key={href}
                                    href={href}
                                    onClick={() => { if (mobileMenuOpen) setMobileMenuPath(null); }}
                                    className={`group flex w-full items-center text-left text-white/90 transition duration-300 max-md:min-h-11 ${mobileTabRoutes.has(child.route) ? "max-md:hidden" : ""} ${expanded ? "pl-6" : ""
                                      } ${isActive
                                        ? expanded
                                          ? "gap-3 rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-2 py-2"
                                          : "justify-center rounded-lg bg-cyan-300/20 px-0 py-2.5 text-cyan-100"
                                        : expanded
                                          ? "gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-white/20 hover:bg-white/12"
                                          : "justify-center rounded-lg px-0 py-2.5 hover:bg-white/10 hover:text-white"
                                      }`}
                                  >
                                    {child.icon && child.icon.trim().length > 0 ? (
                                      <span className={`grid place-items-center text-[22px] leading-none text-white/95 ${expanded ? "h-9 w-9" : "h-7 w-7"}`}>
                                        {isImageIcon(child.icon) ? (
                                          <img src={child.icon} alt="icon" className="h-5 w-5 object-contain" />
                                        ) : (
                                          normalizeTextIcon(child.icon)
                                        )}
                                      </span>
                                    ) : null}
                                    {expanded ? (
                                      <>
                                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{child.name}</span>
                                        {child.badge ? (
                                          <span className="rounded-full bg-cyan-300/25 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                                            {child.badge}
                                          </span>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        }
                      }

                      // Standard top-level route link (not a section)
                      const href = `/${locale}${group.route}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => { if (mobileMenuOpen) setMobileMenuPath(null); }}
                          className={`group flex w-full items-center text-left text-white/90 transition duration-300 max-md:min-h-11 ${mobileTabRoutes.has(group.route) ? "max-md:hidden" : ""} ${isActive
                            ? expanded
                              ? "gap-3 rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-2 py-2"
                              : "justify-center rounded-lg bg-cyan-300/20 px-0 py-2.5 text-cyan-100"
                            : expanded
                              ? "gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-white/20 hover:bg-white/12"
                              : "justify-center rounded-lg px-0 py-2.5 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                          {group.icon && group.icon.trim().length > 0 ? (
                            <span className={`grid place-items-center text-[22px] leading-none text-white/95 ${expanded ? "h-9 w-9" : "h-7 w-7"}`}>
                              {isImageIcon(group.icon) ? (
                                <img src={group.icon} alt="icon" className="h-5 w-5 object-contain" />
                              ) : (
                                normalizeTextIcon(group.icon)
                              )}
                            </span>
                          ) : null}
                          {expanded ? (
                            <>
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.name}</span>
                              {group.badge ? (
                                <span className="rounded-full bg-cyan-300/25 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                                  {group.badge}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
            </div>

            <div className={`shrink-0 ${compact ? "border-t border-white/12 py-1 px-2" : "border-t border-white/18 p-3"}`}>
              <div className="space-y-2">
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => {
                      if (compact) {
                        setMode("fixed");
                        setHoverExpanded(true);
                      }
                      setShowModeMenu((prev) => !prev);
                      setShowThemeMenu(false);
                    }}
                    className={`flex w-full items-center px-2 py-2 text-white transition duration-300 ${compact
                      ? "justify-center rounded-lg border-0 bg-transparent hover:bg-white/10"
                      : "rounded-xl border border-white/20 bg-white/8 hover:bg-white/14"
                      } ${expanded ? "gap-3" : "justify-center"
                      }`}
                  >
                    <span className="grid h-9 w-9 place-items-center text-[22px] leading-none">≡</span>
                    {expanded ? (
                      <>
                        <span className="text-sm">Tipo de menú</span>
                        <span className="ml-auto text-xs">⌄</span>
                      </>
                    ) : null}
                  </button>

                  {showModeMenu ? (
                    <div
                      className={`absolute z-30 rounded-xl border border-white/20 bg-slate-900/92 p-2 shadow-xl backdrop-blur-xl ${expanded ? "bottom-[calc(100%+8px)] left-0 right-0" : "bottom-0 left-[calc(100%+10px)] w-44"
                        }`}
                    >
                      {([
                        ["compact", "Compacta"],
                        ["auto", "Auto ocultable"],
                        ["fixed", "Fija"]
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setMode(value);
                            setShowModeMenu(false);
                          }}
                          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm transition first:mt-0 ${mode === value ? "bg-cyan-300/25 text-cyan-100" : "text-white/90 hover:bg-white/10"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (compact) {
                        setMode("fixed");
                        setHoverExpanded(true);
                      }
                      setShowThemeMenu((prev) => !prev);
                      setShowModeMenu(false);
                    }}
                    className={`flex w-full items-center px-2 py-2 text-white transition duration-300 ${compact
                      ? "justify-center rounded-lg border-0 bg-transparent hover:bg-white/10"
                      : "rounded-xl border border-white/20 bg-white/8 hover:bg-white/14"
                      } ${expanded ? "gap-3" : "justify-center"
                      }`}
                  >
                    <span className="grid h-9 w-9 place-items-center text-[22px] leading-none">◐</span>
                    {expanded ? (
                      <>
                        <span className="text-sm">Tema</span>
                        <span className="ml-auto text-xs">⌄</span>
                      </>
                    ) : null}
                  </button>

                  {showThemeMenu ? (
                    <div
                      className={`absolute z-30 rounded-xl border border-white/20 bg-slate-900/92 p-2 shadow-xl backdrop-blur-xl ${expanded ? "bottom-[calc(100%+8px)] left-0 right-0" : "bottom-0 left-[calc(100%+10px)] w-44"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setDarkPanel(true);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${darkPanel ? "bg-cyan-300/25 text-cyan-100" : "text-white/90 hover:bg-white/10"
                          }`}
                      >
                        Oscuro degradado
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDarkPanel(false);
                          setShowThemeMenu(false);
                        }}
                        className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${!darkPanel ? "bg-cyan-300/25 text-cyan-100" : "text-white/90 hover:bg-white/10"
                          }`}
                      >
                        Claro cristal
                      </button>
                      <div className="mx-1 my-1.5 h-px bg-white/12" />
                      <div className="flex items-center justify-between px-3 py-1.5 text-sm text-white/90">
                        <span>Automático</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={automaticTheme}
                            onChange={() => setAutomaticTheme(!automaticTheme)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-5 bg-white/20 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all duration-300 peer-checked:bg-cyan-400" />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.clear();
                    }
                    void signOut({ callbackUrl: `/${locale}` });
                  }}
                  className={`flex w-full items-center px-2 py-2 transition duration-300 ${compact
                    ? "justify-center rounded-lg border-0 bg-transparent text-rose-100 hover:bg-rose-300/20"
                    : "rounded-xl border border-rose-300/40 bg-rose-300/15 text-rose-100 hover:bg-rose-300/25"
                    } ${expanded ? "gap-3" : "justify-center"
                    }`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-300/20 text-[20px] leading-none">⎋</span>
                  {expanded ? <span className="text-sm font-semibold">Cerrar sesión</span> : null}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section inert={mobileMenuOpen} className="relative z-10 min-w-0 flex-1 max-md:pt-(--mobile-header) max-md:pb-(--mobile-tabs) max-md:pr-[env(safe-area-inset-right)] max-md:pl-[env(safe-area-inset-left)] md:p-2">
        <div
          id="contentSidebar"
          className={`h-full max-md:overflow-y-auto max-md:overscroll-contain md:overflow-hidden md:rounded-3xl md:border md:p-2 md:backdrop-blur-md ${isMounted ? "md:transition-all md:duration-500" : ""
            } ${isNightActive
              ? "text-slate-100 md:border-white/10 md:bg-[#0B192C]/40"
              : "max-md:text-slate-900 md:border-white/20 md:bg-white/16 md:text-inherit"
            }`}
        >


          {children ?? (
            <>
              <div className="p-6 md:hidden">
                <p className="text-lg font-semibold">{mobileMenuText("welcome")}</p>
                <p className="mt-2 text-sm text-slate-600">{mobileMenuText("welcomeHint")}</p>
              </div>
              <div className="hidden rounded-2xl border border-white/25 bg-slate-950/30 p-6 backdrop-blur-md md:block">
                <p className="text-lg font-semibold text-white">Bienvenido a Relum</p>
                <p className="mt-2 text-sm text-white/75">Elige una opción del menú de la izquierda para empezar.</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Modal Unificado de Perfil de Usuario y Compañía */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl transition-all duration-300 animate-in zoom-in-95 duration-200 max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:overscroll-contain md:p-6">
            {/* Confirmación cambio de compañía como overlay */}
            {confirmCompanyChange && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] p-4">
                <div className="w-full max-w-sm rounded-[18px] border border-slate-200 bg-white p-5 text-slate-800 shadow-xl animate-in zoom-in-95 duration-150">
                  <h4 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-blue-600 text-lg">⚠️</span> Confirmar Cambio
                  </h4>
                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    ¿Estás seguro de que deseas cambiar a la compañía <strong className="text-slate-800">{confirmCompanyChange.commercialName}</strong>?
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Serás redirigido al inicio con los datos filtrados por esta empresa.
                  </p>
                  <div className="flex items-center justify-end gap-2.5 mt-5">
                    <button
                      type="button"
                      onClick={() => setConfirmCompanyChange(null)}
                      className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition duration-150"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectCompany(confirmCompanyChange.id)}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition duration-150 shadow-sm"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header común */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-lg font-bold text-slate-800">
                {profileView === "info" && "Perfil de Usuario"}
                {profileView === "edit" && "Editar Perfil"}
                {profileView === "company" && "Cambiar de Compañía"}
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-2xl text-slate-400 hover:text-slate-600 transition font-bold px-2 py-1"
              >
                ×
              </button>
            </div>

            {/* VISTA 1: INFO DE PERFIL */}
            {profileView === "info" && (
              <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-150">
                {/* Columna Izquierda: Tarjeta de Identidad (Avatar + Datos Principales) */}
                <div className="col-span-12 md:col-span-4 flex flex-col items-center text-center md:text-left md:items-start border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
                  {/* Contenedor de foto premium */}
                  <div className="w-full flex justify-center mb-4">
                    {profileData.avatar ? (
                      <img
                        src={profileData.avatar}
                        alt={finalName}
                        className="h-28 w-28 rounded-full border-4 border-white shadow-md object-cover ring-1 ring-slate-200/80"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-md ring-1 ring-slate-200/80 uppercase select-none">
                        {`${finalName}${finalLastName}`.trim().split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-slate-800 leading-tight">
                        {finalName} {finalLastName}
                      </h4>
                      <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {finalPosition}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DNI / Cédula</span>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{finalDni || "No especificado"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo Electrónico</span>
                        <p className="text-sm text-slate-600 mt-0.5 truncate w-full" title={finalEmail}>{finalEmail}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Empresa Activa</span>
                        <p className="text-sm text-slate-700 font-semibold mt-0.5 truncate w-full">🏢 {companyName || "Sin Empresa"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Tabs + Contenido de Pestañas */}
                <div className="col-span-12 md:col-span-8 flex flex-col justify-between min-h-[380px]">
                  <div>
                    {/* Selector de Pestañas */}
                    <div className="flex border-b border-slate-100 select-none">
                      <button
                        type="button"
                        onClick={() => setActiveTab("personal")}
                        className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${activeTab === "personal"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                      >
                        Información Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("system")}
                        className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${activeTab === "system"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                      >
                        Acceso y Sistema
                      </button>
                    </div>

                    {/* Contenido de la pestaña */}
                    <div className="mt-5">
                      {activeTab === "personal" ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Nombre *</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 font-medium">
                                {finalName || "No especificado"}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Apellido *</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 font-medium">
                                {finalLastName || "No especificado"}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <span className="text-xs font-semibold text-slate-500">País / Prefijo</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium truncate">
                                {viewCountryName}
                              </div>
                            </div>
                            <div className="col-span-7">
                              <span className="text-xs font-semibold text-slate-500">Teléfono *</span>
                              <div className="mt-1 flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                <span className="flex items-center bg-slate-100/80 px-3 text-xs font-semibold text-slate-500 border-r border-slate-200 select-none">
                                  {profileData?.country_code || profileData?.countryCode || "+57"}
                                </span>
                                <div className="w-full px-3 py-2 text-sm text-slate-700 font-medium truncate">
                                  {profileData?.phone_number || profileData?.phoneNumber || "No especificado"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Departamento / Estado</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium truncate">
                                {viewStateName}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Ciudad</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium truncate">
                                {viewCityName}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Género</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium capitalize animate-in fade-in duration-100">
                                {profileData?.gender === "female" ? "Femenino" : profileData?.gender === "other" ? "Otro" : "Masculino"}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Fecha de Nacimiento</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 font-medium truncate">
                                {viewBirthDateFormatted}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Cargo / Posición</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 font-medium">
                                {finalPosition}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-500">Alcance de Seguridad</span>
                              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-blue-600">
                                🛡️ {roleScope || "Usuario"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6 max-md:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-800 transition duration-150"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileView("edit")}
                      className="px-5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition duration-150"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileView("company")}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition duration-150"
                    >
                      Cambiar Empresa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: EDITAR PERFIL */}
            {profileView === "edit" && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileLoading ? (
                  <div className="py-12 text-center text-sm text-slate-500 animate-pulse font-medium">
                    Cargando información del usuario...
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-150">
                    {/* Columna Izquierda: Upload de Foto + Datos no editables */}
                    <div className="col-span-12 md:col-span-4 flex flex-col items-center text-center md:text-left md:items-start border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
                      {/* Subidor de foto premium */}
                      <div className="w-full flex justify-center mb-4">
                        <div
                          onClick={() => document.getElementById("profile-avatar-file-input")?.click()}
                          className="h-28 w-28 rounded-full border-4 border-white shadow-md relative overflow-hidden group cursor-pointer bg-slate-50 flex items-center justify-center transition hover:border-blue-400 ring-1 ring-slate-200/80"
                        >
                          {editForm.avatar && (editForm.avatar.startsWith("http://") || editForm.avatar.startsWith("https://") || editForm.avatar.startsWith("/")) ? (
                            <img
                              src={editForm.avatar}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white uppercase select-none">
                              {`${editForm.name || "?"}${editForm.last_name || ""}`.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white p-1 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mb-0.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                            </svg>
                            <span className="text-[9px] font-extrabold uppercase tracking-wide">Subir</span>
                          </div>

                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            </div>
                          )}
                        </div>

                        <input
                          id="profile-avatar-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleProfileAvatarUpload}
                          className="hidden"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mb-4 text-center select-none">
                        Haz clic para subir foto
                      </span>

                      <div className="w-full space-y-4">
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cargo / Posición</span>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{finalPosition}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alcance de Seguridad</span>
                            <p className="text-sm text-blue-600 font-semibold mt-0.5">🛡️ {roleScope || "Usuario"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Empresa Activa</span>
                            <p className="text-sm text-slate-700 font-semibold mt-0.5 truncate w-full">🏢 {companyName || "Sin Empresa"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Tabs + Inputs del formulario */}
                    <div className="col-span-12 md:col-span-8 flex flex-col justify-between min-h-[380px]">
                      <div>
                        {/* Selector de Pestañas */}
                        <div className="flex border-b border-slate-100 select-none">
                          <button
                            type="button"
                            onClick={() => setActiveTab("personal")}
                            className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${activeTab === "personal"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                              }`}
                          >
                            Información Personal
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("system")}
                            className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${activeTab === "system"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                              }`}
                          >
                            Acceso y Sistema
                          </button>
                        </div>

                        {/* Contenido de la pestaña */}
                        <div className="mt-5">
                          {activeTab === "personal" ? (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Primer Nombre *</span>
                                  <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    placeholder="Ej. Gerson"
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Apellidos *</span>
                                  <input
                                    type="text"
                                    value={editForm.last_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                                    required
                                    placeholder="Ej. Porras"
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-12 gap-3">
                                <label className="col-span-5 block">
                                  <span className="text-xs font-semibold text-slate-500">País / Prefijo</span>
                                  <select
                                    value={editForm.country_iso}
                                    onChange={(event) => {
                                      const selectedIso = event.target.value;
                                      const country = countriesList.find((c) => c.iso === selectedIso);
                                      if (country) {
                                        setEditForm((prev) => ({
                                          ...prev,
                                          country_iso: country.iso,
                                          country_code: country.prefix_area || country.prefix || "",
                                          department_code: "",
                                          city_code: ""
                                        }));
                                      }
                                    }}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 transition"
                                  >
                                    {countriesList.map((c) => (
                                      <option key={c.iso} value={c.iso}>
                                        {c.nombre} ({c.prefix_area || c.prefix || c.iso})
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="col-span-7 block">
                                  <span className="text-xs font-semibold text-slate-500">Teléfono *</span>
                                  <div className="mt-1 flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-blue-400 transition">
                                    <span className="flex items-center bg-slate-100/80 px-3 text-xs font-semibold text-slate-500 border-r border-slate-200 select-none">
                                      {editForm.country_code || "+57"}
                                    </span>
                                    <input
                                      type="text"
                                      value={editForm.phone_number}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                      placeholder="3001234567"
                                      className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                                    />
                                  </div>
                                </label>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Departamento / Estado</span>
                                  <select
                                    value={editForm.department_code}
                                    onChange={(event) => {
                                      const selectedStateId = event.target.value;
                                      setEditForm((prev) => ({
                                        ...prev,
                                        department_code: selectedStateId,
                                        city_code: ""
                                      }));
                                    }}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 transition"
                                  >
                                    <option value="">-- Seleccionar --</option>
                                    {filteredStates.map((s) => (
                                      <option key={s.id_state || s.idState || s.id} value={s.id_state || s.idState || s.id}>
                                        {s.state}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Ciudad</span>
                                  <select
                                    value={editForm.city_code}
                                    disabled={!editForm.department_code}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, city_code: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50 transition"
                                  >
                                    <option value="">-- Seleccionar --</option>
                                    {filteredCities.map((c) => (
                                      <option key={c.id_city || c.idCity || c.id} value={c.id_city || c.idCity || c.id}>
                                        {c.city}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Género</span>
                                  <select
                                    value={editForm.gender}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 transition"
                                  >
                                    <option value="male">Masculino</option>
                                    <option value="female">Femenino</option>
                                    <option value="other">Otro</option>
                                  </select>
                                </label>

                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Fecha de Nacimiento</span>
                                  <input
                                    type="date"
                                    value={editForm.birth_date}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Correo Electrónico *</span>
                                  <input
                                    type="email"
                                    value={finalEmail}
                                    disabled
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-400 outline-none cursor-not-allowed"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">DNI / Cédula</span>
                                  <input
                                    type="text"
                                    value={editForm.dni}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, dni: e.target.value }))}
                                    placeholder="DNI o Cédula"
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {saveError && (
                        <p className="text-xs text-red-500 font-semibold mt-3">⚠️ {saveError}</p>
                      )}

                      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                        <button
                          type="button"
                          onClick={() => setProfileView("info")}
                          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-800 transition duration-150"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition duration-150 flex items-center gap-2"
                        >
                          {savingProfile ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Guardando...
                            </>
                          ) : (
                            "Guardar"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* VISTA 3: SELECCIONAR COMPAÑÍA (TABLA DEL PROYECTO) */}
            {profileView === "company" && (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, ID o ciudad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none transition"
                  />
                </div>

                {/* Pequeña tabla con el estilo del proyecto */}
                <div className="overflow-auto rounded-2xl border border-slate-200 bg-white max-h-60 shadow-xs hide-scrollbar">
                  <table className="min-w-full border-collapse text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold text-slate-600">Nombre Comercial</th>
                        <th className="px-4 py-2.5 font-semibold text-slate-600">ID / Código</th>
                        <th className="px-4 py-2.5 font-semibold text-slate-600">Ciudad</th>
                        <th className="px-4 py-2.5 font-semibold text-slate-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companiesLoading ? (
                        <tr key="loading-companies">
                          <td colSpan={4} className="py-12 text-center text-sm text-slate-500 animate-pulse font-medium">
                            Cargando compañías...
                          </td>
                        </tr>
                      ) : sortedCompanies.length === 0 ? (
                        <tr key="empty-companies">
                          <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                            No se encontraron compañías
                          </td>
                        </tr>
                      ) : (
                        sortedCompanies.map((c) => {
                          const isActive = c.id === companyId;
                          return (
                            <tr
                              key={c.id}
                              onClick={() => setConfirmCompanyChange(c)}
                              className={`cursor-pointer transition duration-150 ${isActive
                                  ? "bg-blue-50/70 hover:bg-blue-100/70 font-semibold text-blue-700"
                                  : "hover:bg-slate-50/70 text-slate-700"
                                }`}
                            >
                              <td className="px-4 py-3.5 font-semibold">
                                <div className="flex items-center gap-1.5">
                                  {isActive && <span className="text-blue-600">★</span>}
                                  {c.commercialName}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-2xs text-slate-450">{c.id.slice(0, 10)}...</td>
                              <td className="px-4 py-3.5 text-slate-500">{c.city || "-"}</td>
                              <td className="px-4 py-3.5">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isActive
                                    ? "bg-blue-200/50 text-blue-800"
                                    : c.status === "active"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setProfileView("info")}
                    className="px-5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition duration-150"
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-800 transition duration-150"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </main>
  );
}

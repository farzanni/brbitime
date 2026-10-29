export interface CustomerProfile {
  name: string;
  phone: string;
  birthday: string;
}

const STORAGE_KEY = "brbi_customer_profile";

export function getSavedCustomerProfile(): CustomerProfile {
  if (typeof window === "undefined") {
    return { name: "", phone: "", birthday: "" };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { name: "", phone: "", birthday: "" };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      birthday: typeof parsed.birthday === "string" ? parsed.birthday : "",
    };
  } catch {
    return { name: "", phone: "", birthday: "" };
  }
}

export function saveCustomerProfile(profile: Partial<CustomerProfile>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getSavedCustomerProfile();
    const updated: CustomerProfile = {
      name: profile.name !== undefined ? profile.name.trim() : current.name,
      phone: profile.phone !== undefined ? profile.phone.trim() : current.phone,
      birthday: profile.birthday !== undefined ? profile.birthday.trim() : current.birthday,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

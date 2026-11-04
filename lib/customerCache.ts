export interface CustomerProfile {
  name: string;
  phone: string;
  birthday: string;
  isSubscribed?: boolean;
}

const STORAGE_KEY = "brbi_customer_profile";

export function getSavedCustomerProfile(): CustomerProfile {
  if (typeof window === "undefined") {
    return { name: "", phone: "", birthday: "", isSubscribed: false };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { name: "", phone: "", birthday: "", isSubscribed: false };
    const parsed = JSON.parse(raw);
    const hasValidIdentity = Boolean(parsed.phone && parsed.name);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      birthday: typeof parsed.birthday === "string" ? parsed.birthday : "",
      isSubscribed: typeof parsed.isSubscribed === "boolean" ? parsed.isSubscribed : hasValidIdentity,
    };
  } catch {
    return { name: "", phone: "", birthday: "", isSubscribed: false };
  }
}

export function saveCustomerProfile(profile: Partial<CustomerProfile>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getSavedCustomerProfile();
    const updatedName = profile.name !== undefined ? profile.name.trim() : current.name;
    const updatedPhone = profile.phone !== undefined ? profile.phone.trim() : current.phone;
    const updatedBirthday = profile.birthday !== undefined ? profile.birthday.trim() : current.birthday;
    const hasValidIdentity = Boolean(updatedPhone && updatedName);

    const updated: CustomerProfile = {
      name: updatedName,
      phone: updatedPhone,
      birthday: updatedBirthday,
      isSubscribed: profile.isSubscribed !== undefined ? profile.isSubscribed : (current.isSubscribed || hasValidIdentity),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors in private browsing
  }
}

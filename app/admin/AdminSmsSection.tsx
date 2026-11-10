"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import {
  MessageSquare,
  Send,
  Smartphone,
  Sparkles,
  Filter,
  Check,
  CheckSquare,
  Square,
  Calendar,
  Search,
  Users,
  Scissors,
  AlertCircle,
  CheckCircle,
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  X,
  History,
  PhoneCall,
} from "lucide-react";
import {
  calculateSmsParts,
  interpolateSmsTemplate,
  type SmsCustomer,
  type SmsBroadcastRecord,
  type SmsRecipient,
} from "@/lib/sms-broadcast";
import { checkBirthdayStatus } from "@/lib/birthday";
import { SERVICES, formatPersianDate } from "@/lib/booking";
import { sendAdminBroadcastSms, sendAdminTestSms } from "@/app/actions";

interface AdminSmsSectionProps {
  customers: SmsCustomer[];
  broadcasts: SmsBroadcastRecord[];
  defaultBarberPhone: string;
  shopName: string;
  initialPreselectedPhone?: string;
  error?: string;
  sentCount?: string;
  failedCount?: string;
  testSent?: string;
  testTarget?: string;
  testError?: string;
}

type FilterPreset =
  | "all"
  | "loyal"
  | "super_vip"
  | "new"
  | "inactive_30"
  | "inactive_60"
  | "has_upcoming"
  | "no_upcoming"
  | "birthday_month"
  | "birthday_week"
  | "has_notes";

interface TemplateOption {
  id: string;
  title: string;
  icon: string;
  tag: string;
  text: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "winback",
    title: "تخفیف بازگشت مشتری",
    icon: "✂️",
    tag: "مخصوص غایبین",
    text: "سلام {نام} عزیز، مدتیه ندیدیمت و دلتنگتیم! به پاس همراهیت، ۲۰٪ تخفیف ویژه برای نوبت‌های این هفته در {سالن} برات در نظر گرفتیم. رزرو آسان در: {سایت}",
  },
  {
    id: "birthday",
    title: "هدیه و تبریک تولد",
    icon: "🎂",
    tag: "تخفیف ۵۰٪",
    text: "سلام {نام} عزیز، پیشاپیش سالروز تولدت مبارک! هدیه سالن {سالن} به شما ۵۰٪ تخفیف برای رزرو نوبت در هفته تولدت هست. رزرو در: {سایت}",
  },
  {
    id: "weekend",
    title: "آفر ویژه آخر هفته",
    icon: "⚡",
    tag: "آفر ویژه",
    text: "سلام {نام} عزیز، با آفر ویژه آخر هفته در {سالن} در خدمتت هستیم! برای دریافت بهترین استایل و خدمات اصلاح، همین حالا نوبتت رو ثبت کن: {سایت}",
  },
  {
    id: "routine",
    title: "یادآوری اصلاح روتین",
    icon: "⏰",
    tag: "یادآوری",
    text: "سلام {نام} عزیز، وقت یه اصلاح و فید تمیز سر و صورت رسیده! برای هماهنگی سریع‌ترین تایم خالی به {سالن} بیا: {سایت}",
  },
  {
    id: "services",
    title: "خدمات جدید فیشیال و پوست",
    icon: "🧴",
    tag: "معرفی خدمت",
    text: "سلام {نام} عزیز، خدمات تخصصی پاکسازی پوست و ماساژ سر در {سالن} فعال شد! برای رزرو آنلاین به {سایت} سر بزن.",
  },
  {
    id: "holiday",
    title: "اطلاعیه تعطیلی / تغییر ساعت",
    icon: "📢",
    tag: "اطلاع‌رسانی",
    text: "مشتری گرامی {سالن}، به اطلاع می‌رساند سالن در روز ... به دلیل ... تعطیل خواهد بود. جهت رزرو در سایر روزها به {سایت} مراجعه نمایید.",
  },
];

export default function AdminSmsSection({
  customers,
  broadcasts,
  defaultBarberPhone,
  shopName,
  initialPreselectedPhone,
  error,
  sentCount,
  failedCount,
  testSent,
  testTarget,
  testError,
}: AdminSmsSectionProps) {
  // Preset filter state
  const [activePreset, setActivePreset] = useState<FilterPreset>("all");
  const [searchQuery, setSearchQuery] = useState(initialPreselectedPhone || "");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [minVisits, setMinVisits] = useState(0);

  // Selected phone numbers
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(() => {
    if (initialPreselectedPhone) {
      return new Set([initialPreselectedPhone]);
    }
    // Default to all customers
    return new Set(customers.map((c) => c.phone));
  });

  // Manual custom numbers added by admin
  const [customRecipients, setCustomRecipients] = useState<Array<{ phone: string; name: string }>>([]);
  const [newCustomPhone, setNewCustomPhone] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Message composer
  const [message, setMessage] = useState(TEMPLATES[0].text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState(defaultBarberPhone);
  const [isTestPending, startTestTransition] = useTransition();

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isBroadcastPending, startBroadcastTransition] = useTransition();

  // History expanded items
  const [expandedBroadcastId, setExpandedBroadcastId] = useState<number | null>(null);

  // Enriched customer data with birthday analysis
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const bStatus = c.birthday ? checkBirthdayStatus(c.birthday) : null;
      return {
        ...c,
        bStatus,
      };
    });
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesPhone = c.phone.includes(query);
        const matchesNotes = c.notes?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesNotes) return false;
      }

      // 2. Service filter
      if (serviceFilter !== "all") {
        if (!c.booked_services.includes(serviceFilter)) {
          return false;
        }
      }

      // 3. Minimum visits filter
      if (minVisits > 0 && c.total_visits < minVisits) {
        return false;
      }

      // 4. Preset filtering
      switch (activePreset) {
        case "loyal":
          return c.total_visits >= 3;
        case "super_vip":
          return c.total_visits >= 5;
        case "new":
          return c.total_visits === 1;
        case "inactive_30":
          return c.days_since_last_visit !== null && c.days_since_last_visit >= 30;
        case "inactive_60":
          return c.days_since_last_visit !== null && c.days_since_last_visit >= 60;
        case "has_upcoming":
          return c.upcoming_appointment !== null;
        case "no_upcoming":
          return c.upcoming_appointment === null;
        case "birthday_month":
          return Boolean(c.bStatus?.isBirthdayMonth);
        case "birthday_week":
          return Boolean(c.bStatus?.isBirthdayWeek);
        case "has_notes":
          return Boolean(c.notes && c.notes.trim().length > 0);
        case "all":
        default:
          return true;
      }
    });
  }, [enrichedCustomers, searchQuery, serviceFilter, minVisits, activePreset]);

  // Bulk selection actions
  const selectAllFiltered = () => {
    const next = new Set(selectedPhones);
    filteredCustomers.forEach((c) => next.add(c.phone));
    customRecipients.forEach((c) => next.add(c.phone));
    setSelectedPhones(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedPhones);
    filteredCustomers.forEach((c) => next.delete(c.phone));
    customRecipients.forEach((c) => next.delete(c.phone));
    setSelectedPhones(next);
  };

  const togglePhoneSelection = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    setSelectedPhones(next);
  };

  // Add custom manual recipient
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newCustomPhone.trim().replace(/\s+/g, "");
    if (!/^09\d{9}$/.test(cleanPhone)) {
      alert("شماره موبایل وارد شده باید ۱۱ رقمی و با ۰۹ شروع شود.");
      return;
    }
    if (customRecipients.some((r) => r.phone === cleanPhone)) {
      alert("این شماره قبلاً اضافه شده است.");
      return;
    }
    const item = { phone: cleanPhone, name: newCustomName.trim() || "مشتری جدید" };
    setCustomRecipients([...customRecipients, item]);
    setSelectedPhones(new Set([...selectedPhones, cleanPhone]));
    setNewCustomPhone("");
    setNewCustomName("");
    setShowAddCustom(false);
  };

  const removeCustomRecipient = (phone: string) => {
    setCustomRecipients(customRecipients.filter((r) => r.phone !== phone));
    const next = new Set(selectedPhones);
    next.delete(phone);
    setSelectedPhones(next);
  };

  // Build the list of final recipients (from filtered customers + custom)
  const finalRecipients: SmsRecipient[] = useMemo(() => {
    const list: SmsRecipient[] = [];
    const seen = new Set<string>();

    for (const c of customers) {
      if (selectedPhones.has(c.phone) && !seen.has(c.phone)) {
        seen.add(c.phone);
        list.push({ phone: c.phone, name: c.name });
      }
    }
    for (const cr of customRecipients) {
      if (selectedPhones.has(cr.phone) && !seen.has(cr.phone)) {
        seen.add(cr.phone);
        list.push(cr);
      }
    }
    return list;
  }, [customers, selectedPhones, customRecipients]);

  // Insert placeholder tag into textarea at cursor position
  const insertPlaceholder = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextText = message.substring(0, start) + tag + message.substring(end);
    setMessage(nextText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Telemetry calculation
  const smsTelemetry = useMemo(() => {
    return calculateSmsParts(message);
  }, [message]);

  // Preview customer selection
  const [previewCustomerIndex, setPreviewCustomerIndex] = useState(0);
  const sampleCustomer = useMemo(() => {
    return (
      finalRecipients[previewCustomerIndex] || {
        name: "رضا محمدی",
        phone: "09123456789",
      }
    );
  }, [finalRecipients, previewCustomerIndex]);

  const livePreviewText = useMemo(() => {
    return interpolateSmsTemplate(message, sampleCustomer, {
      shopName,
      persianDate: formatPersianDate(new Date()),
      shopUrl: "muucut.ir",
    });
  }, [message, sampleCustomer, shopName]);

  // Preset filter labels
  const PRESET_LABELS: Record<FilterPreset, { label: string; count: number; icon: string; desc: string }> = {
    all: {
      label: "همه مشتریان",
      count: customers.length,
      icon: "🌟",
      desc: "تمام مشتریان موجود در بانک اطلاعات",
    },
    loyal: {
      label: "مشتریان وفادار (۳+)",
      count: customers.filter((c) => c.total_visits >= 3).length,
      icon: "💎",
      desc: "مشتریان با حداقل ۳ مراجعه",
    },
    super_vip: {
      label: "سوپر VIP (۵+)",
      count: customers.filter((c) => c.total_visits >= 5).length,
      icon: "👑",
      desc: "مشتریان طلایی با ۵ بار و بیشتر مراجعه",
    },
    new: {
      label: "مشتریان جدید (۱ بار)",
      count: customers.filter((c) => c.total_visits === 1).length,
      icon: "🆕",
      desc: "مشتریانی که فقط یک‌بار نوبت گرفته‌اند",
    },
    inactive_30: {
      label: "غایب > ۳۰ روز",
      count: customers.filter((c) => c.days_since_last_visit !== null && c.days_since_last_visit >= 30).length,
      icon: "⏳",
      desc: "مشتریانی که بیش از ۱ ماه مراجعه نکرده‌اند",
    },
    inactive_60: {
      label: "غایب > ۶۰ روز",
      count: customers.filter((c) => c.days_since_last_visit !== null && c.days_since_last_visit >= 60).length,
      icon: "🍂",
      desc: "مشتریانی که بیش از ۲ ماه مراجعه نکرده‌اند",
    },
    has_upcoming: {
      label: "دارای نوبت پیش‌رو",
      count: customers.filter((c) => c.upcoming_appointment !== null).length,
      icon: "📅",
      desc: "دارای نوبت رزرو شده فعال در آینده",
    },
    no_upcoming: {
      label: "بدون نوبت فعال",
      count: customers.filter((c) => c.upcoming_appointment === null).length,
      icon: "📭",
      desc: "در حال حاضر هیچ نوبتی ندارند",
    },
    birthday_month: {
      label: "متولدین این ماه",
      count: enrichedCustomers.filter((c) => c.bStatus?.isBirthdayMonth).length,
      icon: "🎂",
      desc: "متولدین ماه جاری شمسی",
    },
    birthday_week: {
      label: "هفته تولد (۷ روز آینده)",
      count: enrichedCustomers.filter((c) => c.bStatus?.isBirthdayWeek).length,
      icon: "🎁",
      desc: "تولد در ۷ روز آینده (مشمول ۵۰٪ تخفیف)",
    },
    has_notes: {
      label: "دارای یادداشت آرایشگر",
      count: customers.filter((c) => c.notes && c.notes.trim().length > 0).length,
      icon: "📝",
      desc: "مشتریانی با پرونده و یادداشت مدل مو",
    },
  };

  // Submit test SMS
  const handleTestSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("message", message);
    formData.set("phone", testPhone);

    startTestTransition(async () => {
      await sendAdminTestSms(formData);
    });
  };

  // Submit bulk broadcast
  const handleBroadcastSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (finalRecipients.length === 0 || !message.trim()) return;

    const formData = new FormData();
    formData.set("message", message.trim());
    formData.set("filterName", PRESET_LABELS[activePreset].label);
    formData.set("recipients", JSON.stringify(finalRecipients));

    startBroadcastTransition(async () => {
      await sendAdminBroadcastSms(formData);
      setShowConfirmModal(false);
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Status Alerts */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-black text-white">سامانه هوشمند ارسال پیامک و بازاریابی</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            فیلتر هوشمند مشتریان، ارسال پیامک‌های گروهی، یادآوری اصلاح، تخفیف‌های بازگشت و تبریک تولد
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-amber-300">
            👥 بانک مشتریان: {customers.length} نفر
          </span>
          <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-400">
            🎯 انتخاب شده: {finalRecipients.length} نفر
          </span>
        </div>
      </div>

      {/* URL notifications */}
      {sentCount !== undefined && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 shadow-lg shadow-emerald-500/5">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="space-y-0.5">
            <p className="font-bold text-sm">پیامک‌ها با موفقیت به صف ارسال تحویل داده شدند!</p>
            <p className="text-emerald-400/80">
              ارسال موفق به {sentCount} نفر
              {failedCount && Number(failedCount) > 0 && ` (ناموفق: ${failedCount} نفر)`}
            </p>
          </div>
        </div>
      )}

      {testSent && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>پیامک آزمایشی با موفقیت به شماره {testTarget} ارسال گردید.</span>
        </div>
      )}

      {testError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>خطا در ارسال پیامک تستی: {decodeURIComponent(testError)}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>
            {error === "empty-message" && "لطفاً متن پیامک را وارد کنید."}
            {error === "no-recipients" && "هیچ مخاطبی برای ارسال پیامک انتخاب نشده است."}
            {error === "invalid-recipients" && "داده‌های مخاطبان نامعتبر است."}
          </span>
        </div>
      )}

      {/* 2. SECTION A: Smart Targeting & Filters */}
      <section className="space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">مرحله ۱: انتخاب و فیلتر هوشمند مخاطبان</h3>
          </div>
          <span className="text-xs text-neutral-400">
            فیلتر مورد نظر را انتخاب کنید تا مخاطبان هدف فوراً مشخص شوند
          </span>
        </div>

        {/* Preset filter grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(Object.keys(PRESET_LABELS) as FilterPreset[]).map((key) => {
            const item = PRESET_LABELS[key];
            const isActive = activePreset === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActivePreset(key);
                  // Auto select all matching this preset
                  const matching = enrichedCustomers.filter((c) => {
                    switch (key) {
                      case "loyal":
                        return c.total_visits >= 3;
                      case "super_vip":
                        return c.total_visits >= 5;
                      case "new":
                        return c.total_visits === 1;
                      case "inactive_30":
                        return c.days_since_last_visit !== null && c.days_since_last_visit >= 30;
                      case "inactive_60":
                        return c.days_since_last_visit !== null && c.days_since_last_visit >= 60;
                      case "has_upcoming":
                        return c.upcoming_appointment !== null;
                      case "no_upcoming":
                        return c.upcoming_appointment === null;
                      case "birthday_month":
                        return Boolean(c.bStatus?.isBirthdayMonth);
                      case "birthday_week":
                        return Boolean(c.bStatus?.isBirthdayWeek);
                      case "has_notes":
                        return Boolean(c.notes && c.notes.trim().length > 0);
                      case "all":
                      default:
                        return true;
                    }
                  });
                  setSelectedPhones(new Set(matching.map((c) => c.phone)));
                }}
                className={`flex flex-col items-start justify-between rounded-2xl border p-3 text-right transition-all ${
                  isActive
                    ? "border-amber-400 bg-amber-400/15 shadow-md shadow-amber-500/10"
                    : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-lg">{item.icon}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                      isActive ? "bg-amber-400 text-neutral-950" : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {item.count}
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <p className={`text-xs font-bold leading-tight ${isActive ? "text-amber-300" : "text-white"}`}>
                    {item.label}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[10px] text-neutral-500">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary filters toolbar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
          {/* Live Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو نام، شماره موبایل یا یادداشت..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-3 pr-9 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-2.5 text-neutral-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter by Booked Service */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs text-neutral-300 outline-none focus:border-amber-400"
          >
            <option value="all">تمام خدمات رزرو شده</option>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                فقط مشتریان: {s.name}
              </option>
            ))}
          </select>

          {/* Filter by Min Visits */}
          <select
            value={minVisits}
            onChange={(e) => setMinVisits(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs text-neutral-300 outline-none focus:border-amber-400"
          >
            <option value={0}>تمام تعداد مراجعات (همه)</option>
            <option value={2}>حداقل ۲ مراجعه به بالا</option>
            <option value={3}>حداقل ۳ مراجعه به بالا (وفادار)</option>
            <option value={5}>حداقل ۵ مراجعه به بالا (VIP)</option>
            <option value={10}>حداقل ۱۰ مراجعه (مشتریان طلایی)</option>
          </select>
        </div>

        {/* Selection actions & counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-neutral-950 p-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white transition"
            >
              <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
              <span>انتخاب همه ({filteredCustomers.length})</span>
            </button>

            <button
              type="button"
              onClick={deselectAllFiltered}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition"
            >
              <Square className="h-3.5 w-3.5 text-neutral-500" />
              <span>لغو انتخاب</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>افزودن شماره دستی</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">گیرندگان فعال:</span>
            <span className="rounded-lg bg-amber-400 px-2.5 py-1 font-mono text-xs font-bold text-neutral-950">
              {finalRecipients.length} مخاطب
            </span>
          </div>
        </div>

        {/* Manual Custom Number Input */}
        {showAddCustom && (
          <form
            onSubmit={handleAddCustom}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 animate-in fade-in"
          >
            <span className="text-xs font-bold text-amber-300">افزودن مخاطب جدید به صورت دستی:</span>
            <input
              required
              type="tel"
              dir="ltr"
              placeholder="09123456789"
              value={newCustomPhone}
              onChange={(e) => setNewCustomPhone(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-amber-400"
            />
            <input
              type="text"
              placeholder="نام مخاطب (اختیاری)"
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-300 transition"
            >
              افزودن
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              انصراف
            </button>
          </form>
        )}

        {/* Custom Recipients Tag List */}
        {customRecipients.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-neutral-500">شماره‌های دستی اضافه شده:</span>
            {customRecipients.map((cr) => (
              <span
                key={cr.phone}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300"
              >
                <span>{cr.name}</span>
                <span className="font-mono text-[11px] text-neutral-400">({cr.phone})</span>
                <button
                  type="button"
                  onClick={() => removeCustomRecipient(cr.phone)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Customer list table */}
        <div className="max-h-80 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              هیچ مشتری با فیلترهای انتخابی یافت نشد.
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {filteredCustomers.map((c) => {
                const isSelected = selectedPhones.has(c.phone);

                return (
                  <div
                    key={c.id}
                    onClick={() => togglePhoneSelection(c.phone)}
                    className={`flex cursor-pointer items-center justify-between gap-3 p-3 text-xs transition ${
                      isSelected
                        ? "bg-amber-400/5 hover:bg-amber-400/10"
                        : "opacity-60 hover:bg-neutral-900/50 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                          isSelected
                            ? "border-amber-400 bg-amber-400 text-neutral-950"
                            : "border-neutral-700 bg-neutral-900"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{c.name || "مشتری بدون نام"}</span>
                          {c.total_visits >= 5 ? (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              VIP
                            </span>
                          ) : c.total_visits === 1 ? (
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                              جدید
                            </span>
                          ) : null}

                          {c.bStatus?.isBirthdayWeek && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                              🎂 هفته تولد
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-neutral-400">
                          <span dir="ltr">{c.phone}</span>
                          <span>•</span>
                          <span>{c.total_visits} مراجعه</span>
                          {c.days_since_last_visit !== null && (
                            <>
                              <span>•</span>
                              <span className={c.days_since_last_visit >= 30 ? "text-amber-400" : ""}>
                                {c.days_since_last_visit === 0
                                  ? "امروز"
                                  : `${c.days_since_last_visit} روز قبل`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-[11px]">
                      {c.upcoming_appointment ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Calendar className="h-3 w-3" />
                          <span>نوبت فعال: {c.upcoming_appointment.date}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-500">بدون نوبت فعال</span>
                      )}

                      {c.notes && (
                        <span className="max-w-[200px] truncate text-neutral-400 text-[10px]">
                          یادداشت: {c.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. SECTION B: Message Composer, Templates & Part Calculator */}
      <section className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">مرحله ۲: متن پیامک و قالب‌های آماده</h3>
          </div>
          <span className="text-xs text-neutral-400">
            می‌توانید از قالب‌های آماده استفاده کنید یا متن دلخواه خود را بنویسید
          </span>
        </div>

        {/* Quick Templates Bar */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-neutral-300">قالب‌های پیشنهادی سریع:</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setMessage(tmpl.text)}
                className="flex flex-col items-start rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-right hover:border-amber-400/50 hover:bg-neutral-900 transition"
              >
                <div className="flex w-full items-center justify-between text-xs font-bold text-white">
                  <span>{tmpl.icon}</span>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-amber-300">
                    {tmpl.tag}
                  </span>
                </div>
                <span className="mt-2 text-xs font-semibold text-neutral-200">{tmpl.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Placeholders Tag Inserter */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
          <span className="text-xs text-neutral-400">درج خودکار متغیرهای پیامک:</span>
          <button
            type="button"
            onClick={() => insertPlaceholder("{نام}")}
            className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/20 transition"
            title="نام مشتری در پیامک هر شخص جایگزین می‌شود"
          >
            <span>+</span>
            <span>{"{نام}"}</span>
          </button>
          <button
            type="button"
            onClick={() => insertPlaceholder("{سالن}")}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white transition"
          >
            <span>+</span>
            <span>{"{سالن}"}</span>
          </button>
          <button
            type="button"
            onClick={() => insertPlaceholder("{تاریخ}")}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white transition"
          >
            <span>+</span>
            <span>{"{تاریخ}"}</span>
          </button>
          <button
            type="button"
            onClick={() => insertPlaceholder("{سایت}")}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white transition"
          >
            <span>+</span>
            <span>{"{سایت}"}</span>
          </button>
        </div>

        {/* Textarea & Live Telemetry Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Text Area (Col 7) */}
          <div className="lg:col-span-7 space-y-3">
            <label className="block text-xs font-semibold text-neutral-300">متن پیامک ارسالی:</label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="متن پیامک را اینجا بنویسید..."
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed text-white placeholder-neutral-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Part counter & cost calculation */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-neutral-950 px-4 py-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-neutral-400">
                  طول متن: <strong className="text-white">{smsTelemetry.charCount}</strong> کاراکتر
                </span>
                <span>•</span>
                <span className="font-semibold text-amber-300">
                  {smsTelemetry.parts} پارت پیامک فارسی
                </span>
                <span className="text-[11px] text-neutral-500">
                  (باقی‌مانده این پارت: {smsTelemetry.charsRemainingInCurrentPart})
                </span>
              </div>

              <div className="font-mono text-neutral-300">
                مجموع ارسال:{" "}
                <strong className="text-amber-400">
                  {finalRecipients.length * smsTelemetry.parts}
                </strong>{" "}
                پیامک
              </div>
            </div>

            {smsTelemetry.parts > 2 && (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                متن پیامک بیش از ۲ پارت است. برای کاهش هزینه پیشنهاد می‌شود متن را کوتاه‌تر نمایید.
              </p>
            )}
          </div>

          {/* Realistic Mobile Preview (Col 5) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <Smartphone className="h-4 w-4 text-amber-400" />
                <span>پیش‌نمایش زنده در گوشی مشتری:</span>
              </label>

              {finalRecipients.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewCustomerIndex((prev) => (prev + 1) % finalRecipients.length)
                  }
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                >
                  تعویض مخاطب نمونه ({sampleCustomer.name || "مشتری"})
                </button>
              )}
            </div>

            {/* Mobile Device Frame */}
            <div className="relative mx-auto max-w-[320px] rounded-[38px] border-4 border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
              {/* Dynamic Island / Notch */}
              <div className="mx-auto mb-4 h-4 w-24 rounded-full bg-neutral-800" />

              {/* Status Header */}
              <div className="mb-3 flex items-center justify-between border-b border-neutral-900 pb-2 text-[10px] text-neutral-500 font-mono">
                <span>پیامک دریافتی</span>
                <span>هم‌اکنون</span>
              </div>

              {/* Sender Name */}
              <div className="mb-3 text-center">
                <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                  <Scissors className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-white">{shopName}</p>
                <p className="text-[10px] font-mono text-neutral-500">2000660110</p>
              </div>

              {/* SMS Speech Bubble */}
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 p-3.5 text-xs text-neutral-100 shadow-md">
                <p className="leading-relaxed whitespace-pre-wrap">{livePreviewText}</p>
                <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-neutral-500 font-mono">
                  <span>۱۴:۰۵</span>
                  <Check className="h-2.5 w-2.5 text-blue-400" />
                </div>
              </div>

              {/* Simulated home bar */}
              <div className="mx-auto mt-6 h-1 w-28 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION C: Test Send & Final Broadcast Dispatch */}
      <section className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-4">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">مرحله ۳: ارسال آزمایشی و ارسال نهایی</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Option A: Test Send to Barber */}
          <form
            onSubmit={handleTestSend}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3"
          >
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-amber-400" />
                <span>ارسال تستی به شماره آرایشگر:</span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                ابتدا پیام را روی گوشی خودتان تست کنید تا از لحن و ظاهر پیام مطمئن شوید.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                required
                type="tel"
                dir="ltr"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="09123456789"
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isTestPending || !message.trim()}
                className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition"
              >
                <Send className="h-3 w-3" />
                <span>{isTestPending ? "در حال ارسال..." : "ارسال تست"}</span>
              </button>
            </div>
          </form>

          {/* Option B: Final Bulk Send Button */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-400" />
                <span>ارسال گروهی به مخاطبان انتخاب‌شده:</span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                پیامک به صورت شخصی‌سازی‌شده (با نام هر فرد) به{" "}
                <strong className="text-amber-300">{finalRecipients.length}</strong> نفر ارسال خواهد شد.
              </p>
            </div>

            <button
              type="button"
              disabled={finalRecipients.length === 0 || !message.trim() || isBroadcastPending}
              onClick={() => setShowConfirmModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-xs font-black text-neutral-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Send className="h-4 w-4" />
              <span>
                {isBroadcastPending
                  ? "در حال پردازش و ارسال..."
                  : `ارسال پیامک به ${finalRecipients.length} مشتری`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleBroadcastSend}
            className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">تایید نهایی ارسال پیامک گروهی</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              آیا از ارسال این پیامک به{" "}
              <strong className="text-amber-400 font-bold">{finalRecipients.length} نفر</strong> از مشتریان
              مطمئن هستید؟
            </p>

            <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>تعداد گیرندگان:</span>
                <span className="text-white font-bold">{finalRecipients.length} نفر</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>دسته‌بندی فیلتر:</span>
                <span className="text-amber-300">{PRESET_LABELS[activePreset].label}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>تعداد پارت پیامک:</span>
                <span className="text-white">
                  {smsTelemetry.parts} پارت (مجموع: {finalRecipients.length * smsTelemetry.parts})
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
              <span className="block mb-1 text-[11px] font-bold text-neutral-500 font-sans">
                پیش‌نمایش پیامک:
              </span>
              <p className="line-clamp-3 leading-relaxed text-neutral-200">{livePreviewText}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isBroadcastPending}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isBroadcastPending}
                className="flex-1 rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-300 disabled:opacity-50 transition"
              >
                {isBroadcastPending ? "در حال ارسال..." : "بله، ارسال کن"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. SECTION D: Broadcast Campaigns History */}
      <section className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              تاریخچه پیامک‌های ارسال‌شده ({broadcasts.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-500">گزارش آخرین کمپین‌های ارسال‌شده</span>
        </div>

        {broadcasts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-10 text-center text-xs text-neutral-500">
            هنوز پیامک گروهی در این بخش ارسال نشده است.
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const isExpanded = expandedBroadcastId === b.id;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-700 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                        {b.target_filter}
                      </span>
                      <span className="font-mono text-xs text-neutral-400">
                        {new Date(b.created_at).toLocaleDateString("fa-IR")} ساعت{" "}
                        {new Date(b.created_at).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                        {b.success_count} ارسال موفق
                      </span>
                      {b.fail_count > 0 && (
                        <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400">
                          {b.fail_count} ناموفق
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setMessage(b.message);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 hover:text-white transition"
                        title="استفاده مجدد از این متن در ویرایشگر"
                      >
                        <Copy className="h-3 w-3" />
                        <span>استفاده مجدد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBroadcastId(isExpanded ? null : b.id)
                        }
                        className="text-neutral-400 hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/60 rounded-xl p-3">
                    {b.message}
                  </p>

                  {/* Expanded recipient list */}
                  {isExpanded && b.recipients && b.recipients.length > 0 && (
                    <div className="border-t border-neutral-900 pt-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-neutral-400">لیست دریافت‌کنندگان:</p>
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-900 bg-neutral-900/40 p-2 divide-y divide-neutral-900/60 text-[11px]">
                        {b.recipients.map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-1 px-1.5">
                            <span className="text-white">{r.name || "مشتری"}</span>
                            <div className="flex items-center gap-2 font-mono text-neutral-400">
                              <span dir="ltr">{r.phone}</span>
                              <span
                                className={`text-[10px] ${
                                  r.status === "sent" ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {r.status === "sent" ? "موفق" : r.error || "خطا"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export type Language = "en" | "ar" | "ru";

export interface TranslationDict {
  code: Language;
  name: string;
  label: string;
  dir: "ltr" | "rtl";
  // Sidebar
  portalSubtitle: string;
  navDashboard: string;
  navGenerateClientId: string;
  navMyClients: string;
  navCommissions: string;
  navReports: string;
  navMarketingMaterials: string;
  navProfile: string;
  navSupport: string;
  exit: string;

  // Header
  searchPlaceholder: string;
  notificationsTitle: string;
  notificationsMsg: string;

  // Welcome Banner
  partnerBadge: string;
  welcomeBack: string;
  welcomeSub: string;

  // Stat Cards
  totalClients: string;
  activeClients: string;
  totalCommission: string;
  pendingCommission: string;
  vsLastMonth: string;
  clientsPending: string;

  // Action Banner
  generateBannerTitle: string;
  generateBannerSub: string;
  generateBtn: string;

  // Recent Clients Table
  recentClientsTitle: string;
  viewAll: string;
  thNumber: string;
  thClientId: string;
  thClientName: string;
  thService: string;
  thStatus: string;
  thCommission: string;
  thDate: string;

  // Filters
  filterAll: string;
  filterBusinessSetup: string;
  filterCorporateTax: string;
  filterVatRegistration: string;
  filterBankAccount: string;
  filterFreelanceVisa: string;

  // Statuses
  statusCompleted: string;
  statusInProgress: string;
  statusPending: string;

  // Charts
  commissionOverviewTitle: string;
  thisMonth: string;
  totalEarned: string;
  paid: string;
  processing: string;
  clientStatusTitle: string;
  chartTotal: string;
  chartActive: string;
  chartPending: string;
  chartCompleted: string;

  // Bottom Quick Cards
  card1Title: string;
  card1Sub: string;
  card2Title: string;
  card2Sub: string;
  card3Title: string;
  card3Sub: string;

  // Generate ID Modal
  modalGenTitle: string;
  modalGenSub: string;
  modalClientNameLabel: string;
  modalClientNamePlaceholder: string;
  modalServiceLabel: string;
  modalNotesLabel: string;
  modalNotesPlaceholder: string;
  modalEstCommission: string;
  modalSubmitBtn: string;
  modalSuccessTitle: string;
  modalSuccessSub: string;
  modalAssignedId: string;
  modalDoneBtn: string;

  // Materials Modal
  materialsModalTitle: string;
  materialsModalSub: string;
  downloadBtn: string;

  // Support Modal
  supportModalTitle: string;
  supportModalSub: string;
  supportDirectChannels: string;
  supportEmail: string;
  supportWhatsApp: string;
  supportOffice: string;
  closeBtn: string;

  // Mobile Bottom Nav
  mobDashboard: string;
  mobGenerate: string;
  mobClients: string;
  mobCommissions: string;
  mobMore: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    code: "en",
    name: "English",
    label: "English",
    dir: "ltr",
    portalSubtitle: "EXECUTIVE PARTNER PORTAL",
    navDashboard: "Dashboard",
    navGenerateClientId: "Generate Client ID",
    navMyClients: "My Clients",
    navCommissions: "Commissions",
    navReports: "Reports",
    navMarketingMaterials: "Marketing Materials",
    navProfile: "Profile",
    navSupport: "Support",
    exit: "Exit",

    searchPlaceholder: "Search clients, ID or status...",
    notificationsTitle: "Notifications",
    notificationsMsg: "All notifications caught up. 4 client submissions are currently under review.",

    partnerBadge: "Executive Partner Portal",
    welcomeBack: "Welcome Back,",
    welcomeSub: "Track your referrals, generate client IDs and manage your earnings – all in one place.",

    totalClients: "Total Clients",
    activeClients: "Active Clients",
    totalCommission: "Total Commission",
    pendingCommission: "Pending Commission",
    vsLastMonth: "vs last month",
    clientsPending: "clients pending",

    generateBannerTitle: "Generate New Client ID",
    generateBannerSub: "Create a unique client ID for your new referral",
    generateBtn: "+ Generate Client ID",

    recentClientsTitle: "Recent Clients",
    viewAll: "View All",
    thNumber: "#",
    thClientId: "CLIENT ID",
    thClientName: "CLIENT NAME",
    thService: "SERVICE",
    thStatus: "STATUS",
    thCommission: "COMMISSION",
    thDate: "DATE",

    filterAll: "ALL",
    filterBusinessSetup: "Business Setup",
    filterCorporateTax: "Corporate Tax",
    filterVatRegistration: "VAT Registration",
    filterBankAccount: "Bank Account",
    filterFreelanceVisa: "Freelance Visa",

    statusCompleted: "Completed",
    statusInProgress: "In Progress",
    statusPending: "Pending",

    commissionOverviewTitle: "Commission Overview",
    thisMonth: "This Month",
    totalEarned: "Total Earned",
    paid: "Paid",
    processing: "Processing",
    clientStatusTitle: "Client Status",
    chartTotal: "Total",
    chartActive: "Active",
    chartPending: "Pending",
    chartCompleted: "Completed",

    card1Title: "Marketing Materials",
    card1Sub: "Get our brochures, logos and presentations.",
    card2Title: "Training & Resources",
    card2Sub: "Learn about our services and process.",
    card3Title: "Need Help?",
    card3Sub: "Contact our support team anytime.",

    modalGenTitle: "Generate New Client ID",
    modalGenSub: "Issue an official partner tracking ID for your referral client.",
    modalClientNameLabel: "Client / Company Name",
    modalClientNamePlaceholder: "e.g. Al Noor Trading LLC",
    modalServiceLabel: "Selected Service",
    modalNotesLabel: "Internal Notes / Remarks (Optional)",
    modalNotesPlaceholder: "Mainland commercial license, 2 visas needed...",
    modalEstCommission: "EST. COMMISSION",
    modalSubmitBtn: "GENERATE CLIENT ID",
    modalSuccessTitle: "Client ID Generated!",
    modalSuccessSub: "Your unique partner tracking code is ready.",
    modalAssignedId: "ASSIGNED CLIENT ID",
    modalDoneBtn: "Done & Back to Dashboard",

    materialsModalTitle: "Marketing Materials & Partner Kit",
    materialsModalSub: "Download official Tijara One brochures, presentation decks and brand assets.",
    downloadBtn: "Download",

    supportModalTitle: "Partner Training & Support",
    supportModalSub: "Tijara One dedicated partner relationship desk.",
    supportDirectChannels: "Direct Support Channels:",
    supportEmail: "Email",
    supportWhatsApp: "WhatsApp Desk",
    supportOffice: "Office: Boulevard Plaza Tower 1, Downtown Dubai",
    closeBtn: "Close",

    mobDashboard: "Dashboard",
    mobGenerate: "Generate ID",
    mobClients: "My Clients",
    mobCommissions: "Commissions",
    mobMore: "More",
  },

  ar: {
    code: "ar",
    name: "العربية",
    label: "العربية (Arabic)",
    dir: "rtl",
    portalSubtitle: "بوابة الشركاء التنفيذيين",
    navDashboard: "لوحة التحكم",
    navGenerateClientId: "إنشاء معرّف عميل",
    navMyClients: "عملائي",
    navCommissions: "العمولات",
    navReports: "التقارير",
    navMarketingMaterials: "المواد التسويقية",
    navProfile: "الملف الشخصي",
    navSupport: "الدعم والمساعدة",
    exit: "خروج",

    searchPlaceholder: "ابحث عن العملاء، المعرّف أو الحالة...",
    notificationsTitle: "الإشعارات",
    notificationsMsg: "تمت متابعة جميع الإشعارات. 4 طلبات عملاء قيد المراجعة حالياً.",

    partnerBadge: "بوابة الشركاء التنفيذيين",
    welcomeBack: "مرحباً بعودتك،",
    welcomeSub: "تتبع إحالاتك، وأنشئ معرّفات العملاء، وأدر أرباحك وعمولاتك - كل ذلك في مكان واحد.",

    totalClients: "إجمالي العملاء",
    activeClients: "العملاء النشطون",
    totalCommission: "إجمالي العمولات",
    pendingCommission: "العمولات المعلقة",
    vsLastMonth: "مقارنة بالشهر الماضي",
    clientsPending: "عملاء معلقون",

    generateBannerTitle: "إنشاء معرّف عميل جديد",
    generateBannerSub: "أنشئ معرّفاً فريداً لتتبع إحالتك وعميلك الجديد",
    generateBtn: "+ إنشاء معرّف العميل",

    recentClientsTitle: "أحدث العملاء",
    viewAll: "عرض الكل",
    thNumber: "#",
    thClientId: "معرّف العميل",
    thClientName: "اسم العميل",
    thService: "الخدمة",
    thStatus: "الحالة",
    thCommission: "العمولة",
    thDate: "التاريخ",

    filterAll: "الكل",
    filterBusinessSetup: "تأسيس الشركات",
    filterCorporateTax: "ضريبة الشركات",
    filterVatRegistration: "ضريبة القيمة المضافة",
    filterBankAccount: "الحساب البنكي",
    filterFreelanceVisa: "تأشيرة العمل الحر",

    statusCompleted: "مكتمل",
    statusInProgress: "قيد التنفيذ",
    statusPending: "معلق",

    commissionOverviewTitle: "نظرة عامة على العمولات",
    thisMonth: "هذا الشهر",
    totalEarned: "إجمالي الأرباح",
    paid: "مدفوع",
    processing: "قيد المعالجة",
    clientStatusTitle: "حالة العملاء",
    chartTotal: "الإجمالي",
    chartActive: "نشط",
    chartPending: "معلق",
    chartCompleted: "مكتمل",

    card1Title: "المواد التسويقية",
    card1Sub: "حمّل البروشورات، الشعارات والعروض التقديمية الرسمية.",
    card2Title: "التدريب والموارد",
    card2Sub: "تعرف على خدماتنا وخطوات وإجراءات العمل.",
    card3Title: "تحتاج مساعدة؟",
    card3Sub: "تواصل مع فريق دعم الشركاء في أي وقت.",

    modalGenTitle: "إنشاء معرّف عميل جديد",
    modalGenSub: "أصدر كود تتبع رسمي لعميلك المحال.",
    modalClientNameLabel: "اسم العميل / الشركة",
    modalClientNamePlaceholder: "مثال: شركة النور للتجارة ش.ذ.م.م",
    modalServiceLabel: "الخدمة المختارة",
    modalNotesLabel: "ملاحظات داخلية (اختياري)",
    modalNotesPlaceholder: "رخصة تجارية رئيسية، مطلوب تأشيرتان...",
    modalEstCommission: "العمولة المقدرة",
    modalSubmitBtn: "إصدار معرّف العميل",
    modalSuccessTitle: "تم إنشاء معرّف العميل بنجاح!",
    modalSuccessSub: "كود التتبع الخاص بشريك تيجارة ون جاهز.",
    modalAssignedId: "معرّف العميل الصادر",
    modalDoneBtn: "تم والعودة للوحة التحكم",

    materialsModalTitle: "المواد التسويقية وحقيبة الشريك",
    materialsModalSub: "تحميل بروفايل الشركة الرسمي، مقارنة المناطق الحرة وحزم الهوية البصرية.",
    downloadBtn: "تحميل",

    supportModalTitle: "تدريب ودعم الشركاء",
    supportModalSub: "مكتب علاقات الشركاء المخصص في تيجارة ون.",
    supportDirectChannels: "قنوات التواصل المباشرة:",
    supportEmail: "البريد الإلكتروني",
    supportWhatsApp: "مكتب واتساب",
    supportOffice: "المكتب: برج بوليفارد بلازا 1، داون تاون دبي",
    closeBtn: "إغلاق",

    mobDashboard: "الرئيسية",
    mobGenerate: "إنشاء معرّف",
    mobClients: "عملائي",
    mobCommissions: "العمولات",
    mobMore: "المزيد",
  },

  ru: {
    code: "ru",
    name: "Русский",
    label: "Русский (Russian)",
    dir: "ltr",
    portalSubtitle: "ПОРТАЛ ДЛЯ ПАРТНЕРОВ",
    navDashboard: "Панель управления",
    navGenerateClientId: "Создать ID клиента",
    navMyClients: "Мои клиенты",
    navCommissions: "Комиссионные",
    navReports: "Отчеты",
    navMarketingMaterials: "Маркетинг",
    navProfile: "Профиль",
    navSupport: "Поддержка",
    exit: "Выход",

    searchPlaceholder: "Поиск клиентов, ID или статуса...",
    notificationsTitle: "Уведомления",
    notificationsMsg: "Все уведомления прочитаны. 4 заявки клиентов на рассмотрении.",

    partnerBadge: "Исполнительный портал партнеров",
    welcomeBack: "С возвращением,",
    welcomeSub: "Отслеживайте рефералов, создавайте ID клиентов и управляйте доходами в одном месте.",

    totalClients: "Всего клиентов",
    activeClients: "Активные клиенты",
    totalCommission: "Общая комиссия",
    pendingCommission: "Ожидающая комиссия",
    vsLastMonth: "по сравнению с прошлым месяцем",
    clientsPending: "клиента в ожидании",

    generateBannerTitle: "Создать новый ID клиента",
    generateBannerSub: "Создайте уникальный код отслеживания для нового клиента",
    generateBtn: "+ Создать ID клиента",

    recentClientsTitle: "Недавние клиенты",
    viewAll: "Смотреть все",
    thNumber: "#",
    thClientId: "ID КЛИЕНТА",
    thClientName: "ИМЯ КЛИЕНТА",
    thService: "УСЛУГА",
    thStatus: "СТАТУС",
    thCommission: "КОМИССИЯ",
    thDate: "ДАТА",

    filterAll: "Все",
    filterBusinessSetup: "Открытие бизнеса",
    filterCorporateTax: "Корпоративный налог",
    filterVatRegistration: "Регистрация НДС",
    filterBankAccount: "Банковский счет",
    filterFreelanceVisa: "Фриланс виза",

    statusCompleted: "Завершено",
    statusInProgress: "В процессе",
    statusPending: "В ожидании",

    commissionOverviewTitle: "Обзор комиссий",
    thisMonth: "Этот месяц",
    totalEarned: "Всего заработано",
    paid: "Выплачено",
    processing: "В обработке",
    clientStatusTitle: "Статус клиентов",
    chartTotal: "Всего",
    chartActive: "Активные",
    chartPending: "В ожидании",
    chartCompleted: "Завершено",

    card1Title: "Маркетинговые материалы",
    card1Sub: "Скачайте презентации, буклеты и логотипы.",
    card2Title: "Обучение и ресурсы",
    card2Sub: "Изучите наши услуги, регламенты и процедуры.",
    card3Title: "Нужна помощь?",
    card3Sub: "Свяжитесь со службой поддержки партнеров в любое время.",

    modalGenTitle: "Создать новый ID клиента",
    modalGenSub: "Сгенерируйте официальный реферальный ID для клиента.",
    modalClientNameLabel: "Имя клиента / Название компании",
    modalClientNamePlaceholder: "напр., Al Noor Trading LLC",
    modalServiceLabel: "Выбранная услуга",
    modalNotesLabel: "Заметки (Необязательно)",
    modalNotesPlaceholder: "Mainland коммерческая лицензия, 2 визы...",
    modalEstCommission: "ОРИЕНТ. КОМИССИЯ",
    modalSubmitBtn: "СОЗДАТЬ ID КЛИЕНТА",
    modalSuccessTitle: "ID клиента успешно создан!",
    modalSuccessSub: "Ваш уникальный код отслеживания готов к использованию.",
    modalAssignedId: "ПРИСВОЕННЫЙ ID КЛИЕНТА",
    modalDoneBtn: "Готово, вернуться в панель",

    materialsModalTitle: "Маркетинговые материалы",
    materialsModalSub: "Скачайте официальный профиль Tijara One и презентации для партнеров.",
    downloadBtn: "Скачать",

    supportModalTitle: "Обучение и поддержка партнеров",
    supportModalSub: "Выделенная служба поддержки партнеров Tijara One.",
    supportDirectChannels: "Прямые каналы связи:",
    supportEmail: "Эл. почта",
    supportWhatsApp: "WhatsApp desk",
    supportOffice: "Офис: Boulevard Plaza Tower 1, Downtown Dubai",
    closeBtn: "Закрыть",

    mobDashboard: "Главная",
    mobGenerate: "Создать ID",
    mobClients: "Клиенты",
    mobCommissions: "Комиссии",
    mobMore: "Еще",
  },
};

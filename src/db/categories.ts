import type { Category } from '@/types';

/** تعريف فئة افتراضية قبل تحويلها لسجل كامل */
interface SeedCategory {
  id: string;
  name: string;
  icon: string;
  colorIndex: number;
  kind: Category['kind'];
  type: Category['type'];
  /** كلمات مفتاحية للتعرّف التلقائي من النص العربي */
  keywords: string[];
}

export const DEFAULT_EXPENSE_CATEGORIES: SeedCategory[] = [
  {
    id: 'food',
    name: 'طعام ومطاعم',
    icon: 'utensils',
    colorIndex: 2,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'اكل', 'أكل', 'طعام', 'مطعم', 'مطاعم', 'غدا', 'غداء', 'عشا', 'عشاء', 'فطور', 'فطار',
      'شاورما', 'فلافل', 'حمص', 'فول', 'برجر', 'بيتزا', 'بيزا', 'سندويشة', 'سندويش', 'ساندويش',
      'شاورمه', 'منسف', 'مسخن', 'مقلوبه', 'مقلوبة', 'كباب', 'مشاوي', 'دجاج', 'فراخ', 'سمك',
      'وجبه', 'وجبة', 'مطعم', 'ديليفري', 'توصيل طلب', 'طلبات', 'شويه', 'كنافه', 'كنافة',
      'حلويات', 'حلو', 'بقلاوه', 'بقلاوة', 'ايس كريم', 'ايسكريم', 'بوظه', 'بوظة',
    ],
  },
  {
    id: 'coffee',
    name: 'قهوة ومشروبات',
    icon: 'coffee',
    colorIndex: 10,
    kind: 'discretionary',
    type: 'expense',
    keywords: [
      'قهوه', 'قهوة', 'كوفي', 'كافيه', 'كافي', 'اسبريسو', 'إسبريسو', 'لاتيه', 'كابتشينو',
      'كابوتشينو', 'نسكافيه', 'شاي', 'شاهي', 'عصير', 'عصائر', 'مشروب', 'مشروبات', 'كولا',
      'بيبسي', 'كوكا', 'سفن', 'مياه', 'ميه', 'مي', 'موية', 'ماء', 'سموذي', 'ميلك شيك', 'موكا',
    ],
  },
  {
    id: 'transport',
    name: 'مواصلات',
    icon: 'bus',
    colorIndex: 3,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'مواصلات', 'مواصلة', 'باص', 'سرفيس', 'تكسي', 'تاكسي', 'اوبر', 'أوبر', 'كريم', 'رحله',
      'رحلة', 'نقل', 'اجره', 'أجرة', 'اجرة', 'ركوبه', 'ركوبة', 'قطار', 'تنقل',
    ],
  },
  {
    id: 'fuel',
    name: 'بنزين',
    icon: 'fuel',
    colorIndex: 5,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'بنزين', 'سولار', 'ديزل', 'وقود', 'محطه', 'محطة', 'تعبئة', 'تعبئه', 'غاز سياره',
      'زيت سياره', 'زيت السياره', 'كهرباء سياره',
    ],
  },
  {
    id: 'car',
    name: 'السيارة',
    icon: 'car',
    colorIndex: 8,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'سياره', 'سيارة', 'كراج', 'ميكانيكي', 'صيانه سياره', 'اطارات', 'إطارات', 'كفرات',
      'تصليح سياره', 'ترخيص', 'تامين سياره', 'تأمين سيارة', 'غسيل سياره', 'بطاريه',
    ],
  },
  {
    id: 'shopping',
    name: 'تسوق',
    icon: 'shopping-bag',
    colorIndex: 4,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'تسوق', 'سوبرماركت', 'سوبر ماركت', 'ماركت', 'بقاله', 'بقالة', 'دكان', 'محل', 'مول',
      'مشتريات', 'مقاضي', 'خضار', 'فواكه', 'لحمه', 'لحمة', 'خبز',
      'حليب', 'بيض', 'جبنه', 'جبنة', 'سمنه', 'زيت', 'سكر', 'رز', 'ارز', 'طحين',
    ],
  },
  {
    id: 'clothes',
    name: 'ملابس',
    icon: 'shirt',
    colorIndex: 9,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'ملابس', 'لبس', 'قميص', 'بنطلون', 'بنطال', 'جاكيت', 'جاكت', 'كنزه', 'كنزة', 'حذاء',
      'جزمه', 'جزمة', 'كوتشي', 'صندل', 'شنطه', 'شنطة', 'حقيبه', 'حقيبة', 'ساعه', 'ساعة',
      'نظاره', 'نظارة', 'عبايه', 'عباية', 'فستان', 'طقم',
    ],
  },
  {
    id: 'home',
    name: 'منزل',
    icon: 'home',
    colorIndex: 1,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'بيت', 'منزل', 'للبيت', 'شغله للبيت', 'اثاث', 'أثاث', 'مفروشات', 'ادوات منزليه',
      'تنظيف', 'منظفات', 'صيانه', 'صيانة', 'دهان', 'كهربائي', 'سباك', 'نجار', 'مطبخ',
      'ايجار', 'إيجار', 'اجار', 'ستاير', 'سجاد',
    ],
  },
  {
    id: 'bills',
    name: 'فواتير',
    icon: 'receipt',
    colorIndex: 7,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'فاتوره', 'فاتورة', 'فواتير', 'كهربا', 'كهرباء', 'ماء', 'مياه', 'ميه', 'بلديه', 'بلدية',
      'غاز', 'جباية', 'ضريبه', 'ضريبة', 'رسوم',
    ],
  },
  {
    id: 'telecom',
    name: 'اتصالات وإنترنت',
    icon: 'wifi',
    colorIndex: 3,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'انترنت', 'إنترنت', 'نت', 'واي فاي', 'وايفاي', 'شبكه', 'شبكة', 'رصيد', 'شحن رصيد',
      'موبايل', 'جوال', 'تلفون', 'هاتف', 'جوال شحن', 'باقه', 'باقة', 'خط', 'جوالي',
      'اوريدو', 'جوال', 'بالتل', 'مكالمات',
    ],
  },
  {
    id: 'entertainment',
    name: 'ترفيه',
    icon: 'sparkles',
    colorIndex: 4,
    kind: 'discretionary',
    type: 'expense',
    keywords: [
      'ترفيه', 'سينما', 'فيلم', 'ملاهي', 'رحله', 'نزهه', 'نزهة', 'لعبه', 'لعبة', 'العاب',
      'ألعاب', 'بلايستيشن', 'بلياردو', 'ملعب', 'مسبح', 'كوفي شوب', 'خروجه', 'خروجة',
      'حفله', 'حفلة', 'تذكره', 'تذكرة', 'مغامرات',
    ],
  },
  {
    id: 'health',
    name: 'صحة',
    icon: 'heart',
    colorIndex: 7,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'صحه', 'صحة', 'دكتور', 'طبيب', 'عياده', 'عيادة', 'مستشفى', 'دوا', 'دواء', 'ادويه',
      'أدوية', 'صيدليه', 'صيدلية', 'تحاليل', 'اشعه', 'أشعة', 'اسنان', 'أسنان', 'نظارات طبيه',
      'عمليه', 'عملية', 'علاج', 'تامين صحي', 'مطعوم',
    ],
  },
  {
    id: 'gifts',
    name: 'هدايا',
    icon: 'gift',
    colorIndex: 4,
    kind: 'discretionary',
    type: 'expense',
    keywords: [
      'هديه', 'هدية', 'هدايا', 'عيديه', 'عيدية', 'مناسبه', 'مناسبة', 'عرس', 'زواج', 'خطوبه',
      'مولود', 'تخرج', 'عزا', 'عزاء', 'صدقه', 'صدقة', 'زكاه', 'زكاة', 'تبرع', 'ورد', 'زهور',
    ],
  },
  {
    id: 'subscriptions',
    name: 'اشتراكات',
    icon: 'repeat',
    colorIndex: 8,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'اشتراك', 'اشتراكات', 'نتفلكس', 'نتفليكس', 'سبوتيفاي', 'يوتيوب بريميوم', 'شاهد',
      'شهري', 'ايكلاود', 'ايكلود', 'جوجل', 'مايكروسوفت', 'اوفيس', 'تطبيق', 'خدمه شهريه',
      'كانفا', 'ادوبي', 'شات جي بي تي', 'chatgpt', 'netflix', 'spotify',
    ],
  },
  {
    id: 'work',
    name: 'عمل',
    icon: 'briefcase',
    colorIndex: 6,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'شغل', 'عمل', 'مكتب', 'ادوات مكتبيه', 'قرطاسيه', 'قرطاسية', 'طباعه', 'طباعة', 'تصوير',
      'مشروع', 'معدات', 'كمبيوتر', 'لابتوب', 'برنامج', 'دومين', 'استضافه', 'استضافة',
    ],
  },
  {
    id: 'education',
    name: 'تعليم',
    icon: 'book',
    colorIndex: 3,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'تعليم', 'جامعه', 'جامعة', 'مدرسه', 'مدرسة', 'كورس', 'دوره', 'دورة', 'كتاب', 'كتب',
      'قسط', 'اقساط', 'رسوم جامعيه', 'دروس', 'معهد', 'تدريب', 'شهاده', 'شهادة',
    ],
  },
  {
    id: 'family',
    name: 'عائلة',
    icon: 'users',
    colorIndex: 1,
    kind: 'essential',
    type: 'expense',
    keywords: [
      'عائله', 'عائلة', 'اهل', 'أهل', 'ماما', 'بابا', 'امي', 'أمي', 'ابوي', 'اخوي', 'اختي',
      'ولادي', 'اولاد', 'أولاد', 'مصروف ولاد', 'حضانه', 'حضانة', 'بيبي', 'اطفال', 'أطفال',
    ],
  },
  {
    id: 'personal',
    name: 'عناية شخصية',
    icon: 'scissors',
    colorIndex: 9,
    kind: 'flexible',
    type: 'expense',
    keywords: [
      'حلاق', 'حلاقه', 'حلاقة', 'صالون', 'كوافير', 'عطر', 'بارفان', 'شامبو', 'صابون',
      'معجون', 'فرشاه', 'كريم', 'مكياج', 'عنايه', 'عناية', 'حمام', 'مناكير', 'ماكينه حلاقه',
    ],
  },
  {
    id: 'other',
    name: 'أخرى',
    icon: 'more',
    colorIndex: 10,
    kind: 'flexible',
    type: 'expense',
    keywords: ['اخرى', 'أخرى', 'متفرقات', 'غير ذلك', 'شي', 'شغله', 'شغلة', 'اشياء'],
  },
];

export const DEFAULT_INCOME_CATEGORIES: SeedCategory[] = [
  {
    id: 'salary',
    name: 'راتب',
    icon: 'wallet',
    colorIndex: 6,
    kind: 'essential',
    type: 'income',
    keywords: ['راتب', 'معاش', 'الراتب', 'رواتب', 'مرتب'],
  },
  {
    id: 'freelance',
    name: 'عمل حر',
    icon: 'briefcase',
    colorIndex: 1,
    kind: 'essential',
    type: 'income',
    keywords: ['فريلانس', 'عمل حر', 'شغل خاص', 'تصميم', 'اعلان', 'إعلان', 'عميل', 'زبون'],
  },
  {
    id: 'gift-in',
    name: 'هدية',
    icon: 'gift',
    colorIndex: 4,
    kind: 'flexible',
    type: 'income',
    keywords: ['هديه', 'هدية', 'عيديه', 'عيدية', 'مكافاه', 'مكافأة', 'اكراميه'],
  },
  {
    id: 'sale',
    name: 'بيع',
    icon: 'shopping-bag',
    colorIndex: 5,
    kind: 'flexible',
    type: 'income',
    keywords: ['بعت', 'بيع', 'بيعت', 'مبيعات'],
  },
  {
    id: 'other-in',
    name: 'دخل آخر',
    icon: 'more',
    colorIndex: 10,
    kind: 'flexible',
    type: 'income',
    keywords: ['دخل', 'ايراد', 'إيراد', 'وارد'],
  },
];

export function buildDefaultCategories(now: number): Category[] {
  const all = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  return all.map((c, i) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    colorIndex: c.colorIndex,
    kind: c.kind,
    type: c.type,
    keywords: c.keywords,
    isDefault: true,
    archived: false,
    order: i,
    createdAt: now,
    updatedAt: now,
  }));
}

"use client";

/**
 * Curated Arabic → English name dataset used to auto-suggest the student's
 * English name from their Arabic (triple) name. Names not present in the map
 * fall back to a phonetic transliteration so every name still gets a
 * suggestion the student can edit.
 */

const ARABIC_NAMES: Record<string, string | undefined> = {
  // ── Male first names ──
  "احمد": "Ahmed",
  "محمد": "Mohamed",
  "محمود": "Mahmoud",
  "مصطفى": "Mostafa",
  "خالد": "Khaled",
  "عمر": "Omar",
  "علي": "Ali",
  "حسن": "Hassan",
  "حسين": "Hussein",
  "ابراهيم": "Ibrahim",
  "يوسف": "Youssef",
  "ياسر": "Yasser",
  "طارق": "Tarek",
  "عمرو": "Amr",
  "هشام": "Hisham",
  "ايمن": "Ayman",
  "سامي": "Sami",
  "اشرف": "Ashraf",
  "عادل": "Adel",
  "شريف": "Sherif",
  "كريم": "Karim",
  "هاني": "Hany",
  "وائل": "Wael",
  "مجدي": "Magdy",
  "نادر": "Nader",
  "رامي": "Ramy",
  "عصام": "Essam",
  "منير": "Mounir",
  "فوزي": "Fawzy",
  "سمير": "Samir",
  "جمال": "Gamal",
  "اسلام": "Islam",
  "مروان": "Marwan",
  "ادهم": "Adham",
  "رجب": "Ragab",
  "رمضان": "Ramadan",
  "سعيد": "Said",
  "فتحي": "Fathy",
  "عماد": "Emad",
  "علاء": "Alaa",
  "انور": "Anwar",
  "بهاء": "Bahaa",
  "صابر": "Saber",
  "صلاح": "Salah",
  "صبري": "Sabry",
  "ضياء": "Diaa",
  "طه": "Taha",
  "عامر": "Amer",
  "عاطف": "Atef",
  "عزيز": "Aziz",
  "فؤاد": "Fouad",
  "كمال": "Kamal",
  "لطفي": "Lotfy",
  "ماجد": "Maged",
  "ممدوح": "Mamdouh",
  "مرتضى": "Mortada",
  "مصعب": "Mosab",
  "معتز": "Moataz",
  "ناجي": "Nagy",
  "نبيل": "Nabil",
  "هيثم": "Haytham",
  "وليد": "Walid",
  "ياسين": "Yassin",
  "زياد": "Ziad",
  "سيف": "Seif",
  "يحيى": "Yahya",
  "امين": "Amin",
  "عمار": "Ammar",
  "مازن": "Mazen",
  "ايهاب": "Ehab",
  "تامر": "Tamer",
  "بيشوي": "Bishoy",
  "شنودة": "Shenouda",
  "مينا": "Mina",
  "جرجس": "Girgis",
  "بطرس": "Botros",
  "حنا": "Hanna",
  "توفيق": "Tawfik",
  "رفيق": "Rafik",
  "رشاد": "Rashad",
  "سيد": "Sayed",
  "متولي": "Metwally",
  "عاشور": "Ashour",
  "بركات": "Barakat",
  "سلامة": "Salama",
  "خليل": "Khalil",
  "اسماعيل": "Ismail",
  "سليمان": "Suleiman",
  "عثمان": "Othman",
  "صالح": "Saleh",
  "كامل": "Kamel",
  "حامد": "Hamed",
  "عوض": "Awad",
  "زكي": "Zaki",
  "نصر": "Nasr",
  "درويش": "Darwish",
  "رمزي": "Ramzy",
  "سامح": "Sameh",
  "مومن": "Moamen",
  "همام": "Hammam",
  "حسام": "Hossam",
  "رائد": "Raed",
  "ماهر": "Maher",

  // ── Female first names ──
  "فاطمة": "Fatma",
  "عائشة": "Aisha",
  "زينب": "Zeinab",
  "خديجة": "Khadija",
  "مريم": "Maryam",
  "سارة": "Sara",
  "اسماء": "Asmaa",
  "هاجر": "Hagar",
  "هالة": "Hala",
  "منى": "Mona",
  "سلمى": "Salma",
  "نور": "Nour",
  "ياسمين": "Yasmin",
  "رنا": "Rana",
  "دينا": "Dina",
  "ريم": "Reem",
  "شيماء": "Shaimaa",
  "ايمان": "Eman",
  "امل": "Amal",
  "هدى": "Hoda",
  "عبير": "Abeer",
  "اماني": "Amani",
  "مروة": "Marwa",
  "نادية": "Nadia",
  "سعاد": "Soad",
  "سهير": "Sohair",
  "ليلى": "Laila",
  "نجلاء": "Naglaa",
  "ايناس": "Enas",
  "رشا": "Rasha",
  "غادة": "Ghada",
  "حنان": "Hanan",
  "اسراء": "Esraa",
  "نورهان": "Nourhan",
  "ملك": "Malak",
  "جنى": "Jana",
  "حبيبة": "Habiba",
  "فريدة": "Farida",
  "رؤى": "Roa",
  "هبه": "Heba",
  "دعاء": "Doaa",
  "رحمة": "Rahma",
  "تقى": "Taqwa",
  "اميرة": "Amira",
  "داليا": "Dalia",
  "رانيا": "Rania",
  "منال": "Manal",
  "صفاء": "Safaa",
  "نسمة": "Nisma",
  "اية": "Aya",
  "مودة": "Mawada",
  "بسملة": "Basmala",
  "شهد": "Shahd",
  "تسبيح": "Tasbih",
  "رقية": "Rokaya",
  "سمية": "Somaya",
  "فاتن": "Faten",
  "نيفين": "Nevine",
  "جيهان": "Gihan",
  "ماجدة": "Magda",
  "سحر": "Sahar",
  "الهام": "Elham",
  "وفاء": "Wafaa",
  "عزة": "Azza",
  "هناء": "Hanaa",
  "شادية": "Shadia",
  "ناهد": "Nahed",
  "سوسن": "Sawsan",
  "سلوى": "Salwa",
  "علا": "Ola",
  "اشراق": "Eshraq",
  "رحاب": "Rihab",
  "عبلة": "Abla",
  "عواطف": "Awatef",
  "فايزة": "Fayza",
  "نوال": "Nawal",
  "فوزية": "Fawzia",
  "صباح": "Sabah",
  "زهرة": "Zahra",
  "براءة": "Baraa",
  "سديم": "Sadeem",
  "لارا": "Lara",
  "لينا": "Lina",
  "ماريا": "Maria",
  "ميرهان": "Mirhan",
  "ناردين": "Nardeen",

  // ── Compound / family-name prefixes and common surnames ──
  "عبد": "Abdel",
  "عبدالله": "Abdullah",
  "عبدالرحمن": "Abdulrahman",
  "عبدالحميد": "Abdelhamid",
  "عبدالعزيز": "Abdelaziz",
  "عبدالفتاح": "Abdelfattah",
  "عبدالمنعم": "Abdelmoneim",
  "عبدالغني": "Abdelghani",
  "عبدالسلام": "Abdelsalam",
  "عبدالرؤوف": "Abdelraouf",
  "عبدالغفار": "Abdelghaffar",
  "عبدالوهاب": "Abdelwahab",
  "عبدالمجيد": "Abdelmajeed",
  "عبدالخالق": "Abdelkhaleq",
  "عبدالعظيم": "Abdelazeem",
  "عبدالباسط": "Abdelbaset",
  "عبدالرازق": "Abdelrazek",
  "عبدالصمد": "Abdelsamad",
  "عبدالهادي": "Abdelhady",
  "عبدالكريم": "Abdelkarim",
  "عبدالحكيم": "Abdelhakim",
  "عبدالواحد": "Abdelwahed",
  "ابو": "Abo",
  "السيد": "El-Sayed",
  "الشريف": "El-Sherif",
  "البنا": "El-Banna",
  "النجار": "El-Naggar",
  "الحداد": "El-Haddad",
  "الفقي": "El-Fekky",
  "مرسى": "Morsi",
  "الشاذلي": "El-Shazly",
  "الوكيل": "El-Wakeel",
  "البرعي": "El-Barawy",
  "نعيم": "Naeem",
  "رجاء": "Ragaa",
  "حنفي": "Hanafy",
  "زغلول": "Zaghloul",
  "شكري": "Shokry",
  "حجازي": "Hegazy",
  "جابر": "Gaber",
  "بدر": "Badr",
  "بدران": "Badran",
  "عطية": "Attia",
  "عرفه": "Arafa",
  "نوح": "Noha",
  "يونس": "Younes",
  "إدريس": "Idris",
};

/** Normalize Arabic variants (diacritics, أ/إ/آ, ة, ى, ؤ, ئ) for lookup. */
function normalizeArabicForLookup(name: string): string {
  return name
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const AR_TO_LATIN: Record<string, string> = {
  "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "g", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "z", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s",
  "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
  "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
  "ء": "", "لا": "la",
};

/** Phonetic fallback used when a name part is not in the dataset. */
function transliterateArabicName(name: string): string {
  const normalized = name.replace(/[^\u0621-\u064A\s]/g, " ");
  let result = "";
  let i = 0;
  while (i < normalized.length) {
    const two = normalized.slice(i, i + 2);
    if (AR_TO_LATIN[two]) {
      result += AR_TO_LATIN[two];
      i += 2;
      continue;
    }
    result += AR_TO_LATIN[normalized[i]] ?? "";
    i += 1;
  }
  return result
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Suggest an English name from the Arabic (triple) name: dataset first, phonetic fallback. */
export function suggestEnglishName(arabicName: string): string {
  const parts = arabicName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((part) => {
      const norm = normalizeArabicForLookup(part);
      return ARABIC_NAMES[norm] ?? ARABIC_NAMES[part] ?? transliterateArabicName(part);
    })
    .join(" ");
}

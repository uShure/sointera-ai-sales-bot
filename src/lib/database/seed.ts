import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Создаем функцию для создания даты в 2025 году
const createDate = (month: number, day: number) => {
  return new Date(2025, month - 1, day); // month - 1 так как месяцы начинаются с 0
};

const courses = [
  {
    name: "Консультация на миллион",
    url: "https://sointera-biz.ru/million-consultation",
    format: "online",
    price: 500,
    category: "consultation",
    description: "Индивидуальная консультация по развитию бизнеса в индустрии красоты"
  },
  {
    name: "Курс по стрижкам с нуля",
    url: "https://sointera-biz.ru/haircut-from-zero",
    format: "offline",
    price: 95000,
    category: "haircut",
    description: "Полный курс для начинающих парикмахеров. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8), // Ближайший поток
    duration: "5 дней"
  },
  {
    name: "Курс по стрижкам. Фундамент",
    url: "https://sointera-biz.ru/stajirovka",
    format: "offline",
    price: 60000,
    category: "haircut",
    description: "11 базовых форм стрижек. Систематизация знаний, практика на манекенах. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8),
    duration: "3 дня"
  },
  {
    name: "Наставник по стрижкам",
    url: "https://sointera-biz.ru/hair_mentor",
    format: "offline",
    price: 65000,
    category: "haircut",
    description: "Программа наставничества для парикмахеров. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8),
    duration: "3 месяца"
  },
  {
    name: "ДНК цвета",
    url: "https://sointera-biz.ru/dna_person",
    format: "offline",
    price: 60000,
    category: "color",
    description: "Фундаментальная колористика без привязки к бренду. Очный курс в Творческой деревне. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8),
    duration: "3 дня"
  },
  {
    name: "Наставник по колористике",
    url: "https://sointera-biz.ru/nastavnik-kolorist",
    format: "offline",
    price: 65000,
    category: "color",
    description: "Программа наставничества для колористов. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8),
    duration: "3 месяца"
  },
  {
    name: "Короткие стрижки. Динамический онлайн интенсив",
    url: "https://sointera-biz.ru/short_haircuts_intensive",
    format: "online",
    price: 35000,
    category: "haircut",
    description: "Интенсивный онлайн курс по коротким стрижкам. Ближайшие даты: 8 сентября, 6 октября, 3 ноября, 1 декабря",
    startDate: createDate(9, 8),
    duration: "1 день"
  },
  {
    name: "Очный курс по коротким стрижкам",
    url: "https://sointera-biz.ru/short_haircuts_offline",
    format: "offline",
    price: 70000,
    category: "haircut",
    description: "Интенсивный очный курс по коротким стрижкам",
    startDate: createDate(9, 9),
    endDate: createDate(9, 11),
    duration: "3 дня"
  },
  {
    name: "Очный курс ДНК цвета",
    url: "https://sointera-biz.ru/dna_offline",
    format: "offline",
    price: 70000,
    category: "color",
    description: "Углубленный курс по колористике",
    startDate: createDate(9, 30),
    endDate: createDate(10, 2),
    duration: "3 дня"
  },
  {
    name: "Курс по стрижкам 2.0 (продвинутый уровень)",
    url: "https://sointera-biz.ru/haircuts-2-0",
    format: "offline",
    price: 75000,
    category: "haircut",
    description: "Продвинутый курс по стрижкам, комбинация фундаментальных форм",
    startDate: createDate(10, 21),
    endDate: createDate(10, 23),
    duration: "3 дня"
  },
  {
    name: "Ежегодное выездное планирование для руководителей салонов красоты",
    url: "https://sointera-biz.ru/planning",
    format: "offline",
    price: 95000,
    category: "management",
    description: "Стратегическое планирование для владельцев салонов",
    startDate: createDate(12, 2),
    endDate: createDate(12, 4),
    duration: "3 дня"
  },
  {
    name: "СПА-стажировка в онлайн формате",
    url: "https://sointera-biz.ru/spa-online",
    format: "online",
    price: 15000,
    category: "spa",
    description: "Онлайн обучение СПА-процедурам для волос"
  },
  {
    name: "Стрижка SOINTERA",
    url: "https://sointera-biz.ru/haircut-sointera",
    format: "online",
    price: 3900,
    category: "haircut",
    description: "Авторская стрижка по методике SOINTERA"
  },
  {
    name: "Мастер-группа для руководителей",
    url: "https://sointera-biz.ru/master-gruppa",
    format: "online",
    price: 150000,
    category: "management",
    description: "Группа для владельцев и руководителей салонов красоты"
  },
  {
    name: "Школа маркетинга",
    url: "https://sointera-biz.ru/school-of-marketing",
    format: "online",
    price: 35000,
    category: "marketing",
    description: "Маркетинг для салонов красоты и частных мастеров"
  },
  {
    name: "ДНК Цвета. Онлайн курс по колористике",
    url: "https://sointera-biz.ru/dna_online",
    format: "online",
    price: 39000,
    category: "color",
    description: "Фундаментальная колористика онлайн"
  },
  {
    name: "Короткие стрижки",
    url: "https://sointera-biz.ru/short_haircuts",
    format: "online",
    price: 35000,
    category: "haircut",
    description: "Онлайн курс по коротким стрижкам"
  },
  {
    name: "Курс по стрижкам",
    url: "https://sointera-biz.ru/haircut_course",
    format: "online",
    price: 39000,
    category: "haircut",
    description: "Базовый онлайн курс по стрижкам"
  },
  {
    name: "Парикмахер с нуля",
    url: "https://sointera-biz.ru/parikmakher-s-nulya",
    format: "online",
    price: 135000,
    category: "haircut",
    description: "Полный курс обучения парикмахерскому искусству с нуля"
  },
  {
    name: "Корейские стрижки",
    url: "https://sointera-biz.ru/koreyskiye-strizhki",
    format: "online",
    price: 8950,
    category: "haircut",
    description: "Техники и стили корейских стрижек"
  },
  {
    name: "Факультет по неуправляемым волосам",
    url: "https://sointera-biz.ru/fakultat-po-neupravlyayemym-volosam",
    format: "online",
    price: 8950,
    category: "haircut",
    description: "Работа со сложными типами волос"
  },
  {
    name: "Факультет по работе с блондинками",
    url: "https://sointera-biz.ru/fakultet-blond",
    format: "online",
    price: 8950,
    category: "color",
    description: "Специализация по блондированию"
  },
  {
    name: "Лицензия преподавателя",
    url: "https://sointera-biz.ru/licenziya-prepodavatelya",
    format: "offline",
    price: 130000,
    category: "education",
    description: "Программа подготовки преподавателей парикмахерского искусства"
  },
  {
    name: "Федеральная программа подготовки тренеров",
    url: "https://sointera-biz.ru/federalnaya-programma-podgotovki",
    format: "offline",
    price: 260000,
    category: "education",
    description: "Профессиональная подготовка тренеров для индустрии красоты"
  }
];

async function seed() {
  console.log('Начинаю заполнение базы данных...');

  // Очищаем существующие данные
  await prisma.course.deleteMany();

  // Добавляем курсы
  for (const course of courses) {
    await prisma.course.create({ data: course });
  }

  console.log(`Добавлено ${courses.length} курсов`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

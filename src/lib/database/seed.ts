import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    name: "Короткие стрижки 2.0",
    url: "https://sointera-biz.ru/short_haircuts2",
    format: "offline",
    price: 70000,
    category: "haircut",
    description: "Продвинутый курс по коротким стрижкам в Творческой деревне",
    duration: "3 дня"
  },
  {
    name: "Очный курс по стрижкам: фундамент",
    url: "https://sointera-biz.ru/stajirovka",
    format: "offline",
    price: 60000,
    category: "haircut",
    description: "11 базовых форм стрижек. Систематизация знаний, практика на манекенах",
    duration: "3 дня"
  },
  {
    name: "Стрижки 2.0",
    url: "https://sointera-biz.ru/haircuts-2-0",
    format: "offline",
    price: 60000,
    category: "haircut",
    description: "Продвинутый курс по стрижкам с новыми техниками"
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
    name: "Планирование в салоне",
    url: "https://sointera-biz.ru/planning",
    format: "offline",
    price: 95000,
    category: "management",
    description: "Курс по организации и планированию работы салона"
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
    name: "ДНК Цвета. Курс по колористике",
    url: "https://sointera-biz.ru/dna_online",
    format: "online",
    price: 39000,
    category: "color",
    description: "Фундаментальная колористика без привязки к бренду"
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
    name: "Наставник по стрижкам",
    url: "https://sointera-biz.ru/hair_mentor",
    format: "online",
    price: 65000,
    category: "haircut",
    description: "Программа наставничества для парикмахеров"
  },
  {
    name: "Наставник-колорист",
    url: "https://sointera-biz.ru/nastavnik-kolorist",
    format: "online",
    price: 65000,
    category: "color",
    description: "Программа наставничества для колористов"
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
  },
  {
    name: "ДНК ЦВЕТА Фундаментальный курс по колористике в Творческой деревне",
    url: "https://sointera-biz.ru/dna_person#rec981721501",
    format: "offline",
    price: 60000,
    category: "color",
    description: "Очный курс по колористике в Творческой деревне. 3 дня полного погружения",
    duration: "3 дня"
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

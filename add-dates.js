const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Добавляем даты к существующим курсам
  const courses = await prisma.course.findMany();
  console.log(`Найдено ${courses.length} курсов`);
  
  const createDate = (month, day) => new Date(2025, month - 1, day);
  
  // Обновляем курсы с датами сентября
  const updates = [
    { name: "Курс по стрижкам с нуля", startDate: createDate(9, 8) },
    { name: "Курс по стрижкам. Фундамент", startDate: createDate(9, 8) },
    { name: "Наставник по стрижкам", startDate: createDate(9, 8) },
    { name: "ДНК цвета", startDate: createDate(9, 8) },
    { name: "Наставник по колористике", startDate: createDate(9, 8) },
    { name: "Короткие стрижки. Динамический онлайн интенсив", startDate: createDate(9, 8) },
    { name: "Очный курс по коротким стрижкам", startDate: createDate(9, 9) },
    { name: "Очный курс ДНК цвета", startDate: createDate(9, 30) },
    { name: "Курс по стрижкам 2.0 (продвинутый уровень)", startDate: createDate(10, 21) },
    { name: "Ежегодное выездное планирование для руководителей салонов красоты", startDate: createDate(12, 2) }
  ];
  
  for (const update of updates) {
    try {
      await prisma.course.updateMany({
        where: { name: update.name },
        data: { startDate: update.startDate }
      });
      console.log(`Обновлен: ${update.name}`);
    } catch (e) {
      console.log(`Не найден: ${update.name}`);
    }
  }
  
  const withDates = await prisma.course.count({ where: { startDate: { not: null } } });
  console.log(`Курсов с датами: ${withDates}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

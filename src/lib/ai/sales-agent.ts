import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Загружаем переменные окружения из .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Настройка прокси если указан
const httpAgent = process.env.HTTPS_PROXY
  ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
  : undefined;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpAgent as any,
});

const prisma = new PrismaClient();

export interface CustomerContext {
  telegramId: string;
  username?: string;
  firstName?: string;
  classification?: string;
  stage?: string;
  conversation?: any;
}

const MANAGER_TRIGGERS = [
  'оформить заказ',
  'лист ожидания',
  'не могу зайти в личный кабинет',
  'программа курса',
  'рассрочка от нас',
  'оплатить как ип'
];

const SYSTEM_PROMPT = `
Вы - AI-продажник школы парикмахерского искусства SOINTERA. Вы общаетесь с клиентами от лица школы, помогаете выбрать курсы и отвечаете на вопросы.

ВАЖНО: Предлагайте ТОЛЬКО реальные курсы из базы данных с точными ценами!

📋 ПРИНЦИПЫ ОБЩЕНИЯ:
1. Лёгкий, разговорный стиль. Обращение на "вы"
2. Задавайте уточняющие вопросы: "А вы уже проходили похожие курсы?", "А в какой вы сейчас точке?"
3. Используйте фразы поддержки: "Очень понятный вопрос", "Вы точно не одна с таким запросом"
4. Аргументируйте через пользу: "Этот курс хорошо заходит тем, кто..."
5. Аккуратные переходы к продаже: "Если чувствуете, что это ваш формат — можно забронировать место сейчас"

ОСНОВНЫЕ КУРСЫ SOINTERA:

ОФЛАЙН в Творческой деревне (60000-70000 руб):
- Очный курс по стрижкам: фундамент - 60000 руб (3 дня, 11 базовых форм)
- Короткие стрижки 2.0 - 70000 руб
- ДНК ЦВЕТА (колористика) - 60000 руб (3 дня полного погружения)

ОНЛАЙН курсы:
- Парикмахер с нуля - 135000 руб (полное обучение с нуля)
- Курс по стрижкам - 39000 руб
- ДНК Цвета онлайн - 39000 руб
- Короткие стрижки - 35000 руб
- Наставник по стрижкам - 65000 руб

🏡 О ТВОРЧЕСКОЙ ДЕРЕВНЕ:
Очные курсы проходят в загородной академии SOINTERA. Это профессиональный ретрит с проживанием в купольных домиках, питанием от повара. Формат "всё включено".

📱 КОГДА ЗВАТЬ МЕНЕДЖЕРА:
Если клиент спрашивает про: оформление заказа, лист ожидания, личный кабинет, рассрочку - скажите: "По этому вопросу вас проконсультирует наш менеджер @natalylini."
`;

export class SalesAgent {
  async classifyCustomer(message: string, context: CustomerContext): Promise<string> {
    const keywords = {
      beginner: ['начинающий', 'новичок', 'с нуля', 'хочу научиться', 'нет опыта'],
      experienced: ['опыт', 'работаю', 'лет в профессии', 'мастер', 'салон'],
      interested: ['интересно', 'расскажите', 'что у вас есть', 'какие курсы'],
      ready: ['хочу купить', 'готов оплатить', 'записаться', 'забронировать']
    };

    for (const [classification, words] of Object.entries(keywords)) {
      if (words.some(word => message.toLowerCase().includes(word))) {
        return classification;
      }
    }

    return 'interested';
  }

  async shouldCallManager(message: string): Promise<boolean> {
    const lowerMessage = message.toLowerCase();
    return MANAGER_TRIGGERS.some(trigger => lowerMessage.includes(trigger));
  }

  async processMessage(message: string, context: CustomerContext): Promise<{
    response: string;
    callManager: boolean;
    classification?: string;
  }> {
    // Проверяем, нужен ли менеджер
    const callManager = await this.shouldCallManager(message);
    if (callManager) {
      return {
        response: `По этому вопросу вас проконсультирует наш менеджер @${process.env.MANAGER_USERNAME}, я передам ей ваш запрос. Она свяжется с вами в ближайшее время.`,
        callManager: true
      };
    }

    // Классифицируем клиента
    const classification = await this.classifyCustomer(message, context);

    // Получаем релевантные курсы
    const courses = await this.findRelevantCourses(message);

    // Генерируем ответ с помощью AI
    const response = await this.generateResponse(message, courses, context);

    return {
      response,
      callManager: false,
      classification
    };
  }

  async findRelevantCourses(message: string) {
    const keywords = {
      haircut: ['стрижк', 'короткие', 'форм'],
      color: ['цвет', 'колорист', 'блонд', 'днк цвета', 'окрашиван'],
      management: ['руководител', 'салон', 'планирован', 'управлен'],
      education: ['преподават', 'тренер', 'обуч'],
      online: ['онлайн', 'дистанц'],
      offline: ['очно', 'офлайн', 'деревн']
    };

    const categories: string[] = [];
    const formats: string[] = [];

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => message.toLowerCase().includes(word))) {
        if (category === 'online' || category === 'offline') {
          formats.push(category);
        } else {
          categories.push(category);
        }
      }
    }

    const where: any = {};
    if (categories.length > 0) {
      where.category = { in: categories };
    }
    if (formats.length > 0) {
      where.format = { in: formats };
    }

    const courses = await prisma.course.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      take: 5
    });

    return courses;
  }

  async generateResponse(
    message: string,
    courses: any[],
    context: CustomerContext
  ): Promise<string> {
    const coursesInfo = courses.map(c =>
      `- ${c.name} (${c.format === 'online' ? 'онлайн' : 'офлайн'}): ${c.price} руб. ${c.description || ''}`
    ).join('\n');

    // Создаём полный промпт с информацией о всех курсах
    const FULL_PROMPT_WITH_COURSES = `${SYSTEM_PROMPT}

КУРСЫ ИЗ ПОИСКА ПО ЗАПРОСУ:
${coursesInfo || 'По вашему запросу найдены следующие курсы:'}

ВАЖНО: Всегда предлагайте конкретные курсы с точными ценами из списка выше!
Если клиент спрашивает про стрижки - предлагайте курсы по стрижкам.
Если про окрашивание - курсы по колористике.
Если про обучение с нуля - курс "Парикмахер с нуля" за 135000 руб.`;

    const messages = [
      { role: 'system' as const, content: FULL_PROMPT_WITH_COURSES },
      {
        role: 'user' as const,
        content: message
      }
    ];

    try {
      const { callOpenAI } = await import('./openai-alternative');
      const response = await callOpenAI(messages, process.env.OPENAI_API_KEY!);
      return response || 'Извините, не могу сформулировать ответ.';
    } catch (error) {
      console.error('Error generating response:', error);
      return 'Извините, произошла ошибка. Наш менеджер @natalylini свяжется с вами в ближайшее время.';
    }
  }

  async saveConversation(
    customerId: string,
    userMessage: string,
    assistantMessage: string,
    conversationId?: string
  ) {
    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          customerId,
          messages: {
            create: [
              { role: 'user', content: userMessage },
              { role: 'assistant', content: assistantMessage }
            ]
          }
        }
      });
      return conversation.id;
    } else {
      await prisma.message.createMany({
        data: [
          { conversationId, role: 'user', content: userMessage },
          { conversationId, role: 'assistant', content: assistantMessage }
        ]
      });
      return conversationId;
    }
  }
}

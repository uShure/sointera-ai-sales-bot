import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

// Загружаем переменные окружения из .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Настройка прокси если указан
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Создаем кастомный fetch с прокси
const customFetch = httpAgent ? (url: any, init: any = {}) => {
  return fetch(url, { ...init, agent: httpAgent });
} : undefined;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpAgent as any,
  fetch: customFetch as any,
});

const prisma = new PrismaClient();

export interface CustomerContext {
  telegramId: string;
  username?: string;
  firstName?: string;
  classification?: string;
  stage?: string;
  conversationId?: string;
}

const MANAGER_TRIGGERS = [
  'оформить заказ',
  'лист ожидания',
  'не могу зайти в личный кабинет',
  'программа курса',
  'рассрочка от нас',
  'оплатить как ип',
  'купить',
  'оплатить',
  'записаться'
];

const SYSTEM_PROMPT = `
Вы - AI-продажник школы парикмахерского искусства SOINTERA. Вы общаетесь с клиентами от лица школы, помогаете выбрать курсы и отвечаете на вопросы.

ВАЖНО: 
- Вы НЕ придумываете ничего от себя. Используете только информацию из базы данных курсов.
- Обязательно указывайте ДАТЫ НАЧАЛА курсов для очных и курсов с куратором.
- Курсы в записи БЕЗ даты старта - можно начать в любое время.
- Сегодня ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}.

📋 ПРИНЦИПЫ ОБЩЕНИЯ:
1. Лёгкий, разговорный стиль. Обращение на "вы"
2. Задавайте уточняющие вопросы: "А вы уже проходили похожие курсы?", "А в какой вы сейчас точке?"
3. После презентации курса спрашивайте: "Готовы забронировать место?" или "Какой вариант вам больше подходит?"
4. Используйте фразы поддержки: "Очень понятный вопрос", "Вы точно не одна с таким запросом"
5. Аргументируйте через пользу: "Этот курс хорошо заходит тем, кто..."

❌ НЕ ИСПОЛЬЗУЙТЕ:
- Навязчивые фразы: "Только сегодня скидка!", "Вы упустите шанс!"
- Пассивную неуверенность: "Может быть, вам подойдёт..."
- Сухую информацию без контекста

🎯 ЦЕЛЕВАЯ АУДИТОРИЯ:
- Женщины 30-45 лет
- В профессии от 5 до 20 лет
- Хотят системы, уверенности, роста дохода
- Боятся поднимать цены, онлайн-обучения, что "уже поздно"

📚 ВАЖНАЯ ИНФОРМАЦИЯ О КУРСАХ:

ОЧНЫЕ КУРСЫ:
- Проходят в Творческой деревне SOINTERA
- Формат "всё включено": проживание, питание от повара, утренние беседы с Еленой
- НЕ выдаем ножницы и фен (нужно привезти свои)
- НЕТ видеозаписей курсов после обучения
- Мужья НЕ могут присутствовать
- НЕТ доплаты за ночь
- НЕТ рассрочки на очные курсы
- Полотенце привозить НЕ нужно

ОНЛАЙН КУРСЫ:
- Доступ к материалам на 1 год
- Если не успели сдать задания вовремя - продление 3000 руб/месяц
- Рассрочка от школы на разное количество месяцев (зависит от курса)
- Можно оплатить на одного, а смотреть нескольким (домашку сдает тот, кто оплатил)

ТРЕБОВАНИЯ К КУРСАМ:
- "Фундамент" и "С нуля" - НЕ для новичков! Нужно иметь базовое образование парикмахера
- "Наставник по стрижкам" - практика на манекенах в три круга

РАЗНИЦА МЕЖДУ КУРСАМИ:
- ТРЕНЕР - обучает других мастеров, ведет курсы
- НАСТАВНИК - индивидуальное сопровождение мастеров

ТАКТИКА ПРОДАЖ:
- При запросе очных курсов, если нет мест: "К сожалению, места на очный курс закончились. Но есть отличная альтернатива - онлайн формат с теми же результатами! Вы сможете учиться в удобном темпе, пересматривать уроки, и главное - начать уже на следующей неделе."

РАСПИСЫВАЙТЕ ПРОГРАММУ в сообщениях, не отправляйте просто на сайт.



ВАЖНО ДЛЯ НОВИЧКОВ:
Если человек говорит "с нуля", "я новичок", "нет опыта", "хочу научиться" - отвечайте:
"К сожалению, у нас НЕТ курсов для полных новичков без парикмахерского образования. Все наши программы требуют базовое парикмахерское образование (минимум курсы или колледж). 

Рекомендую сначала получить базовое образование в парикмахерском колледже или на базовых курсах в вашем городе, а затем вернуться к нам для повышения квалификации.

Наши курсы подойдут вам, когда у вас уже будет база и опыт работы с клиентами."

НЕ предлагайте курсы "Парикмахер с нуля" - несмотря на название, он тоже требует базу!
НЕ предлагайте "Наставник" и "Стрижка SOINTERA" - это для опытных мастеров!

📱 КОГДА ЗВАТЬ МЕНЕДЖЕРА:
Если клиент спрашивает про: оформление заказа, лист ожидания, личный кабинет, подробную программу курса, рассрочку от школы, оплату как ИП, или готов купить/записаться - скажите: "По этому вопросу вас проконсультирует наш менеджер @natalylini, я передам ей ваш запрос."
`;

export class SalesAgent {
  async classifyCustomer(message: string, context: CustomerContext): Promise<string> {
    const keywords = {
      beginner: ['начинающий', 'новичок', 'с нуля', 'хочу научиться', 'нет опыта'],
      experienced: ['опыт', 'работаю', 'лет в профессии', 'мастер', 'салон'],
      interested: ['интересно', 'расскажите', 'что у вас есть', 'какие курсы'],
      ready_to_buy: ['хочу купить', 'готов оплатить', 'записаться', 'забронировать', 'беру', 'оплачу']
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

  // Получаем историю беседы
  async getConversationHistory(conversationId: string | undefined): Promise<any[]> {
    if (!conversationId) return [];

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10 // Берем последние 10 сообщений для контекста
    });

    return messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
  }

  async processMessage(message: string, context: CustomerContext): Promise<{
    response: string;
    callManager: boolean;
    classification?: string;
    managerInfo?: {
      customerName: string;
      customerUsername?: string;
      request: string;
      classification?: string;
    };
  }> {
    // Классифицируем клиента
    const classification = await this.classifyCustomer(message, context);

    // Проверяем, нужен ли менеджер
    const callManager = await this.shouldCallManager(message) || classification === 'ready_to_buy';
    
    if (callManager) {
      const managerInfo = {
        customerName: context.firstName || context.username || context.telegramId,
        customerUsername: context.username,
        request: message,
        classification
      };

      return {
        response: `По этому вопросу вас проконсультирует наш менеджер @${process.env.MANAGER_USERNAME}, я передам ей ваш запрос. Она свяжется с вами в ближайшее время.`,
        callManager: true,
        classification,
        managerInfo
      };
    }

    // Получаем историю беседы
    const conversationHistory = await this.getConversationHistory(context.conversationId);

    // Получаем релевантные курсы
    const courses = await this.findRelevantCourses(message);

    // Генерируем ответ с помощью AI
    const response = await this.generateResponse(message, courses, context, conversationHistory);

    return {
      response,
      callManager: false,
      classification
    };
  }

  async findRelevantCourses(message: string) {
    const keywords = {
      haircut: ['стрижк', 'короткие', 'форм', 'парикмахер'],
      color: ['цвет', 'колорист', 'блонд', 'днк цвета', 'окрашиван'],
      management: ['руководител', 'салон', 'планирован', 'управлен'],
      education: ['преподават', 'тренер', 'обуч', 'наставник'],
      online: ['онлайн', 'дистанц'],
      offline: ['очно', 'офлайн', 'деревн', 'творческая деревня']
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

    // Получаем курсы с датами, отсортированные по дате начала
    const courses = await prisma.course.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [
        { startDate: 'asc' },
        { price: 'asc' }
      ],
      take: 7
    });

    // Если ничего не нашли по категориям, берем ближайшие курсы
    if (courses.length === 0) {
      const nearestCourses = await prisma.course.findMany({
        where: {
          startDate: {
            gte: new Date()
          }
        },
        orderBy: { startDate: 'asc' },
        take: 5
      });
      return nearestCourses;
    }

    return courses;
  }

  formatCourseDate(date: Date | null | undefined): string {
    if (!date) return '';
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('ru-RU', options);
  }

  async generateResponse(
    message: string,
    courses: any[],
    context: CustomerContext,
    conversationHistory: any[]
  ): Promise<string> {
    // Форматируем информацию о курсах с датами
    const coursesInfo = courses.map(c => {
      const dateInfo = c.startDate ? `, начало ${this.formatCourseDate(c.startDate)}` : '';
      return `- ${c.name} (${c.format === 'online' ? 'онлайн' : 'офлайн'}${dateInfo}): ${c.price} руб. ${c.description || ''}`;
    }).join('\n');

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'system' as const,
        content: `Доступные курсы для рекомендации:\n${coursesInfo || 'Используйте общую информацию о школе'}\n\nИстория диалога с клиентом доступна ниже для контекста.`
      }
    ];

    // Добавляем историю беседы
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Добавляем текущее сообщение
    messages.push({
      role: 'user' as const,
      content: message
    });

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1500
      });

      return completion.choices[0].message.content || 'Извините, не могу сформулировать ответ. Попробуйте переформулировать вопрос.';
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
  ): Promise<string> {
    // Если есть conversationId и беседа активна, продолжаем её
    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (conversation && conversation.status === 'active') {
        // Добавляем новые сообщения в существующую беседу
        await prisma.message.createMany({
          data: [
            { conversationId, role: 'user', content: userMessage },
            { conversationId, role: 'assistant', content: assistantMessage }
          ]
        });
        
        // Обновляем время последнего обновления беседы
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });

        return conversationId;
      }
    }

    // Создаем новую беседу только если старой нет или она не активна
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
  }
}

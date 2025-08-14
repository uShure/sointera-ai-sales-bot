import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { PrismaClient } from '@prisma/client';
import { SalesAgent } from './lib/ai/sales-agent';
import readline from 'readline/promises';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { format } from 'util';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

// Создаём папку для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Создаём потоки для записи логов
const logFile = createWriteStream(path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`), { flags: 'a' });
const errorFile = createWriteStream(path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`), { flags: 'a' });

// Функция для логирования
const log = (level: 'INFO' | 'ERROR' | 'DEBUG', message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = format(`[${timestamp}] [${level}] ${message}`, ...args);

  // Выводим в консоль
  if (level === 'ERROR') {
    console.error(formattedMessage);
  } else {
    console.log(formattedMessage);
  }

  // Записываем в файл
  if (level === 'ERROR') {
    errorFile.write(formattedMessage + '\n');
  }
  logFile.write(formattedMessage + '\n');
};

class TelegramUserbot {
  private client: TelegramClient;
  private salesAgent: SalesAgent;
  private activeConversations: Map<string, string> = new Map();
  private isRunning: boolean = false;
  private messagesProcessed: number = 0;
  private sessionStartTime: Date = new Date();

  constructor() {
    const apiId = parseInt(process.env.TELEGRAM_API_ID!);
    const apiHash = process.env.TELEGRAM_API_HASH!;
    const stringSession = new StringSession(process.env.TELEGRAM_SESSION_STRING || '');

    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    this.salesAgent = new SalesAgent();
  }

  async start() {
    log('INFO', '🚀 Запуск SOINTERA AI Продажника...');
    log('INFO', '📱 Подключение к личному аккаунту Telegram...');

    const isHeadless = process.env.HEADLESS === 'true';

    // Подключаемся к Telegram
    if (isHeadless && process.env.TELEGRAM_SESSION_STRING) {
      // Для сервера - используем сохранённую сессию
      await this.client.connect();
      log('INFO', '✅ Подключено через сохранённую сессию');
    } else {
      // Интерактивный режим для первого запуска
      await this.client.start({
        phoneNumber: async () => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const phone = await rl.question('📞 Введите номер телефона (с кодом страны, например +7...): ');
          rl.close();
          return phone;
        },
        password: async () => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const password = await rl.question('🔐 Введите пароль 2FA (если есть, иначе нажмите Enter): ');
          rl.close();
          return password;
        },
        phoneCode: async () => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const code = await rl.question('💬 Введите код из Telegram: ');
          rl.close();
          return code;
        },
        onError: (err) => log('ERROR', 'Ошибка подключения:', err),
      });

      // Сохраняем сессию для будущего использования
      const sessionString = (this.client.session as StringSession).save();
      if (sessionString && !process.env.TELEGRAM_SESSION_STRING) {
        log('INFO', '📌 ВАЖНО! Сохраните строку сессии в файл .env.local');
        console.log('----------------------------------------');
        console.log(`TELEGRAM_SESSION_STRING=${sessionString}`);
        console.log('----------------------------------------');

        // Также сохраняем в файл для удобства
        fs.writeFileSync('session.txt', `TELEGRAM_SESSION_STRING=${sessionString}`);
        log('INFO', 'Сессия также сохранена в файл session.txt');
      }
    }

    // Получаем информацию о текущем пользователе
    const me = await this.client.getMe();
    log('INFO', `👤 Вошли как: ${me.firstName} ${me.lastName || ''} (@${me.username || 'без username'})`);
    log('INFO', `📊 ID аккаунта: ${me.id}`);

    // Обработка входящих сообщений
    this.client.addEventHandler(this.handleMessage.bind(this), new NewMessage({}));

    this.isRunning = true;
    this.sessionStartTime = new Date();

    log('INFO', '🤖 AI Продажник активен и готов отвечать на сообщения!');
    log('INFO', '📨 Ожидание входящих сообщений...');

    // Запускаем периодическую статистику
    this.startStatsReporting();
  }

  private async handleMessage(event: any) {
    const message = event.message;

    // Обрабатываем только личные сообщения (не от групп/каналов)
    if (!message.isPrivate || !message.fromId) {
      return;
    }

    // Игнорируем исходящие сообщения (наши собственные)
    if (message.out) {
      return;
    }

    const userId = message.fromId.userId?.toString();
    if (!userId) return;

    const text = message.text;
    if (!text) return;

    // Получаем информацию об отправителе
    const sender = await message.getSender();
    const senderName = sender.firstName || sender.username || 'Клиент';

    log('INFO', `💬 Новое сообщение от ${senderName} (@${sender.username || 'без username'}): "${text}"`);

    try {
      // Получаем или создаем клиента в базе
      const customer = await this.getOrCreateCustomer(userId, sender);

      // Получаем ID активной беседы
      const conversationId = this.activeConversations.get(userId);

      // Обрабатываем сообщение через AI агента
      log('DEBUG', 'Анализирую сообщение через AI...');
      const result = await this.salesAgent.processMessage(text, {
        telegramId: userId,
        username: customer.username || undefined,
        firstName: customer.firstName || undefined,
        classification: customer.classification || undefined,
        stage: customer.stage || undefined,
        conversationId: conversationId,
      });

      // Сохраняем беседу
      const newConversationId = await this.salesAgent.saveConversation(
        customer.id,
        text,
        result.response,
        conversationId
      );

      this.activeConversations.set(userId, newConversationId);

      // Обновляем классификацию клиента
      if (result.classification) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            classification: result.classification,
            stage: result.classification === 'ready_to_buy' ? 'ready_to_buy' : customer.stage,
            lastInteraction: new Date()
          }
        });
        log('INFO', `📊 Классификация клиента: ${this.getClassificationLabel(result.classification)}`);
      }

      // Отправляем ответ
      log('INFO', `🤖 Отправляю ответ: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);

      await message.reply({ message: result.response });
      this.messagesProcessed++;
      log('INFO', `✅ Ответ отправлен. Всего обработано сообщений: ${this.messagesProcessed}`);

      // Если нужен менеджер, уведомляем
      if (result.callManager && result.managerInfo) {
        log('INFO', `⚠️ Требуется помощь менеджера! Передаю @${process.env.MANAGER_USERNAME}`);
        await this.createManagerRequest(customer.id, text);
        await this.notifyManagerWithDetails(customer, result.managerInfo);
      }

    } catch (error) {
      log('ERROR', 'Ошибка обработки сообщения:', error);
      await message.reply({
        message: 'Извините, произошла техническая ошибка. Наш менеджер @natalylini свяжется с вами в ближайшее время.'
      });
    }
  }

  private getClassificationLabel(classification: string): string {
    const labels: Record<string, string> = {
      beginner: '🆕 Новичок',
      experienced: '💼 Опытный',
      interested: '🤔 Интересуется',
      ready_to_buy: '💳 Готов купить'
    };
    return labels[classification] || classification;
  }

  private async getOrCreateCustomer(telegramId: string, sender: any) {
    let customer = await prisma.customer.findUnique({
      where: { telegramId }
    });

    if (!customer) {
      log('INFO', `📝 Новый клиент! Добавляю в базу...`);
      customer = await prisma.customer.create({
        data: {
          telegramId,
          username: sender.username || null,
          firstName: sender.firstName || null,
          lastName: sender.lastName || null,
          phoneNumber: sender.phone || null,
        }
      });
    }

    return customer;
  }

  private async createManagerRequest(customerId: string, reason: string) {
    await prisma.managerRequest.create({
      data: {
        customerId,
        reason
      }
    });
  }

  private async notifyManager(customer: any, message: string) {
    const managerUsername = process.env.MANAGER_USERNAME;
    if (!managerUsername) return;

    try {
      log('INFO', `📤 Отправляю уведомление менеджеру @${managerUsername}...`);
      const managerEntity = await this.client.getEntity(managerUsername);
      await this.client.sendMessage(managerEntity, {
        message: `🔔 **Требуется помощь менеджера!**\n\n👤 **Клиент:** ${customer.firstName || customer.username || customer.telegramId}\n📝 **Запрос:** ${message}\n\n⏰ Время: ${new Date().toLocaleString('ru-RU')}`
      });
      log('INFO', '✅ Менеджер уведомлен');
    } catch (error) {
      log('ERROR', 'Не удалось отправить уведомление менеджеру:', error);
    }
  }

  private async notifyManagerWithDetails(customer: any, managerInfo: any) {
    const managerUsername = process.env.MANAGER_USERNAME;
    if (!managerUsername) return;

    try {
      log('INFO', `📤 Отправляю подробное уведомление менеджеру @${managerUsername}...`);
      const managerEntity = await this.client.getEntity(managerUsername);

      // Формируем подробное сообщение для менеджера
      let messageText = `🔔 **Требуется помощь менеджера!**\n\n`;
      messageText += `👤 **Клиент:** ${customer.firstName || 'Без имени'}`;

      if (customer.username) {
        messageText += ` (@${customer.username})`;
      }

      messageText += `\n📞 **Telegram ID:** ${customer.telegramId}`;

      if (customer.phoneNumber) {
        messageText += `\n☎️ **Телефон:** ${customer.phoneNumber}`;
      }

      if (managerInfo.classification) {
        messageText += `\n📊 **Статус:** ${this.getClassificationLabel(managerInfo.classification)}`;
      }

      messageText += `\n\n📝 **Запрос клиента:**\n"${managerInfo.request}"`;

      // Добавляем историю взаимодействий если есть
      if (customer.lastInteraction) {
        const lastDate = new Date(customer.lastInteraction);
        messageText += `\n\n⏰ **Последнее взаимодействие:** ${lastDate.toLocaleString('ru-RU')}`;
      }

      // Добавляем прямую ссылку на клиента в Telegram
      messageText += `\n\n💬 **Написать клиенту:** [Открыть чат](tg://user?id=${customer.telegramId})`;
      messageText += `\n\n📅 **Время запроса:** ${new Date().toLocaleString('ru-RU')}`;

      await this.client.sendMessage(managerEntity, {
        message: messageText,
        parseMode: 'markdown'
      });

      log('INFO', '✅ Менеджер получил подробное уведомление');
    } catch (error) {
      log('ERROR', 'Не удалось отправить уведомление менеджеру:', error);
    }
  }

  private startStatsReporting() {
    // Каждый час записываем статистику
    setInterval(async () => {
      await this.logStats();
    }, 60 * 60 * 1000); // каждый час
  }

  private async logStats() {
    const totalCustomers = await prisma.customer.count();
    const activeConversations = await prisma.conversation.count({
      where: { status: 'active' }
    });
    const pendingRequests = await prisma.managerRequest.count({
      where: { resolved: false }
    });

    const uptime = Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60); // в минутах

    log('INFO', '📊 СТАТИСТИКА:');
    log('INFO', `Время работы: ${uptime} минут`);
    log('INFO', `Обработано сообщений: ${this.messagesProcessed}`);
    log('INFO', `Всего клиентов: ${totalCustomers}`);
    log('INFO', `Активных диалогов: ${activeConversations}`);
    log('INFO', `Запросов менеджеру: ${pendingRequests}`);
  }

  async showStats() {
    await this.logStats();
  }

  async stop() {
    this.isRunning = false;
    log('INFO', '⏹ Остановка AI Продажника...');
    await this.logStats();
    await this.client.disconnect();
    await prisma.$disconnect();
    log('INFO', '👋 AI Продажник остановлен');

    // Закрываем файлы логов
    logFile.end();
    errorFile.end();
  }
}

// Запуск приложения
async function main() {
  const isHeadless = process.env.HEADLESS === 'true';

  if (!isHeadless) {
    console.clear();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('     SOINTERA AI ПРОДАЖНИК v1.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('     Школа парикмахерского искусства');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  const userbot = new TelegramUserbot();

  try {
    await userbot.start();

    // Показываем статистику при запуске
    await userbot.showStats();

    // Обработка сигнала остановки
    process.on('SIGINT', async () => {
      log('INFO', 'Получен сигнал остановки (SIGINT)...');
      await userbot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      log('INFO', 'Получен сигнал остановки (SIGTERM)...');
      await userbot.stop();
      process.exit(0);
    });

    // Держим процесс активным
    await new Promise(() => {}); // Бесконечное ожидание

  } catch (error) {
    log('ERROR', 'Критическая ошибка:', error);
    await userbot.stop();
    process.exit(1);
  }
}

// Запускаем приложение
main().catch((error) => {
  log('ERROR', 'Ошибка запуска приложения:', error);
  process.exit(1);
});

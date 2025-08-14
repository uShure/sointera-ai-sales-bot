import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { Api } from 'telegram/tl';
import { PrismaClient } from '@prisma/client';
import { SalesAgent } from '../ai/sales-agent';
import readline from 'readline/promises';

const prisma = new PrismaClient();

export class TelegramBot {
  private client: TelegramClient;
  private salesAgent: SalesAgent;
  private activeConversations: Map<string, string> = new Map();

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
    console.log('Запуск Telegram бота...');

    // Подключаемся к Telegram
    await this.client.start({
      phoneNumber: async () => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const phone = await rl.question('Введите номер телефона: ');
        rl.close();
        return phone;
      },
      password: async () => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const password = await rl.question('Введите пароль (если есть): ');
        rl.close();
        return password;
      },
      phoneCode: async () => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const code = await rl.question('Введите код из Telegram: ');
        rl.close();
        return code;
      },
      onError: (err) => console.log(err),
    });

    console.log('Бот подключен!');

    // Сохраняем сессию для будущего использования
    const sessionString = this.client.session.save() as string;
    console.log('Сохраните эту строку сессии в .env.local:');
    console.log(`TELEGRAM_SESSION_STRING=${sessionString}`);

    // Обработка входящих сообщений
    this.client.addEventHandler(this.handleMessage.bind(this), new NewMessage({}));
  }

  private async handleMessage(event: any) {
    const message = event.message;

    // Игнорируем сообщения от ботов и каналов
    if (!message.isPrivate || message.fromId?.userId === undefined) {
      return;
    }

    const userId = message.fromId.userId.toString();
    const text = message.text;

    if (!text) return;

    console.log(`Получено сообщение от ${userId}: ${text}`);

    try {
      // Получаем или создаем клиента
      const customer = await this.getOrCreateCustomer(userId, message);

      // Получаем ID активной беседы
      const conversationId = this.activeConversations.get(userId);

      // Обрабатываем сообщение через AI агента
      const result = await this.salesAgent.processMessage(text, {
        telegramId: userId,
        username: customer.username || undefined,
        firstName: customer.firstName || undefined,
        classification: customer.classification || undefined,
        stage: customer.stage || undefined,
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
            lastInteraction: new Date()
          }
        });
      }

      // Отправляем ответ
      await message.reply({ message: result.response });

      // Если нужен менеджер, создаем запрос
      if (result.callManager) {
        await this.createManagerRequest(customer.id, text);
        await this.notifyManager(customer, text);
      }

    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
      await message.reply({
        message: 'Извините, произошла ошибка. Наш менеджер свяжется с вами.'
      });
    }
  }

  private async getOrCreateCustomer(telegramId: string, message: any) {
    let customer = await prisma.customer.findUnique({
      where: { telegramId }
    });

    if (!customer) {
      const sender = await message.getSender();
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
      const managerEntity = await this.client.getEntity(managerUsername);
      await this.client.sendMessage(managerEntity, {
        message: `🔔 Требуется помощь менеджера!\n\nКлиент: ${customer.firstName || customer.username || customer.telegramId}\nЗапрос: ${message}`
      });
    } catch (error) {
      console.error('Не удалось отправить уведомление менеджеру:', error);
    }
  }

  async stop() {
    await this.client.disconnect();
  }
}

import { TelegramBot } from '../lib/telegram/bot';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🚀 Запуск SOINTERA AI Продажника...');

  const bot = new TelegramBot();

  try {
    await bot.start();
    console.log('✅ Бот успешно запущен и готов к работе!');

    // Держим процесс активным
    process.on('SIGINT', async () => {
      console.log('\n⏹ Остановка бота...');
      await bot.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
    process.exit(1);
  }
}

main();

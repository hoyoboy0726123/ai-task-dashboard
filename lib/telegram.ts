// ai-task-dashboard/lib/telegram.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramNotification(message: string) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !chatId) {
    console.warn("Telegram configuration missing (Token or Chat ID)");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Telegram Notification Error:', error);
    return false;
  }
}

// ai-task-dashboard/test_connection.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split(/\r?\n/);
const env = {};
lines.forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;

async function testTelegram() {
  console.log('📡 Sending test message to Telegram...');
  const msg = "✅ *Gemini CLI 連線成功！*\n\n您的 AI 任務儀表板已與 Telegram 完成雙向綁定。\n\n🕒 測試時間：" + new Date().toLocaleString();
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: msg,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();
    if (result.ok) {
      console.log('🎉 Success! Message sent to your Telegram.');
    } else {
      console.log('❌ Failed: ' + result.description);
    }
  } catch (error) {
    console.log('❌ Error: ' + error.message);
  }
}

testTelegram();

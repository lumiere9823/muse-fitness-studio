// server/services/telegram.js — Telegram notification service
const { db } = require('../db');

async function sendTelegramMessage(text) {
  try {
    const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
    const chatIdRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();
    const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'enable_telegram_notifications'").get();

    const token = tokenRow?.value?.trim();
    const chatId = chatIdRow?.value?.trim();
    const enabled = enabledRow?.value === '1';

    if (!token || !chatId || !enabled) {
      return { success: false, reason: 'Telegram notifications not configured or disabled' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    return { success: data.ok, data };
  } catch (error) {
    console.error('Telegram notification error:', error.message);
    return { success: false, error: error.message };
  }
}

async function notifyNewLead(lead) {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const msg = [
    `🔔 <b>KHÁCH HÀNG MỚI ĐĂNG KÝ TẬP THỬ!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Họ tên:</b> ${lead.name || 'Chưa có'}`,
    `📞 <b>Số điện thoại:</b> <code>${lead.phone || 'Chưa có'}</code>`,
    lead.email ? `✉️ <b>Email:</b> ${lead.email}` : null,
    `🏢 <b>Chi nhánh:</b> ${lead.branch || 'Chưa chọn'}`,
    `🎯 <b>Mục tiêu:</b> ${lead.goal || 'Tư vấn chung'}`,
    lead.slot ? `⏰ <b>Khung giờ:</b> ${lead.slot}` : null,
    lead.note ? `📝 <b>Ghi chú:</b> <i>${lead.note}</i>` : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌐 <b>Nguồn:</b> ${lead.utm_source || 'Trực tiếp website'}${lead.utm_campaign ? ` (${lead.utm_campaign})` : ''}`,
    `⏱️ <b>Thời gian:</b> ${time}`,
    `👉 <a href="${process.env.LIVE_SITE_ORIGIN || 'https://www.musefitnessstudio.com'}/admin/">Vào trang Quản trị xử lý lead</a>`,
  ].filter(Boolean).join('\n');

  return sendTelegramMessage(msg);
}

module.exports = {
  sendTelegramMessage,
  notifyNewLead,
};

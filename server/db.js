// server/db.js — Muse Fitness Studio SQLite Database Layer
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'muse.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      branch TEXT,
      goal TEXT,
      slot TEXT,
      note TEXT,
      counselor_notes TEXT,
      status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacting', 'scheduled', 'attended', 'converted', 'cancelled'
      source TEXT DEFAULT 'website_form',
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      fbclid TEXT,
      ttclid TEXT,
      gclid TEXT,
      page_url TEXT,
      referrer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      opening_hours TEXT DEFAULT '6:00 – 21:00 (T2 – CN)',
      map_url TEXT,
      image_url TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      tag TEXT,
      bio TEXT,
      photo_url TEXT,
      specialities TEXT, -- JSON string or comma-separated
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch TEXT NOT NULL,
      slot_period TEXT NOT NULL, -- 'morning', 'noon', 'afternoon', 'evening'
      slot_time TEXT NOT NULL, -- e.g. '06:30 – 07:30'
      class_title TEXT NOT NULL, -- e.g. 'Boxing', 'Bodyweight–Kettlebell'
      discipline TEXT NOT NULL, -- 'Boxing', 'Bodyweight–Kettlebell'
      level TEXT NOT NULL, -- 'lv1', 'lv2'
      level_label TEXT NOT NULL, -- 'Level 1 — Làm quen từ đầu'
      desc TEXT,
      coach_name TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pricing_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- 'membership', 'course', 'pt'
      name TEXT NOT NULL,
      badge TEXT,
      price_display TEXT NOT NULL,
      unit TEXT NOT NULL,
      features TEXT, -- JSON array string
      is_featured INTEGER DEFAULT 0,
      button_text TEXT DEFAULT 'Đăng ký tư vấn',
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      cover_image TEXT,
      read_time TEXT DEFAULT '5 phút',
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  seedData();
}

function seedData() {
  // Check if admin user exists
  const userCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!userCheck) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('muse123456', salt);
    db.prepare(`
      INSERT INTO users (username, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', hash, 'Quản Trị Viên Muse', 'admin');
  }

  // Check branches
  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get().count;
  if (branchCount === 0) {
    const insertBranch = db.prepare(`
      INSERT INTO branches (name, slug, address, phone, opening_hours, map_url, image_url, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBranch.run(
      'Hoàng Văn Thụ',
      'hoang-van-thu',
      '261 Hoàng Văn Thụ, Phường 2, Tân Bình, TP.HCM',
      '1900 299 991',
      '6:00 – 21:00 (T2 – CN)',
      'https://maps.google.com/?q=261+Hoang+Van+Thu+Tan+Binh',
      'assets/branch-hoang-van-thu.png',
      1
    );

    insertBranch.run(
      'Lê Đức Thọ',
      'le-duc-tho',
      '502 Lê Đức Thọ, Phường 17, Gò Vấp, TP.HCM',
      '1900 299 991',
      '6:00 – 21:00 (T2 – CN)',
      'https://maps.google.com/?q=502+Le+Duc+Tho+Go+Vap',
      'assets/branch-le-duc-tho.png',
      2
    );

    insertBranch.run(
      'Nguyễn Thị Thập',
      'nguyen-thi-thap',
      '471 Nguyễn Thị Thập, Tân Phong, Quận 7, TP.HCM',
      '1900 299 991',
      '6:00 – 21:00 (T2 – CN)',
      'https://maps.google.com/?q=471+Nguyen+Thi+Thap+Quan+7',
      'assets/branch-nguyen-thi-thap.png',
      3
    );
  }

  // Check coaches
  const coachCount = db.prepare('SELECT COUNT(*) as count FROM coaches').get().count;
  if (coachCount === 0) {
    const insertCoach = db.prepare(`
      INSERT INTO coaches (name, title, tag, bio, photo_url, specialities, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertCoach.run(
      'Coach Mai Anh',
      'HLV Sức Mạnh Nền Tảng',
      'Strength · Beginner',
      'Theo sát người mới, tập trung kỹ thuật nền và giúp hội viên tự tin trong từng chuyển động.',
      'assets/photo-coach.jpg',
      JSON.stringify(['Gym nền tảng', 'Form check', 'Phục hồi tư thế']),
      1
    );

    insertCoach.run(
      'Coach Thuỳ Dương',
      'HLV Bodyweight – Kettlebell',
      'Bodyweight · Kettlebell',
      'Chuyên môn sâu về kiểm soát cơ thể, tăng sức bền an toàn và định hình cơ bắp thon gọn.',
      'assets/class-kettlebell.jpg',
      JSON.stringify(['Bodyweight', 'Kettlebell', 'Mobility']),
      2
    );

    insertCoach.run(
      'Coach Tuấn Kiệt',
      'HLV Boxing Fit & Conditioning',
      'Hành Trình 9 Tuần',
      'Tạo nhịp lớp sôi nổi, tràn đầy năng lượng, xả stress hiệu quả với kỹ thuật boxing chuẩn xác.',
      'assets/class-boxing-fit.jpg',
      JSON.stringify(['Boxing', 'Cardio Fit', 'Giảm mỡ']),
      3
    );
  }

  // Check schedules
  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedules').get().count;
  if (scheduleCount === 0) {
    const insertSchedule = db.prepare(`
      INSERT INTO schedules (branch, slot_period, slot_time, class_title, discipline, level, level_label, desc, coach_name, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleClasses = [
      // Sáng 06:30 – 07:30
      ['Hoàng Văn Thụ', 'morning', '06:30 – 07:30', 'Boxing', 'Boxing', 'lv1', 'Level 1 — Làm quen từ đầu', 'Nền tảng cơ bản — đánh lại từ đầu, từng động tác đúng kỹ thuật.', 'Coach Tuấn Kiệt', 1],
      ['Hoàng Văn Thụ', 'morning', '06:30 – 07:30', 'Boxing', 'Boxing', 'lv2', 'Level 2 — Nâng cao kỹ thuật', 'Yêu cầu: hoàn thành Level 1 Boxing trước. Bộ động tác phức tạp hơn.', 'Coach Tuấn Kiệt', 2],
      ['Hoàng Văn Thụ', 'morning', '06:30 – 07:30', 'Bodyweight–Kettlebell', 'Bodyweight–Kettlebell', 'lv1', 'Level 1 — Làm quen từ đầu', 'Nền tảng cơ bản — tập từng động tác với kettlebell, quen di chuyển.', 'Coach Thuỳ Dương', 3],
      ['Hoàng Văn Thụ', 'morning', '06:30 – 07:30', 'Bodyweight–Kettlebell', 'Bodyweight–Kettlebell', 'lv2', 'Level 2 — Nâng cao kỹ thuật', 'Yêu cầu: hoàn thành Level 1. Tăng cường sức mạnh và độ linh hoạt.', 'Coach Thuỳ Dương', 4],

      // Sáng 10:00 – 11:00
      ['Hoàng Văn Thụ', 'morning', '10:00 – 11:00', 'Boxing', 'Boxing', 'lv1', 'Level 1 — Làm quen từ đầu', 'Phù hợp với nàng có buổi sáng linh hoạt, nhịp độ vừa sức.', 'Coach Tuấn Kiệt', 5],
      ['Hoàng Văn Thụ', 'morning', '10:00 – 11:00', 'Bodyweight–Kettlebell', 'Bodyweight–Kettlebell', 'lv1', 'Level 1 — Làm quen từ đầu', 'Tập trung cơ lõi và chuyển động mềm mại, vững vàng.', 'Coach Mai Anh', 6],

      // Chiều 16:30 – 17:30
      ['Lê Đức Thọ', 'afternoon', '16:30 – 17:30', 'Boxing', 'Boxing', 'lv1', 'Level 1 — Làm quen từ đầu', 'Giải toả căng thẳng sau giờ làm việc, tăng nhịp tim tích cực.', 'Coach Tuấn Kiệt', 7],
      ['Lê Đức Thọ', 'afternoon', '16:30 – 17:30', 'Bodyweight–Kettlebell', 'Bodyweight–Kettlebell', 'lv1', 'Level 1 — Làm quen từ đầu', 'Đốt calo và kích hoạt toàn thân với chuỗi bài tập kettlebell.', 'Coach Thuỳ Dương', 8],

      // Tối 18:30 – 19:30
      ['Nguyễn Thị Thập', 'evening', '18:30 – 19:30', 'Boxing', 'Boxing', 'lv1', 'Level 1 — Làm quen từ đầu', 'Khung giờ vàng cho chị em công sở nạp lại năng lượng.', 'Coach Tuấn Kiệt', 9],
      ['Nguyễn Thị Thập', 'evening', '18:30 – 19:30', 'Bodyweight–Kettlebell', 'Bodyweight–Kettlebell', 'lv2', 'Level 2 — Nâng cao kỹ thuật', 'Tăng cường sức mạnh thân dưới và vòng eo thon gọn.', 'Coach Mai Anh', 10],
    ];

    for (const item of sampleClasses) {
      insertSchedule.run(...item);
    }
  }

  // Check pricing
  const pricingCount = db.prepare('SELECT COUNT(*) as count FROM pricing_plans').get().count;
  if (pricingCount === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO pricing_plans (category, name, badge, price_display, unit, features, is_featured, button_text, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPlan.run(
      'membership',
      'Only Gym',
      'Entry',
      '399.000đ',
      '/ tháng',
      JSON.stringify(['Tập luyện tại 01 chi nhánh nàng chọn', 'Phù hợp để bắt đầu thói quen tập đều', 'Tủ đồ và phòng tắm tiện nghi']),
      0,
      'Tư vấn gói Only Gym',
      1
    );

    insertPlan.run(
      'membership',
      'Platinum',
      'Gợi ý',
      '599.000đ',
      '/ tháng',
      JSON.stringify(['Linh hoạt check-in tất cả chi nhánh', 'Có sẵn khăn tập lớn & nhỏ mỗi buổi', 'Tập full dịch vụ yoga, group X…', 'Đo chỉ số InBody định kỳ']),
      1,
      'Tư vấn gói Platinum',
      2
    );

    insertPlan.run(
      'membership',
      'Ruby',
      'Premium tiện nghi',
      '1.667.000đ',
      '/ tháng',
      JSON.stringify(['Linh hoạt check-in tất cả chi nhánh', 'Tủ đồ riêng, khăn cá nhân thêu tên', 'Nước uống miễn phí mỗi buổi tập', 'Tặng thêm 10 buổi tập']),
      0,
      'Tư vấn gói Ruby',
      3
    );

    insertPlan.run(
      'course',
      'Hành Trình 9 Tuần',
      'Core Signature',
      '1.050.000đ',
      '/ tuần (3 buổi)',
      JSON.stringify(['Cam kết mục tiêu sau khi đánh giá thể trạng', 'Lớp nhóm nhỏ tối đa 6–8 học viên', 'HLV theo sát form dáng từng buổi', 'Tặng kèm thực đơn dinh dưỡng cá nhân hoá']),
      1,
      'Đăng ký Hành Trình 9 Tuần',
      4
    );
  }

  // Check settings
  const defaultSettings = [
    ['studio_name', 'Muse Fitness Studio'],
    ['hotline', '1900 299 991'],
    ['email', 'contact@musefitnessstudio.com'],
    ['telegram_bot_token', ''],
    ['telegram_chat_id', ''],
    ['enable_telegram_notifications', '0'],
    ['working_hours', '6:00 – 21:00 (Thứ 2 – Chủ Nhật)'],
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  // Seed some sample leads if none exist
  const leadCount = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  if (leadCount === 0) {
    const insertLead = db.prepare(`
      INSERT INTO leads (name, phone, email, branch, goal, slot, note, counselor_notes, status, source, utm_source, utm_campaign, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertLead.run(
      'Nguyễn Thu Trang',
      '0988123456',
      'thutrang@gmail.com',
      'Hoàng Văn Thụ',
      'Tư vấn Hành Trình 9 Tuần',
      'Sáng (6h – 9h)',
      'Muốn giảm mỡ bụng sau sinh và cải thiện sức bền',
      'Đã gọi lần 1, khách hẹn qua phòng tập thứ 7 tuần này',
      'scheduled',
      'website_form',
      'tiktok',
      'summer_fitness',
      '-2 hours'
    );

    insertLead.run(
      'Trần Phương Linh',
      '0909654321',
      'phuonglinh@outlook.com',
      'Nguyễn Thị Thập',
      'Thay đổi vóc dáng',
      'Tối (18h – 21h)',
      'Chưa từng tập gym bao giờ, muốn có PT kèm kỹ thuật',
      'Đã tư vấn gói Platinum và lộ trình tập cho người mới',
      'contacting',
      'website_form',
      'facebook',
      'lead_ads_q7',
      '-5 hours'
    );

    insertLead.run(
      'Lê Hải Yến',
      '0912789123',
      'haiyen.le@gmail.com',
      'Lê Đức Thọ',
      'Tập Bodyweight – Kettlebell',
      'Chiều (15h – 18h)',
      'Hỏi về lớp kettlebell buổi chiều',
      '',
      'new',
      'website_form',
      'google',
      'search_brand',
      '-15 minutes'
    );
  }
}

initSchema();

module.exports = { db };

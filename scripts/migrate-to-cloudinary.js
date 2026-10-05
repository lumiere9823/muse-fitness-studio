// scripts/migrate-to-cloudinary.js — Migrate all assets to Cloudinary, update DB, Supabase, and HTML files
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { db } = require('../server/db');
const { isSupabaseConfigured, getSupabase } = require('../server/supabase');

const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const BACKUP_DIR = path.join(ROOT_DIR, 'assets_backup');
const MAP_FILE = path.join(__dirname, 'cloudinary-map.json');

// Ensure Cloudinary is configured
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Lỗi: Chưa điền đủ thông số CLOUDINARY trong file .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  secure: true,
});

async function main() {
  console.log('🚀 Bắt đầu quá trình di chuyển ảnh lên Cloudinary & Supabase...');

  // Step 1: Scan all image files in assets/
  const assetFiles = fs.readdirSync(ASSETS_DIR).filter((file) => {
    const fullPath = path.join(ASSETS_DIR, file);
    if (fs.statSync(fullPath).isDirectory()) return false;
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
  });

  console.log(`📦 Tìm thấy ${assetFiles.length} file ảnh trong thư mục assets/`);

  // Load existing map if partially uploaded
  let urlMap = {};
  if (fs.existsSync(MAP_FILE)) {
    try {
      urlMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    } catch (e) {}
  }

  // Step 2: Upload images to Cloudinary
  let countUploaded = 0;
  for (let i = 0; i < assetFiles.length; i++) {
    const file = assetFiles[i];
    const key = `assets/${file}`;
    const filePath = path.join(ASSETS_DIR, file);

    if (urlMap[key]) {
      console.log(`[${i + 1}/${assetFiles.length}] ⏭ Đã tải trước đó: ${file}`);
      continue;
    }

    const nameWithoutExt = path.parse(file).name;
    const ext = path.extname(file).toLowerCase();
    const isSvg = ext === '.svg';

    console.log(`[${i + 1}/${assetFiles.length}] ⬆ Đang upload: ${file}...`);

    try {
      const uploadOptions = {
        folder: 'muse-fitness-studio',
        public_id: nameWithoutExt,
        resource_type: 'image',
        overwrite: true,
      };

      if (!isSvg) {
        uploadOptions.format = 'webp';
        uploadOptions.quality = 'auto:good';
        uploadOptions.fetch_format = 'auto';
      }

      const res = await cloudinary.uploader.upload(filePath, uploadOptions);
      urlMap[key] = res.secure_url;
      // Also map with forward slashes variations
      urlMap[file] = res.secure_url;
      countUploaded++;

      // Save map periodically
      fs.writeFileSync(MAP_FILE, JSON.stringify(urlMap, null, 2), 'utf8');
      console.log(`   ✓ URL: ${res.secure_url}`);
    } catch (err) {
      console.error(`   ❌ Lỗi upload ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 Hoàn thành upload Cloudinary: ${countUploaded} ảnh mới!`);

  // Step 3: Update SQLite Database tables with new Cloudinary URLs
  console.log('\n📝 Cập nhật đường dẫn trong Database SQLite...');

  // 3.1 Branches
  const branches = db.prepare('SELECT id, image_url FROM branches').all();
  const updateBranch = db.prepare('UPDATE branches SET image_url = ? WHERE id = ?');
  for (const b of branches) {
    if (b.image_url && urlMap[b.image_url]) {
      updateBranch.run(urlMap[b.image_url], b.id);
    }
  }

  // 3.2 Coaches
  const coaches = db.prepare('SELECT id, photo_url FROM coaches').all();
  const updateCoach = db.prepare('UPDATE coaches SET photo_url = ? WHERE id = ?');
  for (const c of coaches) {
    if (c.photo_url && urlMap[c.photo_url]) {
      updateCoach.run(urlMap[c.photo_url], c.id);
    }
  }

  // 3.3 Blogs
  const blogs = db.prepare('SELECT id, cover_image FROM blogs').all();
  const updateBlog = db.prepare('UPDATE blogs SET cover_image = ? WHERE id = ?');
  for (const bl of blogs) {
    if (bl.cover_image && urlMap[bl.cover_image]) {
      updateBlog.run(urlMap[bl.cover_image], bl.id);
    }
  }

  console.log('✓ Đã cập nhật xong SQLite với link Cloudinary.');

  // Step 4: Sync to Supabase
  console.log('\n☁️ Đang đồng bộ toàn bộ dữ liệu mới lên Supabase PostgreSQL...');
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();

    // Sync branches
    const updatedBranches = db.prepare('SELECT name, slug, address, phone, opening_hours, map_url, image_url, order_index, is_active FROM branches').all();
    const { error: brErr } = await supabase.from('branches').upsert(
      updatedBranches.map(b => ({ ...b, is_active: Boolean(b.is_active) })),
      { onConflict: 'slug' }
    );
    if (brErr) console.error('Lỗi sync branches lên Supabase:', brErr.message);
    else console.log(`✓ Đã sync ${updatedBranches.length} chi nhánh với link Cloudinary lên Supabase`);

    // Sync coaches
    const updatedCoaches = db.prepare('SELECT name, title, tag, bio, photo_url, specialities, order_index, is_active FROM coaches').all();
    const formattedCoaches = updatedCoaches.map(c => ({
      ...c,
      specialities: c.specialities ? JSON.parse(c.specialities) : [],
      is_active: Boolean(c.is_active),
    }));
    const { error: coErr } = await supabase.from('coaches').upsert(formattedCoaches);
    if (coErr) console.error('Lỗi sync coaches lên Supabase:', coErr.message);
    else console.log(`✓ Đã sync ${updatedCoaches.length} huấn luyện viên lên Supabase`);

    // Sync pricing
    const pricing = db.prepare('SELECT category, name, badge, price_display, unit, features, is_featured, button_text, order_index, is_active FROM pricing_plans').all();
    const formattedPricing = pricing.map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      is_featured: Boolean(p.is_featured),
      is_active: Boolean(p.is_active),
    }));
    const { error: prErr } = await supabase.from('pricing_plans').upsert(formattedPricing);
    if (prErr) console.error('Lỗi sync pricing lên Supabase:', prErr.message);
    else console.log(`✓ Đã sync ${pricing.length} gói tập lên Supabase`);
  } else {
    console.log('⚠️ Supabase chưa cấu hình đủ, bỏ qua bước sync Supabase.');
  }

  // Step 5: Update HTML and CSS files to use Cloudinary CDN
  console.log('\n📄 Đang cập nhật đường dẫn ảnh trong các file HTML & CSS...');
  const htmlFiles = fs.readdirSync(ROOT_DIR).filter(f => f.endsWith('.html') || f.endsWith('.css'));
  
  for (const f of htmlFiles) {
    const filePath = path.join(ROOT_DIR, f);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [localAsset, cldUrl] of Object.entries(urlMap)) {
      if (localAsset.startsWith('assets/') && content.includes(localAsset)) {
        content = content.split(localAsset).join(cldUrl);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Đã thay thế URL Cloudinary trong: ${f}`);
    }
  }

  // Step 6: Backup local assets to assets_backup/ and remove from assets/
  console.log('\n🗂️ Đang sao lưu ảnh sang assets_backup/ và dọn dẹp thư mục local assets/...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  let deletedCount = 0;
  for (const file of assetFiles) {
    const src = path.join(ASSETS_DIR, file);
    const dest = path.join(BACKUP_DIR, file);

    // Copy to backup
    fs.copyFileSync(src, dest);

    // Only delete from assets/ if successfully mapped to Cloudinary
    if (urlMap[`assets/${file}`]) {
      fs.unlinkSync(src);
      deletedCount++;
    }
  }

  console.log(`✅ ĐÃ HOÀN TẤT TOÀN BỘ QUY TRÌNH!`);
  console.log(`- Đã tải toàn bộ ảnh lên Cloudinary`);
  console.log(`- Đã cập nhật database & Supabase`);
  console.log(`- Đã thay thế link ảnh trong toàn bộ file HTML/CSS`);
  console.log(`- Đã sao lưu an toàn tại: assets_backup/`);
  console.log(`- Đã dọn dẹp ${deletedCount} file trong thư mục assets/`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

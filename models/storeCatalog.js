/**
 * BroBot Credits Store — original catalog (v1.2).
 *
 * Everything here is BroBot's own work: names, prices and the CSS
 * gradients used as profile backgrounds on the web dashboard.
 * No third-party artwork is used — backgrounds are pure gradients
 * generated from BroBot's violet identity, badges are plain emoji.
 *
 * Items are bought per-server with the credits members earn from
 * /daily, and the equipped background + owned badges show on /profile.
 */

const BACKGROUNDS = [
  { id: 'default', nameEn: 'BroBot Violet (Default)', nameAr: 'بنفسجي BroBot (الافتراضي)', price: 0, css: 'linear-gradient(135deg,#5865f2,#eb459e)' },
  { id: 'violet-night', nameEn: 'Violet Night', nameAr: 'ليل البنفسج', price: 1000, css: 'linear-gradient(135deg,#1e1b4b,#7c3aed)' },
  { id: 'ocean-depth', nameEn: 'Ocean Depth', nameAr: 'عمق المحيط', price: 1500, css: 'linear-gradient(135deg,#0c4a6e,#06b6d4)' },
  { id: 'sunset-glow', nameEn: 'Sunset Glow', nameAr: 'وهج الغروب', price: 2000, css: 'linear-gradient(135deg,#7c2d12,#f59e0b)' },
  { id: 'forest-mist', nameEn: 'Forest Mist', nameAr: 'ضباب الغابة', price: 2500, css: 'linear-gradient(135deg,#052e16,#22c55e)' },
  { id: 'rose-quartz', nameEn: 'Rose Quartz', nameAr: 'ورد الكوارتز', price: 3500, css: 'linear-gradient(135deg,#4a044e,#f472b6)' },
  { id: 'golden-hour', nameEn: 'Golden Hour', nameAr: 'الساعة الذهبية', price: 5000, css: 'linear-gradient(135deg,#451a03,#facc15)' },
  { id: 'crimson-pulse', nameEn: 'Crimson Pulse', nameAr: 'نبض قرمزي', price: 6500, css: 'linear-gradient(135deg,#450a0a,#ef4444)' }
];

const BADGES = [
  { id: 'early-bird', nameEn: 'Early Bird', nameAr: 'الطائر المبكر', emoji: '🐦', price: 800 },
  { id: 'rising-star', nameEn: 'Rising Star', nameAr: 'النجم الصاعد', emoji: '⭐', price: 1500 },
  { id: 'rocket', nameEn: 'Rocket', nameAr: 'الصاروخ', emoji: '🚀', price: 3000 },
  { id: 'diamond', nameEn: 'Diamond', nameAr: 'الماسة', emoji: '💎', price: 5000 },
  { id: 'phoenix', nameEn: 'Phoenix', nameAr: 'العنقاء', emoji: '🔥', price: 7500 },
  { id: 'crown', nameEn: 'Crown', nameAr: 'التاج', emoji: '👑', price: 10000 }
];

function findBackground(id) {
  return BACKGROUNDS.find((item) => item.id === id) || null;
}

function findBadge(id) {
  return BADGES.find((item) => item.id === id) || null;
}

function findItem(id) {
  const background = findBackground(id);
  if (background) return { ...background, kind: 'background' };
  const badge = findBadge(id);
  if (badge) return { ...badge, kind: 'badge' };
  return null;
}

module.exports = { BACKGROUNDS, BADGES, findBackground, findBadge, findItem };

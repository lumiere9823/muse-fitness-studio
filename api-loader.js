// api-loader.js — Seamless Dynamic Data Loader for Muse Fitness Landing Pages
(function () {
  const API_ENDPOINT = '/api';

  // Dynamic Class Schedule Loader for schedule.html
  async function loadDynamicSchedules() {
    const lichSection = document.getElementById('lich');
    if (!lichSection) return;

    try {
      const res = await fetch(`${API_ENDPOINT}/schedules`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !data.data || data.data.length === 0) return;

      const schedules = data.data;

      // Group schedules by slot_time
      const groups = {};
      schedules.forEach((item) => {
        const key = item.slot_time;
        if (!groups[key]) {
          groups[key] = {
            slot_period: item.slot_period,
            slot_time: item.slot_time,
            items: [],
          };
        }
        groups[key].items.push(item);
      });

      // If we have dynamic groups, we can enhance the container
      // Keep filter functionality intact
      console.log(`[Muse CMS] Loaded ${schedules.length} dynamic schedule slots.`);
    } catch (err) {
      // Graceful fallback to static HTML
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadDynamicSchedules();
  });
})();

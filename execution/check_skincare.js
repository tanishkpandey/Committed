const { getDB } = require('../server/config/db');

(async () => {
  const db = await getDB();
  const habits = await db.all("SELECT * FROM habits WHERE title LIKE '%Skincare%'");
  console.log('Skincare habit:', JSON.stringify(habits, null, 2));
  if (habits.length > 0) {
    const logs = await db.all('SELECT * FROM habit_logs WHERE habit_id = ?', [habits[0].id]);
    console.log('Skincare total logs count:', logs.length);
    const today = new Date();
    const curMonthPrefix = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const curMonthLogs = logs.filter(l => l.completed_date && l.completed_date.startsWith(curMonthPrefix));
    console.log('Skincare logs in current month (' + curMonthPrefix + '):', curMonthLogs.length);
    
    // Check 30 day count:
    let count30 = 0;
    const datesSet = new Set(logs.map(l => l.completed_date));
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ymd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (datesSet.has(ymd)) count30++;
    }
    console.log('Skincare logs in last 30 days:', count30);
    const freq = habits[0].frequency_days || 7;
    const expected30 = Math.max(1, Math.round((freq / 7) * 30));
    console.log('frequency_days:', freq, 'expected30Target:', expected30);
    console.log('rate30 calculated by insightsEngine:', Math.min(100, Math.round((count30 / expected30) * 100)));
  }
})();

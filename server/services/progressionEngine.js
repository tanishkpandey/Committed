// Committed Multi-Year Progression & Long-Term Milestone Engine
const { formatYMD } = require('../config/db');

function getLevelFromXP(totalXP = 0) {
  let level = 1;
  let xpForNext = 100;
  let accumulated = 0;

  while (totalXP >= accumulated + xpForNext) {
    accumulated += xpForNext;
    level++;
    xpForNext = 100 + (level - 1) * 25;
  }

  const currentLevelXP = totalXP - accumulated;
  const targetXPForNext = xpForNext;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / targetXPForNext) * 100));
  const xpRemaining = targetXPForNext - currentLevelXP;

  return {
    level,
    totalXP,
    currentLevelXP,
    nextLevelTargetXP: targetXPForNext,
    progressPercent,
    xpRemaining
  };
}

function evaluateProgression(habits = [], logs = []) {
  const activeHabits = habits.filter(h => !h.is_archived);
  const activeHabitIds = new Set(activeHabits.map(h => h.id));
  const transactions = [];

  const logsByHabit = new Map();
  const logsByDate = new Map();
  const allUniqueDates = new Set();
  const logsByMonth = new Map();

  logs.forEach(l => {
    if (!l.completed_date) return;
    allUniqueDates.add(l.completed_date);

    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, new Set());
    logsByHabit.get(l.habit_id).add(l.completed_date);

    if (!logsByDate.has(l.completed_date)) logsByDate.set(l.completed_date, new Set());
    logsByDate.get(l.completed_date).add(l.habit_id);

    if (activeHabitIds.has(l.habit_id)) {
      const mKey = l.completed_date.substring(0, 7);
      logsByMonth.set(mKey, (logsByMonth.get(mKey) || 0) + 1);
    }

    const h = habits.find(habit => habit.id === l.habit_id);
    const title = h ? h.title : 'Habit';
    transactions.push({
      id: `xp-comp-${l.id || l.habit_id + '_' + l.completed_date}`,
      amount: 10,
      event_type: 'habit_completion',
      habit_id: l.habit_id,
      event_date: l.completed_date,
      description: `${title} completed`,
      created_at: l.created_at || new Date(l.completed_date + 'T12:00:00').toISOString()
    });
  });

  // 1. Perfect Days (+25 XP)
  let perfectDaysCount = 0;
  const perfectDatesSet = new Set();

  if (activeHabits.length > 0) {
    allUniqueDates.forEach(dateStr => {
      const completedHabitsForDate = logsByDate.get(dateStr) || new Set();
      const allDone = activeHabits.every(h => completedHabitsForDate.has(h.id));
      if (allDone) {
        perfectDaysCount++;
        perfectDatesSet.add(dateStr);
        transactions.push({
          id: `xp-pd-${dateStr}`,
          amount: 25,
          event_type: 'perfect_day',
          event_date: dateStr,
          description: 'Perfect Day (100% completed)',
          created_at: new Date(dateStr + 'T23:59:59').toISOString()
        });
      }
    });
  }

  // Calculate Current & Longest Perfect Days Streak
  let currentPerfectStreak = 0;
  let checkD = new Date();
  let todayDateStr = formatYMD(checkD);

  if (!perfectDatesSet.has(todayDateStr)) {
    checkD.setDate(checkD.getDate() - 1);
  }

  while (perfectDatesSet.has(formatYMD(checkD))) {
    currentPerfectStreak++;
    checkD.setDate(checkD.getDate() - 1);
  }

  const sortedPerfectDates = Array.from(perfectDatesSet).sort();
  let longestPerfectStreak = 0;
  let tempPStreak = 0;

  for (let i = 0; i < sortedPerfectDates.length; i++) {
    if (i === 0) {
      tempPStreak = 1;
    } else {
      const [py, pm, pd] = sortedPerfectDates[i - 1].split('-').map(Number);
      const [cy, cm, cd] = sortedPerfectDates[i].split('-').map(Number);
      const diff = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));
      if (diff === 1) tempPStreak++;
      else tempPStreak = 1;
    }
    if (tempPStreak > longestPerfectStreak) longestPerfectStreak = tempPStreak;
  }

  // 2. Global longest streak calculation across all habits
  let globalLongestStreak = 0;
  let globalCurrentStreak = 0;

  activeHabits.forEach(h => {
    const datesSet = logsByHabit.get(h.id) || new Set();
    const sorted = Array.from(datesSet).sort();
    let streak = 0;
    let maxS = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const [py, pm, pd] = sorted[i - 1].split('-').map(Number);
        const [cy, cm, cd] = sorted[i].split('-').map(Number);
        const diff = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));
        if (diff === 1) streak++;
        else if (diff > 1) streak = 1;
      }
      if (streak > maxS) maxS = streak;
    }
    if (maxS > globalLongestStreak) globalLongestStreak = maxS;

    // Current streak
    let cStreak = 0;
    let curD = new Date();
    if (!datesSet.has(formatYMD(curD))) {
      curD.setDate(curD.getDate() - 1);
    }
    while (datesSet.has(formatYMD(curD))) {
      cStreak++;
      curD.setDate(curD.getDate() - 1);
    }
    if (cStreak > globalCurrentStreak) globalCurrentStreak = cStreak;
  });

  // 3. Monthly & Annual Completion %
  let bestMonthlyRate = 0;
  logsByMonth.forEach((count, mKey) => {
    const [y, m] = mKey.split('-').map(Number);
    const daysInM = new Date(y, m, 0).getDate();
    const possibleInM = Math.max(activeHabits.length * daysInM, 1);
    const rate = Math.min(100, Math.round((count / possibleInM) * 100));
    if (rate > bestMonthlyRate) bestMonthlyRate = rate;
  });

  // Annual Completion Rate (Past 365 days)
  const today = new Date();
  let pastYearLogs = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = formatYMD(d);
    const completedSet = logsByDate.get(dStr) || new Set();
    completedSet.forEach(hId => {
      if (activeHabitIds.has(hId)) pastYearLogs++;
    });
  }
  const annualPossible = Math.max(activeHabits.length * 365, 1);
  const annualCompletionRate = Math.min(100, Math.round((pastYearLogs / annualPossible) * 100));

  const totalCompletions = logs.length;
  const distinctDaysCount = allUniqueDates.size;
  const totalXP = transactions.reduce((acc, t) => acc + t.amount, 0);
  const levelInfo = getLevelFromXP(totalXP);

  // 4. Comprehensive Long-Term Multi-Year Achievements Catalog (24 Tiered Milestones)
  const achievementsList = [
    // Track A: 🔥 Longest Streak Maintained (Consistency Legends)
    {
      id: 'streak_7',
      category: 'streak',
      name: '7-Day Streak',
      description: 'Maintain an unbroken 7-day streak.',
      icon: 'flame',
      target: 7,
      current: Math.min(7, globalLongestStreak),
      unlocked: globalLongestStreak >= 7,
      xpBonus: 50
    },
    {
      id: 'streak_21',
      category: 'streak',
      name: '21-Day Streak',
      description: 'Reach 21 consecutive days — habit automaticity unlocked.',
      icon: 'lock',
      target: 21,
      current: Math.min(21, globalLongestStreak),
      unlocked: globalLongestStreak >= 21,
      xpBonus: 100
    },
    {
      id: 'streak_30',
      category: 'streak',
      name: '30-Day Streak',
      description: 'Sustain a 30-day streak without a single break.',
      icon: 'shield',
      target: 30,
      current: Math.min(30, globalLongestStreak),
      unlocked: globalLongestStreak >= 30,
      xpBonus: 150
    },
    {
      id: 'streak_50',
      category: 'streak',
      name: '50-Day Streak',
      description: 'Build an unstoppable 50-day streak.',
      icon: 'zap',
      target: 50,
      current: Math.min(50, globalLongestStreak),
      unlocked: globalLongestStreak >= 50,
      xpBonus: 250
    },
    {
      id: 'streak_100',
      category: 'streak',
      name: '100-Day Streak',
      description: 'Triple-digit mastery: 100 consecutive days.',
      icon: 'award',
      target: 100,
      current: Math.min(100, globalLongestStreak),
      unlocked: globalLongestStreak >= 100,
      xpBonus: 500
    },
    {
      id: 'streak_180',
      category: 'streak',
      name: '180-Day Streak',
      description: 'Maintain half a year (180 days) of unbroken daily discipline.',
      icon: 'gem',
      target: 180,
      current: Math.min(180, globalLongestStreak),
      unlocked: globalLongestStreak >= 180,
      xpBonus: 1000
    },
    {
      id: 'streak_365',
      category: 'streak',
      name: '365-Day Streak',
      description: 'One full unbroken year (365 days) of continuous execution.',
      icon: 'crown',
      target: 365,
      current: Math.min(365, globalLongestStreak),
      unlocked: globalLongestStreak >= 365,
      xpBonus: 2500
    },
    {
      id: 'streak_730',
      category: 'streak',
      name: '730-Day Streak',
      description: 'Two full unbroken years (730 days) — pure lifestyle mastery.',
      icon: 'sparkles',
      target: 730,
      current: Math.min(730, globalLongestStreak),
      unlocked: globalLongestStreak >= 730,
      xpBonus: 5000
    },

    // Track B: ⭐ Perfect Days Mastery (Flawless Days)
    {
      id: 'pd_1',
      category: 'perfect_days',
      name: 'First Perfect Day',
      description: 'Complete 100% of all active habits in a single day.',
      icon: 'check-circle-2',
      target: 1,
      current: Math.min(1, perfectDaysCount),
      unlocked: perfectDaysCount >= 1,
      xpBonus: 25
    },
    {
      id: 'pd_7',
      category: 'perfect_days',
      name: 'Perfect Week',
      description: 'Accumulate 7 Perfect Days over your journey.',
      icon: 'sparkles',
      target: 7,
      current: Math.min(7, perfectDaysCount),
      unlocked: perfectDaysCount >= 7,
      xpBonus: 75
    },
    {
      id: 'pd_30',
      category: 'perfect_days',
      name: 'Perfect Month',
      description: 'Accumulate 30 Perfect Days across your lifetime.',
      icon: 'star',
      target: 30,
      current: Math.min(30, perfectDaysCount),
      unlocked: perfectDaysCount >= 30,
      xpBonus: 200
    },
    {
      id: 'pd_100',
      category: 'perfect_days',
      name: '100 Perfect Days',
      description: 'Accumulate 100 total Perfect Days.',
      icon: 'trophy',
      target: 100,
      current: Math.min(100, perfectDaysCount),
      unlocked: perfectDaysCount >= 100,
      xpBonus: 500
    },
    {
      id: 'pd_365',
      category: 'perfect_days',
      name: 'Perfect Year',
      description: 'Accumulate 365 lifetime Perfect Days.',
      icon: 'medal',
      target: 365,
      current: Math.min(365, perfectDaysCount),
      unlocked: perfectDaysCount >= 365,
      xpBonus: 2000
    },
    {
      id: 'pd_500',
      category: 'perfect_days',
      name: '500 Perfect Days',
      description: 'Accumulate 500 lifetime Perfect Days — superhuman dedication.',
      icon: 'crown',
      target: 500,
      current: Math.min(500, perfectDaysCount),
      unlocked: perfectDaysCount >= 500,
      xpBonus: 4000
    },

    // Track C: 📊 Monthly & Yearly Target Completion (% Hit)
    {
      id: 'rate_m70',
      category: 'consistency',
      name: '70% Monthly Consistency',
      description: 'Achieve 70%+ habit completion rate in any calendar month.',
      icon: 'trending-up',
      target: 70,
      current: Math.min(70, bestMonthlyRate),
      unlocked: bestMonthlyRate >= 70,
      unit: '%',
      xpBonus: 100
    },
    {
      id: 'rate_m80',
      category: 'consistency',
      name: '80% Monthly Consistency',
      description: 'Achieve 80%+ habit completion rate in any calendar month.',
      icon: 'activity',
      target: 80,
      current: Math.min(80, bestMonthlyRate),
      unlocked: bestMonthlyRate >= 80,
      unit: '%',
      xpBonus: 200
    },
    {
      id: 'rate_m90',
      category: 'consistency',
      name: '90% Monthly Consistency',
      description: 'Achieve 90%+ habit completion rate in any calendar month.',
      icon: 'award',
      target: 90,
      current: Math.min(90, bestMonthlyRate),
      unlocked: bestMonthlyRate >= 90,
      unit: '%',
      xpBonus: 400
    },
    {
      id: 'rate_y80',
      category: 'consistency',
      name: '80% Annual Consistency',
      description: 'Maintain 80%+ habit completion rate across a full rolling year.',
      icon: 'shield-check',
      target: 80,
      current: Math.min(80, annualCompletionRate),
      unlocked: annualCompletionRate >= 80,
      unit: '%',
      xpBonus: 1500
    },

    // Track D: 🏆 All-Time Volume & Check-In Milestones (Lifetime Volume)
    {
      id: 'vol_100',
      category: 'volume',
      name: '100 Check-Ins',
      description: 'Reach 100 total habit check-ins.',
      icon: 'check-circle',
      target: 100,
      current: Math.min(100, totalCompletions),
      unlocked: totalCompletions >= 100,
      xpBonus: 100
    },
    {
      id: 'vol_500',
      category: 'volume',
      name: '500 Check-Ins',
      description: 'Reach 500 total habit check-ins.',
      icon: 'award',
      target: 500,
      current: Math.min(500, totalCompletions),
      unlocked: totalCompletions >= 500,
      xpBonus: 300
    },
    {
      id: 'vol_1000',
      category: 'volume',
      name: '1,000 Check-Ins',
      description: 'Reach 1,000 total habit check-ins across your lifetime.',
      icon: 'trophy',
      target: 1000,
      current: Math.min(1000, totalCompletions),
      unlocked: totalCompletions >= 1000,
      xpBonus: 750
    },
    {
      id: 'vol_2500',
      category: 'volume',
      name: '2,500 Check-Ins',
      description: 'Reach 2,500 total habit check-ins.',
      icon: 'gem',
      target: 2500,
      current: Math.min(2500, totalCompletions),
      unlocked: totalCompletions >= 2500,
      xpBonus: 1500
    },
    {
      id: 'vol_5000',
      category: 'volume',
      name: '5,000 Check-Ins',
      description: 'Reach 5,000 total habit check-ins — elite multi-year discipline.',
      icon: 'crown',
      target: 5000,
      current: Math.min(5000, totalCompletions),
      unlocked: totalCompletions >= 5000,
      xpBonus: 3000
    },
    {
      id: 'vol_10000',
      category: 'volume',
      name: '10,000 Check-Ins',
      description: 'Reach 10,000 total habit check-ins — living legend.',
      icon: 'sparkles',
      target: 10000,
      current: Math.min(10000, totalCompletions),
      unlocked: totalCompletions >= 10000,
      xpBonus: 7500
    }
  ];

  const unlockedAchievements = achievementsList.filter(a => a.unlocked);

  return {
    ...levelInfo,
    lifetimeStats: {
      lifetimeXP: totalXP,
      currentLevel: levelInfo.level,
      totalCompletions,
      perfectDays: perfectDaysCount,
      achievementsUnlocked: unlockedAchievements.length,
      totalAchievements: achievementsList.length,
      longestStreak: globalLongestStreak,
      currentStreak: globalCurrentStreak,
      perfectDaysStreak: currentPerfectStreak,
      longestPerfectDaysStreak: longestPerfectStreak,
      bestMonthlyRate,
      annualCompletionRate,
      daysTracked: distinctDaysCount
    },
    achievements: achievementsList,
    recentTransactions: transactions.slice(0, 10),
    allTransactions: transactions
  };
}

module.exports = {
  getLevelFromXP,
  evaluateProgression
};

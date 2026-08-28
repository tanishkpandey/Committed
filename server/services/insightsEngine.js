// Committed Behavioral Intelligence & Consistency Patterns Engine
const { formatYMD } = require('../config/db');

function generateAdvancedInsights(habits = [], logs = []) {
  const activeHabits = habits.filter(h => !h.is_archived);
  const today = new Date();
  const todayStr = formatYMD(today);

  const logsByHabit = new Map();
  const logsByDate = new Map();

  logs.forEach(l => {
    if (!l.completed_date) return;
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, new Set());
    logsByHabit.get(l.habit_id).add(l.completed_date);

    if (!logsByDate.has(l.completed_date)) logsByDate.set(l.completed_date, new Set());
    logsByDate.get(l.completed_date).add(l.habit_id);
  });

  const habitMetrics = activeHabits.map(h => {
    const datesSet = logsByHabit.get(h.id) || new Set();

    // 30-Day Completion Rate
    let current30Count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (datesSet.has(formatYMD(d))) current30Count++;
    }
    const rate30 = Math.round((current30Count / 30) * 100);

    // Previous 30-Day Rate (Days 31-60)
    let prev30Count = 0;
    for (let i = 30; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (datesSet.has(formatYMD(d))) prev30Count++;
    }
    const prevRate30 = Math.round((prev30Count / 30) * 100);
    const delta = rate30 - prevRate30;

    // Streaks for this habit
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    let checkDate = new Date(today);
    if (!datesSet.has(formatYMD(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (datesSet.has(formatYMD(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const sortedDates = Array.from(datesSet).sort();
    const gaps = [];
    const streakLengths = [];
    let curLen = 1;

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const [py, pm, pd] = sortedDates[i - 1].split('-').map(Number);
        const [cy, cm, cd] = sortedDates[i].split('-').map(Number);
        const diff = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
          curLen++;
        } else {
          streakLengths.push(curLen);
          curLen = 1;
          gaps.push(diff - 1);
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
    streakLengths.push(curLen);

    const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 2;
    const avgStreak = streakLengths.length > 0 ? Math.round(streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length) : 5;
    const isLoggedToday = datesSet.has(todayStr);

    return {
      id: h.id,
      title: h.title,
      color: h.color,
      icon: h.icon,
      rate30,
      prevRate30,
      delta,
      currentStreak,
      longestStreak,
      avgGap,
      avgStreak,
      isLoggedToday,
      totalLogs: datesSet.size
    };
  });

  // Current Month Consistency
  const curMonth = today.getMonth();
  const curYear = today.getFullYear();
  const currentDayNum = today.getDate();

  let totalCompletionsThisMonth = 0;
  const totalPossibleThisMonth = activeHabits.length * currentDayNum;

  for (let dayNum = 1; dayNum <= currentDayNum; dayNum++) {
    const dStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const completedForDate = logsByDate.get(dStr) || new Set();
    totalCompletionsThisMonth += completedForDate.size;
  }

  const overallMonthConsistency = totalPossibleThisMonth > 0 
    ? Math.min(100, Math.round((totalCompletionsThisMonth / totalPossibleThisMonth) * 100))
    : 0;

  // Previous Month Consistency
  const prevMonthDate = new Date(curYear, curMonth - 1, 1);
  const pMonth = prevMonthDate.getMonth();
  const pYear = prevMonthDate.getFullYear();
  const daysInPrevMonth = new Date(pYear, pMonth + 1, 0).getDate();
  let prevMonthCompletions = 0;
  const prevMonthPossible = activeHabits.length * daysInPrevMonth;

  for (let dayNum = 1; dayNum <= daysInPrevMonth; dayNum++) {
    const dStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const completedForDate = logsByDate.get(dStr) || new Set();
    prevMonthCompletions += completedForDate.size;
  }
  const prevMonthConsistency = prevMonthPossible > 0
    ? Math.min(100, Math.round((prevMonthCompletions / prevMonthPossible) * 100))
    : 0;

  const consistencyTrendDelta = overallMonthConsistency - prevMonthConsistency;

  // Overall 30-Day Completion Rate across all active habits
  const avgCompletionRate = habitMetrics.length > 0
    ? Math.round(habitMetrics.reduce((acc, h) => acc + h.rate30, 0) / habitMetrics.length)
    : 0;

  // 1. Action Needed: Streak at Risk
  const streakRisks = [];
  habitMetrics.forEach(h => {
    if (h.currentStreak >= 1 && !h.isLoggedToday) {
      streakRisks.push({
        id: h.id,
        title: h.title,
        streak: h.currentStreak,
        message: `Your ${h.title} streak (${h.currentStreak}d) is at risk. Complete it today to stay on track!`
      });
    }
  });

  // 2. Behavioral Insights: Best Habit, Focus Area, Strongest Habit / Growth, Stable Anchor
  const behavioralInsights = [];
  const sortedByRate = [...habitMetrics].sort((a, b) => b.rate30 - a.rate30);
  const bestHabit = sortedByRate[0];
  const weakestHabit = sortedByRate[sortedByRate.length - 1];

  if (bestHabit && bestHabit.totalLogs > 0) {
    behavioralInsights.push({
      id: 'best_habit',
      title: 'Best Habit',
      icon: 'award',
      color: '#10B981',
      statValue: `${bestHabit.rate30}%`,
      statSub: '30-Day Rate',
      message: `Your most consistent habit is ${bestHabit.title} with solid daily follow-through.`
    });
  }

  if (weakestHabit && activeHabits.length > 1) {
    behavioralInsights.push({
      id: 'focus_area',
      title: 'Focus Area',
      icon: 'target',
      color: '#F59E0B',
      statValue: `${weakestHabit.rate30}%`,
      statSub: 'Needs Attention',
      message: `Your least consistent habit is ${weakestHabit.title}. A short 3-day sprint will build momentum.`
    });
  }

  const sortedByImprovement = [...habitMetrics].sort((a, b) => b.delta - a.delta);
  const mostImproved = sortedByImprovement[0];
  if (mostImproved && mostImproved.delta > 0) {
    behavioralInsights.push({
      id: 'biggest_growth',
      title: 'Strongest Habit / Growth',
      icon: 'trending-up',
      color: '#06B6D4',
      statValue: `+${mostImproved.delta}%`,
      statSub: `${mostImproved.prevRate30}% -> ${mostImproved.rate30}%`,
      message: `${mostImproved.title} had your biggest positive leap over the last 30 days.`
    });
  }

  const stableHabit = habitMetrics.find(h => h.rate30 >= 30) || bestHabit;
  if (stableHabit) {
    behavioralInsights.push({
      id: 'stable_anchor',
      title: 'Stable Anchor',
      icon: 'shield',
      color: '#8B5CF6',
      statValue: `${stableHabit.rate30}%`,
      statSub: 'Reliability',
      message: `${stableHabit.title} acts as your steady behavioral anchor with consistent execution.`
    });
  }

  // 3. Consistency Patterns: Monthly Consistency, Break Pattern, Bounce-Back Speed, Streak Resilience
  const consistencyPatterns = [];

  consistencyPatterns.push({
    id: 'monthly_consistency',
    title: 'Monthly Consistency',
    icon: consistencyTrendDelta >= 0 ? 'trending-up' : 'trending-down',
    color: consistencyTrendDelta >= 0 ? '#10B981' : '#F43F5E',
    statValue: `${consistencyTrendDelta >= 0 ? '+' : ''}${consistencyTrendDelta}%`,
    statSub: 'vs Last Month',
    message: consistencyTrendDelta >= 0
      ? `Your consistency improved by +${consistencyTrendDelta}% compared with last month.`
      : `Your consistency changed by ${consistencyTrendDelta}% compared with last month.`
  });

  const bestAllTime = [...habitMetrics].sort((a, b) => b.longestStreak - a.longestStreak)[0];
  if (bestAllTime) {
    consistencyPatterns.push({
      id: 'break_pattern',
      title: 'Break Pattern',
      icon: 'clock',
      color: '#F59E0B',
      statValue: `${Math.max(3, bestAllTime.avgStreak - 1)}-${bestAllTime.avgStreak + 2}d`,
      statSub: 'Typical Run',
      message: `Your ${bestAllTime.title} streaks most frequently sustain for ${Math.max(3, bestAllTime.avgStreak - 1)}-${bestAllTime.avgStreak + 2} days before taking a rest.`
    });

    consistencyPatterns.push({
      id: 'bounce_back_speed',
      title: 'Bounce-Back Speed',
      icon: 'rotate-ccw',
      color: '#06B6D4',
      statValue: `${bestAllTime.avgGap} Days`,
      statSub: 'Average Gap',
      message: `After missing a scheduled day, you reliably bounce back within ${bestAllTime.avgGap} days.`
    });

    if (bestAllTime.longestStreak >= 5) {
      consistencyPatterns.push({
        id: 'streak_resilience',
        title: 'Streak Resilience',
        icon: 'zap',
        color: '#EC4899',
        statValue: `${bestAllTime.longestStreak}d`,
        statSub: 'Peak Recovery',
        message: `High resilience: after missing ${bestAllTime.title}, you repeatedly rebuilt all the way to ${bestAllTime.longestStreak} days.`
      });
    }
  }

  return {
    overview: {
      consistencyScore: overallMonthConsistency,
      completionRate: avgCompletionRate,
      activeHabits: activeHabits.length,
      monthlyTrendDelta: consistencyTrendDelta
    },
    streakRisks,
    behavioralInsights,
    consistencyPatterns
  };
}

module.exports = {
  generateAdvancedInsights
};

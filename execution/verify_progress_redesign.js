const fs = require('fs');

console.log('--- Verifying public/progress.html ---');
const html = fs.readFileSync('public/progress.html', 'utf8');

const checks = [
  { name: 'Level card label id', check: html.includes('id="levelCardLabel"') },
  { name: 'Level card headline id', check: html.includes('id="levelCardHeadline"') },
  { name: 'Level progress fill id', check: html.includes('id="levelProgressFill"') },
  { name: 'Level XP current id', check: html.includes('id="levelXpCurrent"') },
  { name: 'Level XP next id', check: html.includes('id="levelXpNext"') },
  { name: 'Best streak days id', check: html.includes('id="bestStreakDays"') },
  { name: 'Best streak gold card', check: html.includes('class="best-streak-card"') },
  { name: 'Total XP id', check: html.includes('id="statTotalXp"') },
  { name: 'Check ins id', check: html.includes('id="statCheckIns"') },
  { name: 'Perfect days id', check: html.includes('id="statPerfectDays"') },
  { name: 'Badges count id', check: html.includes('id="statBadgesCount"') },
  { name: 'Next badge section', check: html.includes('id="nextBadgeSection"') },
  { name: 'Next badge to unlock heading', check: html.includes('Next badge to unlock') },
  { name: 'Your badges row id', check: html.includes('id="yourBadgesRow"') },
  { name: 'See all button id', check: html.includes('id="progressSeeAllBtn"') },
  { name: 'All badges modal overlay id', check: html.includes('id="allBadgesModalOverlay"') },
  { name: 'Modal badges container id', check: html.includes('id="modalBadgesContainer"') },
  { name: 'Modal subtitle id', check: html.includes('id="modalBadgesSubtitle"') },
  { name: 'Modal Total logs filter chip', check: html.includes('Total logs') },
  { name: 'Zero-flicker 5-tab bottom nav', check: html.includes('class="bottom-nav"') && html.includes('Today') && html.includes('Progress') }
];

let allPassed = true;
checks.forEach(c => {
  if (!c.check) {
    console.error('FAIL:', c.name);
    allPassed = false;
  } else {
    console.log('PASS:', c.name);
  }
});

console.log('\n--- Verifying public/js/progress.js ---');
const js = fs.readFileSync('public/js/progress.js', 'utf8');
const jsChecks = [
  { name: 'renderHeroCard handles level and xpRemaining', check: js.includes('renderHeroCard') && js.includes('xpRemaining') },
  { name: 'renderLifetimeStats handles 0 perfect days (Not yet)', check: js.includes('Not yet') && js.includes('Finish every habit in one day') },
  { name: 'renderNextBadge circular progress ring calculation', check: js.includes('renderNextBadge') && js.includes('stroke-dasharray') && js.includes('stroke-dashoffset') },
  { name: 'renderNextBadge category chip and headline', check: js.includes('next-badge-category-chip') && js.includes('next-badge-headline') },
  { name: 'renderYourBadges 4 most recent badges', check: js.includes('renderYourBadges') && js.includes('slice(-4)') },
  { name: 'modal badges grouped by category', check: js.includes('modal-group-block') && js.includes('modal-group-heading') && js.includes('modal-group-grid') },
  { name: 'unlocked badge status text', check: js.includes('modal-card-unlocked-status') && js.includes('Unlocked') },
  { name: 'locked badge action text', check: js.includes('modal-card-action-text') && js.includes('more') },
  { name: 'showBadgeDetailModal and showLockedBadgeModal present', check: js.includes('showBadgeDetailModal') && js.includes('showLockedBadgeModal') },
  { name: 'Short badge descriptions and compact labels present', check: js.includes('SHORT_BADGE_DESCRIPTIONS') && js.includes('SHORT_BADGE_LABELS') }
];

jsChecks.forEach(c => {
  if (!c.check) {
    console.error('FAIL JS:', c.name);
    allPassed = false;
  } else {
    console.log('PASS JS:', c.name);
  }
});

console.log('\n--- Verifying public/css/components.css ---');
const css = fs.readFileSync('public/css/components.css', 'utf8');
const cssChecks = [
  { name: 'progress-level-card CSS', check: css.includes('.progress-level-card') },
  { name: 'best-streak-card gold tint CSS', check: css.includes('.best-streak-card') && css.includes('245, 158, 11') },
  { name: 'progress-stats-grid 2-col CSS', check: css.includes('.progress-stats-grid') && css.includes('grid-template-columns: repeat(2, 1fr)') },
  { name: 'next-badge-card and ring CSS', check: css.includes('.next-badge-card') && css.includes('.next-badge-ring-svg') },
  { name: 'your-badges-row 4-col CSS', check: css.includes('.your-badges-row') && css.includes('grid-template-columns: repeat(4, 1fr)') },
  { name: 'modal-filter-chip.active emerald with dark text', check: css.includes('.modal-filter-chip.active') && css.includes('#10b981 !important') && css.includes('#07090e !important') },
  { name: 'modal-badge-card locked no border and transparent bg', check: css.includes('.modal-badge-card.locked') && css.includes('border: none') && css.includes('background: transparent') }
];

cssChecks.forEach(c => {
  if (!c.check) {
    console.error('FAIL CSS:', c.name);
    allPassed = false;
  } else {
    console.log('PASS CSS:', c.name);
  }
});

if (allPassed) {
  console.log('\n=============================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('=============================================');
  process.exit(0);
} else {
  process.exit(1);
}

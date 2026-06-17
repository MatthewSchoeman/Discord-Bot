/**
 * Returns a map of { userId → gameName } assigning one random game per member.
 * Games can repeat if there are more members than games.
 */
function assignGamesRandomly(members, games) {
  const shuffled = [...games].sort(() => Math.random() - 0.5);
  const assignments = {};
  members.forEach((member, i) => {
    assignments[member.id] = shuffled[i % shuffled.length];
  });
  return assignments;
}

/**
 * Fits a list of strings into Discord's 1024-char embed field limit.
 * Shows as many items as possible, then appends "...and X more".
 */
function truncateList(items, limit = 1024) {
  if (!items.length) return 'None';
  const out = [];
  let used = 0;
  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const remaining = items.length - i - 1;
    const overflow = remaining > 0 ? `\n...and ${remaining} more` : '';
    if (used + line.length + 1 + overflow.length > limit) {
      out.push(`...and ${items.length - i} more`);
      break;
    }
    out.push(line);
    used += line.length + 1;
  }
  return out.join('\n');
}

module.exports = {
  assignGamesRandomly,
  truncateList
};

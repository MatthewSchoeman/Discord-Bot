const fs = require('fs');

const DATA_FILE = './game_data.json';
const REMINDER_FILE = './reminder_data.json';

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadReminders() {
  if (!fs.existsSync(REMINDER_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REMINDER_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse reminders JSON:', err);
    return [];
  }
}

function saveReminders(reminders) {
  try {
    fs.writeFileSync(REMINDER_FILE, JSON.stringify(reminders, null, 2));
  } catch (err) {
    console.error('Failed to save reminders JSON:', err);
  }
}

module.exports = {
  loadData,
  saveData,
  loadReminders,
  saveReminders
};

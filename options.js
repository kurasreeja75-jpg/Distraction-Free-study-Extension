// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'focusDuration',
    'breakDuration',
    'blockDuringFocus',
    'blockList',
    'notificationsEnabled'
  ]);
  
  document.getElementById('focusDuration').value = settings.focusDuration || 25;
  document.getElementById('breakDuration').value = settings.breakDuration || 5;
  document.getElementById('blockDuringFocus').checked = settings.blockDuringFocus !== false;
  document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
  
  if (settings.blockList && settings.blockList.length > 0) {
    document.getElementById('blockList').value = settings.blockList.join('\n');
  } else {
    document.getElementById('blockList').value = 
      'facebook.com\ntwitter.com\ninstagram.com\nreddit.com\nyoutube.com\ntiktok.com';
  }
}

async function saveSettings() {
  const focusDuration = parseInt(document.getElementById('focusDuration').value);
  const breakDuration = parseInt(document.getElementById('breakDuration').value);
  const blockDuringFocus = document.getElementById('blockDuringFocus').checked;
  const notificationsEnabled = document.getElementById('notificationsEnabled').checked;
  
  // Parse block list
  const blockListText = document.getElementById('blockList').value;
  const blockList = blockListText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(domain => domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''));
  
  // Validate inputs
  if (focusDuration < 1 || focusDuration > 120) {
    alert('Focus duration must be between 1 and 120 minutes');
    return;
  }
  
  if (breakDuration < 1 || breakDuration > 60) {
    alert('Break duration must be between 1 and 60 minutes');
    return;
  }
  
  // Save to storage
  await chrome.storage.sync.set({
    focusDuration,
    breakDuration,
    blockDuringFocus,
    blockList,
    notificationsEnabled
  });
  
  // Update blocking rules
  await chrome.runtime.sendMessage({ action: 'updateBlockRules' });
  
  // Show success message
  const saveMessage = document.getElementById('saveMessage');
  saveMessage.style.display = 'block';
  setTimeout(() => {
    saveMessage.style.display = 'none';
  }, 3000);
}

async function resetToDefaults() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    await chrome.storage.sync.set({
      focusDuration: 25,
      breakDuration: 5,
      blockDuringFocus: true,
      notificationsEnabled: true,
      blockList: [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'reddit.com',
        'youtube.com',
        'tiktok.com'
      ]
    });
    
    await loadSettings();
    await chrome.runtime.sendMessage({ action: 'updateBlockRules' });
    
    const saveMessage = document.getElementById('saveMessage');
    saveMessage.textContent = 'Settings reset to defaults!';
    saveMessage.style.display = 'block';
    setTimeout(() => {
      saveMessage.style.display = 'none';
      saveMessage.textContent = 'Settings saved successfully!';
    }, 3000);
  }
}
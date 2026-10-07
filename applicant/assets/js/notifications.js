// Global Notification Center Interaction Handlers
function markAllNotificationsRead() {
  document.querySelectorAll('.notification-item').forEach(item => {
    item.classList.remove('unread');
  });

  const badgeDot = document.getElementById('unreadBadgeDot');
  if (badgeDot) badgeDot.style.display = 'none';

  const countBadge = document.getElementById('notificationCountBadge');
  if (countBadge) countBadge.textContent = '0';

  if (typeof showToast === 'function') {
    showToast('All notifications marked as read', 'success');
  }
}

function readNotification(itemEl) {
  if (itemEl && itemEl.classList.contains('unread')) {
    itemEl.classList.remove('unread');
    const countBadge = document.getElementById('notificationCountBadge');
    if (countBadge) {
      let current = parseInt(countBadge.textContent) || 0;
      if (current > 0) {
        current--;
        countBadge.textContent = current;
        if (current === 0) {
          const badgeDot = document.getElementById('unreadBadgeDot');
          if (badgeDot) badgeDot.style.display = 'none';
        }
      }
    }
  }
}

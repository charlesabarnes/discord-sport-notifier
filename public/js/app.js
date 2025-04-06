// Main application JavaScript for Discord Sport Notifier

document.addEventListener('DOMContentLoaded', function() {
  // Initialize HTMX events
  document.body.addEventListener('htmx:afterSwap', function(event) {
    if (event.detail.target.id === 'teams-table-body' || event.detail.target.id === 'leagues-table-body') {
      showNotification('Configuration updated successfully');
    }
  });

  document.body.addEventListener('htmx:responseError', function(event) {
    showNotification('Error updating configuration', 'error');
  });
});

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white shadow-lg transform transition-all duration-500 translate-y-0 opacity-100`;
  notification.textContent = message;

  // Add to the DOM
  document.body.appendChild(notification);

  // Remove after a delay
  setTimeout(() => {
    notification.classList.add('opacity-0', 'translate-y-[-20px]');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

// Environment switching helper
function switchEnvironment(env) {
  // Update URL parameter
  const url = new URL(window.location);
  url.searchParams.set('env', env);
  window.history.pushState({}, '', url);
  
  // Reload the configuration data
  loadEnvironmentData(env);
}

// Handle environment-specific config settings
function getEnvironmentName() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('env') || 'production';
}
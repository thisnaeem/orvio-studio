// Runs before the React module, so import failures still have a visible recovery UI.
(() => {
  const fail = message => {
    const status = document.getElementById('startup-status');
    if (!status) return;
    status.textContent = 'Orvio could not start. ' + String(message || 'Please reload the workspace.').slice(0, 500);
    const button = document.createElement('button');
    button.textContent = 'Reload workspace';
    button.style.cssText = 'display:block;margin-top:20px;padding:10px 18px;cursor:pointer';
    button.onclick = () => location.reload();
    status.appendChild(button);
  };
  window.addEventListener('error', event => fail(event.message || 'A required resource failed to load.'), true);
  window.addEventListener('unhandledrejection', event => fail(event.reason?.message || 'Startup was interrupted.'));
  setTimeout(() => fail('Loading is taking longer than expected. Check the development server and reload.'), 20000);
})();

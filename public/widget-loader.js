(function() {
  // 1. Find the current loader script
  const currentScript = document.currentScript || document.querySelector('script[data-partner-id]');
  if (!currentScript) {
    console.error('[Obooking Widget] Loader script tag not found.');
    return;
  }

  // 2. Resolve absolute backend base URL from the script source
  let baseUrl = 'http://localhost:3000';
  try {
    const src = currentScript.src;
    if (src) {
      const url = new URL(src);
      baseUrl = url.origin;
    }
  } catch (e) {
    console.error('[Obooking Widget] Error parsing loader URL', e);
  }

  // 3. Create the main bundle script tag
  const bundleScript = document.createElement('script');
  bundleScript.src = `${baseUrl}/widget.bundle.js`;
  bundleScript.async = true;

  // 4. Forward B2B credentials and user attributes to the bundle script
  const partnerId = currentScript.getAttribute('data-partner-id');
  const partnerName = currentScript.getAttribute('data-partner-name');
  const userEmail = currentScript.getAttribute('data-user-email');
  const userName = currentScript.getAttribute('data-user-name');
  
  if (partnerId) bundleScript.setAttribute('data-partner-id', partnerId);
  if (partnerName) bundleScript.setAttribute('data-partner-name', partnerName);
  if (userEmail) bundleScript.setAttribute('data-user-email', userEmail);
  if (userName) bundleScript.setAttribute('data-user-name', userName);

  // 5. Inject the bundle into the host page
  document.head.appendChild(bundleScript);
})();

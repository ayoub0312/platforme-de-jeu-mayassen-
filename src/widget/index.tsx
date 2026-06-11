import React from 'react'
import { createRoot } from 'react-dom/client'
import { WidgetApp } from './WidgetApp'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '../utils/trpc'

// 1. Find the loader script tag and read B2B partner configs
const scriptTag = document.currentScript || document.querySelector('script[data-partner-id]');
const partnerId = scriptTag?.getAttribute('data-partner-id') || undefined;
const partnerName = scriptTag?.getAttribute('data-partner-name') || undefined;
const userEmail = scriptTag?.getAttribute('data-user-email') || undefined;
const userName = scriptTag?.getAttribute('data-user-name') || undefined;

// Dynamically discover backend absolute URL from the script tag source
let backendUrl = 'http://localhost:3000';
if (scriptTag) {
  try {
    const src = (scriptTag as HTMLScriptElement).src;
    if (src) {
      const url = new URL(src);
      backendUrl = url.origin;
    }
  } catch (e) {
    console.error('[Obooking Widget] Error parsing script URL, fallback to default', e);
  }
}

// 2. Set up local React Query and tRPC client instances pointing to the game portal backend
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${backendUrl}/api/trpc`,
    }),
  ],
});

// 3. Attach Shadow DOM and mount React Widget inside it
function initWidget() {
  const containerId = 'obooking-game-widget-container';
  if (document.getElementById(containerId)) return; // Avoid duplicate loading

  // Create container div
  const container = document.createElement('div');
  container.id = containerId;
  container.style.position = 'fixed';
  container.style.bottom = '0';
  container.style.right = '0';
  container.style.zIndex = '999999';
  document.body.appendChild(container);

  // Attach Shadow DOM to isolate Tailwind CSS
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Dynamically load compiled Tailwind stylesheet inside Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = `${backendUrl}/widget.css`;
  shadowRoot.appendChild(styleLink);

  // Create mount root element inside Shadow DOM
  const mountEl = document.createElement('div');
  shadowRoot.appendChild(mountEl);

  // Render React App
  const root = createRoot(mountEl);
  root.render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <WidgetApp 
          partnerId={partnerId} 
          partnerName={partnerName} 
          initialUserEmail={userEmail}
          initialUserName={userName}
        />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
}

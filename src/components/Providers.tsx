'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import React, { useState } from 'react'
import { trpc } from '../utils/trpc'

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return ''
  }
  if (process.env.VERCEL_URL) {
    // Deployments on Vercel
    return `https://${process.env.VERCEL_URL}`
  }
  // Fallback to local development server
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Prevent reinstantiating QueryClient on hot reloads
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

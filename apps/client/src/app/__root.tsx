import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import RootProvider from '@/providers'
import { Toaster } from '@/components/atoms/sonner'
import '@/styles/globals.css'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <RootProvider>
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools />
    </RootProvider>
  )
}
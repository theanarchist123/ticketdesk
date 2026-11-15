import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/layout'

import DashboardPage from './pages/dashboard'
import TicketsPage from './pages/tickets'
import NewTicketPage from './pages/tickets/new'
import TicketDetailPage from './pages/tickets/detail'
import CustomersPage from './pages/customers'
import BoardPage from './pages/board'
import ReportsPage from './pages/reports'
import SlaPage from './pages/sla'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/new" element={<NewTicketPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/sla" element={<SlaPage />} />
            </Route>
          </Routes>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--td-surface)',
                border: '1px solid var(--td-border)',
                color: 'var(--td-text)',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

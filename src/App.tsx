import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { AdminPage } from './pages/AdminPage'
import { DashboardPage } from './pages/DashboardPage'
import { EnvironmentalPage } from './pages/EnvironmentalPage'
import { FindingsPage } from './pages/FindingsPage'
import { HomePage } from './pages/HomePage'
import { MethodologyPage } from './pages/MethodologyPage'
import { ReportPage } from './pages/ReportPage'
import { SurveyPage } from './pages/SurveyPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="survey" element={<SurveyPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="environment" element={<EnvironmentalPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route
          path="*"
          element={
            <div className="py-20 text-center">
              <h1 className="text-2xl font-semibold text-brand-900">Page not found</h1>
              <a href={import.meta.env.BASE_URL} className="mt-3 inline-block text-sm text-brand-700 underline">
                Return home
              </a>
            </div>
          }
        />
      </Route>
      </Routes>
    </BrowserRouter>
  )
}

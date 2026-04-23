import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { OrgChart } from '@/components/chart/OrgChart'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toolbar } from '@/components/layout/Toolbar'

export default function App() {
  const loadBaseline = useAppStore((s) => s.loadBaseline)
  const loadScenario = useAppStore((s) => s.loadScenario)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const scenario = params.get('scenario')

    loadBaseline()
      .then(() => {
        if (scenario) return loadScenario(scenario)
      })
      .catch(console.error)
  }, [loadBaseline, loadScenario])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <OrgChart />
        </main>
      </div>
    </div>
  )
}

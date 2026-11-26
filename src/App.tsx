import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { LayoutProfissional } from './components/Layout'
import Login, { TelaCarregando, TelaErro } from './pages/Login'
import Onboarding from './pages/Onboarding'
import Inicio from './pages/prof/Inicio'
import Pacientes from './pages/prof/Pacientes'
import PacienteDetalhe from './pages/prof/PacienteDetalhe'
import Agenda from './pages/prof/Agenda'
import Perfil from './pages/prof/Perfil'
import MeuControle from './pages/paciente/MeuControle'

export default function App() {
  const { papel } = useAuth()

  if (papel === 'carregando') return <TelaCarregando />
  if (papel === 'anonimo') return <Login />
  if (papel === 'erro') return <TelaErro />
  if (papel === 'novo') return <Onboarding />
  if (papel === 'paciente') return <MeuControle />

  return (
    <LayoutProfissional>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/pacientes/:id" element={<PacienteDetalhe />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LayoutProfissional>
  )
}

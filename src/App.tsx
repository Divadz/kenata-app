import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireMember } from './components/RequireMember';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { RepertoirePage } from './features/repertoire/RepertoirePage';
import { MembersPage } from './features/members/MembersPage';
import { GroupSettings } from './features/group/GroupSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RequireMember>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="repertoire" element={<RepertoirePage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="settings" element={<GroupSettings />} />
            </Route>
          </Routes>
        </RequireMember>
      </BrowserRouter>
    </AuthProvider>
  );
}

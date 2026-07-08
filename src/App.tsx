import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireMember } from './components/RequireMember';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { RepertoirePage } from './features/repertoire/RepertoirePage';
import { SetlistsPage } from './features/setlists/SetlistsPage';
import { SetlistEditor } from './features/setlists/SetlistEditor';
import { SharedSetlist } from './features/setlists/SharedSetlist';
import { MembersPage } from './features/members/MembersPage';
import { GroupSettings } from './features/group/GroupSettings';

/** Application authentifiée (accès membre requis). */
function AuthedApp() {
  return (
    <RequireMember>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="repertoire" element={<RepertoirePage />} />
          <Route path="setlists" element={<SetlistsPage />} />
          <Route path="setlists/:id" element={<SetlistEditor />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<GroupSettings />} />
        </Route>
      </Routes>
    </RequireMember>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Partage public en lecture seule (sans authentification). */}
          <Route path="/s/:token" element={<SharedSetlist />} />
          <Route path="/*" element={<AuthedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

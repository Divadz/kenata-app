import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireMember } from './components/RequireMember';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { RepertoirePage } from './features/repertoire/RepertoirePage';
import { SetlistsPage } from './features/setlists/SetlistsPage';
import { SetlistEditor } from './features/setlists/SetlistEditor';
import { SharedSetlist } from './features/setlists/SharedSetlist';
import { ConcertsPage } from './features/concerts/ConcertsPage';
import { ConcertEditor } from './features/concerts/ConcertEditor';
import { BookingPage } from './features/booking/BookingPage';
import { ContactsPage } from './features/contacts/ContactsPage';
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
          <Route path="concerts" element={<ConcertsPage />} />
          <Route path="concerts/:id" element={<ConcertEditor />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          {/* Membres est désormais une section de Réglages ; on redirige les anciens liens. */}
          <Route path="members" element={<Navigate to="/settings" replace />} />
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

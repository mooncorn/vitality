import { AppLayout } from '@/components/layout/AppLayout';
import { PlayerGrid } from '@/components/layout/PlayerGrid';
import { GlobalMenu } from '@/components/menu/GlobalMenu';

function App() {
  return (
    <AppLayout>
      <PlayerGrid />
      <GlobalMenu />
    </AppLayout>
  );
}

export default App;

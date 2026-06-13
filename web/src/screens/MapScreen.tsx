import { CruiseMap } from '../components/Map/CruiseMap';
import { TopBar } from '../components/HUD/TopBar';
import { PulseButton } from '../components/HUD/PulseButton';
import { UserCard } from '../components/HUD/UserCard';
import { SpotDetail } from '../components/HUD/SpotDetail';

export function MapScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CruiseMap />
      <TopBar />
      <PulseButton />
      <UserCard />
      <SpotDetail />
    </div>
  );
}

import { CruiseMap } from '../components/Map/CruiseMap';
import { TopBar } from '../components/HUD/TopBar';
import { ActivityFeed } from '../components/HUD/ActivityFeed';
import { GroupPanel } from '../components/HUD/GroupPanel';
import { SpotDetail } from '../components/HUD/SpotDetail';
import { CruiserDetail } from '../components/HUD/CruiserDetail';

export function MapScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CruiseMap />
      <TopBar />
      <ActivityFeed />
      <GroupPanel />
      <SpotDetail />
      <CruiserDetail />
    </div>
  );
}

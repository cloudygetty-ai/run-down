export type Vec2 = { lat: number; lng: number };

export type VehicleClass =
  | 'lowrider'
  | 'muscle'
  | 'classic'
  | 'truck'
  | 'import'
  | 'euro'
  | 'suv';

export type Cruiser = {
  id: string;
  handle: string;
  vehicleClass: VehicleClass;
  vehicleName: string;
  color: string;
  position: Vec2;
  heading: number;
  speed: number;
  groupId: string | null;
  isLive: boolean;
  lastSeen: number;
  repScore: number;
  milesLogged: number;
};

export type SpotCategory =
  | 'strip'
  | 'meetup'
  | 'lookout'
  | 'parking'
  | 'drive-in'
  | 'historic';

export type CruisingSpot = {
  id: string;
  name: string;
  description: string;
  position: Vec2;
  category: SpotCategory;
  activeCruisers: number;
  peakTime: string;
  totalCheckins: number;
  rating: number;
  createdByHandle: string;
  vibeScore: 'lit' | 'active' | 'quiet' | 'dead';
};

export type CruiseGroup = {
  id: string;
  name: string;
  color: string;
  leaderId: string;
  memberIds: string[];
  isConvoy: boolean;
};

export type ActivityEventType =
  | 'join'
  | 'checkin'
  | 'honk'
  | 'group_form'
  | 'milestone'
  | 'spot_hot';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  handle: string;
  targetHandle?: string;
  spotName?: string;
  detail: string;
  timestamp: number;
};

export type NavTab = 'map' | 'spots' | 'profile';
export type MapMode = 'explore' | 'live' | 'convoy';

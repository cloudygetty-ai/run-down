import type { Cruiser, CruisingSpot, CruiseGroup, ActivityEvent, Vec2, VehicleClass } from '../types';
import { useMapStore } from '../store/map.store';
import { headingBetween, interpolateVec2 } from './geo';

// ── Famous LA cruising spots ─────────────────────────────────────────────────

export const INITIAL_SPOTS: CruisingSpot[] = [
  {
    id: 'sunset-strip',
    name: 'Sunset Strip',
    description: 'The most iconic cruise in the world. West Hollywood\'s legendary mile.',
    position: { lat: 34.0904, lng: -118.3840 },
    category: 'strip',
    activeCruisers: 11,
    peakTime: 'Fri & Sat 9PM–2AM',
    totalCheckins: 48920,
    rating: 4.9,
    createdByHandle: 'OG_CRUISER',
    vibeScore: 'lit',
  },
  {
    id: 'hollywood-blvd',
    name: 'Hollywood Blvd',
    description: 'Cruise under the stars past the Walk of Fame. Iconic.',
    position: { lat: 34.1016, lng: -118.3370 },
    category: 'strip',
    activeCruisers: 7,
    peakTime: 'Fri 8PM–1AM',
    totalCheckins: 31400,
    rating: 4.7,
    createdByHandle: 'STRIP_KING',
    vibeScore: 'active',
  },
  {
    id: 'crenshaw-blvd',
    name: 'Crenshaw Blvd',
    description: 'Home of the lowrider. The most respected strip in LA.',
    position: { lat: 33.9892, lng: -118.3289 },
    category: 'strip',
    activeCruisers: 14,
    peakTime: 'Sun 2PM–8PM',
    totalCheckins: 62100,
    rating: 5.0,
    createdByHandle: 'IMPALA_GOD',
    vibeScore: 'lit',
  },
  {
    id: 'van-nuys-blvd',
    name: 'Van Nuys Blvd',
    description: 'The Valley\'s legendary cruise spot since the 1970s.',
    position: { lat: 34.1900, lng: -118.4490 },
    category: 'strip',
    activeCruisers: 5,
    peakTime: 'Sat 7PM–midnight',
    totalCheckins: 19800,
    rating: 4.5,
    createdByHandle: 'VALLEY_CHROME',
    vibeScore: 'active',
  },
  {
    id: 'whittier-blvd',
    name: 'Whittier Blvd',
    description: 'East LA\'s historic lowrider corridor. Deep roots.',
    position: { lat: 33.9792, lng: -118.0742 },
    category: 'historic',
    activeCruisers: 8,
    peakTime: 'Sun noon–6PM',
    totalCheckins: 27500,
    rating: 4.8,
    createdByHandle: 'EASTSIDE_LIFE',
    vibeScore: 'active',
  },
  {
    id: 'pch-malibu',
    name: 'PCH — Malibu Run',
    description: 'Pacific Coast Highway coastal cruise. All classes welcome.',
    position: { lat: 34.0350, lng: -118.6920 },
    category: 'strip',
    activeCruisers: 3,
    peakTime: 'Sun morning',
    totalCheckins: 14200,
    rating: 4.6,
    createdByHandle: 'COAST_GHOST',
    vibeScore: 'quiet',
  },
  {
    id: 'mulholland-drive',
    name: 'Mulholland Drive',
    description: 'Twisties above the city. Breathtaking views at every corner.',
    position: { lat: 34.1155, lng: -118.4195 },
    category: 'lookout',
    activeCruisers: 4,
    peakTime: 'Sat dusk',
    totalCheckins: 9800,
    rating: 4.7,
    createdByHandle: 'APEX_KING',
    vibeScore: 'quiet',
  },
  {
    id: 'melrose-ave',
    name: 'Melrose Ave',
    description: 'Euro scene HQ. The meet-up spot for the import and euro crews.',
    position: { lat: 34.0836, lng: -118.3680 },
    category: 'meetup',
    activeCruisers: 6,
    peakTime: 'Thu night',
    totalCheckins: 11200,
    rating: 4.4,
    createdByHandle: 'EURO_SPEC',
    vibeScore: 'active',
  },
];

// ── Cruising routes (waypoints for each cruiser) ─────────────────────────────

type Route = { waypoints: Vec2[]; speed: number };

const ROUTES: Record<string, Route> = {
  sunset: {
    waypoints: [
      { lat: 34.0900, lng: -118.3980 },
      { lat: 34.0902, lng: -118.3840 },
      { lat: 34.0904, lng: -118.3700 },
      { lat: 34.0906, lng: -118.3560 },
      { lat: 34.0904, lng: -118.3700 },
      { lat: 34.0902, lng: -118.3840 },
    ],
    speed: 0.00038,
  },
  hollywood: {
    waypoints: [
      { lat: 34.1016, lng: -118.3490 },
      { lat: 34.1016, lng: -118.3370 },
      { lat: 34.1016, lng: -118.3250 },
      { lat: 34.1016, lng: -118.3370 },
    ],
    speed: 0.00042,
  },
  crenshaw: {
    waypoints: [
      { lat: 33.9980, lng: -118.3282 },
      { lat: 33.9820, lng: -118.3288 },
      { lat: 33.9660, lng: -118.3294 },
      { lat: 33.9820, lng: -118.3288 },
    ],
    speed: 0.00036,
  },
  vanNuys: {
    waypoints: [
      { lat: 34.1680, lng: -118.4490 },
      { lat: 34.1880, lng: -118.4490 },
      { lat: 34.2080, lng: -118.4490 },
      { lat: 34.1880, lng: -118.4490 },
    ],
    speed: 0.00040,
  },
  whittier: {
    waypoints: [
      { lat: 33.9792, lng: -118.0880 },
      { lat: 33.9792, lng: -118.0700 },
      { lat: 33.9792, lng: -118.0520 },
      { lat: 33.9792, lng: -118.0700 },
    ],
    speed: 0.00045,
  },
  pch: {
    waypoints: [
      { lat: 34.0220, lng: -118.7020 },
      { lat: 34.0350, lng: -118.6850 },
      { lat: 34.0490, lng: -118.6680 },
      { lat: 34.0350, lng: -118.6850 },
    ],
    speed: 0.00055,
  },
  melrose: {
    waypoints: [
      { lat: 34.0836, lng: -118.3820 },
      { lat: 34.0836, lng: -118.3680 },
      { lat: 34.0836, lng: -118.3540 },
      { lat: 34.0836, lng: -118.3680 },
    ],
    speed: 0.00032,
  },
  mulholland: {
    waypoints: [
      { lat: 34.1100, lng: -118.4380 },
      { lat: 34.1155, lng: -118.4195 },
      { lat: 34.1210, lng: -118.4010 },
      { lat: 34.1155, lng: -118.4195 },
    ],
    speed: 0.00028,
  },
};

// ── Initial cruiser definitions ──────────────────────────────────────────────

type CruiserDef = {
  id: string;
  handle: string;
  vehicleClass: VehicleClass;
  vehicleName: string;
  color: string;
  groupId: string | null;
  routeKey: keyof typeof ROUTES;
  waypointOffset: number;
  repScore: number;
  milesLogged: number;
};

const CRUISER_DEFS: CruiserDef[] = [
  { id: 'c1',  handle: 'CHROME_KING',     vehicleClass: 'lowrider', vehicleName: '1964 Chevy Impala',     color: '#C9A84C', groupId: 'westside',   routeKey: 'sunset',    waypointOffset: 0,   repScore: 9820, milesLogged: 18400 },
  { id: 'c2',  handle: 'BOMB_DOG',        vehicleClass: 'lowrider', vehicleName: '1962 Lincoln Cont.',    color: '#C9A84C', groupId: 'westside',   routeKey: 'sunset',    waypointOffset: 0.4, repScore: 7340, milesLogged: 12200 },
  { id: 'c3',  handle: 'VELVET_THUNDER',  vehicleClass: 'muscle',   vehicleName: '1968 Dodge Charger',    color: '#8B5CF6', groupId: 'burnout_co', routeKey: 'hollywood', waypointOffset: 0,   repScore: 6110, milesLogged: 9800  },
  { id: 'c4',  handle: 'IRON_DUKE',       vehicleClass: 'muscle',   vehicleName: '1969 Camaro Z/28',      color: '#8B5CF6', groupId: 'burnout_co', routeKey: 'hollywood', waypointOffset: 0.5, repScore: 5880, milesLogged: 8750  },
  { id: 'c5',  handle: 'DEVIL_STICK',     vehicleClass: 'muscle',   vehicleName: '1970 Chevelle SS',      color: '#8B5CF6', groupId: 'burnout_co', routeKey: 'mulholland',waypointOffset: 0.2, repScore: 4920, milesLogged: 7600  },
  { id: 'c6',  handle: 'EASTSIDE_RICO',   vehicleClass: 'lowrider', vehicleName: '1959 El Camino',        color: '#E8854C', groupId: 'la_vatos',   routeKey: 'crenshaw',  waypointOffset: 0,   repScore: 11200,milesLogged: 22100 },
  { id: 'c7',  handle: 'HYDRAULIC_KID',   vehicleClass: 'lowrider', vehicleName: '1963 Impala SS',        color: '#E8854C', groupId: 'la_vatos',   routeKey: 'crenshaw',  waypointOffset: 0.3, repScore: 8900, milesLogged: 16500 },
  { id: 'c8',  handle: 'PLACA_DOG',       vehicleClass: 'lowrider', vehicleName: '1956 Ford Crown Vic',   color: '#E8854C', groupId: 'la_vatos',   routeKey: 'whittier',  waypointOffset: 0,   repScore: 7600, milesLogged: 13200 },
  { id: 'c9',  handle: 'NEON_PROPHET',    vehicleClass: 'import',   vehicleName: '1995 Honda Civic EG',   color: '#4CAF7C', groupId: null,          routeKey: 'melrose',   waypointOffset: 0.1, repScore: 3240, milesLogged: 5800  },
  { id: 'c10', handle: 'STATIC_KING',     vehicleClass: 'import',   vehicleName: '2002 Subaru WRX',       color: '#4CAF7C', groupId: null,          routeKey: 'melrose',   waypointOffset: 0.6, repScore: 2980, milesLogged: 4900  },
  { id: 'c11', handle: 'DIESEL_PROPHET',  vehicleClass: 'truck',    vehicleName: '1972 Chevy C-10',       color: '#E85555', groupId: 'iron_convoy', routeKey: 'vanNuys',   waypointOffset: 0,   repScore: 4500, milesLogged: 8200  },
  { id: 'c12', handle: 'CHROME_MULE',     vehicleClass: 'truck',    vehicleName: '1969 Ford F-100',       color: '#E85555', groupId: 'iron_convoy', routeKey: 'vanNuys',   waypointOffset: 0.4, repScore: 3870, milesLogged: 6900  },
  { id: 'c13', handle: 'CHROME_RIDER',    vehicleClass: 'classic',  vehicleName: '1957 Chevy Bel Air',    color: '#FFFFFF', groupId: null,          routeKey: 'pch',       waypointOffset: 0.2, repScore: 6600, milesLogged: 11400 },
  { id: 'c14', handle: 'VAPOR_TRAIL',     vehicleClass: 'euro',     vehicleName: 'Mercedes 450SL \'73',   color: '#C0C0C0', groupId: null,          routeKey: 'mulholland',waypointOffset: 0.6, repScore: 5100, milesLogged: 9100  },
  { id: 'c15', handle: 'MIDNIGHT_RUN',    vehicleClass: 'classic',  vehicleName: '1967 Ford Mustang GT',  color: '#FFFFFF', groupId: null,          routeKey: 'pch',       waypointOffset: 0.7, repScore: 7200, milesLogged: 13800 },
  { id: 'c16', handle: 'SILVER_GHOST',    vehicleClass: 'classic',  vehicleName: '1955 Chevy Bel Air',    color: '#C0C0C0', groupId: null,          routeKey: 'sunset',    waypointOffset: 0.8, repScore: 8800, milesLogged: 16200 },
];

const INITIAL_GROUPS: Record<string, CruiseGroup> = {
  westside: {
    id: 'westside',
    name: 'Westside Rollers',
    color: '#C9A84C',
    leaderId: 'c1',
    memberIds: ['c1', 'c2'],
    isConvoy: true,
  },
  burnout_co: {
    id: 'burnout_co',
    name: 'Burnout Co.',
    color: '#8B5CF6',
    leaderId: 'c3',
    memberIds: ['c3', 'c4', 'c5'],
    isConvoy: true,
  },
  la_vatos: {
    id: 'la_vatos',
    name: 'LA Vatos CC',
    color: '#E8854C',
    leaderId: 'c6',
    memberIds: ['c6', 'c7', 'c8'],
    isConvoy: true,
  },
  iron_convoy: {
    id: 'iron_convoy',
    name: 'Iron Convoy',
    color: '#E85555',
    leaderId: 'c11',
    memberIds: ['c11', 'c12'],
    isConvoy: true,
  },
};

const ACTIVITY_TEMPLATES: Array<(h: string, extra?: string) => string> = [
  (h) => `${h} just pulled onto the strip`,
  (h, s) => `${h} checked in at ${s ?? 'the strip'}`,
  (h, t) => `${h} honked at ${t ?? 'someone'}`,
  (h) => `${h} is rolling clean tonight`,
  (h) => `${h} just hit a new miles record`,
  (h, s) => `${h} called ${s ?? 'this spot'} LIT`,
  (h, g) => `${h} joined ${g ?? 'a convoy'}`,
];

// ── Route state per cruiser ──────────────────────────────────────────────────

type CruiserState = {
  cruiser: Cruiser;
  routeKey: keyof typeof ROUTES;
  progress: number; // 0..1 between current and next waypoint
  waypointIdx: number;
};

const cruiserStates = new Map<string, CruiserState>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function buildInitialCruiser(def: CruiserDef): Cruiser {
  const route = ROUTES[def.routeKey];
  const wpIdx = Math.floor(def.waypointOffset * (route.waypoints.length - 1));
  const pos = route.waypoints[wpIdx];
  const nextPos = route.waypoints[(wpIdx + 1) % route.waypoints.length];
  return {
    id: def.id,
    handle: def.handle,
    vehicleClass: def.vehicleClass,
    vehicleName: def.vehicleName,
    color: def.color,
    position: pos,
    heading: headingBetween(pos, nextPos),
    speed: Math.round(route.speed * 150000),
    groupId: def.groupId,
    isLive: true,
    lastSeen: Date.now(),
    repScore: def.repScore,
    milesLogged: def.milesLogged,
  };
}

function tickCruiser(state: CruiserState): CruiserState {
  const route = ROUTES[state.routeKey];
  const { waypoints, speed } = route;
  let { progress, waypointIdx } = state;

  progress += speed + (Math.random() - 0.5) * speed * 0.3;

  if (progress >= 1) {
    progress -= 1;
    waypointIdx = (waypointIdx + 1) % waypoints.length;
  }

  const from = waypoints[waypointIdx];
  const to = waypoints[(waypointIdx + 1) % waypoints.length];
  const position = interpolateVec2(from, to, progress);
  const heading = headingBetween(from, to);

  return {
    ...state,
    progress,
    waypointIdx,
    cruiser: {
      ...state.cruiser,
      position,
      heading,
      lastSeen: Date.now(),
    },
  };
}

let feedCounter = 0;

function maybeEmitFeedEvent(): void {
  feedCounter++;
  if (feedCounter % 8 !== 0) return;

  const store = useMapStore.getState();
  const cruiserList = Object.values(store.cruisers);
  if (cruiserList.length === 0) return;

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const cruiser = pick(cruiserList);
  const spot = pick(INITIAL_SPOTS);
  const group = pick(Object.values(INITIAL_GROUPS));
  const target = pick(cruiserList.filter((c) => c.id !== cruiser.id));

  const roll = Math.floor(Math.random() * ACTIVITY_TEMPLATES.length);
  let detail = '';
  let type: ActivityEvent['type'] = 'join';

  if (roll === 0) { detail = ACTIVITY_TEMPLATES[0](cruiser.handle); type = 'join'; }
  else if (roll === 1) { detail = ACTIVITY_TEMPLATES[1](cruiser.handle, spot.name); type = 'checkin'; }
  else if (roll === 2) { detail = ACTIVITY_TEMPLATES[2](cruiser.handle, target.handle); type = 'honk'; }
  else if (roll === 3) { detail = ACTIVITY_TEMPLATES[3](cruiser.handle); type = 'join'; }
  else if (roll === 4) { detail = ACTIVITY_TEMPLATES[4](cruiser.handle); type = 'milestone'; }
  else if (roll === 5) { detail = ACTIVITY_TEMPLATES[5](cruiser.handle, spot.name); type = 'checkin'; }
  else { detail = ACTIVITY_TEMPLATES[6](cruiser.handle, group.name); type = 'group_form'; }

  store.pushFeed({
    id: `evt-${Date.now()}-${Math.random()}`,
    type,
    handle: cruiser.handle,
    targetHandle: type === 'honk' ? target.handle : undefined,
    spotName: type === 'checkin' ? spot.name : undefined,
    detail,
    timestamp: Date.now(),
  });
}

export function startMockService(): () => void {
  const store = useMapStore.getState();

  store.setSpots(INITIAL_SPOTS);
  store.setGroups(INITIAL_GROUPS);

  CRUISER_DEFS.forEach((def) => {
    const cruiser = buildInitialCruiser(def);
    const route = ROUTES[def.routeKey];
    const wpIdx = Math.floor(def.waypointOffset * (route.waypoints.length - 1));
    cruiserStates.set(def.id, {
      cruiser,
      routeKey: def.routeKey,
      progress: def.waypointOffset % (1 / (route.waypoints.length - 1)),
      waypointIdx: wpIdx,
    });
    store.setCruiser(cruiser);
  });

  // Seed initial feed events
  const seedHandles = ['CHROME_KING', 'EASTSIDE_RICO', 'IRON_DUKE'];
  const seedSpots = ['Sunset Strip', 'Crenshaw Blvd', 'Hollywood Blvd'];
  seedHandles.forEach((handle, i) => {
    store.pushFeed({
      id: `seed-${i}`,
      type: 'checkin',
      handle,
      spotName: seedSpots[i],
      detail: `${handle} checked in at ${seedSpots[i]}`,
      timestamp: Date.now() - (3 - i) * 45000,
    });
  });
  store.pushFeed({
    id: 'seed-group',
    type: 'group_form',
    handle: 'WESTSIDE ROLLERS',
    detail: 'Westside Rollers convoy is rolling — 2 deep on Sunset',
    timestamp: Date.now() - 120000,
  });

  intervalId = setInterval(() => {
    cruiserStates.forEach((state, id) => {
      const next = tickCruiser(state);
      cruiserStates.set(id, next);
      useMapStore.getState().setCruiser(next.cruiser);
    });
    maybeEmitFeedEvent();
  }, 800);

  return () => {
    if (intervalId !== null) clearInterval(intervalId);
    cruiserStates.clear();
  };
}

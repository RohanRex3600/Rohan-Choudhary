// AreaSense (Know Your Area)
// MVP single-file scaffold (Expo React Native + TypeScript)
// Screens: Home, Go, Happenings, Contribute
// NOTE: Paste this file as App.tsx in a fresh Expo project (SDK 51+).
// Then follow the README at the bottom of this file.

import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Platform, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';

// --- Minimal util: tailwind-y classnames (inline styles for RN)
const tw = {
  screen: { flex: 1, backgroundColor: '#0B1220' },
  container: { padding: 16 },
  h1: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  h2: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  p: { color: '#C8D0E0', fontSize: 14 },
  chip: { backgroundColor: '#1B2437', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  card: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  input: { backgroundColor: '#0f172a', color: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#1B2437', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
  tag: { backgroundColor: '#0f172a', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderColor: '#334155', borderWidth: 1, marginRight: 6 },
};

// --- Types
type AreaBriefingCard = { id: string; category: 'todo' | 'nottodo' | 'appreciate' | 'safety'; title: string; body: string; };
type Area = { id: string; name: string; city: string; ward?: string; lat: number; lng: number };
type EventItem = { id: string; title: string; start: string; venue?: string; tag?: string };
type Tip = { id: string; user: string; areaId: string; category: 'auto' | 'metro' | 'bus' | 'safety' | 'etiquette' | 'misc'; text: string; upvotes: number; createdAt: string };

// --- Mock seed data (replace with Supabase later)
const SEED_AREA: Area = { id: 'andheri_w', name: 'Andheri West', city: 'Mumbai', ward: 'K/West', lat: 19.1197, lng: 72.8468 };
const BRIEFINGS: AreaBriefingCard[] = [
  { id: 'b1', category: 'todo', title: 'Use Metro & Shared Autos', body: 'Line‑1/2A for N‑S hops. Shared autos around DN Nagar/Versova; carry change or pay UPI.' },
  { id: 'b2', category: 'nottodo', title: 'Don’t Block Narrow Lanes', body: 'During processions/visarjan, avoid interior lanes. Follow security cordons.' },
  { id: 'b3', category: 'appreciate', title: 'Queue Discipline', body: 'Queue at metro security; let passengers alight first. Digital payments appreciated.' },
  { id: 'b4', category: 'safety', title: 'Monsoon Watch', body: 'Prefer main roads at night; check underpass flooding alerts on heavy rain days.' },
];

const EVENTS: EventItem[] = [
  { id: 'e1', title: 'Ganesh Aarti – Local Mandal', start: 'Today 7:30 PM', venue: 'JP Road', tag: 'Festival' },
  { id: 'e2', title: 'Traffic Advisory: Metro work', start: 'Daily 11 PM – 5 AM', venue: 'New Link Road', tag: 'Traffic' },
];

const TIPS: Tip[] = [
  { id: 't1', user: 'LocalGuide_97', areaId: 'andheri_w', category: 'auto', text: 'Shared auto to DN Nagar metro from Four Bungalows ₹12 (subject to change).', upvotes: 12, createdAt: new Date().toISOString() },
  { id: 't2', user: 'Mumbaikar', areaId: 'andheri_w', category: 'etiquette', text: 'Peak hours: backpacks front‑carry in metro to avoid bumping others.', upvotes: 7, createdAt: new Date().toISOString() },
];

// --- Helpers
function openMapsDirections(from: {lat:number; lng:number}, toQuery: string) {
  const mapsUrl = Platform.select({
    ios: `http://maps.apple.com/?saddr=${from.lat},${from.lng}&daddr=${encodeURIComponent(toQuery)}&dirflg=r`,
    android: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${encodeURIComponent(toQuery)}&travelmode=transit`,
    default: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${encodeURIComponent(toQuery)}&travelmode=transit`,
  });
  Linking.openURL(mapsUrl!);
}

function openUber(toQuery: string) {
  const deep = `uber://?action=setPickup&pickup=my_location&dropoff[query]=${encodeURIComponent(toQuery)}`;
  const webFallback = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[query]=${encodeURIComponent(toQuery)}`;
  Linking.openURL(deep).catch(() => Linking.openURL(webFallback));
}

function openOla() {
  // Many devices don’t support ola://; fallback to app store web listing if it fails
  const olaDeep = `ola://app/launch`;
  const fallback = `https://ola.onelink.me/3Z5i?pid=deeplink&af_dp=ola%3A%2F%2Fapp%2Flaunch`;
  Linking.openURL(olaDeep).catch(() => Linking.openURL(fallback));
}

// --- Home Screen
function HomeScreen() {
  const [loc, setLoc] = useState<{lat:number; lng:number} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        Alert.alert('Permission needed', 'Location is used to fetch area hints. You can also type a destination in Go tab.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLoading(false);
    })();
  }, []);

  const area = SEED_AREA; // Replace with reverse‑geocode result later
  const briefingCategories = useMemo(() => [...new Set(BRIEFINGS.map(b => b.category))], []);

  return (
    <SafeAreaView style={tw.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[tw.container, { gap: 12 }]}>
          <Text style={tw.h1}>Know Your Area</Text>
          <Text style={tw.p}>You are around <Text style={{color:'white', fontWeight:'600'}}>{area.name}</Text>, {area.city}. ({loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : (loading ? 'Detecting location…' : 'Location off')})</Text>

          <View style={tw.card}>
            <Text style={tw.h2}>Area briefing</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {briefingCategories.map((c) => (
                <View key={c} style={tw.chip}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>{labelFor(c)}</Text>
                </View>
              ))}
            </View>
            {BRIEFINGS.map((item) => (
              <View key={item.id} style={[tw.card, {backgroundColor: '#0B1220'}]}>
                <Text style={{ color: '#A8B2C5', fontSize: 12, marginBottom: 2 }}>{labelFor(item.category)}</Text>
                <Text style={{ color: 'white', fontWeight: '700', marginBottom: 4 }}>{item.title}</Text>
                <Text style={tw.p}>{item.body}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[tw.btn, { flex: 1 }]} onPress={() => WebBrowser.openBrowserAsync('https://www.google.com/maps/search/?api=1&query=auto%20stand%20near%20me')}>
              <Text style={tw.btnText}>Find Auto Stand Nearby</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tw.btnGhost, { flex: 1 }]} onPress={() => Alert.alert('Tip', 'Shared autos often queue outside Versova & DN Nagar Metro during peak hours.') }>
              <Text style={tw.btnText}>Shared Auto Tip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelFor(cat: AreaBriefingCard['category']) {
  switch (cat) {
    case 'todo': return 'To‑Do';
    case 'nottodo': return 'Not‑to‑Do';
    case 'appreciate': return 'Local Appreciation';
    case 'safety': return 'Safety';
  }
}

// --- Go Screen (Route helper)
function GoScreen() {
  const [dest, setDest] = useState('Versova Metro Station');
  const from = { lat: SEED_AREA.lat, lng: SEED_AREA.lng };

  return (
    <SafeAreaView style={tw.screen}>
      <View style={[tw.container, { gap: 16 }]}>
        <Text style={tw.h1}>Go somewhere</Text>
        <TextInput
          placeholder="Enter destination (e.g., DN Nagar Metro)"
          placeholderTextColor="#64748b"
          value={dest}
          onChangeText={setDest}
          style={tw.input}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[tw.btn, { flex: 1 }]} onPress={() => openMapsDirections(from, dest)}>
            <Text style={tw.btnText}>Open in Maps (Transit)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[tw.btnGhost, { flex: 1 }]} onPress={() => openUber(dest)}>
            <Text style={tw.btnText}>Uber</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[tw.btnGhost, { flex: 1 }]} onPress={() => openOla()}>
            <Text style={tw.btnText}>Ola</Text>
          </TouchableOpacity>
        </View>

        <View style={tw.card}>
          <Text style={tw.h2}>Common pickup points nearby</Text>
          {['DN Nagar Metro Gate 1','Versova Metro Gate 2','Four Bungalows BEST stop'].map((name) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text style={{ color: 'white' }}>{name}</Text>
              <TouchableOpacity onPress={() => openMapsDirections(from, name)}>
                <Text style={{ color: '#60a5fa' }}>Navigate</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Happenings Screen
function HappeningsScreen() {
  return (
    <SafeAreaView style={tw.screen}>
      <View style={[tw.container, { gap: 12 }]}>
        <Text style={tw.h1}>What’s happening nearby</Text>
        {EVENTS.map((ev) => (
          <View key={ev.id} style={tw.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[tw.tag, { color: 'white' }]}>{ev.tag || 'Info'}</Text>
            </View>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 4 }}>{ev.title}</Text>
            <Text style={tw.p}>{ev.start} {ev.venue ? `• ${ev.venue}` : ''}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// --- Contribute Screen
function ContributeScreen() {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Tip['category']>('auto');

  function submit() {
    if (!text.trim()) return Alert.alert('Empty', 'Please add a short tip.');
    // TODO: POST to Supabase (tips) → pending moderation
    Alert.alert('Submitted', 'Thanks! Your tip will be visible after moderation.');
    setText('');
  }

  return (
    <SafeAreaView style={tw.screen}>
      <View style={[tw.container, { gap: 12 }]}>
        <Text style={tw.h1}>Contribute a tip</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(['auto','metro','bus','safety','etiquette','misc'] as Tip['category'][]).map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[tw.tag, { marginBottom: 8, borderColor: category===c?'#60a5fa':'#334155' }]}>
              <Text style={{ color: 'white' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          placeholder="120‑char tip. Example: Shared auto to DN Nagar ₹12 (subject to change)."
          placeholderTextColor="#64748b"
          value={text}
          onChangeText={setText}
          style={[tw.input, { minHeight: 100 }]} multiline maxLength={240}
        />
        <TouchableOpacity style={tw.btn} onPress={submit}>
          <Text style={tw.btnText}>Submit for review</Text>
        </TouchableOpacity>
        <View style={{ opacity: 0.7 }}>
          <Text style={tw.p}>By submitting you agree your tip is public after moderation. Avoid personal data; be respectful.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Navigation setup
const Tab = createBottomTabNavigator();

export default function App() {
  const navTheme = useMemo(() => ({
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#0B1220', card: '#0B1220', text: 'white' },
  }), []);

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#0B1220', borderTopColor: '#1f2937' }, tabBarActiveTintColor: '#60a5fa', tabBarInactiveTintColor: '#94a3b8' }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Go" component={GoScreen} />
        <Tab.Screen name="Happenings" component={HappeningsScreen} />
        <Tab.Screen name="Contribute" component={ContributeScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

/* =============================
   Supabase SQL (run in SQL editor)
   =============================
-- Areas
create table if not exists public.areas (
  id text primary key,
  name text not null,
  city text not null,
  ward text,
  centroid geography(point, 4326),
  lat double precision,
  lng double precision
);

-- Area briefings (mod-curated)
create table if not exists public.area_briefings (
  id bigserial primary key,
  area_id text references public.areas(id) on delete cascade,
  category text check (category in ('todo','nottodo','appreciate','safety')) not null,
  title text not null,
  body text not null,
  language text default 'en',
  source text,
  verified_by uuid,
  updated_at timestamptz default now()
);

-- Users (auth.users exists). Shadow profile table for roles & karma
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  role text default 'user',
  languages text[] default '{en}',
  karma int default 0,
  created_at timestamptz default now()
);

-- Tips (crowdsourced)
create table if not exists public.tips (
  id bigserial primary key,
  area_id text references public.areas(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  category text check (category in ('auto','metro','bus','safety','etiquette','misc')) not null,
  text text not null,
  media_url text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  upvotes int default 0,
  downvotes int default 0,
  created_at timestamptz default now()
);

-- Events (curated/partner feeds for now)
create table if not exists public.events (
  id bigserial primary key,
  area_id text references public.areas(id) on delete cascade,
  title text not null,
  start_ts timestamptz not null,
  end_ts timestamptz,
  venue text,
  url text,
  category text
);

-- Reports (community moderation)
create table if not exists public.reports (
  id bigserial primary key,
  tip_id bigint references public.tips(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);

-- RLS
alter table public.tips enable row level security;
alter table public.area_briefings enable row level security;
alter table public.events enable row level security;
alter table public.areas enable row level security;

-- Public read policies
create policy tips_read on public.tips for select using (status = 'approved');
create policy tips_insert on public.tips for insert with check (auth.role() = 'authenticated');
create policy tips_update_own on public.tips for update using (auth.uid() = user_id);

create policy areas_read on public.areas for select using (true);
create policy briefings_read on public.area_briefings for select using (true);
create policy events_read on public.events for select using (true);

-- Mod role example (create a Postgres role and grant)
-- CREATE ROLE mod NOINHERIT;
-- Then in Supabase, create a JWT claim mapping if needed. Or perform moderation via service key from admin app.

/* =============================
   Client wiring (later):
   - npm i @supabase/supabase-js
   - fetch: const { data } = await supabase.from('area_briefings').select('*').eq('area_id', 'andheri_w')
   - submit tip: insert into tips with status='pending'
============================= */

/* =============================
   Quick README
   =============================
1) Create a new Expo app:
   npx create-expo-app areasense --template
   cd areasense
   npm i @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
   npx expo install react-native-screens react-native-safe-area-context expo-location expo-linking expo-web-browser

2) Replace App.tsx with this file. Run:
   npx expo start

3) (Optional) Add Supabase:
   npm i @supabase/supabase-js
   - Create project, run SQL above in SQL editor.
   - Add .env with SUPABASE_URL & SUPABASE_ANON_KEY; initialize client and replace mock arrays with live queries.

4) Play Store prep later: add app icon, privacy policy link, and switch mock to live data.

*/

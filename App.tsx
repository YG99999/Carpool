import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Car, Calendar, Settings, Plus, Trash2, Edit2, 
  Check, X, ChevronRight, ChevronLeft, Save, AlertTriangle, 
  User, MapPin, LogOut, Menu, GripVertical, Download
} from 'lucide-react';

// --- THEME ---
const COLORS = {
  primary: '#173f7f', // Dark Blue
  accent: '#1abc54',  // Bright Green
  bg: '#f3f4f6',
  white: '#ffffff',
  textMain: '#1e293b',
  danger: '#ef4444',
  warning: '#f59e0b',
};

// --- DATA TYPES & MOCKS ---

type ID = string;

interface Player {
  id: ID;
  name: string;
  teamName: string;
  grade: string;
  needsChildSeat: boolean;
  groupIds: ID[]; // For preferred groups
}

interface Driver {
  id: ID;
  name: string;
  hasLicense: boolean;
  maxSeatsTotal: number;
  maxChildSeats: number;
  notes: string;
}

interface PreferredGroup {
  id: ID;
  name: string;
  priority: number; // 1-5
  memberIds: ID[];
  requirement: 'hard' | 'soft';
}

interface Eligibility {
  driverId: ID;
  playerId: ID;
  allowed: boolean;
  preference: 'none' | 'prefer' | 'always';
}

interface Event {
  id: ID;
  name: string;
  dateTime: string;
  locationName: string;
  locationAddress: string;
  notes: string;
}

interface EventAttendance {
  eventId: ID;
  playerId: ID;
  isGoing: boolean;
  needsRide: boolean;
}

interface EventDriver {
  eventId: ID;
  driverId: ID;
  isDriving: boolean;
  direction: 'to' | 'from' | 'both';
  availableSeatsTotal: number;
  availableChildSeats: number;
  notes: string;
}

interface Assignment {
  id: ID;
  eventId: ID;
  driverId: ID; // 'unassigned' if unassigned
  playerId: ID;
  direction: 'to' | 'from' | 'both';
}

// --- DATABASE SERVICE (LocalStorage) ---

const DB = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(`tc_${key}`);
      return item ? JSON.parse(item) : [];
    } catch { return []; }
  },
  set: (key: string, data: any) => {
    localStorage.setItem(`tc_${key}`, JSON.stringify(data));
  },
  // Initialize default data if empty
  init: () => {
    if (!localStorage.getItem('tc_players')) {
      DB.set('players', []);
      DB.set('drivers', []);
      DB.set('groups', []);
      DB.set('eligibility', []);
      DB.set('events', []);
      DB.set('attendance', []);
      DB.set('eventDrivers', []);
      DB.set('assignments', []);
    }
  }
};

// --- UTILS ---

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// --- COMPONENTS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";
  const styles: any = {
    primary: `text-white hover:opacity-90 disabled:opacity-50`,
    secondary: `bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50`,
    danger: `bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50`,
    accent: `bg-[#1abc54] text-white hover:bg-[#159c45] disabled:opacity-50`
  };
  
  // Custom style injection for primary to use theme color
  const styleProp = variant === 'primary' ? { backgroundColor: COLORS.primary } : {};

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
      style={styleProp}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', title, action }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
        {action}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" {...props} />
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-[#173f7f] border-[#173f7f]' : 'bg-white border-slate-300'}`}>
      {checked && <Check size={14} className="text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className="text-sm text-slate-700 select-none">{label}</span>
  </label>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'players' | 'events' | 'eventDetail'>('login');
  const [currentEventId, setCurrentEventId] = useState<ID | null>(null);
  
  // Data State
  const [players, setPlayers] = useState<Player[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<PreferredGroup[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility[]>([]);
  
  // Event Specific State (loaded when viewing event)
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [eventDrivers, setEventDrivers] = useState<EventDriver[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Init
  useEffect(() => {
    DB.init();
    refreshData();
    // Check session
    if (sessionStorage.getItem('tc_auth')) setView('dashboard');
  }, []);

  const refreshData = () => {
    setPlayers(DB.get('players'));
    setDrivers(DB.get('drivers'));
    setEvents(DB.get('events'));
    setGroups(DB.get('groups'));
    setEligibility(DB.get('eligibility'));
  };

  const handleLogin = (code: string) => {
    if (code === 'COACH123') { // Simple auth
      sessionStorage.setItem('tc_auth', 'true');
      setView('dashboard');
    } else {
      alert('Invalid code. Try COACH123');
    }
  };

  const navigateToEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    // Load event specific data
    const allAttendance = DB.get('attendance');
    const allED = DB.get('eventDrivers');
    const allAssignments = DB.get('assignments');
    
    setAttendance(allAttendance.filter((a:any) => a.eventId === eventId));
    setEventDrivers(allED.filter((e:any) => e.eventId === eventId));
    setAssignments(allAssignments.filter((a:any) => a.eventId === eventId));
    
    setView('eventDetail');
  };

  // --- RENDER VIEWS ---

  if (view === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 shadow-md text-white" style={{ backgroundColor: COLORS.primary }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => setView('dashboard')}>
            <Car className="text-[#1abc54]" />
            <span>TeamCarpool</span>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <button onClick={() => setView('players')} className={`hover:text-[#1abc54] ${view === 'players' ? 'text-[#1abc54]' : ''}`}>People</button>
            <button onClick={() => setView('events')} className={`hover:text-[#1abc54] ${view === 'events' ? 'text-[#1abc54]' : ''}`}>Events</button>
            <button onClick={() => { sessionStorage.removeItem('tc_auth'); setView('login'); }}><LogOut size={18} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {view === 'dashboard' && <Dashboard players={players} drivers={drivers} events={events} onNav={setView} onEventClick={navigateToEvent} />}
        {view === 'players' && <PeopleManager players={players} drivers={drivers} groups={groups} eligibility={eligibility} refresh={refreshData} />}
        {view === 'events' && <EventsList events={events} onEventClick={navigateToEvent} refresh={refreshData} />}
        {view === 'eventDetail' && currentEventId && (
          <EventDetail 
            eventId={currentEventId} 
            allPlayers={players} 
            allDrivers={drivers} 
            allGroups={groups}
            allEligibility={eligibility}
            attendance={attendance}
            eventDrivers={eventDrivers}
            assignments={assignments}
            onBack={() => setView('events')}
            refreshData={() => navigateToEvent(currentEventId)}
          />
        )}
      </div>
    </div>
  );
}

// --- SUB-SCREENS ---

const LoginScreen = ({ onLogin }: any) => {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-blue-50">
            <Car size={48} style={{ color: COLORS.primary }} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">TeamCarpool</h1>
        <p className="text-slate-500">Enter organizer access code</p>
        <div className="space-y-3">
          <Input 
            placeholder="Access Code" 
            value={code} 
            onChange={(e:any) => setCode(e.target.value)} 
            type="password"
          />
          <Button onClick={() => onLogin(code)} className="w-full">
            Enter Dashboard
          </Button>
          <div className="text-xs text-slate-400">Try: COACH123</div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ players, drivers, events, onNav, onEventClick }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Organizer Dashboard</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Team Stats" action={<Button variant="secondary" onClick={() => onNav('players')} className="text-xs px-2 py-1">Manage</Button>}>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-[#173f7f]">{players.length}</div>
            <div className="text-sm text-slate-600">Players</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-[#1abc54]">{drivers.length}</div>
            <div className="text-sm text-slate-600">Drivers</div>
          </div>
        </div>
      </Card>

      <Card title="Upcoming Events" action={<Button variant="primary" onClick={() => onNav('events')} className="text-xs px-2 py-1"><Plus size={14} /> New</Button>}>
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-4">No upcoming events</div>
          ) : (
            events.slice(0, 3).map((ev: Event) => (
              <div key={ev.id} onClick={() => onEventClick(ev.id)} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                <div>
                  <div className="font-semibold">{ev.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(ev.dateTime)}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  </div>
);

// --- PEOPLE MANAGER ---

const PeopleManager = ({ players, drivers, groups, eligibility, refresh }: any) => {
  const [tab, setTab] = useState<'players' | 'drivers'>('players');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // -- CRUD Logic --
  const savePlayer = (player: Player) => {
    const list = DB.get('players');
    if (editingItem) {
      DB.set('players', list.map((p: Player) => p.id === player.id ? player : p));
    } else {
      DB.set('players', [player, ...list]);
    }
    refresh(); setIsModalOpen(false);
  };

  const saveDriver = (driver: Driver) => {
    const list = DB.get('drivers');
    if (editingItem) {
      DB.set('drivers', list.map((d: Driver) => d.id === driver.id ? driver : d));
    } else {
      DB.set('drivers', [driver, ...list]);
    }
    refresh(); setIsModalOpen(false);
  };

  const deleteItem = (type: 'players' | 'drivers', id: ID) => {
    if (!confirm('Are you sure?')) return;
    const list = DB.get(type);
    DB.set(type, list.filter((i: any) => i.id !== id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">People</h2>
        <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }}><Plus size={16} /> Add {tab === 'players' ? 'Player' : 'Driver'}</Button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-4">
        <button onClick={() => setTab('players')} className={`px-4 py-2 font-medium border-b-2 ${tab === 'players' ? 'border-[#173f7f] text-[#173f7f]' : 'border-transparent text-slate-500'}`}>Players</button>
        <button onClick={() => setTab('drivers')} className={`px-4 py-2 font-medium border-b-2 ${tab === 'drivers' ? 'border-[#173f7f] text-[#173f7f]' : 'border-transparent text-slate-500'}`}>Drivers</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {tab === 'players' ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Team</th>
                <th className="p-3">Child Seat</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((p: Player) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-slate-600">{p.teamName}</td>
                  <td className="p-3">{p.needsChildSeat ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">Required</span> : '-'}</td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => { setEditingItem(p); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => deleteItem('players', p.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {players.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No players yet.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Child Seats</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d: Driver) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-slate-600">{d.maxSeatsTotal} seats</td>
                  <td className="p-3 text-slate-600">{d.maxChildSeats}</td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => { setEditingItem(d); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => deleteItem('drivers', d.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No drivers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit' : 'Add New'}>
        {tab === 'players' ? (
          <PlayerForm 
            initial={editingItem || { id: generateId(), name: '', teamName: '', grade: '', needsChildSeat: false, groupIds: [] }} 
            onSave={savePlayer} 
          />
        ) : (
          <DriverForm 
            initial={editingItem || { id: generateId(), name: '', hasLicense: true, maxSeatsTotal: 4, maxChildSeats: 0, notes: '' }} 
            onSave={saveDriver} 
          />
        )}
      </Modal>
    </div>
  );
};

const PlayerForm = ({ initial, onSave }: any) => {
  const [data, setData] = useState(initial);
  return (
    <div className="space-y-3">
      <Input label="Name" value={data.name} onChange={(e:any) => setData({...data, name: e.target.value})} />
      <Input label="Team" value={data.teamName} onChange={(e:any) => setData({...data, teamName: e.target.value})} />
      <Input label="Grade" value={data.grade} onChange={(e:any) => setData({...data, grade: e.target.value})} />
      <Checkbox label="Needs Child Seat / Booster" checked={data.needsChildSeat} onChange={(e:any) => setData({...data, needsChildSeat: e.target.checked})} />
      <Button onClick={() => onSave(data)} className="w-full mt-4">Save Player</Button>
    </div>
  );
};

const DriverForm = ({ initial, onSave }: any) => {
  const [data, setData] = useState(initial);
  return (
    <div className="space-y-3">
      <Input label="Name" value={data.name} onChange={(e:any) => setData({...data, name: e.target.value})} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" label="Max Seats (Total)" value={data.maxSeatsTotal} onChange={(e:any) => setData({...data, maxSeatsTotal: parseInt(e.target.value)})} />
        <Input type="number" label="Max Child Seats" value={data.maxChildSeats} onChange={(e:any) => setData({...data, maxChildSeats: parseInt(e.target.value)})} />
      </div>
      <Input label="Notes" value={data.notes} onChange={(e:any) => setData({...data, notes: e.target.value})} />
      <Button onClick={() => onSave(data)} className="w-full mt-4">Save Driver</Button>
    </div>
  );
};

// --- EVENTS LIST ---

const EventsList = ({ events, onEventClick, refresh }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', dateTime: '', locationName: '', locationAddress: '', notes: '' });

  const createEvent = () => {
    const event = { ...newEvent, id: generateId() };
    DB.set('events', [event, ...events]);
    refresh();
    setIsModalOpen(false);
  };

  const deleteEvent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this event? This will remove all carpool assignments.')) return;
    DB.set('events', events.filter((ev: Event) => ev.id !== id));
    // Also clean up related data
    DB.set('attendance', DB.get('attendance').filter((a:any) => a.eventId !== id));
    DB.set('eventDrivers', DB.get('eventDrivers').filter((a:any) => a.eventId !== id));
    DB.set('assignments', DB.get('assignments').filter((a:any) => a.eventId !== id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events</h2>
        <Button onClick={() => setIsModalOpen(true)}><Plus size={16} /> Create Event</Button>
      </div>
      <div className="space-y-3">
        {events.map((ev: Event) => (
          <div key={ev.id} onClick={() => onEventClick(ev.id)} className="bg-white p-4 rounded-xl shadow-sm border hover:border-blue-300 cursor-pointer flex justify-between items-center group">
            <div>
              <div className="font-bold text-lg text-[#173f7f]">{ev.name}</div>
              <div className="text-slate-500 text-sm flex gap-3 mt-1">
                <span className="flex items-center gap-1"><Calendar size={14}/> {formatDate(ev.dateTime)}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> {ev.locationName}</span>
              </div>
            </div>
            <button onClick={(e) => deleteEvent(e, ev.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {events.length === 0 && <div className="text-center py-12 text-slate-400">No events yet. Create one to start.</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Event">
        <div className="space-y-3">
          <Input label="Event Name" placeholder="e.g. Away vs Lincoln" value={newEvent.name} onChange={(e:any) => setNewEvent({...newEvent, name: e.target.value})} />
          <Input label="Date & Time" type="datetime-local" value={newEvent.dateTime} onChange={(e:any) => setNewEvent({...newEvent, dateTime: e.target.value})} />
          <Input label="Location Name" placeholder="e.g. Lincoln High School" value={newEvent.locationName} onChange={(e:any) => setNewEvent({...newEvent, locationName: e.target.value})} />
          <Input label="Address" value={newEvent.locationAddress} onChange={(e:any) => setNewEvent({...newEvent, locationAddress: e.target.value})} />
          <Button onClick={createEvent} className="w-full mt-4">Create Event</Button>
        </div>
      </Modal>
    </div>
  );
};

// --- EVENT DETAIL & CARPOOL LOGIC ---

const EventDetail = ({ 
  eventId, allPlayers, allDrivers, allGroups, allEligibility,
  attendance, eventDrivers, assignments,
  onBack, refreshData 
}: any) => {
  const [tab, setTab] = useState<'attendance'|'drivers'|'carpool'>('attendance');
  const event = DB.get('events').find((e:any) => e.id === eventId);
  const [localAttendance, setLocalAttendance] = useState<EventAttendance[]>(attendance);
  const [localEventDrivers, setLocalEventDrivers] = useState<EventDriver[]>(eventDrivers);
  
  // Sync prop changes to local state
  useEffect(() => { setLocalAttendance(attendance); }, [attendance]);
  useEffect(() => { setLocalEventDrivers(eventDrivers); }, [eventDrivers]);

  if (!event) return <div>Event not found</div>;

  // --- ACTIONS ---

  const saveAttendance = () => {
    const fullList = DB.get('attendance').filter((a:any) => a.eventId !== eventId);
    DB.set('attendance', [...fullList, ...localAttendance]);
    alert('Attendance saved!');
    refreshData();
  };

  const saveDrivers = () => {
    const fullList = DB.get('eventDrivers').filter((a:any) => a.eventId !== eventId);
    DB.set('eventDrivers', [...fullList, ...localEventDrivers]);
    alert('Drivers saved!');
    refreshData();
  };

  const toggleAttendance = (pid: ID, field: 'isGoing' | 'needsRide') => {
    const existing = localAttendance.find(a => a.playerId === pid) || { eventId, playerId: pid, isGoing: false, needsRide: true };
    const updated = { ...existing, [field]: !existing[field] };
    
    // Logic: if not going, cannot need ride. if going, default need ride is true.
    if (field === 'isGoing' && !updated.isGoing) updated.needsRide = false;
    if (field === 'isGoing' && updated.isGoing) updated.needsRide = true;
    
    setLocalAttendance([
      ...localAttendance.filter(a => a.playerId !== pid),
      updated
    ]);
  };

  const toggleDriver = (did: ID, field: 'isDriving' | 'direction', value?: any) => {
    const driverDef = allDrivers.find((d:any) => d.id === did);
    const existing = localEventDrivers.find(d => d.driverId === did) || { 
      eventId, driverId: did, isDriving: false, direction: 'both', 
      availableSeatsTotal: driverDef.maxSeatsTotal, 
      availableChildSeats: driverDef.maxChildSeats, notes: '' 
    };
    
    let updated = { ...existing };
    if (field === 'isDriving') updated.isDriving = !updated.isDriving;
    else if (field === 'direction') updated.direction = value;
    else updated = { ...updated, [field]: value }; // for seats override if needed

    setLocalEventDrivers([
      ...localEventDrivers.filter(d => d.driverId !== did),
      updated
    ]);
  };

  // --- ALGORITHM ---

  const generateCarpool = () => {
    // 1. Get Participants
    const goingPlayers = allPlayers.filter((p: Player) => {
      const att = localAttendance.find(a => a.playerId === p.id);
      return att && att.isGoing && att.needsRide;
    });

    const activeDrivers = localEventDrivers.filter(d => d.isDriving);

    if (activeDrivers.length === 0) {
      alert('No drivers marked for this event!');
      return;
    }

    // 2. Setup Driver Capacity Buckets
    let newAssignments: Assignment[] = [];
    let unassignedIds: ID[] = [];
    
    // We treat "to" and "from" directions somewhat independently or simplified "both" for prototype.
    // For this prototype, we'll assume "both" direction for simplicity of the algorithm, 
    // or assign to the driver regardless of direction match (refine later).
    
    // Helper to check if driver allows player
    const isAllowed = (did: ID, pid: ID) => {
      const rule = allEligibility.find((e:any) => e.driverId === did && e.playerId === pid);
      return rule ? rule.allowed : true; // allowed by default
    };

    const getPreference = (did: ID, pid: ID) => {
      const rule = allEligibility.find((e:any) => e.driverId === did && e.playerId === pid);
      return rule ? rule.preference : 'none';
    };

    // Prepare driver buckets
    const buckets = activeDrivers.map(d => ({
      ...d,
      remainingSeats: d.availableSeatsTotal,
      remainingChildSeats: d.availableChildSeats,
      assignedPlayerIds: [] as ID[]
    }));

    // 3. Process Logic
    // Sort players: Groups (Hard) -> Groups (Soft) -> Individuals
    // Simplified: Just sort by Needs Child Seat first (hard constraint), then random.
    const sortedPlayers = [...goingPlayers].sort((a, b) => (a.needsChildSeat === b.needsChildSeat ? 0 : a.needsChildSeat ? -1 : 1));

    for (const player of sortedPlayers) {
      // Find best driver
      let bestDriverIndex = -1;
      let bestScore = -1;

      buckets.forEach((bucket, idx) => {
        if (bucket.remainingSeats <= 0) return;
        if (player.needsChildSeat && bucket.remainingChildSeats <= 0) return;
        if (!isAllowed(bucket.driverId, player.id)) return;

        // Scoring
        let score = 10;
        const pref = getPreference(bucket.driverId, player.id);
        if (pref === 'always') score += 50;
        if (pref === 'prefer') score += 20;
        
        // Load balancing: prefer empty cars slightly? No, prefer filling cars to minimize drivers? 
        // Let's prefer filling cars that already have people (clustering) or sticking to preferences.
        // Simple greedy: score higher for preference, then higher for remaining capacity to fill?
        // Let's just use preference.
        
        if (score > bestScore) {
          bestScore = score;
          bestDriverIndex = idx;
        }
      });

      if (bestDriverIndex !== -1) {
        // Assign
        buckets[bestDriverIndex].remainingSeats--;
        if (player.needsChildSeat) buckets[bestDriverIndex].remainingChildSeats--;
        buckets[bestDriverIndex].assignedPlayerIds.push(player.id);
        
        newAssignments.push({
          id: generateId(),
          eventId,
          driverId: buckets[bestDriverIndex].driverId,
          playerId: player.id,
          direction: 'both' // Simplified for now
        });
      } else {
        unassignedIds.push(player.id);
        // Create unassigned record
        newAssignments.push({
          id: generateId(),
          eventId,
          driverId: 'unassigned',
          playerId: player.id,
          direction: 'both'
        });
      }
    }

    // Save to DB
    const otherAssignments = DB.get('assignments').filter((a:any) => a.eventId !== eventId);
    DB.set('assignments', [...otherAssignments, ...newAssignments]);
    refreshData();
    setTab('carpool');
    alert(`Carpool generated. ${unassignedIds.length} players unassigned.`);
  };

  // --- RENDER ---

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="secondary" onClick={onBack} className="px-2"><ChevronLeft /></Button>
        <div>
          <h2 className="text-xl font-bold text-[#173f7f]">{event.name}</h2>
          <p className="text-sm text-slate-500">{formatDate(event.dateTime)} • {event.locationName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-lg shadow-sm border p-1">
        {['attendance', 'drivers', 'carpool'].map((t: any) => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${tab === t ? 'bg-[#173f7f] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border p-4 min-h-[400px]">
        
        {/* ATTENDANCE */}
        {tab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Who is going?</h3>
              <Button onClick={saveAttendance} variant="accent"><Save size={16} /> Save Changes</Button>
            </div>
            <div className="divide-y">
              {allPlayers.map((p: Player) => {
                const att = localAttendance.find(a => a.playerId === p.id) || { isGoing: false, needsRide: true };
                return (
                  <div key={p.id} className={`py-3 flex items-center justify-between ${att.isGoing ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAttendance(p.id, 'isGoing')} className={`w-6 h-6 rounded border flex items-center justify-center ${att.isGoing ? 'bg-[#1abc54] border-[#1abc54]' : 'bg-white'}`}>
                        {att.isGoing && <Check size={14} className="text-white" />}
                      </button>
                      <span className="font-medium">{p.name}</span>
                      {p.needsChildSeat && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">Child Seat</span>}
                    </div>
                    {att.isGoing && (
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={att.needsRide} onChange={() => toggleAttendance(p.id, 'needsRide')} className="w-4 h-4" />
                        Needs Ride
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DRIVERS */}
        {tab === 'drivers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Available Drivers</h3>
              <Button onClick={saveDrivers} variant="accent"><Save size={16} /> Save Changes</Button>
            </div>
            <div className="space-y-3">
              {allDrivers.map((d: Driver) => {
                const ed = localEventDrivers.find(x => x.driverId === d.id);
                const isDriving = ed?.isDriving || false;
                return (
                  <div key={d.id} className={`border rounded-lg p-3 transition-colors ${isDriving ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                       <button onClick={() => toggleDriver(d.id, 'isDriving')} className={`w-6 h-6 rounded border flex items-center justify-center ${isDriving ? 'bg-[#173f7f] border-[#173f7f]' : 'bg-white'}`}>
                        {isDriving && <Check size={14} className="text-white" />}
                      </button>
                      <div>
                        <div className="font-bold text-slate-800">{d.name}</div>
                        <div className="text-xs text-slate-500">{d.maxSeatsTotal} seats • {d.maxChildSeats} child seats</div>
                      </div>
                    </div>
                    {isDriving && (
                      <div className="ml-9 flex gap-4 text-sm">
                         <div className="flex items-center gap-2">
                            <span className="text-slate-600">Direction:</span>
                            <select 
                              value={ed?.direction || 'both'} 
                              onChange={(e) => toggleDriver(d.id, 'direction', e.target.value)}
                              className="border rounded px-2 py-1 bg-white text-sm"
                            >
                              <option value="both">Both Ways</option>
                              <option value="to">To Event Only</option>
                              <option value="from">From Event Only</option>
                            </select>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CARPOOL BOARD */}
        {tab === 'carpool' && (
          <CarpoolBoard 
            eventId={eventId}
            assignments={assignments} 
            eventDrivers={eventDrivers} 
            players={allPlayers} 
            drivers={allDrivers}
            onGenerate={generateCarpool}
            refreshData={refreshData}
          />
        )}

      </div>
    </div>
  );
};

// --- CARPOOL BOARD (DnD UI) ---

const CarpoolBoard = ({ eventId, assignments, eventDrivers, players, drivers, onGenerate, refreshData }: any) => {
  const activeDrivers = eventDrivers.filter((d:any) => d.isDriving);
  
  // Drag and Drop State
  const [draggedPlayerId, setDraggedPlayerId] = useState<ID | null>(null);

  const handleDrop = (targetDriverId: ID) => {
    if (!draggedPlayerId) return;

    // Remove old assignment
    const filtered = assignments.filter((a:any) => a.playerId !== draggedPlayerId);
    
    // Add new assignment
    const newAssign = {
      id: generateId(),
      eventId,
      driverId: targetDriverId,
      playerId: draggedPlayerId,
      direction: 'both'
    };

    // Update DB
    const otherEvents = DB.get('assignments').filter((a:any) => a.eventId !== eventId);
    DB.set('assignments', [...otherEvents, ...filtered, newAssign]);
    
    setDraggedPlayerId(null);
    refreshData();
  };

  const getDriverLoad = (did: ID) => assignments.filter((a:any) => a.driverId === did).length;
  const getUnassigned = () => assignments.filter((a:any) => a.driverId === 'unassigned');

  // If no assignments exist at all for this event, show prompt
  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <Car size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">No Carpool Yet</h3>
        <p className="text-slate-500 mb-6">Setup attendance and drivers, then generate.</p>
        <Button onClick={onGenerate}>Generate Carpool</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          <span className="font-bold text-[#173f7f]">{assignments.length}</span> passengers total
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onGenerate} className="text-xs">Re-Calculate</Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar items-start">
        
        {/* UNASSIGNED COLUMN */}
        <div 
          className="min-w-[250px] bg-red-50 rounded-xl border-2 border-red-100 flex-shrink-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('unassigned')}
        >
          <div className="p-3 border-b border-red-100 font-bold text-red-800 flex justify-between">
            <span>Unassigned</span>
            <span className="bg-white px-2 rounded-full text-xs py-0.5">{getUnassigned().length}</span>
          </div>
          <div className="p-2 space-y-2 min-h-[100px]">
            {getUnassigned().map((a:any) => {
              const p = players.find((x:any) => x.id === a.playerId);
              if(!p) return null;
              return (
                <PlayerCard key={p.id} player={p} onDragStart={() => setDraggedPlayerId(p.id)} />
              );
            })}
          </div>
        </div>

        {/* DRIVER COLUMNS */}
        {activeDrivers.map((ed:any) => {
          const d = drivers.find((x:any) => x.id === ed.driverId);
          const assigned = assignments.filter((a:any) => a.driverId === d.id);
          const isFull = assigned.length >= ed.availableSeatsTotal;
          
          return (
            <div 
              key={d.id} 
              className={`min-w-[250px] bg-white rounded-xl border-2 flex-shrink-0 transition-colors ${isFull ? 'border-slate-200' : 'border-blue-200'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(d.id)}
            >
              <div className="p-3 border-b flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <div>
                  <div className="font-bold text-slate-800">{d.name}</div>
                  <div className="text-xs text-slate-500">{assigned.length} / {ed.availableSeatsTotal} seats</div>
                </div>
                {isFull && <Check size={16} className="text-green-500" />}
              </div>
              <div className="p-2 space-y-2 min-h-[100px]">
                {assigned.map((a:any) => {
                  const p = players.find((x:any) => x.id === a.playerId);
                  if(!p) return null;
                  return (
                    <PlayerCard key={p.id} player={p} onDragStart={() => setDraggedPlayerId(p.id)} />
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

const PlayerCard = ({ player, onDragStart }: any) => (
  <div 
    draggable 
    onDragStart={onDragStart}
    className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 group"
  >
    <div className="flex justify-between items-start">
      <div className="font-medium text-sm text-slate-800">{player.name}</div>
      <GripVertical size={14} className="text-slate-300" />
    </div>
    <div className="flex gap-1 mt-1">
      {player.needsChildSeat && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Booster</span>}
      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{player.teamName || 'Team'}</span>
    </div>
  </div>
);

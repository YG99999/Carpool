import React, { useState, useEffect } from 'react';

// Inline Icons to ensure zero-dependency
const Users = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const Car = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M2 12h12"/></svg>
);
const AlertCircle = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
const CheckCircle = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const Play = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const ArrowRight = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const ArrowLeft = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

export default function App() {
  // --- PERSISTENCE LOGIC ---
  const [view, setView] = useState(() => localStorage.getItem('tc_view') || 'setup1');
  const [people, setPeople] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_people');
      if (saved) {
        // Migration check: ensure new blockedWith field exists if loading old data
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({
          ...p,
          blockedWith: p.blockedWith || [], // Ensure array exists
          isDrivingSelfOnly: p.isDrivingSelfOnly || false, // Ensure self-only flag exists
          // Remove legacy allowedWith if it exists to avoid confusion
          allowedWith: undefined 
        }));
      }
      return [];
    } catch (e) { return []; }
  });
  
  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_assignments');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState('');

  // Save changes
  useEffect(() => { localStorage.setItem('tc_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('tc_people', JSON.stringify(people)); }, [people]);
  useEffect(() => { 
    if (assignments) localStorage.setItem('tc_assignments', JSON.stringify(assignments));
    else localStorage.removeItem('tc_assignments');
  }, [assignments]);


  const addPerson = () => {
    if (!newPersonName.trim()) return;
    const newPerson = {
      id: Date.now(),
      name: newPersonName.trim(),
      hasLicense: false,
      seats: 4,
      blockedWith: [], // Changed from allowedWith to blockedWith
      mustRideWith: null,
      isDrivingToday: false,
      isDrivingSelfOnly: false, // New field for "Self Only" drivers
      isGoingToday: false
    };
    setPeople([newPerson, ...people]);
    setNewPersonName('');
  };

  const updatePerson = (id: any, field: any, value: any) => {
    setPeople(people.map((p: any) => {
      if (p.id === id) {
        // If blocking a driver that is the "mustRideWith", clear "mustRideWith"
        if (field === 'blockedWith' && p.mustRideWith) {
          const newBlocked = Array.isArray(value) ? value : [];
          if (newBlocked.includes(p.mustRideWith)) {
            return { ...p, [field]: value, mustRideWith: null };
          }
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const togglePersonInArray = (personId: any, field: 'blockedWith', targetId: any) => {
    setPeople(people.map((p: any) => {
      if (p.id === personId) {
        const arr = p[field] || [];
        const newArr = arr.includes(targetId)
          ? arr.filter((id: any) => id !== targetId) // Unblock
          : [...arr, targetId]; // Block
        
        // If blocking the mustRideWith driver, clear the preference
        if (p.mustRideWith === targetId && newArr.includes(targetId)) {
          return { ...p, [field]: newArr, mustRideWith: null };
        }
        
        return { ...p, [field]: newArr };
      }
      return p;
    }));
  };

  const organizeCarpool = () => {
    setError('');
    
    const drivers = people.filter((p: any) => p.isDrivingToday && p.hasLicense);
    const goingPeople = people.filter((p: any) => p.isGoingToday);
    const passengers = goingPeople.filter((p: any) => !p.isDrivingToday);
    
    if (drivers.length === 0) {
      setError('Pick at least one driver!');
      setAssignments(null);
      return;
    }

    // Calculate total seats excluding "Self Only" drivers' capacity
    const totalSeats = drivers.reduce((sum: any, d: any) => {
      return sum + (d.isDrivingSelfOnly ? 0 : d.seats);
    }, 0);
    
    if (passengers.length > totalSeats) {
      setError(`Not enough seats! ${passengers.length} people but only ${totalSeats} seats available.`);
    }

    // Initialize groups
    // If driving self only, seatsLeft is 0
    const groups = drivers.map((d: any) => ({
      driver: d,
      passengers: [],
      seatsLeft: d.isDrivingSelfOnly ? 0 : d.seats
    }));

    const assignedIds = new Set();
    const leftOut: any[] = [];

    // --- PASS 1: Assign "Must Ride With" preferences ---
    // If preference is available, assign them. If not, they wait for Pass 2.
    passengers.forEach((p: any) => {
      if (p.mustRideWith) {
        const targetGroup = groups.find((g: any) => g.driver.id === p.mustRideWith);
        
        // Check if driver is going, has seats, and is NOT blocked (sanity check)
        if (targetGroup && targetGroup.seatsLeft > 0) {
           const isBlocked = (p.blockedWith || []).includes(targetGroup.driver.id);
           if (!isBlocked) {
             targetGroup.passengers.push(p);
             targetGroup.seatsLeft--;
             assignedIds.add(p.id);
           }
        }
      }
    });

    // --- PASS 2: Assign remaining passengers ---
    passengers.forEach((p: any) => {
      if (assignedIds.has(p.id)) return;

      // Find first available driver that isn't blocked
      const validGroup = groups.find((g: any) => {
        if (g.seatsLeft <= 0) return false;
        
        // Check blocklist
        const isBlocked = (p.blockedWith || []).includes(g.driver.id);
        if (isBlocked) return false;

        return true;
      });

      if (validGroup) {
        validGroup.passengers.push(p);
        validGroup.seatsLeft--;
        assignedIds.add(p.id);
      } else {
        leftOut.push(p);
      }
    });

    setAssignments({ 
      groups: groups.filter((g: any) => g.passengers.length > 0 || g.driver.isGoingToday), 
      leftOut 
    });
  };

  const movePassenger = (passengerId: any, fromCarIndex: any, toCarIndex: any) => {
    if (!assignments) return;
    
    const newGroups = [...assignments.groups];
    const fromCar = newGroups[fromCarIndex];
    const toCar = toCarIndex === -1 ? null : newGroups[toCarIndex];
    
    const passengerIndex = fromCar.passengers.findIndex((p: any) => p.id === passengerId);
    if (passengerIndex === -1) return;
    
    const passenger = fromCar.passengers[passengerIndex];
    
    if (toCarIndex === -1) {
      fromCar.passengers.splice(passengerIndex, 1);
      fromCar.seatsLeft++;
      setAssignments({
        groups: newGroups,
        leftOut: [...assignments.leftOut, passenger]
      });
      return;
    }
    
    // Check if target car can accept passenger (including self-only restriction)
    // Actually, if a car is 'self only', seatsLeft is initialized to 0.
    // If we want to allow manual override (drag and drop into self only car), 
    // we would need to check if the user INTENDS to break the rule.
    // For now, let's respect the seat limit strictly.
    if (toCar && toCar.seatsLeft > 0) {
      fromCar.passengers.splice(passengerIndex, 1);
      fromCar.seatsLeft++;
      toCar.passengers.push(passenger);
      toCar.seatsLeft--;
      setAssignments({ ...assignments, groups: newGroups });
    }
  };

  const moveFromLeftOut = (passengerId: any, toCarIndex: any) => {
    if (!assignments) return;
    
    const newGroups = [...assignments.groups];
    const toCar = newGroups[toCarIndex];
    const passenger = assignments.leftOut.find((p: any) => p.id === passengerId);
    
    if (!passenger || !toCar || toCar.seatsLeft <= 0) return;
    
    toCar.passengers.push(passenger);
    toCar.seatsLeft--;
    setAssignments({
      groups: newGroups,
      leftOut: assignments.leftOut.filter((p: any) => p.id !== passengerId)
    });
  };

  const drivers = people.filter((p: any) => p.hasLicense);
  const goingCount = people.filter((p: any) => p.isGoingToday).length;
  const drivingCount = people.filter((p: any) => p.isDrivingToday && p.hasLicense).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Car className="text-indigo-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">TeamCarpool</h1>
              <p className="text-xs text-gray-600">Setup once, organize fast</p>
            </div>
          </div>

          {/* Nav */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setView('setup1')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                view === 'setup1'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Add People
            </button>
            <button
              onClick={() => setView('setup2')}
              disabled={people.length === 0}
              className={`flex-1 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                view === 'setup2'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Set Rules
            </button>
            <button
              onClick={() => setView('organize')}
              disabled={people.length === 0}
              className={`flex-1 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                view === 'organize'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Play size={14} className="inline mr-1" />
              Organize
            </button>
          </div>

          {/* STEP 1: Add People */}
          {view === 'setup1' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                  placeholder="Name"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                />
                <button
                  onClick={addPerson}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Add
                </button>
              </div>

              {people.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {people.map((p: any) => (
                      <div key={p.id} className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center gap-3">
                        <span className="flex-1 font-semibold text-gray-800">{p.name}</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.hasLicense}
                            onChange={(e) => updatePerson(p.id, 'hasLicense', e.target.checked)}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm text-gray-700">Driver</span>
                        </label>
                        {p.hasLicense && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="8"
                              value={p.seats}
                              onChange={(e) => updatePerson(p.id, 'seats', parseInt(e.target.value) || 4)}
                              className="w-12 px-2 py-1 text-sm border-2 border-gray-300 rounded text-center text-gray-900 bg-white"
                            />
                            <span className="text-xs text-gray-600">seats</span>
                          </div>
                        )}
                        <button
                          onClick={() => setPeople(people.filter((per: any) => per.id !== p.id))}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setView('setup2')}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center justify-center gap-2"
                  >
                    Next: Set Rules
                    <ArrowRight size={18} />
                  </button>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add people to get started</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Set Rules */}
          {view === 'setup2' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Everyone rides with anyone by default. <span className="text-red-600 font-bold">Tap a driver to block them</span> for a specific person.
              </p>
              
              {people.map((p: any) => {
                const potentialDrivers = drivers.filter((d: any) => d.id !== p.id);
                // Filter allowed drivers for the "Must ride with" list
                const allowedDriversList = potentialDrivers.filter((d: any) => !(p.blockedWith || []).includes(d.id));
                
                return (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="font-semibold text-gray-800 mb-2">{p.name}</div>
                    
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs text-gray-600 mb-1.5 block font-bold">
                          Do NOT ride with:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {potentialDrivers.length > 0 ? (
                            potentialDrivers.map((d: any) => {
                              const isBlocked = (p.blockedWith || []).includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  onClick={() => togglePersonInArray(p.id, 'blockedWith', d.id)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    isBlocked
                                      ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  {d.name} {isBlocked && '✕'}
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-xs text-gray-500 italic">No other drivers</span>
                          )}
                        </div>
                      </div>

                      {allowedDriversList.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1.5 block">
                            Prefer to ride with: <span className="text-gray-500">(Optional)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {allowedDriversList.map((d: any) => (
                              <button
                                key={d.id}
                                onClick={() => updatePerson(p.id, 'mustRideWith', p.mustRideWith === d.id ? null : d.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                  p.mustRideWith === d.id
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {d.name} {p.mustRideWith === d.id && '✓'}
                              </button>
                            ))}
                          </div>
                          {p.mustRideWith && <div className="text-[10px] text-gray-500 mt-1">* If {people.find((x:any) => x.id === p.mustRideWith)?.name} is full or not driving, they will ride with someone else.</div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-2">
                <button
                  onClick={() => setView('setup1')}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={() => setView('organize')}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Done - Organize Trips
                </button>
              </div>
            </div>
          )}

          {/* ORGANIZE VIEW */}
          {view === 'organize' && (
            <div className="space-y-4">
              {people.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={40} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">Add people first</p>
                  <button
                    onClick={() => setView('setup1')}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    Add People
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      Who's going and driving?
                    </div>
                    <div className="space-y-1.5">
                      {people.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 bg-white p-2 rounded">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.isGoingToday}
                              onChange={(e) => updatePerson(p.id, 'isGoingToday', e.target.checked)}
                              className="w-4 h-4 text-green-600"
                            />
                            <span className="font-medium text-sm text-gray-800">{p.name}</span>
                          </label>
                          
                          {p.hasLicense && p.isGoingToday && (
                            <div className="ml-auto flex items-center gap-3">
                                {p.isDrivingToday && (
                                    <label className="flex items-center gap-1 cursor-pointer" title="Driver is not taking passengers">
                                        <input
                                            type="checkbox"
                                            checked={p.isDrivingSelfOnly || false}
                                            onChange={(e) => updatePerson(p.id, 'isDrivingSelfOnly', e.target.checked)}
                                            className="w-3 h-3 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wide">Self Only</span>
                                    </label>
                                )}
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={p.isDrivingToday}
                                    onChange={(e) => updatePerson(p.id, 'isDrivingToday', e.target.checked)}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-700 font-medium">Driving ({p.seats})</span>
                                </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-600 flex gap-3">
                      <span>Going: {goingCount}</span>
                      <span>Driving: {drivingCount}</span>
                    </div>
                  </div>

                  <button
                    onClick={organizeCarpool}
                    disabled={drivingCount === 0 || goingCount === 0}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {assignments ? 'Re-organize Carpool' : 'Organize Carpool'}
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {assignments && (
                    <div className="space-y-2.5 pt-3 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2 p-2.5 bg-green-50 border-2 border-green-200 rounded-lg text-green-700">
                        <CheckCircle size={18} />
                        <span className="font-semibold text-sm">All set!</span>
                      </div>

                      {assignments.groups.map((g: any, carIndex: any) => (
                        <div key={carIndex} className="bg-indigo-50 border-2 border-indigo-300 rounded-lg overflow-hidden">
                          <div className="bg-indigo-100 px-3 py-2 flex items-center gap-2">
                            <Car size={16} className="text-indigo-700" />
                            <span className="font-bold text-sm text-indigo-900">Car {carIndex + 1}: {g.driver.name}</span>
                            <span className="text-xs text-indigo-700 ml-auto">
                              {g.driver.isDrivingSelfOnly 
                                ? <span className="text-orange-600 font-bold text-[10px] uppercase bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">Self Only</span> 
                                : `${g.passengers.length}/${g.driver.seats}`
                              }
                            </span>
                          </div>
                          {g.passengers.length > 0 && (
                            <div className="p-2 space-y-1">
                              {g.passengers.map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded">
                                  <span className="flex-1 font-medium text-sm text-gray-800">{p.name}</span>
                                  <div className="flex gap-1">
                                    {assignments.groups.map((targetCar: any, targetIndex: any) => 
                                      targetIndex !== carIndex && targetCar.seatsLeft > 0 && (
                                        <button
                                          key={targetIndex}
                                          onClick={() => movePassenger(p.id, carIndex, targetIndex)}
                                          className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium"
                                          title={`Move to Car ${targetIndex + 1}`}
                                        >
                                          →{targetIndex + 1}
                                        </button>
                                      )
                                    )}
                                    <button
                                      onClick={() => movePassenger(p.id, carIndex, -1)}
                                      className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
                                      title="Remove from car"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {assignments.leftOut.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg overflow-hidden">
                          <div className="bg-red-100 px-3 py-2 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-700" />
                            <span className="font-bold text-sm text-red-900">Not assigned</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {assignments.leftOut.map((p: any) => (
                              <div key={p.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded">
                                <span className="flex-1 font-medium text-sm text-red-700">{p.name}</span>
                                <div className="flex gap-1">
                                  {assignments.groups.map((car: any, index: any) => 
                                    car.seatsLeft > 0 && (
                                      <button
                                        key={index}
                                        onClick={() => moveFromLeftOut(p.id, index)}
                                        className="px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium"
                                        title={`Add to Car ${index + 1}`}
                                      >
                                        +Car{index + 1}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
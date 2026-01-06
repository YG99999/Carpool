import React, { useState } from 'react';
import { Users, Car, AlertCircle, CheckCircle, Play, ArrowRight, ArrowLeft } from 'lucide-react';

export default function CarpoolOrganizer() {
  const [view, setView] = useState('setup1');
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState('');

  const addPerson = () => {
    if (!newPersonName.trim()) return;
    const newPerson = {
      id: Date.now(),
      name: newPersonName.trim(),
      hasLicense: false,
      seats: 4,
      allowedWith: [],
      mustRideWith: null,
      isDrivingToday: false,
      isGoingToday: false
    };
    setPeople([newPerson, ...people]);
    setNewPersonName('');
  };

  const updatePerson = (id, field, value) => {
    setPeople(people.map(p => {
      if (p.id === id) {
        // If clearing allowedWith and mustRideWith depends on it, clear mustRideWith too
        if (field === 'allowedWith' && p.mustRideWith) {
          const newAllowed = Array.isArray(value) ? value : [];
          if (!newAllowed.includes(p.mustRideWith)) {
            return { ...p, [field]: value, mustRideWith: null };
          }
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const togglePersonInArray = (personId, field, targetId) => {
    setPeople(people.map(p => {
      if (p.id === personId) {
        const arr = p[field];
        const newArr = arr.includes(targetId)
          ? arr.filter(id => id !== targetId)
          : [...arr, targetId];
        
        // If removing a driver that is the mustRideWith, clear mustRideWith
        if (field === 'allowedWith' && p.mustRideWith === targetId && !newArr.includes(targetId)) {
          return { ...p, [field]: newArr, mustRideWith: null };
        }
        
        return { ...p, [field]: newArr };
      }
      return p;
    }));
  };

  const organizeCarpool = () => {
    setError('');
    
    const drivers = people.filter(p => p.isDrivingToday && p.hasLicense);
    const goingPeople = people.filter(p => p.isGoingToday);
    const passengers = goingPeople.filter(p => !p.isDrivingToday);
    
    if (drivers.length === 0) {
      setError('Pick at least one driver!');
      setAssignments(null);
      return;
    }

    const totalSeats = drivers.reduce((sum, d) => sum + d.seats, 0);
    
    if (passengers.length > totalSeats) {
      setError(`Not enough seats! ${passengers.length} people but only ${totalSeats} seats available.`);
    }

    const groups = drivers.map(d => ({
      driver: d,
      passengers: [],
      seatsLeft: d.seats
    }));

    const assigned = new Set();
    const leftOut = [];

    // First pass: assign people who MUST ride with specific driver
    passengers.forEach(p => {
      if (assigned.has(p.id) || !p.mustRideWith) return;
      
      const requiredDriverGroup = groups.find(g => g.driver.id === p.mustRideWith);
      
      if (requiredDriverGroup && requiredDriverGroup.seatsLeft > 0) {
        requiredDriverGroup.passengers.push(p);
        requiredDriverGroup.seatsLeft--;
        assigned.add(p.id);
      } else {
        leftOut.push(p);
        assigned.add(p.id);
      }
    });

    // Second pass: assign remaining passengers
    passengers.forEach(p => {
      if (assigned.has(p.id)) return;

      for (const group of groups) {
        if (group.seatsLeft > 0) {
          const allowed = p.allowedWith.length === 0 || p.allowedWith.includes(group.driver.id);

          if (allowed) {
            group.passengers.push(p);
            group.seatsLeft--;
            assigned.add(p.id);
            break;
          }
        }
      }

      if (!assigned.has(p.id)) {
        leftOut.push(p);
      }
    });

    setAssignments({ 
      groups: groups.filter(g => g.passengers.length > 0 || g.driver.isGoingToday), 
      leftOut 
    });
  };

  const movePassenger = (passengerId, fromCarIndex, toCarIndex) => {
    if (!assignments) return;
    
    const newGroups = [...assignments.groups];
    const fromCar = newGroups[fromCarIndex];
    const toCar = toCarIndex === -1 ? null : newGroups[toCarIndex];
    
    const passengerIndex = fromCar.passengers.findIndex(p => p.id === passengerId);
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
    
    if (toCar && toCar.seatsLeft > 0) {
      fromCar.passengers.splice(passengerIndex, 1);
      fromCar.seatsLeft++;
      toCar.passengers.push(passenger);
      toCar.seatsLeft--;
      setAssignments({ ...assignments, groups: newGroups });
    }
  };

  const moveFromLeftOut = (passengerId, toCarIndex) => {
    if (!assignments) return;
    
    const newGroups = [...assignments.groups];
    const toCar = newGroups[toCarIndex];
    const passenger = assignments.leftOut.find(p => p.id === passengerId);
    
    if (!passenger || !toCar || toCar.seatsLeft <= 0) return;
    
    toCar.passengers.push(passenger);
    toCar.seatsLeft--;
    setAssignments({
      groups: newGroups,
      leftOut: assignments.leftOut.filter(p => p.id !== passengerId)
    });
  };

  const drivers = people.filter(p => p.hasLicense);
  const goingCount = people.filter(p => p.isGoingToday).length;
  const drivingCount = people.filter(p => p.isDrivingToday && p.hasLicense).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Car className="text-indigo-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Carpool</h1>
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
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    {people.map(p => (
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
                              className="w-12 px-2 py-1 text-sm border-2 border-gray-300 rounded text-center"
                            />
                            <span className="text-xs text-gray-600">seats</span>
                          </div>
                        )}
                        <button
                          onClick={() => setPeople(people.filter(per => per.id !== p.id))}
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
              <p className="text-sm text-gray-600">Optional: Set driver restrictions for each person</p>
              
              {people.map(p => {
                const allowedDriversList = drivers.filter(d => d.id !== p.id && p.allowedWith.includes(d.id));
                
                return (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="font-semibold text-gray-800 mb-2">{p.name}</div>
                    
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs text-gray-600 mb-1.5 block">
                          Can ride with: <span className="text-gray-500">(leave empty if anyone is fine)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {drivers.filter(d => d.id !== p.id).length > 0 ? (
                            drivers.filter(d => d.id !== p.id).map(d => (
                              <button
                                key={d.id}
                                onClick={() => togglePersonInArray(p.id, 'allowedWith', d.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  p.allowedWith.includes(d.id)
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {d.name}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500 italic">No drivers yet</span>
                          )}
                        </div>
                      </div>

                      {allowedDriversList.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1.5 block">
                            Must ride with: <span className="text-gray-500">(pick one if required)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {allowedDriversList.map(d => (
                              <button
                                key={d.id}
                                onClick={() => updatePerson(p.id, 'mustRideWith', p.mustRideWith === d.id ? null : d.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  p.mustRideWith === d.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
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
                      {people.map(p => (
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
                            <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.isDrivingToday}
                                onChange={(e) => updatePerson(p.id, 'isDrivingToday', e.target.checked)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-xs text-gray-700">Driving ({p.seats})</span>
                            </label>
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

                      {assignments.groups.map((g, carIndex) => (
                        <div key={carIndex} className="bg-indigo-50 border-2 border-indigo-300 rounded-lg overflow-hidden">
                          <div className="bg-indigo-100 px-3 py-2 flex items-center gap-2">
                            <Car size={16} className="text-indigo-700" />
                            <span className="font-bold text-sm text-indigo-900">Car {carIndex + 1}: {g.driver.name}</span>
                            <span className="text-xs text-indigo-700 ml-auto">
                              {g.passengers.length}/{g.driver.seats}
                            </span>
                          </div>
                          {g.passengers.length > 0 && (
                            <div className="p-2 space-y-1">
                              {g.passengers.map(p => (
                                <div key={p.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded">
                                  <span className="flex-1 font-medium text-sm text-gray-800">{p.name}</span>
                                  <div className="flex gap-1">
                                    {assignments.groups.map((targetCar, targetIndex) => 
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
                            {assignments.leftOut.map(p => (
                              <div key={p.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded">
                                <span className="flex-1 font-medium text-sm text-red-700">{p.name}</span>
                                <div className="flex gap-1">
                                  {assignments.groups.map((car, index) => 
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
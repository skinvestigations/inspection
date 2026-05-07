import { useState, useEffect, useRef, useCallback } from "react";

// ── Detect Electron vs Browser ─────────────────────────────────
const IS_ELECTRON = !!(window.electronAPI?.isElectron);

// ── Storage abstraction (Electron file system OR localStorage) ──
const Storage = {
  async load() {
    if (IS_ELECTRON) {
      const r = await window.electronAPI.loadData();
      return r.success ? r.data : null;
    }
    try { return JSON.parse(localStorage.getItem('aircraft_inspection_v3') || 'null'); } catch { return null; }
  },
  async save(data) {
    if (IS_ELECTRON) {
      await window.electronAPI.saveData(data);
    } else {
      // Strip photo base64 from localStorage to avoid quota issues
      try { localStorage.setItem('aircraft_inspection_v3', JSON.stringify(data)); } catch {}
    }
  },
  async reset() {
    if (IS_ELECTRON) { await window.electronAPI.resetData(); }
    else { localStorage.removeItem('aircraft_inspection_v3'); }
  },
  async exportReport(html) {
    if (IS_ELECTRON) {
      return window.electronAPI.exportReport(html);
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `inspection_report_${new Date().toISOString().slice(0,10)}.html`; a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }
  },
  async printReport(html) {
    if (IS_ELECTRON) { return window.electronAPI.printReport(html); }
    else { const w = window.open('', '_blank'); w.document.write(html); w.print(); return { success: true }; }
  },
  async openDataFolder() {
    if (IS_ELECTRON) window.electronAPI.openDataFolder();
  },
};

// ── Checklist Data ─────────────────────────────────────────────
const CHECKLIST_DATA = [
  {
    section: "1. Operational Inspection",
    items: [
      { id: "1.1", text: "Starter – Check for proper operation, unusual noises and dragging. Check starter energized light (if installed) and/or load meter to ensure starter disengagement when the starter switch is released." },
      { id: "1.2", text: "Fuel Pressure or Flow – check operation within normal limits." },
      { id: "1.3", text: "Cylinder Head Temperature – Check for proper operations, temperature and fluctuations." },
      { id: "1.4", text: "Alternator – check for proper output and unusual noises." },
      { id: "1.5", text: "Propeller – Check for smoothness of operation." },
      { id: "1.6", text: "Oil Pressure and Temperature – Check for proper pressure, temperature limits and unusual fluctuations." },
      { id: "1.7", text: "Magnetos – Check the performance of the magneto as outlined in the Pilot's Operating Handbook." },
      { id: "1.8", text: "Power Check – Refer to NORMAL PROCEDURES in the Pilot's Operating Handbook." },
      { id: "1.9", text: "Voltmeter – Check for proper indication and unusual fluctuations." },
      { id: "1.10", text: "Heating and Ventilating System – Check for proper operation, heat and airflow output. Check controls for freedom of operation." },
      { id: "1.11", text: "Firewall Shutoff Valve – Check for proper operation and freedom of movement." },
      { id: "1.12", text: "Induction Airbox, Valve, Doors, and Controls – Remove air filter and inspect hinges, doors, seals, and attaching parts for wear and security. Check operation." },
      { id: "1.13", text: "Oil Cooler – Check for obstructions, leaks, and security of attachment. Forward line on engine adapter plate must go to lower port on cooler." },
      { id: "1.14", text: "Check latches, hinges, and seals for condition, operation, and security of attachment." },
      { id: "1.15", text: "Idle RPM and Mixture Settings – Check for both proper RPM and mixture settings. Check controls for freedom of operation." },
      { id: "1.16", text: "Ignition Switch – Rotate through OFF position to extreme limit. If engine continues to run past OFF, switch is abnormal and must be replaced." },
      { id: "1.17", text: "All Engine Controls – With engine running, check for proper operational limits, engine response and rigging. Check friction locks for proper operation." },
      { id: "1.18", text: "Fuel Quantity Gages – Check for proper operation and unusual fluctuations." },
      { id: "1.19", text: "Auxiliary Fuel Pump – Check pump for proper operation, unusual noise and fluctuations." },
      { id: "1.20", text: "Fuel Tank Selector Valves – Check for proper operation and feel for positive detent and proper placarding." },
      { id: "1.21", text: "All Lights – Check for condition, attachment, cracked or broken lenses. Check switches, knobs, and circuit breakers for looseness and operation." },
      { id: "1.22", text: "Check electric pitch control system for proper operation. Trim up should move tab down. Trim down should move tab up." },
      { id: "1.23", text: "Radio Operation – Check for proper operations, security of switches and knobs." },
      { id: "1.24", text: "Flaps – check for noisy operation, full travel and proper installation." },
      { id: "1.25", text: "Flight Instruments – Check for condition and proper operation." },
      { id: "1.26", text: "Brakes – Check for condition and wear, ease of operation. Check for unusual brake chatter." },
      { id: "1.27", text: "Emergency Locator Transmitter – Check for proper operation and assure that the ELT is armed when the airplane is returned to service." },
      { id: "1.28", text: "Switches, Circuit Breakers – Check for proper operation." },
      { id: "1.29", text: "Flight and Trim Controls – Check freedom of movement and proper operation through full travel with and without flaps extended." },
    ]
  },
  {
    section: "2. Power Plant",
    items: [
      { id: "2.1", text: "Cowling Skin – check for deformation and obvious damage or cracks. Check for loose or missing rivets." },
      { id: "2.2", text: "Cowling Structure – Check for cracks and deformation. Check for loose or missing rivets and concealed damage." },
      { id: "2.3", text: "Cowling – Check for condition, security and adjustment of latches. Open upper cowling and clean. Inspect for cracks." },
      { id: "2.4", text: "Spark Plugs – Clean, inspect, regap to 0.022, test and replace as necessary. Tighten to 8 ft-lbs. Check ignition harness condition and attachment." },
      { id: "2.5", text: "Compression – Perform differential compression test. Must be better than 60/80." },
      { id: "2.6", text: "Battery – Inspect, clean and tighten connections. Check for security and proper attachment. Check for corrosion." },
      { id: "2.7", text: "Plumbing – Inspect plumbing and accessories for condition and attachment. Check clearance and secure against chafing." },
      { id: "2.8", text: "Brake Fluid Reservoir – Check for security, attachment, open vent, proper fluid levels and leaks." },
      { id: "2.9", text: "Engine Sump – Check for cracks, leaks, proper fluid level, deformation and security." },
      { id: "2.10", text: "Crankcase – Check security of crankcase half bolts. Torque seal should be solid." },
      { id: "2.11", text: "Oil Sump Drains and Filter – Remove oil filter. Inspect oil sump drains and install new filter. Empty oil overflow catch can." },
      { id: "2.12", text: "Oil Cooler – Check oil cooler, lines and fittings for condition, security, chafing and leaks. Forward output on engine adapter plate must go to lower cooler port." },
      { id: "2.13", text: "Propeller and Mounting Bolts – Check condition and security. Inspect blades for cracks, dents, nicks, erosion, corrosion. Check torque: wood props 17 ft-lbs, EZ-pitch carbon prop 15 ft-lbs." },
      { id: "2.14", text: "Propeller Spinner – Check for deformation, security and cracks." },
      { id: "2.15", text: "Propeller Hub – Check for cracks, excessively leaking seals and condition." },
      { id: "2.16", text: "Alternator – Check for condition and attachment. Check wiring for proper attachment and possible chafing. Check for unusual noise." },
      { id: "2.17", text: "Starter – Check for condition, attachment and chafed or loose wires." },
      { id: "2.18", text: "Magnetos – Check ignition harness for proper connection, security and fraying." },
      { id: "2.19", text: "Cylinders and Baffles – Check cylinders and exhaust manifold for obvious leaks, security and cracks. Check baffles for cracks and security." },
      { id: "2.20", text: "Exhaust System – Check for deformation, security, cracks, leaks, loose or missing nuts and clamps. Check for thin wall condition." },
      { id: "2.21", text: "Firewall – Check for wrinkles, damage or cracks. Check all electrical and control access holes for proper sealing." },
      { id: "2.22", text: "Hose and Ducts – Check all fuel, oil and air hose or duct for leakage, cracks, deterioration and damage. Check fittings for security." },
      { id: "2.23", text: "Engine Accessories – Check for condition, security and leaks. Check wiring: starter solenoid, regulator rectifier, alternator wires, engine grounding straps." },
      { id: "2.24", text: "Engine Mounts – Check for cracks, corrosion and security. Inspect rubber cushions, mount bolts and nuts. Torque 8 ft-lbs on 1/4\" AN4 bolts through rubbers." },
      { id: "2.25", text: "Cabin Heater System – Check for cracks, distortion, corrosion, leaks and obstructions." },
      { id: "2.26", text: "Engine Controls – Check controls for condition, attachment, alignment, and rigging. Throttle secondary idle stop ferrule must be set against cable adjuster nut at warm 850 RPM idle." },
      { id: "2.27", text: "Ignition Harness – Inspect for fraying and attachment." },
      { id: "2.28", text: "Electrical Wiring and Equipment – Inspect electrical wiring and associated equipment for fraying and attachment." },
      { id: "2.29", text: "Check flywheel attach bolts for proper torque of 24 ft-lbs." },
      { id: "2.30", text: "Induction Air Filter – Check for condition, cleanliness and security." },
      { id: "2.31", text: "Induction System – Check hot and cold flexible air ducts for delamination. Check security, cracks, operation, and wear." },
      { id: "2.32", text: "Carburetor Heat System – Check for blockage, security, operation and wear." },
      { id: "2.33", text: "Carburetor – Check for condition and leaks. Float bowl balance tube must be attached to clean side of air-filter box." },
    ]
  },
  {
    section: "3. Cabin and Baggage Compartment",
    items: [
      { id: "3.1", text: "Skin – Inspect skins for deformation or cracks. If damage is found, check adjacent structure." },
      { id: "3.2", text: "Structure – Check for cracks and deformation. Check for concealed damage." },
      { id: "3.3", text: "Check Rudder cables for proper tension, 22 lbs. If equipped with autopilot check cables for rubbing wear on servo." },
      { id: "3.4", text: "Check main pushrod for damage, cracks, or fatigue. Check jam nuts are tight. If equipped with autopilot check servo for freedom of movement with the push rod." },
      { id: "3.5", text: "Flap Motor and Shafts – Check for condition, security and wear at all points. Check housing for security and jam nuts for tightness." },
      { id: "3.6", text: "Brake Master Cylinders and Pedals – Check for condition, security and leaks. Check lines for signs of chafing or cracks." },
      { id: "3.7", text: "Rudder Pedals – Check for freedom of movement. Check cables and push/pull rods for proper routing, condition and security. Check locks and pins for positive lock." },
      { id: "3.8", text: "Control stick – check for cracks at welded joints, chafing of the PTT wiring, and wear or slop in the pivot points." },
      { id: "3.9", text: "Engine Controls – Check for ease of operation through full travel. Check friction lock for proper operation." },
      { id: "3.10", text: "Plumbing – Check all plumbing under seat pan, behind panel, and connections for security, leakage and condition. Change Fuel Filters with new Fram type G1 or similar." },
      { id: "3.11", text: "Canopy structure and Quarter windows – Inspect windows for scratches, crazing and condition. Check canopy for security of attachment and latching mechanism for proper engagement." },
      { id: "3.12", text: "Instruments and Instrument Panel – Inspect instrument panel, sub panels, placards, and instruments for condition and attachment. Check knobs, shock mounts, ground straps." },
      { id: "3.13", text: "Seats, Seat Belts and Shoulder Harnesses – Inspect for proper operations, condition, and security of attachment. Inspect floorboards for condition and seat attachment." },
      { id: "3.14", text: "Ventilating System – Check all fresh air and heat outlet vents for proper movement and operation." },
      { id: "3.15", text: "Fuel Selector Valve – Inspect for leakage, security, freedom of movement, proper detent feel and condition. Clean strainers and check placarding." },
      { id: "3.16", text: "Microphones, Headsets, and Jacks – Inspect for cleanliness, security, and evidence of damage." },
      { id: "3.17", text: "Static System – Check and drain water from the static lines." },
    ]
  },
  {
    section: "4. Wings and Carry-Through Structure",
    items: [
      { id: "4.1", text: "Skin – Check for deformation and obvious damage. Check for cracks. If damage is found, check adjacent structure. Check for indications of excessive flight loading." },
      { id: "4.2", text: "Structure – Check for cracks, deformation and concealed damage." },
      { id: "4.3", text: "Access Doors and Panels – Inspect for cracks, proper fit and attachment." },
      { id: "4.4", text: "Push rods – check end cones for security, jam nut tight, and rod end bearings for freedom of movement. Rod ends must have large area washer to capture rod end in event of bearing failure." },
      { id: "4.5", text: "Ailerons – Check for condition and security. Check for cracks, freedom of movement. Check hinge and brackets for condition, push-pull rods for security and rod ends for corrosion." },
      { id: "4.6", text: "Fuel Tanks, Caps and Vents – Inspect fuel tank, vent lines, and filler caps." },
      { id: "4.7", text: "Wing root end rib – Check for leakage around fuel sending unit, chafing of sending unit wires or rubber fuel lines, condition and security." },
      { id: "4.8", text: "Electrical Wiring and Equipment – Inspect for chafing, damage, security and attachment." },
      { id: "4.9", text: "Flaps and Actuators – Check for condition, security, binding or chafing of push rods. Check flap skin and structure for cracks." },
      { id: "4.10", text: "Flap Position sensor – Check for security and operation." },
      { id: "4.11", text: "Wing Bolts – Check wing bolts for proper torque at the first 100-Hour inspection and after each reinstallation." },
      { id: "4.12", text: "Pitot/Static Tube – Check for condition and obstructions." },
      { id: "4.13", text: "Drain Ports – Check the drain ports in the wing to assure they are free of obstruction." },
    ]
  },
  {
    section: "5. Nose Gear",
    items: [
      { id: "5.1", text: "Wheel and Tire – Check wheel for cracks and tire for wear, damage, condition and proper inflation. Check wheel bearings for condition and wear." },
      { id: "5.2", text: "Landing Gear Strut – Inspect aluminum for corrosion and components for cracks and attachment." },
      { id: "5.3", text: "Motor mount – Check for wear at attach points. Check for cracks and security." },
      { id: "5.4", text: "Nose fork assembly – Inspect for tightness, condition and security, freedom of movement of the nose block pivot, check pivot stop bolt for bending or cracking." },
    ]
  },
  {
    section: "6. Nose Gear Operation",
    items: [
      { id: "6.1", text: "Check for freedom of movement of the nose pivot block, travel is limited to an equal 30 degrees each side of center." },
    ]
  },
  {
    section: "7. Main Gear and Brakes",
    items: [
      { id: "7.1", text: "Brakes, Lines, Lining and Discs – Check for condition, wear and security. Check lines for chafing and leakage. Check discs for wear, warping, or cracks." },
      { id: "7.2", text: "Wheels and Tires – Check wheels for cracks and tires for wear, damage, condition and proper inflation. Check wheel bearings." },
      { id: "7.3", text: "Landing Gear Legs – Inspect aluminum legs and components for cracks, attachment points, corrosion, or deformation." },
    ]
  },
  {
    section: "8. Rear Fuselage and Empennage",
    items: [
      { id: "8.1", text: "Skin – Check for deformation, cracks and obvious damage. If damage is found, check adjacent structure." },
      { id: "8.2", text: "Internal Fuselage Structure – Check for cracks and deformation. Check bulkheads, stringers, and doublers for corrosion, cracks and buckles." },
      { id: "8.3", text: "Structure – Inspect the two most aft bulkheads for cracks, distortion, or other obvious damage." },
      { id: "8.4", text: "Cables and Turnbuckles – Check elevator and rudder flight control cables. Replace components with bulges, splits, bends, or cracks. Check cables for corrosion and proper attachment." },
      { id: "8.5", text: "Control Surfaces – Check for deformation, cracks, security, freedom of movement and travel limits. Check for loose or missing rivets in elevator. Check hinge security." },
      { id: "8.6", text: "Trim Tabs and Actuators – Check for security and wear. Check trim tabs for cracks." },
      { id: "8.7", text: "Tail tie down ring – Check for damage and surrounding structures." },
      { id: "8.8", text: "Horizontal stab leading edge attach bolts – Inspect bolts and mounting point for cracks or any damage." },
      { id: "8.9", text: "Elevator interconnect bellcrank – Check for damage to welded structure. Check bolts inside root ends of elevator for proper torque." },
      { id: "8.10", text: "Antenna behind baggage bulkhead – Check for condition and security." },
    ]
  },
  {
    section: "9. General",
    items: [
      { id: "9.1", text: "Airplane cleaned and serviced." },
      { id: "9.2", text: "Inspect all placards to assure that they are easily readable and securely attached." },
      { id: "9.3", text: "Assure that all Airworthiness Directives, Jabiru Service Bulletins, and previously issued Service Instructions are reviewed and complied with as required." },
      { id: "9.4", text: "For a complete annual inspection, all items on the airplane noted in this guide should be inspected." },
    ]
  }
];

const ALL_ITEMS = CHECKLIST_DATA.flatMap(s => s.items.map(i => ({ ...i, section: s.section })));
const STATUS = { PASS: "pass", FAIL: "fail", PENDING: "pending" };

function initItemState(id) {
  return { id, status: STATUS.PENDING, comments: "", disposition: null, repairNotes: "", timeMinutes: 0, timerStart: null, timerBase: 0, photos: [], files: [], additionalInfo: "", dateCompleted: null };
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function generateReport(inspection) {
  const customItems = inspection.customItems || [];
  const allItems = [...ALL_ITEMS, ...customItems.map(i => ({ ...i, section: "Custom Items" }))];
  const itemStates = inspection.itemStates || {};
  const totalTime = Object.values(itemStates).reduce((s, it) => s + (it.timeMinutes || 0), 0);
  const failed = allItems.filter(i => itemStates[i.id]?.status === STATUS.FAIL);
  const passed = allItems.filter(i => itemStates[i.id]?.status === STATUS.PASS);
  const pending = allItems.filter(i => !itemStates[i.id] || itemStates[i.id]?.status === STATUS.PENDING);
  const laborRate = inspection.laborRate || 85;
  const totalLabor = (totalTime / 60) * laborRate;

  const statusBadge = (status) => {
    if (status === "pass") return '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700">PASS</span>';
    if (status === "fail") return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700">FAIL</span>';
    return '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700">PENDING</span>';
  };

  let rows = "";
  CHECKLIST_DATA.forEach(section => {
    rows += `<tr><td colspan="5" style="background:#0f2244;color:white;font-weight:700;padding:8px 10px;font-size:13px">${section.section}</td></tr>`;
    section.items.forEach(item => {
      const st = itemStates[item.id] || {};
      rows += `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-weight:600;white-space:nowrap">${item.id}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${item.text}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${statusBadge(st.status || "pending")}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:12px">${formatTime(st.timeMinutes || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${st.comments || ""}${st.repairNotes ? ` | Repair: ${st.repairNotes}` : ""}</td>
      </tr>`;
    });
  });
  if (customItems.length > 0) {
    rows += `<tr><td colspan="5" style="background:#0f2244;color:white;font-weight:700;padding:8px 10px;font-size:13px">Custom Items</td></tr>`;
    customItems.forEach(item => {
      const st = itemStates[item.id] || {};
      rows += `<tr><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-weight:600">${item.id}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${item.text}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${statusBadge(st.status || "pending")}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${formatTime(st.timeMinutes || 0)}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${st.comments || ""}</td></tr>`;
    });
  }

  let discrepancies = "";
  if (failed.length > 0) {
    discrepancies = `<h2 style="color:#b91c1c;margin:24px 0 10px;font-size:16px">Discrepancies Found (${failed.length})</h2>`;
    failed.forEach(item => {
      const st = itemStates[item.id] || {};
      const disp = st.disposition === "repaired" ? "✓ REPAIRED" : st.disposition === "deferred" ? "⚠ DEFERRED" : "— No Disposition Set";
      const dc = st.disposition === "repaired" ? "#15803d" : st.disposition === "deferred" ? "#b45309" : "#6b7280";
      discrepancies += `<div style="border-left:4px solid #b91c1c;background:#fff7f7;padding:10px 14px;margin-bottom:10px;border-radius:0 6px 6px 0">
        <div style="font-weight:700;margin-bottom:4px">${item.id} — ${item.section}</div>
        <div style="font-size:13px;color:#374151;margin-bottom:6px">${item.text}</div>
        <div style="display:flex;gap:20px;font-size:12px;flex-wrap:wrap">
          <span style="color:#6b7280">Comments: <em>${st.comments || "None"}</em></span>
          <span style="color:${dc};font-weight:700">${disp}</span>
          ${st.repairNotes ? `<span style="color:#374151">Notes: <em>${st.repairNotes}</em></span>` : ""}
          <span style="color:#6b7280">Time: ${formatTime(st.timeMinutes || 0)}</span>
        </div>
      </div>`;
    });
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Condition Inspection Report – ${inspection.aircraftId || "N/A"}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px 40px;color:#1e293b;font-size:13px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f2244;color:white;padding:7px 10px;text-align:left;font-size:12px}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:16px;border-bottom:2px solid #0f2244;padding-bottom:6px}
  .header-box{border:2px solid #0f2244;padding:18px 22px;margin-bottom:24px;border-radius:4px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:12px}
  .info-row{font-size:13px}
  .info-label{color:#64748b;margin-right:6px}
  .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0}
  .stat-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center}
  .stat-num{font-size:26px;font-weight:700;display:block}
  .stat-label{font-size:11px;color:#64748b;display:block;margin-top:2px}
  .invoice-box{background:#f0f7ff;border:1px solid #93c5fd;padding:16px 20px;margin-top:24px;border-radius:6px}
  .invoice-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
  .invoice-total{font-weight:700;font-size:16px;border-top:2px solid #0f2244;margin-top:8px;padding-top:8px}
  .sig-block{margin-top:48px;padding-top:24px;border-top:2px solid #e2e8f0}
  .sig-line{display:inline-block;border-bottom:1px solid #333;width:280px;height:32px;vertical-align:bottom;margin-right:24px}
  @media print{body{padding:20px}button{display:none}}
</style></head><body>
<div class="header-box">
  <h1>Arion Lightning LS-1 — Condition Inspection Report</h1>
  <p style="margin:4px 0 12px;color:#64748b;font-size:12px">100-Hour / Annual Inspection per FAR Parts 43 &amp; 91 | AA-100CONISP-LS1</p>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">N-Number / Aircraft ID:</span><strong>${inspection.aircraftId || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">Serial Number:</span><strong>${inspection.serialNumber || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">Owner Name:</span><strong>${inspection.ownerName || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">Owner Address:</span><strong>${inspection.ownerAddress || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">Total Time (TTAF):</span><strong>${inspection.aircraftHours || "___________"} hrs</strong></div>
    <div class="info-row"><span class="info-label">Inspection Type:</span><strong>${inspection.inspectionType || "Annual Condition Inspection"}</strong></div>
    <div class="info-row"><span class="info-label">Inspection Started:</span><strong>${formatDate(inspection.startedAt)}</strong></div>
    <div class="info-row"><span class="info-label">Inspection Completed:</span><strong>${formatDate(inspection.completedAt) || "In Progress"}</strong></div>
    <div class="info-row"><span class="info-label">Inspector:</span><strong>${inspection.inspectorName || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">A&amp;P Certificate #:</span><strong>${inspection.apCertificate || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">IA Certificate #:</span><strong>${inspection.iaCertificate || "___________"}</strong></div>
    <div class="info-row"><span class="info-label">Facility:</span><strong>${inspection.facilityName || "___________"}</strong></div>
  </div>
</div>

<h2>Summary</h2>
<div class="summary-grid">
  <div class="stat-box"><span class="stat-num">${allItems.length}</span><span class="stat-label">Total Items</span></div>
  <div class="stat-box"><span class="stat-num" style="color:#15803d">${passed.length}</span><span class="stat-label">Passed</span></div>
  <div class="stat-box"><span class="stat-num" style="color:#b91c1c">${failed.length}</span><span class="stat-label">Discrepancies</span></div>
  <div class="stat-box"><span class="stat-num" style="color:#92400e">${pending.length}</span><span class="stat-label">Pending</span></div>
  <div class="stat-box"><span class="stat-num" style="color:#0f2244">${formatTime(totalTime)}</span><span class="stat-label">Total Time</span></div>
</div>

${discrepancies}

<h2>Complete Inspection Log</h2>
<table>
  <thead><tr><th style="width:52px">Item</th><th>Description</th><th style="width:80px;text-align:center">Result</th><th style="width:72px">Time</th><th>Comments / Repair Notes</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="invoice-box">
  <h2 style="margin-top:0;border-color:#3b82f6">Service Invoice</h2>
  <div class="invoice-row"><span>Labor Rate:</span><span>$${(inspection.laborRate || 85).toFixed(2)} / hr</span></div>
  <div class="invoice-row"><span>Total Labor Time:</span><span>${(totalTime/60).toFixed(2)} hrs (${formatTime(totalTime)})</span></div>
  <div class="invoice-row"><span>Labor Charge:</span><span>$${totalLabor.toFixed(2)}</span></div>
  ${inspection.partsTotal ? `<div class="invoice-row"><span>Parts &amp; Materials:</span><span>$${parseFloat(inspection.partsTotal).toFixed(2)}</span></div>` : ""}
  ${inspection.notes ? `<div class="invoice-row" style="font-style:italic;color:#64748b"><span>Notes:</span><span>${inspection.notes}</span></div>` : ""}
  <div class="invoice-row invoice-total"><span>TOTAL DUE:</span><span>$${(totalLabor + parseFloat(inspection.partsTotal || 0)).toFixed(2)}</span></div>
</div>

<div class="sig-block">
  <h2>Certification</h2>
  <p style="font-size:13px;max-width:700px">I certify that this aircraft has been inspected in accordance with a <strong>${inspection.inspectionType || "condition"} inspection</strong> and was found to be in airworthy condition, unless otherwise noted above as deferred items. This inspection was performed in accordance with FAR Part 43.</p>
  <p style="font-size:12px;color:#64748b;max-width:700px">Note: Airworthiness limitations have been complied with. The aircraft owner/operator is responsible for compliance with all applicable Airworthiness Directives per FAR Part 39.</p>
  <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:24px">
    <div><div class="sig-line"></div><div style="font-size:12px;margin-top:4px;color:#64748b">Inspector Signature</div></div>
    <div><div class="sig-line" style="width:160px"></div><div style="font-size:12px;margin-top:4px;color:#64748b">Date</div></div>
    <div><div class="sig-line" style="width:200px"></div><div style="font-size:12px;margin-top:4px;color:#64748b">A&amp;P / IA Certificate #</div></div>
  </div>
</div>

<p style="font-size:11px;color:#94a3b8;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px">
  Generated by Aircraft Condition Inspection App | ${new Date().toLocaleString()} | Arion Aircraft AA-100CONISP-LS1 R1-4-2012
</p>
</body></html>`;
}

// ── Main App Component ─────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("loading");
  const [inspection, setInspection] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [timers, setTimers] = useState({});
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [appVersion, setAppVersion] = useState("");
  const saveTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Load on mount
  useEffect(() => {
    Storage.load().then(saved => {
      if (saved) { setInspection(saved); setView("checklist"); }
      else setView("setup");
    });
    if (IS_ELECTRON) {
      window.electronAPI.getVersion().then(v => setAppVersion(v));
    }
  }, []);

  // Timer tick every 5 seconds
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setTimers(prev => {
        const running = Object.entries(prev).filter(([, r]) => r);
        if (running.length === 0) return prev;
        setInspection(insp => {
          if (!insp) return insp;
          const itemStates = { ...insp.itemStates };
          running.forEach(([id]) => {
            const st = itemStates[id];
            if (st?.timerStart) {
              const elapsed = (Date.now() - st.timerStart) / 60000;
              itemStates[id] = { ...st, timeMinutes: (st.timerBase || 0) + elapsed };
            }
          });
          return { ...insp, itemStates };
        });
        return prev;
      });
    }, 5000);
    return () => clearInterval(timerIntervalRef.current);
  }, []);

  const debouncedSave = useCallback((state) => {
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await Storage.save(state);
      setSaveStatus("saved");
    }, 1000);
  }, []);

  const updateInspection = useCallback((updater) => {
    setInspection(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const updateItem = useCallback((id, updater) => {
    updateInspection(prev => {
      const itemStates = { ...prev.itemStates };
      const current = itemStates[id] || initItemState(id);
      itemStates[id] = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      return { ...prev, itemStates };
    });
  }, [updateInspection]);

  function toggleTimer(id) {
    const running = timers[id];
    if (running) {
      setTimers(t => ({ ...t, [id]: false }));
      updateItem(id, item => {
        const elapsed = item.timerStart ? (Date.now() - item.timerStart) / 60000 : 0;
        return { ...item, timerStart: null, timerBase: 0, timeMinutes: (item.timerBase || 0) + elapsed };
      });
    } else {
      setTimers(t => ({ ...t, [id]: true }));
      updateItem(id, item => ({ ...item, timerStart: Date.now(), timerBase: item.timeMinutes || 0 }));
    }
  }

  async function handlePhotoUpload(itemId, e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        let photoRef;
        if (IS_ELECTRON) {
          const r = await window.electronAPI.savePhoto({ itemId, base64data: ev.target.result, filename: file.name, mimeType: file.type });
          if (r.success) photoRef = { filename: r.filename, name: file.name, type: file.type, addedAt: Date.now() };
        } else {
          photoRef = { data: ev.target.result, name: file.name, type: file.type, addedAt: Date.now() };
        }
        if (photoRef) {
          updateItem(itemId, item => ({ ...item, photos: [...(item.photos || []), photoRef] }));
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleFileUpload(itemId, e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        let fileRef;
        if (IS_ELECTRON) {
          const r = await window.electronAPI.saveFile({ itemId, base64data: ev.target.result, filename: file.name });
          if (r.success) fileRef = { filename: r.filename, originalName: file.name, size: file.size, addedAt: Date.now() };
        } else {
          fileRef = { data: ev.target.result, name: file.name, size: file.size, addedAt: Date.now() };
        }
        if (fileRef) {
          updateItem(itemId, item => ({ ...item, files: [...(item.files || []), fileRef] }));
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function startNewInspection() {
    const itemStates = {};
    ALL_ITEMS.forEach(({ id }) => { itemStates[id] = initItemState(id); });
    const insp = {
      id: Date.now(), startedAt: Date.now(), completedAt: null, status: "in_progress",
      inspectorName: "", apCertificate: "", iaCertificate: "", facilityName: "",
      ownerName: "", ownerAddress: "", aircraftId: "N677BP", serialNumber: "", aircraftHours: "",
      inspectionType: "Annual Condition Inspection", laborRate: 85, partsTotal: 0,
      itemStates, customItems: [], notes: "",
    };
    Storage.save(insp).then(() => { setInspection(insp); setView("setup-detail"); });
  }

  function getItemState(id) {
    return inspection?.itemStates?.[id] || initItemState(id);
  }

  function getProgress() {
    if (!inspection) return { passed: 0, failed: 0, pending: 0, total: 0 };
    const allIds = [...ALL_ITEMS.map(i => i.id), ...(inspection.customItems || []).map(i => i.id)];
    let passed = 0, failed = 0, pending = 0;
    allIds.forEach(id => {
      const st = inspection.itemStates?.[id];
      if (!st || st.status === STATUS.PENDING) pending++;
      else if (st.status === STATUS.PASS) passed++;
      else failed++;
    });
    return { passed, failed, pending, total: allIds.length };
  }

  function getTotalTime() {
    if (!inspection?.itemStates) return 0;
    return Object.entries(inspection.itemStates).reduce((s, [id, it]) => {
      let t = it.timeMinutes || 0;
      if (timers[id] && it.timerStart) t = (it.timerBase || 0) + (Date.now() - it.timerStart) / 60000;
      return s + t;
    }, 0);
  }

  function getFilteredSections() {
    if (!inspection) return [];
    const sections = [
      ...CHECKLIST_DATA,
      ...(inspection.customItems?.length ? [{ section: "Custom Items", items: inspection.customItems }] : [])
    ];
    if (!searchQuery && filterStatus === "all") return sections;
    return sections.map(s => ({
      ...s,
      items: s.items.filter(item => {
        const st = getItemState(item.id);
        const matchSearch = !searchQuery || item.text.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.includes(searchQuery);
        const matchFilter = filterStatus === "all" || st.status === filterStatus;
        return matchSearch && matchFilter;
      })
    })).filter(s => s.items.length > 0);
  }

  function addCustomItem() {
    if (!newItemText.trim()) return;
    const id = `custom_${Date.now()}`;
    updateInspection(prev => ({
      ...prev,
      customItems: [...(prev.customItems || []), { id, text: newItemText.trim() }],
      itemStates: { ...prev.itemStates, [id]: initItemState(id) }
    }));
    setNewItemText(""); setShowAddItem(false);
  }

  // ── Styles ─────────────────────────────────────────────────
  const S = {
    app: { fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8", color: "#1e293b", userSelect: "none" },
    header: { background: "#0f2244", color: "white", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100, WebkitAppRegion: "drag" },
    headerTitle: { fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 },
    navBtn: (active) => ({ padding: "5px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: active ? "rgba(255,255,255,0.2)" : "transparent", color: "white", WebkitAppRegion: "no-drag" }),
    card: { background: "white", borderRadius: 8, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 10 },
    sectionHdr: { background: "#0f2244", color: "white", padding: "9px 14px", borderRadius: "7px 7px 0 0", fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between", cursor: "pointer" },
    itemRow: (status, active) => ({
      padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
      background: active ? "#eff6ff" : status === "pass" ? "#f0fdf4" : status === "fail" ? "#fff1f2" : "white",
      cursor: "pointer", borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
    }),
    badge: (s) => ({ padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: s === "pass" ? "#dcfce7" : s === "fail" ? "#fee2e2" : "#f1f5f9", color: s === "pass" ? "#15803d" : s === "fail" ? "#b91c1c" : "#64748b" }),
    btn: (v = "default", sm = false) => ({
      padding: sm ? "4px 10px" : "8px 16px", borderRadius: 6, border: v === "outline" ? "1px solid #cbd5e1" : "none", cursor: "pointer",
      fontSize: sm ? 12 : 13, fontWeight: 500,
      background: v === "primary" ? "#0f2244" : v === "success" ? "#15803d" : v === "danger" ? "#b91c1c" : v === "warning" ? "#d97706" : v === "outline" ? "white" : "#f1f5f9",
      color: ["primary", "success", "danger", "warning"].includes(v) ? "white" : "#374151",
    }),
    input: { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 5, fontSize: 13, boxSizing: "border-box", marginBottom: 6, background: "white" },
    textarea: { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 5, fontSize: 13, boxSizing: "border-box", resize: "vertical", minHeight: 64, fontFamily: "inherit" },
    label: { fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" },
  };

  const prog = getProgress();
  const totalTime = getTotalTime();
  const pct = prog.total > 0 ? Math.round(((prog.passed + prog.failed) / prog.total) * 100) : 0;

  // ── Views ───────────────────────────────────────────────────

  if (view === "loading") return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✈</div>
        <p style={{ color: "#64748b" }}>Loading inspection data...</p>
      </div>
    </div>
  );

  if (view === "setup") return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerTitle}>✈ Aircraft Condition Inspection {appVersion && <span style={{ opacity: 0.5, fontSize: 11 }}>v{appVersion}</span>}</div>
      </div>
      <div style={{ maxWidth: 580, margin: "80px auto", padding: "0 16px" }}>
        <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, color: "#0f2244" }}>Lightning LS-1 Condition Inspection</h2>
          <p style={{ color: "#64748b", marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>
            Arion Aircraft 100-Hour / Annual Inspection<br/>
            74 inspection items · Multi-day support · Photo capture · Service invoice
          </p>
          <button style={{ ...S.btn("primary"), fontSize: 15, padding: "12px 36px" }} onClick={startNewInspection}>Start New Inspection</button>
          {IS_ELECTRON && (
            <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
              Data saved to: Documents/AircraftInspections/
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (view === "setup-detail") return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerTitle}>✈ Inspection Setup</div>
        <div style={{ display: "flex", gap: 6, WebkitAppRegion: "no-drag" }}>
          <button style={S.navBtn(false)} onClick={() => setView("checklist")}>Skip to Checklist →</button>
        </div>
      </div>
      <div style={{ maxWidth: 740, margin: "24px auto", padding: "0 16px" }}>
        <div style={S.card}>
          <h2 style={{ margin: "0 0 18px", fontSize: 17, color: "#0f2244" }}>Inspector & Aircraft Information</h2>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e2e8f0" }}>Inspector</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {[["Inspector Name", "inspectorName"], ["Facility / Shop Name", "facilityName"], ["A&P Certificate #", "apCertificate"], ["IA Certificate #", "iaCertificate"]].map(([lbl, key]) => (
              <div key={key}><span style={S.label}>{lbl}</span><input style={S.input} value={inspection?.[key] || ""} onChange={e => updateInspection({ [key]: e.target.value })} /></div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #e2e8f0" }}>Aircraft & Owner</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {[["Owner Name", "ownerName"], ["N-Number / Aircraft ID", "aircraftId"], ["Owner Address", "ownerAddress"], ["Serial Number", "serialNumber"], ["Total Time (TTAF) hrs", "aircraftHours"]].map(([lbl, key]) => (
              <div key={key}><span style={S.label}>{lbl}</span><input style={S.input} value={inspection?.[key] || ""} onChange={e => updateInspection({ [key]: e.target.value })} /></div>
            ))}
            <div>
              <span style={S.label}>Inspection Type</span>
              <select style={{ ...S.input, marginBottom: 0 }} value={inspection?.inspectionType || "Annual Condition Inspection"} onChange={e => updateInspection({ inspectionType: e.target.value })}>
                <option>Annual Condition Inspection</option>
                <option>100-Hour Inspection</option>
                <option>Pre-Purchase Inspection</option>
                <option>Progressive Inspection</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 10px", paddingBottom: 6, borderBottom: "2px solid #e2e8f0" }}>Billing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div><span style={S.label}>Labor Rate ($ / hr)</span><input type="number" style={S.input} value={inspection?.laborRate || 85} onChange={e => updateInspection({ laborRate: parseFloat(e.target.value) || 0 })} /></div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button style={{ ...S.btn("primary"), fontSize: 14, padding: "10px 28px" }} onClick={() => setView("checklist")}>Begin Inspection →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Main Checklist View ──────────────────────────────────────
  const filteredSections = getFilteredSections();
  const activeItemState = activeItemId ? getItemState(activeItemId) : null;
  const activeItemObj = activeItemId ? [...ALL_ITEMS, ...(inspection?.customItems || [])].find(i => i.id === activeItemId) : null;
  const isTimerRunning = !!timers[activeItemId];
  const failedItems = [...ALL_ITEMS, ...(inspection?.customItems || [])].filter(i => getItemState(i.id).status === STATUS.FAIL);

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTitle}>
          ✈
          <span>Lightning LS-1 – {inspection?.inspectionType || "Condition Inspection"}</span>
          {inspection?.aircraftId && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 13 }}>| {inspection.aircraftId}</span>}
          <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 400, marginLeft: 4 }}>
            {saveStatus === "saving" ? "⏳ Saving..." : "✓ Saved"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", WebkitAppRegion: "no-drag" }}>
          <button style={S.navBtn(view === "checklist")} onClick={() => { setView("checklist"); setActiveItemId(null); }}>Checklist</button>
          <button style={S.navBtn(view === "setup-detail")} onClick={() => setView("setup-detail")}>Setup</button>
          {IS_ELECTRON && <button style={S.navBtn(false)} onClick={() => Storage.openDataFolder()}>📁 Files</button>}
          <button style={{ ...S.btn("success", true), marginLeft: 8, WebkitAppRegion: "no-drag" }} onClick={async () => {
            const html = generateReport(inspection);
            await Storage.exportReport(html);
          }}>📄 Report</button>
          <button style={{ ...S.btn("danger", true), WebkitAppRegion: "no-drag" }} onClick={async () => {
            if (window.confirm("Reset all inspection data? This cannot be undone.")) {
              await Storage.reset(); setInspection(null); setView("setup");
            }
          }}>Reset</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#0f2244", padding: "8px 20px", display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", background: prog.failed > 0 ? "#22c55e" : "#22c55e", width: `${pct}%`, borderRadius: 4, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>
          <span>✓ {prog.passed} Pass</span>
          <span style={{ color: "#fca5a5" }}>✗ {prog.failed} Fail</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>○ {prog.pending} Pending</span>
          <span style={{ fontWeight: 700 }}>{pct}% · {formatTime(totalTime)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, padding: "14px 16px", maxWidth: 1280, margin: "0 auto", alignItems: "flex-start" }}>
        {/* Main checklist */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input style={{ ...S.input, marginBottom: 0, flex: 1 }} placeholder="🔍 Search items by text or number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {["all", "pending", "pass", "fail"].map(f => (
              <button key={f} style={{ ...S.btn(filterStatus === f ? "primary" : "outline", true), whiteSpace: "nowrap" }} onClick={() => setFilterStatus(f)}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filteredSections.map(section => {
            const sectionPassed = section.items.filter(i => getItemState(i.id).status === STATUS.PASS).length;
            return (
              <div key={section.section} style={{ marginBottom: 10, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <div style={S.sectionHdr}>
                  <span>{section.section}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>{sectionPassed}/{section.items.length} passed</span>
                </div>
                {section.items.map(item => {
                  const st = getItemState(item.id);
                  const isActive = activeItemId === item.id;
                  const timerRunning = !!timers[item.id];
                  return (
                    <div key={item.id} style={S.itemRow(st.status, isActive)} onClick={() => setActiveItemId(isActive ? null : item.id)}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", minWidth: 34, paddingTop: 2, flexShrink: 0 }}>{item.id}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{item.text}</p>
                          {st.comments && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{st.comments}</p>}
                          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            {(st.photos || []).length > 0 && <span style={{ fontSize: 11, color: "#3b82f6" }}>📷 {st.photos.length} photo{st.photos.length !== 1 ? "s" : ""}</span>}
                            {(st.files || []).length > 0 && <span style={{ fontSize: 11, color: "#7c3aed" }}>📎 {st.files.length} file{st.files.length !== 1 ? "s" : ""}</span>}
                            {timerRunning && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>⏱ TIMER RUNNING</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {st.timeMinutes > 0.5 && <span style={{ fontSize: 11, color: "#64748b" }}>{formatTime(st.timeMinutes)}</span>}
                          <span style={S.badge(st.status)}>{st.status.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Expanded item detail */}
                      {isActive && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }} onClick={e => e.stopPropagation()}>
                          {/* Status */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <button style={{ ...S.btn(st.status === "pass" ? "success" : "outline", true), flex: 1 }} onClick={() => updateItem(item.id, { status: "pass", dateCompleted: Date.now() })}>✓ Pass</button>
                            <button style={{ ...S.btn(st.status === "fail" ? "danger" : "outline", true), flex: 1 }} onClick={() => updateItem(item.id, { status: "fail", dateCompleted: Date.now() })}>✗ Fail / Discrepancy</button>
                            <button style={{ ...S.btn("outline", true), flex: 1 }} onClick={() => updateItem(item.id, { status: "pending", dateCompleted: null })}>↺ Reset</button>
                          </div>

                          <span style={S.label}>Comments</span>
                          <textarea style={{ ...S.textarea, marginBottom: 8 }} value={st.comments} onChange={e => updateItem(item.id, { comments: e.target.value })} placeholder="Inspection notes, measurements, observations..." />

                          {/* Discrepancy handling */}
                          {st.status === "fail" && (
                            <div style={{ background: "#fff7f7", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                              <span style={S.label}>Disposition of Discrepancy</span>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                {[["repaired", "✓ Repaired", "#15803d"], ["deferred", "⚠ Deferred", "#b45309"]].map(([val, label, color]) => (
                                  <button key={val} style={{ ...S.btn("outline", true), flex: 1, borderColor: st.disposition === val ? color : undefined, color: st.disposition === val ? color : undefined, fontWeight: st.disposition === val ? 700 : 400 }}
                                    onClick={() => updateItem(item.id, { disposition: val })}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <span style={S.label}>Repair / Deferral Notes</span>
                              <textarea style={{ ...S.textarea, minHeight: 48 }} value={st.repairNotes || ""} onChange={e => updateItem(item.id, { repairNotes: e.target.value })} placeholder="Describe repair performed or reason for deferral..." />
                            </div>
                          )}

                          {/* Timer */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 10px", background: "#f8fafc", borderRadius: 6 }}>
                            <button style={S.btn(timerRunning ? "danger" : "primary", true)} onClick={() => toggleTimer(item.id)}>
                              {timerRunning ? "⏸ Stop" : "▶ Start"} Timer
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 60 }}>
                              {formatTime(timerRunning && st.timerStart ? (st.timerBase || 0) + (Date.now() - st.timerStart) / 60000 : st.timeMinutes)}
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>Manual (min):</span>
                            <input type="number" min="0" step="0.5" style={{ ...S.input, width: 72, marginBottom: 0, padding: "4px 8px" }}
                              value={Math.round(st.timeMinutes * 10) / 10}
                              onChange={e => updateItem(item.id, { timeMinutes: parseFloat(e.target.value) || 0 })} />
                          </div>

                          {/* Photos */}
                          <div style={{ marginBottom: 10 }}>
                            <span style={S.label}>Photos</span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                              {(st.photos || []).map((p, pi) => {
                                const src = p.data || (p.filename ? `file:///${IS_ELECTRON ? require("os").homedir() : ""}/Documents/AircraftInspections/photos/${p.filename}` : null);
                                return (
                                  <div key={pi} style={{ position: "relative" }}>
                                    {src && <img src={src} alt={p.name} style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 5, border: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => window.open(src)} />}
                                    {!src && <div style={{ width: 76, height: 76, background: "#f1f5f9", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#64748b" }}>📷</div>}
                                    <button style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#b91c1c", color: "white", fontSize: 11, cursor: "pointer", padding: 0, lineHeight: "18px" }}
                                      onClick={(e) => { e.stopPropagation(); updateItem(item.id, item => ({ ...item, photos: item.photos.filter((_, i) => i !== pi) })); }}>×</button>
                                  </div>
                                );
                              })}
                              <label style={{ width: 76, height: 76, border: "2px dashed #cbd5e1", borderRadius: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: "#94a3b8", gap: 2 }}>
                                <span>+</span><span style={{ fontSize: 10, color: "#94a3b8" }}>Add Photo</span>
                                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handlePhotoUpload(item.id, e)} />
                              </label>
                            </div>
                          </div>

                          {/* Files */}
                          <div style={{ marginBottom: 10 }}>
                            <span style={S.label}>Attachments</span>
                            {(st.files || []).map((f, fi) => (
                              <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "#f8fafc", borderRadius: 4, marginBottom: 4, fontSize: 12 }}>
                                <span>📎</span><span style={{ flex: 1 }}>{f.originalName || f.name}</span><span style={{ color: "#94a3b8" }}>{f.size ? `${Math.round(f.size / 1024)}KB` : ""}</span>
                                <button style={S.btn("outline", true)} onClick={() => updateItem(item.id, item => ({ ...item, files: item.files.filter((_, i) => i !== fi) }))}>×</button>
                              </div>
                            ))}
                            <label style={{ ...S.btn("outline", true), cursor: "pointer", display: "inline-block" }}>
                              + Add File<input type="file" multiple style={{ display: "none" }} onChange={e => handleFileUpload(item.id, e)} />
                            </label>
                          </div>

                          {/* Additional info */}
                          <span style={S.label}>Additional Information</span>
                          <textarea style={{ ...S.textarea, minHeight: 48 }} value={st.additionalInfo || ""} onChange={e => updateItem(item.id, { additionalInfo: e.target.value })} placeholder="Measurements, part numbers, torque values recorded, etc." />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Add custom item */}
          <div style={S.card}>
            {showAddItem ? (
              <div>
                <span style={S.label}>Additional Inspection Item Description</span>
                <textarea style={{ ...S.textarea, marginBottom: 8 }} value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="Describe the additional inspection item..." autoFocus />
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={S.btn("primary", true)} onClick={addCustomItem}>Add Item</button>
                  <button style={S.btn("outline", true)} onClick={() => setShowAddItem(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button style={{ ...S.btn("outline"), width: "100%", color: "#3b82f6", borderStyle: "dashed" }} onClick={() => setShowAddItem(true)}>+ Add Additional Inspection Item</button>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width: 228, flexShrink: 0 }}>
          {/* Summary */}
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Summary</div>
            {[["Total Items", prog.total, "#1e293b"], ["✓ Passed", prog.passed, "#15803d"], ["✗ Failed", prog.failed, "#b91c1c"], ["○ Pending", prog.pending, "#64748b"]].map(([lbl, val, color]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>{lbl}</span><span style={{ fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Time</span><span style={{ fontWeight: 700 }}>{formatTime(totalTime)}</span>
            </div>
            {inspection?.laborRate > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderTop: "1px solid #f1f5f9", marginTop: 2 }}>
                <span style={{ color: "#64748b" }}>Labor Est.</span>
                <span style={{ fontWeight: 700, color: "#0f2244" }}>${((totalTime / 60) * (inspection.laborRate || 85)).toFixed(2)}</span>
              </div>
            )}
            <button style={{ ...S.btn("primary"), width: "100%", marginTop: 10, fontSize: 13 }} onClick={async () => {
              const html = generateReport(inspection);
              await Storage.exportReport(html);
            }}>📄 Generate Report</button>
            {IS_ELECTRON && (
              <button style={{ ...S.btn("outline"), width: "100%", marginTop: 6, fontSize: 12 }} onClick={() => {
                const html = generateReport(inspection);
                Storage.printReport(html);
              }}>🖨 Print</button>
            )}
          </div>

          {/* Inspector card */}
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Inspector</div>
            {inspection?.inspectorName && <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600 }}>{inspection.inspectorName}</p>}
            {inspection?.apCertificate && <p style={{ margin: "0 0 2px", fontSize: 12, color: "#64748b" }}>A&P: {inspection.apCertificate}</p>}
            {inspection?.iaCertificate && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>IA: {inspection.iaCertificate}</p>}
            {inspection?.aircraftId && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#0f2244", fontWeight: 600 }}>Aircraft: {inspection.aircraftId}</p>}
            {inspection?.aircraftHours && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>TTAF: {inspection.aircraftHours} hrs</p>}
            {inspection?.startedAt && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>Started: {formatDate(inspection.startedAt)}</p>}
          </div>

          {/* Discrepancies */}
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Discrepancies ({failedItems.length})</div>
            {failedItems.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>None found yet</p>
            ) : failedItems.map(item => {
              const st = getItemState(item.id);
              return (
                <div key={item.id} style={{ padding: "6px 0", borderBottom: "1px solid #fee2e2", cursor: "pointer" }}
                  onClick={() => { setActiveItemId(item.id); setFilterStatus("all"); setSearchQuery(""); }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{item.id}</span>
                    {st.disposition && <span style={{ fontSize: 10, color: st.disposition === "repaired" ? "#15803d" : "#b45309", fontWeight: 600 }}>{st.disposition}</span>}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{item.text.slice(0, 55)}…</p>
                </div>
              );
            })}
          </div>

          {/* Parts & billing */}
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2244", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Parts & Billing</div>
            <span style={S.label}>Parts & Materials ($)</span>
            <input type="number" style={S.input} value={inspection?.partsTotal || 0} onChange={e => updateInspection({ partsTotal: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            <span style={S.label}>Invoice Notes</span>
            <textarea style={{ ...S.textarea, minHeight: 48 }} value={inspection?.notes || ""} onChange={e => updateInspection({ notes: e.target.value })} placeholder="Additional billing notes..." />
            {inspection?.laborRate > 0 && inspection?.partsTotal > 0 && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0f7ff", borderRadius: 5, fontSize: 13, fontWeight: 700, color: "#0f2244" }}>
                Total: ${((getTotalTime() / 60) * (inspection.laborRate || 85) + parseFloat(inspection.partsTotal || 0)).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

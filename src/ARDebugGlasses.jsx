import React, { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Simulated device fleet ------------------------------------------------------
// ---------------------------------------------------------------------------

const STATUS = {
  ok: { label: "Healthy", color: "#3ddc84", glow: "rgba(61,220,132,0.55)" },
  warn: { label: "Degraded", color: "#ffb020", glow: "rgba(255,176,32,0.55)" },
  crit: { label: "Fault", color: "#ff4d5e", glow: "rgba(255,77,94,0.6)" },
};

const INITIAL_DEVICES = [
  {
    id: "GW-01",
    type: "Gateway",
    x: 50,
    y: 34,
    status: "ok",
    battery: 92,
    signal: -41,
    temp: 38.2,
    firmware: "2.4.1",
    lastSeen: 0,
    errCode: null,
    log: ["Heartbeat OK", "Uplink stable, 214 devices bridged"],
  },
  {
    id: "TMP-114",
    type: "Temp Sensor",
    x: 20,
    y: 58,
    status: "warn",
    battery: 34,
    signal: -71,
    temp: 61.8,
    firmware: "1.9.0",
    lastSeen: 12,
    errCode: "W-208",
    log: ["Battery below 40% threshold", "Reading drift +2.1° vs baseline"],
  },
  {
    id: "ACT-07",
    type: "Actuator",
    x: 74,
    y: 64,
    status: "ok",
    battery: 88,
    signal: -52,
    temp: 29.4,
    firmware: "3.1.2",
    lastSeen: 1,
    errCode: null,
    log: ["Cycle count nominal", "Torque within spec"],
  },
  {
    id: "VIB-22",
    type: "Vibration",
    x: 33,
    y: 78,
    status: "crit",
    battery: 61,
    signal: -66,
    temp: 44.0,
    firmware: "1.4.4",
    lastSeen: 47,
    errCode: "E-503",
    log: ["Lost 3 consecutive heartbeats", "Last packet malformed (CRC fail)"],
  },
  {
    id: "PLC-3",
    type: "Controller",
    x: 66,
    y: 22,
    status: "ok",
    battery: null,
    signal: -33,
    temp: 41.6,
    firmware: "4.0.0",
    lastSeen: 0,
    errCode: null,
    log: ["Scan cycle 8ms", "All I/O channels nominal"],
  },
  {
    id: "CAM-9",
    type: "Vision Node",
    x: 84,
    y: 44,
    status: "warn",
    battery: 55,
    signal: -74,
    temp: 52.1,
    firmware: "2.2.0",
    lastSeen: 8,
    errCode: "W-114",
    log: ["Frame rate dropped to 11fps", "Lens obstruction suspected"],
  },
];

const STATUS_ORDER = { crit: 0, warn: 1, ok: 2 };

export default function ARDebugGlasses() {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [selectedId, setSelectedId] = useState(null);
  const [showTopology, setShowTopology] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 1900);
    return () => clearTimeout(t);
  }, []);

  // simulate a "live" feed: lastSeen counters climb, jitter telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((n) => n + 1);
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          lastSeen: d.status === "ok" ? Math.max(0, d.lastSeen + (Math.random() > 0.7 ? 1 : 0)) : d.lastSeen + 1,
          temp: +(d.temp + (Math.random() - 0.5) * 0.6).toFixed(1),
          signal: Math.round(d.signal + (Math.random() - 0.5) * 2),
        }))
      );
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const selected = devices.find((d) => d.id === selectedId) || null;
  const gateway = devices.find((d) => d.type === "Gateway");

  const counts = devices.reduce(
    (acc, d) => {
      acc[d.status]++;
      return acc;
    },
    { ok: 0, warn: 0, crit: 0 }
  );

  const restart = (id) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: "ok", errCode: null, lastSeen: 0, log: [`Manual restart issued`, ...d.log].slice(0, 4) }
          : d
      )
    );
  };

  return (
    <div
      style={{
        fontFamily:
          "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
      className="relative w-full h-[680px] overflow-hidden bg-[#05070a] text-[#d7e2ea] select-none"
    >
      {/* ---------- simulated camera-feed environment ---------- */}
      <FloorScene />
      <Vignette />
      <ScanlineOverlay />

      {/* ---------- HUD top bar ---------- */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-5 pt-4 z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3ddc84] shadow-[0_0_8px_2px_rgba(61,220,132,0.7)] animate-pulse" />
            <span className="text-[11px] tracking-wide font-mono text-[#8fa3ad]">
              FIELD VIEW &mdash; PLANT 4 / BAY C
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-[#5c6f78]">
            {devices.length} devices detected &middot; frame {String(tick).padStart(4, "0")}
          </div>
        </div>

        <div className="flex gap-2">
          <HudBadge count={counts.ok} color={STATUS.ok.color} label="OK" />
          <HudBadge count={counts.warn} color={STATUS.warn.color} label="WARN" />
          <HudBadge count={counts.crit} color={STATUS.crit.color} label="FAULT" />
        </div>
      </div>

      {/* ---------- layer toggles ---------- */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 font-mono text-[10px]">
        <ToggleRow label="HEALTH OVERLAY" active={showHealth} onClick={() => setShowHealth((v) => !v)} />
        <ToggleRow label="TOPOLOGY LINKS" active={showTopology} onClick={() => setShowTopology((v) => !v)} />
      </div>

      {/* ---------- topology lines (svg) ---------- */}
      {showTopology && gateway && (
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {devices
            .filter((d) => d.id !== gateway.id)
            .map((d) => (
              <line
                key={d.id}
                x1={`${gateway.x}%`}
                y1={`${gateway.y}%`}
                x2={`${d.x}%`}
                y2={`${d.y}%`}
                stroke={d.status === "crit" ? "rgba(255,77,94,0.45)" : "rgba(0,217,255,0.28)"}
                strokeWidth={d.status === "crit" ? 1.4 : 1}
                strokeDasharray={d.status === "crit" ? "2 3" : "1 5"}
              />
            ))}
        </svg>
      )}

      {/* ---------- device markers ---------- */}
      {devices.map((d) => (
        <DeviceMarker
          key={d.id}
          device={d}
          selected={selectedId === d.id}
          dim={!showHealth}
          onSelect={() => setSelectedId(d.id === selectedId ? null : d.id)}
        />
      ))}

      {/* ---------- scan sweep on load ---------- */}
      {scanning && <ScanSweep />}

      {/* ---------- device detail panel ---------- */}
      {selected && (
        <DetailPanel device={selected} onClose={() => setSelectedId(null)} onRestart={() => restart(selected.id)} />
      )}

      {/* ---------- crosshair center reticle ---------- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none opacity-40">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-1.5 bg-[#00d9ff]" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-px h-1.5 bg-[#00d9ff]" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-px w-1.5 bg-[#00d9ff]" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 h-px w-1.5 bg-[#00d9ff]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components --------------------------------------------------------------
// ---------------------------------------------------------------------------

function FloorScene() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1016" />
          <stop offset="55%" stopColor="#0d1319" />
          <stop offset="100%" stopColor="#141c22" />
        </linearGradient>
        <linearGradient id="pipe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1c262d" />
          <stop offset="100%" stopColor="#25323a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#floorGrad)" />

      {/* perspective floor grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`h2${i}`}
          x1="0"
          y1={30 + i * 8}
          x2="100"
          y2={30 + i * 8}
          stroke="#3a4a54"
          strokeOpacity="0.15"
          strokeWidth="0.15"
        />
      ))}
      {Array.from({ length: 13 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={50 + (i - 6) * 9}
          y1="30"
          x2={50 + (i - 6) * 16}
          y2="100"
          stroke="#3a4a54"
          strokeOpacity="0.12"
          strokeWidth="0.15"
        />
      ))}

      {/* overhead pipe racks */}
      <rect x="0" y="4" width="100" height="2.2" fill="url(#pipe)" opacity="0.8" />
      <rect x="0" y="7.5" width="100" height="1.4" fill="url(#pipe)" opacity="0.6" />
      {/* rack silhouettes */}
      <rect x="4" y="42" width="10" height="34" fill="#121a20" stroke="#26333b" strokeWidth="0.2" />
      <rect x="88" y="30" width="9" height="46" fill="#121a20" stroke="#26333b" strokeWidth="0.2" />
    </svg>
  );
}

function Vignette() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
}

function ScanlineOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.06]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 3px)",
      }}
    />
  );
}

function ScanSweep() {
  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none"
      style={{
        background:
          "linear-gradient(100deg, transparent 40%, rgba(0,217,255,0.15) 48%, rgba(0,217,255,0.35) 50%, rgba(0,217,255,0.15) 52%, transparent 60%)",
        animation: "sweepMove 1.8s ease-in-out",
      }}
    >
      <style>{`
        @keyframes sweepMove {
          0% { transform: translateX(-120%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HudBadge({ count, color, label }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm border font-mono text-[10px]"
      style={{ borderColor: color + "55", background: color + "14", color }}
    >
      <span className="font-semibold">{count}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function ToggleRow({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[#22303a] bg-[#0a1015]/80 backdrop-blur-sm hover:border-[#00d9ff]/50 transition-colors"
    >
      <span
        className="w-2.5 h-2.5 rounded-sm border"
        style={{
          borderColor: active ? "#00d9ff" : "#3a4a54",
          background: active ? "#00d9ff" : "transparent",
          boxShadow: active ? "0 0 6px 1px rgba(0,217,255,0.6)" : "none",
        }}
      />
      <span className={active ? "text-[#cdeef7]" : "text-[#5c6f78]"}>{label}</span>
    </button>
  );
}

function DeviceMarker({ device, selected, dim, onSelect }) {
  const s = STATUS[device.status];
  const color = dim ? "#5c6f78" : s.color;
  const glow = dim ? "none" : `0 0 10px 2px ${s.glow}`;

  return (
    <button
      onClick={onSelect}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${device.x}%`, top: `${device.y}%` }}
    >
      <div className="relative w-11 h-11 flex items-center justify-center">
        {/* corner brackets */}
        <Bracket corner="tl" color={color} active={selected} />
        <Bracket corner="tr" color={color} active={selected} />
        <Bracket corner="bl" color={color} active={selected} />
        <Bracket corner="br" color={color} active={selected} />

        <span
          className="w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: glow }}
        />
        {device.status === "crit" && !dim && (
          <span
            className="absolute w-2 h-2 rounded-full animate-ping"
            style={{ background: color }}
          />
        )}
      </div>

      {/* label */}
      <div
        className={`mt-1 px-1.5 py-0.5 rounded-sm font-mono text-[9.5px] whitespace-nowrap transition-opacity ${
          selected ? "opacity-100" : "opacity-80 group-hover:opacity-100"
        }`}
        style={{
          background: "rgba(5,8,10,0.75)",
          border: `1px solid ${color}55`,
          color: dim ? "#8fa3ad" : color,
        }}
      >
        {device.id}
      </div>
    </button>
  );
}

function Bracket({ corner, color, active }) {
  const base = "absolute w-3 h-3 transition-all";
  const map = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  };
  return (
    <span
      className={`${base} ${map[corner]}`}
      style={{
        borderColor: color,
        opacity: active ? 1 : 0.55,
        width: active ? "16px" : "12px",
        height: active ? "16px" : "12px",
      }}
    />
  );
}

function DetailPanel({ device, onClose, onRestart }) {
  const s = STATUS[device.status];
  return (
    <div className="absolute top-0 right-0 h-full w-[280px] z-40 bg-[#080c10]/95 backdrop-blur-md border-l border-[#1c262d] flex flex-col font-mono text-[11px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c262d]">
        <div>
          <div className="text-[13px] font-semibold text-[#e8f1f6]">{device.id}</div>
          <div className="text-[10px] text-[#5c6f78] mt-0.5">{device.type}</div>
        </div>
        <button onClick={onClose} className="text-[#5c6f78] hover:text-[#e8f1f6] text-lg leading-none px-1">
          &times;
        </button>
      </div>

      <div className="px-4 py-3 flex items-center gap-2 border-b border-[#1c262d]">
        <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px 2px ${s.glow}` }} />
        <span style={{ color: s.color }} className="font-semibold">
          {s.label}
        </span>
        {device.errCode && <span className="text-[#5c6f78] ml-auto">{device.errCode}</span>}
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-y-3 gap-x-2 border-b border-[#1c262d]">
        <Stat label="TEMP" value={`${device.temp}°C`} />
        <Stat label="SIGNAL" value={`${device.signal} dBm`} />
        <Stat label="BATTERY" value={device.battery !== null ? `${device.battery}%` : "wired"} />
        <Stat label="LAST SEEN" value={device.lastSeen === 0 ? "now" : `${device.lastSeen}s ago`} />
        <Stat label="FIRMWARE" value={`v${device.firmware}`} />
      </div>

      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <div className="text-[#5c6f78] mb-2 tracking-wide">EVENT LOG</div>
        <div className="space-y-2">
          {device.log.map((line, i) => (
            <div key={i} className="text-[#a9bac3] leading-snug border-l border-[#22303a] pl-2">
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-[#1c262d] flex gap-2">
        <button
          onClick={onRestart}
          className="flex-1 py-2 rounded-sm border border-[#00d9ff]/40 text-[#8fdcf2] hover:bg-[#00d9ff]/10 transition-colors"
        >
          Restart device
        </button>
        <button className="flex-1 py-2 rounded-sm border border-[#22303a] text-[#8fa3ad] hover:border-[#3a4a54] transition-colors">
          Push firmware
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[#5c6f78] text-[9.5px] tracking-wide">{label}</div>
      <div className="text-[#dbe7ee] mt-0.5">{value}</div>
    </div>
  );
}

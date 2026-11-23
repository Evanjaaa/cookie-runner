// tools/perf/lib/trace.mjs — อัด trace ช่วงสั้น ๆ แล้วสรุปเวลาที่แต่ละ thread ทำงาน (ms ต่อวินาที)
// ใช้ดูงานที่ไม่อยู่ใน main thread: compositor · raster · GPU process · และนับ GC
import { sleep } from './cdp.mjs';

const CATS = ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'blink.gc', 'gpu', 'cc', 'viz'];

export async function traceWindow(cdp, secs = 5, { keepEvents = false } = {}) {
  const events = [];
  const offData = cdp.on('Tracing.dataCollected', (p) => { for (const e of p.value) events.push(e); });
  const done = new Promise((r) => { const off = cdp.on('Tracing.tracingComplete', () => { off(); r(); }); });
  await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: CATS, recordMode: 'recordAsMuchAsPossible' } });
  await sleep(secs * 1000);
  await cdp.send('Tracing.end');
  await done;
  offData();
  return summarize(events, secs, keepEvents);
}

export function summarize(events, secs, keepEvents = false) {
  const tname = new Map(), pname = new Map();
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name') tname.set(e.pid + ':' + e.tid, e.args.name);
    if (e.ph === 'M' && e.name === 'process_name') pname.set(e.pid, e.args.name);
  }
  // งานระดับบนสุดของแต่ละ thread (toplevel) — รวมเวลาแบบไม่นับซ้อน
  const busy = new Map(), lastEnd = new Map();
  const top = events.filter((e) => e.ph === 'X' && /(^|,)toplevel(,|$)/.test(e.cat) && e.dur > 0).sort((a, b) => a.ts - b.ts);
  for (const e of top) {
    const k = e.pid + ':' + e.tid;
    const end = e.ts + e.dur, le = lastEnd.get(k) || 0;
    const add = Math.max(0, end - Math.max(e.ts, le));
    busy.set(k, (busy.get(k) || 0) + add);
    if (end > le) lastEnd.set(k, end);
  }
  const gc = { minor: 0, minorMs: 0, major: 0, majorMs: 0 };
  for (const e of events) {
    if (e.ph !== 'X') continue;
    if (e.name === 'MinorGC') { gc.minor++; gc.minorMs += e.dur / 1000; }
    if (e.name === 'MajorGC') { gc.major++; gc.majorMs += e.dur / 1000; }
  }
  const rows = [...busy].map(([k, us]) => {
    const pid = Number(k.split(':')[0]);
    return { name: `${(pname.get(pid) || 'p' + pid).replace(/ Process$/, '')}/${tname.get(k) || k}`, msPerSec: Math.round(us / 1000 / secs * 10) / 10 };
  }).filter((r) => r.msPerSec >= 0.5).sort((a, b) => b.msPerSec - a.msPerSec).slice(0, 12);
  rows.push({ name: 'GC', msPerSec: `minor ${gc.minor}×${Math.round(gc.minorMs)}ms major ${gc.major}×${Math.round(gc.majorMs)}ms /${secs}s` });
  return keepEvents ? { rows, events } : rows;
}

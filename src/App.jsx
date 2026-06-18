import { useState, useEffect, useCallback } from "react";

// ===== ★ここを設定 =====
const GAS_URL = "https://script.google.com/macros/s/AKfycbwPA5pcPvC4WFVXPdf9zxaZjZt1wjtyUFt7ey1FkNSHFcaKE6LPnwWcFvVBv7_eoe15/exec";
// ======================

const ADMIN_PASSWORD = "rock";
const SESSION_KEY    = "lockfills_session";

const LOCATION_OPTIONS = ["栗小", "南小", "ハクレン", "五霞BG"];

const DEFAULT_BOYS_MEMBERS  = ["橋本", "折原", "沢上", "篠崎", "鞠子", "中村(勘)", "櫻井", "中島", "小森谷", "染谷(優)", "菱沼", "平井", "武藤", "萱沼", "中村(彰)", "新井(佑)"];
const DEFAULT_GIRLS_MEMBERS = ["須藤", "広沢", "桑原", "塚越", "白井", "森", "関", "加藤る", "坂元", "目黒", "本田", "佐藤", "鈴木", "加藤"];

const DEFAULT_HOLIDAYS = [
  "2024-01-01","2024-01-08","2024-02-11","2024-02-12","2024-02-23","2024-03-20",
  "2024-04-29","2024-05-03","2024-05-04","2024-05-05","2024-05-06",
  "2024-07-15","2024-08-11","2024-08-12","2024-09-16","2024-09-22","2024-09-23",
  "2024-10-14","2024-11-03","2024-11-04","2024-11-23",
  "2025-01-01","2025-01-13","2025-02-11","2025-02-23","2025-02-24","2025-03-20",
  "2025-04-29","2025-05-03","2025-05-04","2025-05-05","2025-05-06",
  "2025-07-21","2025-08-11","2025-09-15","2025-09-23","2025-10-13",
  "2025-11-03","2025-11-23","2025-11-24",
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20",
  "2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23",
  "2026-10-12","2026-11-03","2026-11-23",
];
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const PRACTICE_DAYS = [0, 1, 2, 4, 6];
const WEEKDAY_DEFAULTS = {
  1: { location: "栗小", timeStart: "18:00", timeEnd: "20:00" },
  2: { location: "栗小", timeStart: "18:00", timeEnd: "19:00" },
  4: { location: "南小", timeStart: "18:00", timeEnd: "20:00" },
  6: { location: "南小", timeStart: "13:00", timeEnd: "17:00" },
  0: { location: "栗小", timeStart: "12:00", timeEnd: "16:00" },
  holiday: { location: "南小", timeStart: "9:00", timeEnd: "13:00" },
};

// ===== ユーティリティ =====
function getTodayJST() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
const getWeekday    = (d) => new Date(d + "T00:00:00").getDay();
const isWeekend     = (d) => { const w = getWeekday(d); return w === 0 || w === 6; };
const isHolidayFn   = (d, set) => set.has(d);
const isPracticeDay = (d, set) => isHolidayFn(d, set) || PRACTICE_DAYS.includes(getWeekday(d));
const getDefaults   = (d, set) => {
  const wd = getWeekday(d);
  if (isHolidayFn(d, set) && !isWeekend(d)) return WEEKDAY_DEFAULTS.holiday;
  return WEEKDAY_DEFAULTS[wd] || { location: "", timeStart: "", timeEnd: "" };
};
const toYM      = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
const ymToLabel = (ym) => { const [y, m] = ym.split("-"); return `${y}年${parseInt(m)}月`; };
const fmtDate   = (d, set) => {
  const dt = new Date(d + "T00:00:00");
  const showH = isHolidayFn(d, set) && !isWeekend(d);
  return `${dt.getMonth()+1}/${dt.getDate()}(${WEEKDAY_NAMES[getWeekday(d)]}${showH ? "・祝" : ""})`;
};
const fmtTime = (s, e) => (s || e) ? `${s || "?"}〜${e || "?"}` : "";

function makeRow(dateStr, set) {
  const def = getDefaults(dateStr, set);
  const dt  = new Date(dateStr + "T00:00:00");
  return {
    date: dateStr, day: WEEKDAY_NAMES[dt.getDay()],
    boysLocation: def.location, boysTimeStart: def.timeStart, boysTimeEnd: def.timeEnd, boysOff: false, boys: "", boysMatch: "",
    girlsLocation: def.location, girlsTimeStart: def.timeStart, girlsTimeEnd: def.timeEnd, girlsOff: false, girls: "", girlsMatch: "",
  };
}
function generateMonth(year, month, set) {
  const ym = toYM(year, month);
  const days = new Date(year, month, 0).getDate();
  const rows = [];
  for (let d = 1; d <= days; d++) {
    const ds = `${ym}-${String(d).padStart(2, "0")}`;
    if (isPracticeDay(ds, set)) rows.push(makeRow(ds, set));
  }
  return rows;
}

// ===== API =====
const isGasReady = () => !GAS_URL.includes("YOUR_SCRIPT_ID");
const gasReq  = async (p) => (await fetch(`${GAS_URL}?${new URLSearchParams(p)}`)).json();
const gasPost = async (b) => (await fetch(GAS_URL, { method: "POST", body: JSON.stringify(b) })).json();
const LS_KEY = "lockfills_v5";
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } };
const lsSave = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

// ===== PDF印刷 =====
function buildPrintHtml(rows, notice, boysM, girlsM, holidaysSet, currentYM) {
  const [y, m] = currentYM ? currentYM.split("-") : ["", ""];
  const monthLabel = currentYM ? `${y}年${parseInt(m)}月` : "";
  const rowsHtml = rows.map((s, i) => {
    const showH = isHolidayFn(s.date, holidaysSet) && !isWeekend(s.date);
    const wd = getWeekday(s.date); const dt = new Date(s.date + "T00:00:00");
    const dateLabel = `${dt.getMonth()+1}/${dt.getDate()}(${WEEKDAY_NAMES[wd]}${showH ? "祝" : ""})`;
    const rowBg = i % 2 === 0 ? "#f0f4ff" : "#ffffff";
    const dateBg = wd === 0 ? "#fef2f2" : wd === 6 ? "#eff6ff" : showH ? "#fff7ed" : rowBg;
    const dateColor = wd === 0 ? "#dc2626" : wd === 6 ? "#1d4ed8" : showH ? "#ea580c" : "#111";
    return `<tr>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;background:${dateBg};font-weight:700;color:${dateColor}">${dateLabel}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;background:${rowBg}">${s.boysOff?"休み":s.boysLocation}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;background:${rowBg}">${s.boysOff?"－":fmtTime(s.boysTimeStart,s.boysTimeEnd)}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;font-weight:700;background:${rowBg}">${s.boysOff?"－":(s.boys||"未定")}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;background:${rowBg}">${s.girlsOff?"休み":s.girlsLocation}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;background:${rowBg}">${s.girlsOff?"－":fmtTime(s.girlsTimeStart,s.girlsTimeEnd)}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;text-align:center;font-weight:700;background:${rowBg}">${s.girlsOff?"－":(s.girls||"未定")}</td>
      <td style="padding:4px 5px;border:1px solid #ccc;font-size:9pt;color:#555;background:${rowBg}">${(s.boysMatch||s.girlsMatch)?"※試合あり":""}</td>
    </tr>`;
  }).join("");
  const boysMHtml = boysM.map(s=>`<div style="font-size:10pt;margin-bottom:3px"><span style="font-weight:700;margin-right:6px">${fmtDate(s.date,holidaysSet)}</span>${s.boysMatch}</div>`).join("");
  const girlsMHtml = girlsM.map(s=>`<div style="font-size:10pt;margin-bottom:3px"><span style="font-weight:700;margin-right:6px">${fmtDate(s.date,holidaysSet)}</span>${s.girlsMatch}</div>`).join("");
  const matchHtml = (boysM.length>0||girlsM.length>0)?`<div style="margin-bottom:10px;border:1px solid #93c5fd;border-radius:4px;overflow:hidden"><div style="background:#1e3a8a;color:#fff;padding:4px 10px;font-size:11pt;font-weight:800">■ 試合・イベント情報</div><div style="padding:6px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">${boysM.length>0?`<div><div style="font-weight:800;font-size:10pt;color:#1d4ed8;margin-bottom:4px">【男子】</div>${boysMHtml}</div>`:""} ${girlsM.length>0?`<div><div style="font-weight:800;font-size:10pt;color:#be185d;margin-bottom:4px">【女子】</div>${girlsMHtml}</div>`:""}</div></div>`:"";
  const noticeHtml = notice?`<div style="border:1px solid #93c5fd;border-radius:4px;overflow:hidden"><div style="background:#1e3a8a;color:#fff;padding:4px 10px;font-size:11pt;font-weight:800">■ 連絡事項</div><div style="padding:6px 10px;font-size:10pt;line-height:1.9;white-space:pre-wrap">${notice}</div></div>`:"";
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}html,body{background:#fff!important;color:#111!important}body{font-family:'Noto Sans JP','Helvetica Neue',Arial,sans-serif;font-size:10pt;color:#111;margin:0;padding:10mm 12mm;background:#fff}@page{size:A4 portrait;margin:0}table{width:100%;border-collapse:collapse}</style></head><body>
  <div style="text-align:center;border-bottom:2.5px solid #1e3a8a;padding-bottom:8px;margin-bottom:12px"><div style="font-size:22pt;font-weight:900;color:#1e3a8a">🏀 ロックフィルズ通信</div><div style="font-size:13pt;color:#374151;margin-top:4px">${monthLabel}号　鍵当番表</div></div>
  <table style="margin-bottom:12px;font-size:10pt"><thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:5px;border:1px solid #888;width:15%">日付</th><th style="padding:5px;border:1px solid #888;width:12%">男子場所</th><th style="padding:5px;border:1px solid #888;width:13%">男子時間</th><th style="padding:5px;border:1px solid #888;width:11%">男子当番</th><th style="padding:5px;border:1px solid #888;width:12%">女子場所</th><th style="padding:5px;border:1px solid #888;width:13%">女子時間</th><th style="padding:5px;border:1px solid #888;width:11%">女子当番</th><th style="padding:5px;border:1px solid #888;width:13%">備考</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  ${matchHtml}${noticeHtml}
  <div style="text-align:right;margin-top:10px;font-size:9pt;color:#9ca3af">ROCKFILLS ミニバスケットボールチーム</div>
</body></html>`;
}

// ===== スタイル =====
const DAY_STYLE = {
  "月":{text:"#1d4ed8",badge:"#dbeafe"},"火":{text:"#7c3aed",badge:"#ede9fe"},
  "木":{text:"#15803d",badge:"#dcfce7"},"土":{text:"#1d4ed8",badge:"#bfdbfe"},
  "日":{text:"#be123c",badge:"#fecdd3"},
};
function Badge({children,bg,color,border}){return<span style={{display:"inline-block",padding:"1px 7px",borderRadius:6,background:bg,color,fontSize:11,fontWeight:700,border:border?`1px solid ${border}`:"none"}}>{children}</span>;}
function SmSelect({value,onChange,options,placeholder,disabled}){return(<select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{width:"100%",padding:"6px 24px 6px 8px",borderRadius:8,border:"1.5px solid #c7d2fe",background:disabled?"#f3f4f6":"#f8f9ff",color:value?"#111827":"#9ca3af",fontSize:12,outline:"none",appearance:"none",cursor:disabled?"not-allowed":"pointer",backgroundImage:disabled?"none":`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 7px center"}}><option value="">{placeholder}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>);}
function LocationInput({value,onChange}){const inList=LOCATION_OPTIONS.includes(value);const[free,setFree]=useState(!inList&&value!=="");const handleSel=(v)=>{if(v==="__other__"){setFree(true);onChange("");}else{setFree(false);onChange(v);}};return free?(<div style={{display:"flex",gap:4}}><input value={value} onChange={e=>onChange(e.target.value)} placeholder="場所を入力" autoFocus style={{flex:1,padding:"6px 8px",borderRadius:8,border:"1.5px solid #c7d2fe",background:"#f8f9ff",fontSize:12,outline:"none",boxSizing:"border-box"}}/><button onClick={()=>{setFree(false);onChange("");}} style={{padding:"4px 8px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#f9fafb",fontSize:11,cursor:"pointer",color:"#6b7280",flexShrink:0}}>▼</button></div>):(<select value={inList?value:"__other__"} onChange={e=>handleSel(e.target.value)} style={{width:"100%",padding:"6px 24px 6px 8px",borderRadius:8,border:"1.5px solid #c7d2fe",background:"#f8f9ff",color:value?"#111827":"#9ca3af",fontSize:12,outline:"none",appearance:"none",cursor:"pointer",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 7px center"}}><option value="">場所を選択</option>{LOCATION_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}<option value="__other__">✏️ 直接入力...</option></select>);}
const TIME_SLOTS=Array.from({length:33},(_,i)=>{const h=Math.floor(i/2)+6;const m=i%2===0?"00":"30";return{value:`${h}:${m}`,label:`${h}:${m}`};});
function TimeSelect({value,onChange,placeholder}){return(<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"6px 24px 6px 8px",borderRadius:8,border:"1.5px solid #c7d2fe",background:"#f8f9ff",color:value?"#111827":"#9ca3af",fontSize:12,outline:"none",appearance:"none",cursor:"pointer",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 7px center"}}><option value="">{placeholder}</option>{TIME_SLOTS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select>);}
function TimeInput({start,end,onStart,onEnd}){return(<div style={{display:"flex",alignItems:"center",gap:4}}><TimeSelect value={start} onChange={onStart} placeholder="開始"/><span style={{color:"#9ca3af",fontSize:11,flexShrink:0}}>〜</span><TimeSelect value={end} onChange={onEnd} placeholder="終了"/></div>);}
function OffToggle({checked,onChange,label}){return(<div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>onChange(!checked)}><div style={{width:36,height:20,borderRadius:10,position:"relative",background:checked?"#ef4444":"#d1d5db",transition:"background 0.2s",flexShrink:0}}><div style={{position:"absolute",top:2,left:checked?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/></div><span style={{fontSize:11,color:checked?"#ef4444":"#6b7280",fontWeight:checked?700:400}}>{checked?`${label}休み`:`${label}あり`}</span></div>);}

// ===== モーダル =====
function LoginModal({onClose,onLogin,busy,sessionErr}){const[pw,setPw]=useState("");const[err,setErr]=useState("");const tryLogin=()=>pw===ADMIN_PASSWORD?onLogin():setErr("パスワードが違います");return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}><div style={{background:"#fff",borderRadius:16,padding:24,width:300,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}><h3 style={{margin:"0 0 4px",fontSize:16,color:"#1e3a8a"}}>🔑 管理者ログイン</h3><p style={{margin:"0 0 14px",fontSize:12,color:"#6b7280"}}>パスワードを入力してください</p><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&!busy&&tryLogin()} placeholder="パスワード" autoFocus style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${err?"#ef4444":"#c7d2fe"}`,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:6}}/>{err&&<p style={{margin:"0 0 6px",fontSize:12,color:"#ef4444"}}>{err}</p>}{sessionErr&&<p style={{margin:"0 0 6px",fontSize:12,color:"#f59e0b"}}>🔒 {sessionErr}</p>}{busy&&<p style={{margin:"0 0 6px",fontSize:12,color:"#6b7280"}}>⏳ 確認中...</p>}<div style={{display:"flex",gap:8,marginTop:8}}><button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid #e5e7eb",background:"#f9fafb",color:"#374151",fontWeight:700,cursor:"pointer"}}>キャンセル</button><button onClick={tryLogin} disabled={busy} style={{flex:1,padding:10,borderRadius:10,border:"none",background:"linear-gradient(135deg,#1e3a8a,#312e81)",color:"#fff",fontWeight:700,cursor:busy?"not-allowed":"pointer"}}>ログイン</button></div></div></div>);}

function MembersModal({boys,girls,onSave,onClose,saving}){const[bi,setBi]=useState(boys.join("\n"));const[gi,setGi]=useState(girls.join("\n"));const parse=(s)=>s.split("\n").map(x=>x.trim()).filter(Boolean);return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}><div style={{background:"#fff",borderRadius:18,padding:24,width:340,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxHeight:"90vh",overflowY:"auto"}}><h3 style={{margin:"0 0 4px",fontSize:16,color:"#1e3a8a"}}>👥 メンバー管理</h3><p style={{margin:"0 0 16px",fontSize:12,color:"#6b7280"}}>1行に1名ずつ入力してください</p><div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:800,color:"#1d4ed8",display:"block",marginBottom:6}}>🔵 男子（{parse(bi).length}名）</label><textarea value={bi} onChange={e=>setBi(e.target.value)} rows={8} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #bfdbfe",background:"#eff6ff",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.9}}/></div><div style={{marginBottom:20}}><label style={{fontSize:12,fontWeight:800,color:"#be185d",display:"block",marginBottom:6}}>🔴 女子（{parse(gi).length}名）</label><textarea value={gi} onChange={e=>setGi(e.target.value)} rows={8} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #fbcfe8",background:"#fdf2f8",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.9}}/></div><div style={{display:"flex",gap:8}}><button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,border:"1.5px solid #e5e7eb",background:"#f9fafb",color:"#374151",fontWeight:700,cursor:"pointer"}}>キャンセル</button><button onClick={()=>onSave(parse(bi),parse(gi))} disabled={saving} style={{flex:2,padding:11,borderRadius:10,border:"none",background:saving?"#a5b4fc":"linear-gradient(135deg,#1e3a8a,#312e81)",color:"#fff",fontWeight:800,cursor:saving?"not-allowed":"pointer"}}>{saving?"⏳ 保存中...":"✓ 保存する"}</button></div></div></div>);}

function HolidaysModal({holidays,onSave,onClose,saving}){const[list,setList]=useState([...holidays].sort());const[input,setInput]=useState("");const[err,setErr]=useState("");const add=()=>{const v=input.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){setErr("YYYY-MM-DD形式で入力してください");return;}if(list.includes(v)){setErr("すでに登録されています");return;}setList(prev=>[...prev,v].sort());setInput("");setErr("");};const remove=(d)=>setList(prev=>prev.filter(x=>x!==d));const byYear=list.reduce((acc,d)=>{const y=d.slice(0,4);if(!acc[y])acc[y]=[];acc[y].push(d);return acc;},{});return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}><div style={{background:"#fff",borderRadius:18,padding:24,width:340,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}><h3 style={{margin:"0 0 4px",fontSize:16,color:"#1e3a8a"}}>🗓 祝日管理</h3><p style={{margin:"0 0 12px",fontSize:12,color:"#6b7280"}}>祝日を追加すると練習日として自動生成されます（南小 9:00〜13:00）</p><div style={{display:"flex",gap:6,marginBottom:6}}><input value={input} onChange={e=>{setInput(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="YYYY-MM-DD（例：2026-11-03）" style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${err?"#ef4444":"#c7d2fe"}`,fontSize:12,outline:"none"}}/><button onClick={add} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#1e3a8a,#312e81)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>追加</button></div>{err&&<p style={{margin:"0 0 8px",fontSize:11,color:"#ef4444"}}>{err}</p>}<div style={{flex:1,overflowY:"auto",marginBottom:14,border:"1.5px solid #e0e7ff",borderRadius:10}}>{Object.keys(byYear).sort().reverse().map(y=>(<div key={y}><div style={{padding:"5px 12px",background:"#eff6ff",fontSize:11,fontWeight:800,color:"#1d4ed8",borderBottom:"1px solid #e0e7ff"}}>{y}年</div>{byYear[y].map(d=>{const dt=new Date(d+"T00:00:00");const wd=WEEKDAY_NAMES[getWeekday(d)];return(<div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 12px",borderBottom:"1px solid #f3f4f6"}}><span style={{fontSize:13,color:isWeekend(d)?"#6b7280":"#ea580c"}}>{`${dt.getMonth()+1}/${dt.getDate()}(${wd})`}{isWeekend(d)&&<span style={{fontSize:10,color:"#9ca3af",marginLeft:4}}>土日と重複</span>}</span><button onClick={()=>remove(d)} style={{background:"#fee2e2",border:"none",borderRadius:6,color:"#ef4444",fontWeight:700,fontSize:12,padding:"2px 8px",cursor:"pointer"}}>削除</button></div>);})}</div>))}{list.length===0&&<p style={{textAlign:"center",color:"#9ca3af",fontSize:12,padding:16}}>祝日が登録されていません</p>}</div><div style={{display:"flex",gap:8}}><button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,border:"1.5px solid #e5e7eb",background:"#f9fafb",color:"#374151",fontWeight:700,cursor:"pointer"}}>キャンセル</button><button onClick={()=>onSave(list)} disabled={saving} style={{flex:2,padding:11,borderRadius:10,border:"none",background:saving?"#a5b4fc":"linear-gradient(135deg,#1e3a8a,#312e81)",color:"#fff",fontWeight:800,cursor:saving?"not-allowed":"pointer"}}>{saving?"⏳ 保存中...":"✓ 保存する"}</button></div></div></div>);}

function NewMonthModal({existingYMs,onClose,onCreate,holidaysSet}){const today=new Date();const[yearStr,setYearStr]=useState(String(today.getFullYear()));const[month,setMonth]=useState(today.getMonth()+1);const[creating,setCreating]=useState(false);const year=parseInt(yearStr)||0;const validYear=year>=2000&&year<=2099;const ym=validYear?toYM(year,month):"";const exists=existingYMs.includes(ym);const preview=validYear?generateMonth(year,month,holidaysSet):[];const handleCreate=async()=>{setCreating(true);await onCreate(year,month,preview);setCreating(false);};return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}><div style={{background:"#fff",borderRadius:18,padding:24,width:320,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}><h3 style={{margin:"0 0 4px",fontSize:16,color:"#1e3a8a"}}>📅 新規作成</h3><p style={{margin:"0 0 16px",fontSize:12,color:"#6b7280"}}>対象年月を入力してください</p><div style={{display:"flex",gap:8,marginBottom:14}}><input type="number" value={yearStr} onChange={e=>setYearStr(e.target.value)} placeholder="年（例：2027）" min="2000" max="2099" style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${validYear?"#bfdbfe":"#fca5a5"}`,background:validYear?"#eff6ff":"#fef2f2",fontSize:14,fontWeight:700,outline:"none",textAlign:"center"}}/><select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid #bfdbfe",background:"#eff6ff",fontSize:14,fontWeight:700,outline:"none"}}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}</select></div><div style={{background:"#f8faff",borderRadius:10,padding:"10px 12px",border:"1.5px solid #e0e7ff",marginBottom:14,maxHeight:160,overflowY:"auto"}}><p style={{margin:"0 0 6px",fontSize:11,color:"#6b7280",fontWeight:700}}>練習日プレビュー（{preview.length}日）</p>{!validYear&&<p style={{fontSize:12,color:"#ef4444"}}>2000〜2099の年を入力してください</p>}{preview.map(r=>(<div key={r.date} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0",borderBottom:"1px solid #f3f4f6",color:isHolidayFn(r.date,holidaysSet)&&!isWeekend(r.date)?"#ea580c":"#374151"}}><span style={{fontWeight:600}}>{fmtDate(r.date,holidaysSet)}</span><span style={{color:"#6b7280"}}>{r.boysLocation} {r.boysTimeStart}〜{r.boysTimeEnd}</span></div>))}</div>{exists&&<div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"7px 12px",marginBottom:12,fontSize:12,color:"#92400e"}}>⚠️ {ymToLabel(ym)}はすでに作成済みです。上書きされます。</div>}{creating&&<div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:10,padding:"10px",marginBottom:12,textAlign:"center"}}><div style={{fontSize:13,color:"#1d4ed8",fontWeight:700}}>⏳ 作成中です...</div><div style={{fontSize:11,color:"#6b7280",marginTop:4}}>スプレッドシートに保存しています</div></div>}<div style={{display:"flex",gap:8}}><button onClick={onClose} disabled={creating} style={{flex:1,padding:11,borderRadius:10,border:"1.5px solid #e5e7eb",background:creating?"#f3f4f6":"#f9fafb",color:"#374151",fontWeight:700,cursor:creating?"not-allowed":"pointer"}}>キャンセル</button><button onClick={handleCreate} disabled={!validYear||preview.length===0||creating} style={{flex:2,padding:11,borderRadius:10,border:"none",background:(!validYear||preview.length===0||creating)?"#a5b4fc":"linear-gradient(135deg,#1e3a8a,#312e81)",color:"#fff",fontWeight:800,cursor:(!validYear||preview.length===0||creating)?"not-allowed":"pointer"}}>{creating?"⏳ 作成中...":"作成する"}</button></div></div></div>);}

function DayCard({s,isAdmin,upd,boysMembers,girlsMembers,holidaysSet}){const[open,setOpen]=useState(false);const today=getTodayJST();const isPast=s.date<today;const isToday=s.date===today;const dc=DAY_STYLE[s.day]||{text:"#374151",badge:"#e5e7eb"};const dt=new Date(s.date+"T00:00:00");const showH=isHolidayFn(s.date,holidaysSet)&&!isWeekend(s.date);const bTime=fmtTime(s.boysTimeStart,s.boysTimeEnd);const gTime=fmtTime(s.girlsTimeStart,s.girlsTimeEnd);const sameSch=s.boysLocation===s.girlsLocation&&bTime===gTime&&!s.boysOff&&!s.girlsOff;
return(<div style={{borderRadius:14,marginBottom:8,overflow:"hidden",border:isToday?"2.5px solid #f59e0b":"1.5px solid #e0e7ff",background:"#fff",opacity:isPast?0.65:1,boxShadow:isToday?"0 4px 16px rgba(245,158,11,0.2)":"0 1px 4px rgba(0,0,0,0.05)"}}>
{isToday&&<div style={{background:"#f59e0b",color:"#fff",fontSize:10,fontWeight:800,textAlign:"center",padding:"3px 0",letterSpacing:"0.1em"}}>TODAY</div>}
<div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",padding:"10px 13px",gap:10,cursor:"pointer"}}>
<div style={{width:46,textAlign:"center",background:dc.badge,borderRadius:10,padding:"5px 3px",flexShrink:0}}><div style={{fontSize:15,fontWeight:900,color:dc.text,lineHeight:1}}>{dt.getMonth()+1}/{dt.getDate()}</div><div style={{fontSize:10,color:dc.text,fontWeight:700,marginTop:2}}>{s.day}{showH?"祝":""}</div></div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
{sameSch?(<><Badge bg="#fef9c3" color="#854d0e" border="#fde68a">{s.boysLocation}</Badge><span style={{fontSize:11,color:"#6b7280"}}>{bTime}</span></>):(<>{s.boysOff?<Badge bg="#fee2e2" color="#dc2626">🔵休み</Badge>:<><Badge bg="#dbeafe" color="#1e40af">🔵{s.boysLocation}</Badge><span style={{fontSize:11,color:"#6b7280"}}>{bTime}</span></>}<span style={{color:"#d1d5db",fontSize:10}}>|</span>{s.girlsOff?<Badge bg="#fee2e2" color="#dc2626">🔴休み</Badge>:<><Badge bg="#fce7f3" color="#9d174d">🔴{s.girlsLocation}</Badge><span style={{fontSize:11,color:"#6b7280"}}>{gTime}</span></>}</>)}
{s.boysMatch&&<Badge bg="#dbeafe" color="#1e40af">🔵試合</Badge>}{s.girlsMatch&&<Badge bg="#fce7f3" color="#9d174d">🔴試合</Badge>}
</div>
<div style={{display:"flex",gap:10}}>
<div style={{display:"flex",alignItems:"center",gap:4}}><Badge bg="#dbeafe" color="#1e40af">男</Badge><span style={{fontSize:12,fontWeight:(!s.boysOff&&s.boys)?700:400,color:s.boysOff?"#9ca3af":s.boys?"#111827":"#9ca3af"}}>{s.boysOff?"休み":s.boys||"未定"}</span></div>
<div style={{display:"flex",alignItems:"center",gap:4}}><Badge bg="#fce7f3" color="#9d174d">女</Badge><span style={{fontSize:12,fontWeight:(!s.girlsOff&&s.girls)?700:400,color:s.girlsOff?"#9ca3af":s.girls?"#111827":"#9ca3af"}}>{s.girlsOff?"休み":s.girls||"未定"}</span></div>
</div></div>
<span style={{color:"#d1d5db",fontSize:14,flexShrink:0}}>{open?"▲":"▼"}</span></div>
{open&&(<div style={{borderTop:"1px solid #e0e7ff",background:"#f8f9ff"}}>
{isAdmin?(<div style={{padding:"12px 13px 14px"}}>
<div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:"#1d4ed8"}}>🔵 男子</span><OffToggle checked={s.boysOff} onChange={v=>upd(s.date,"boysOff",v)} label="練習"/></div>
{!s.boysOff&&(<div style={{display:"grid",gap:8}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><label style={{fontSize:10,color:"#6b7280",fontWeight:700,display:"block",marginBottom:3}}>場所</label><LocationInput value={s.boysLocation} onChange={v=>upd(s.date,"boysLocation",v)}/></div><div><label style={{fontSize:10,color:"#6b7280",fontWeight:700,display:"block",marginBottom:3}}>時間</label><TimeInput start={s.boysTimeStart} end={s.boysTimeEnd} onStart={v=>upd(s.date,"boysTimeStart",v)} onEnd={v=>upd(s.date,"boysTimeEnd",v)}/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><label style={{fontSize:10,color:"#1d4ed8",fontWeight:700,display:"block",marginBottom:3}}>当番</label><SmSelect value={s.boys} onChange={v=>upd(s.date,"boys",v)} options={boysMembers} placeholder="選択"/></div><div><label style={{fontSize:10,color:"#1d4ed8",fontWeight:700,display:"block",marginBottom:3}}>試合情報</label><input value={s.boysMatch} onChange={e=>upd(s.date,"boysMatch",e.target.value)} placeholder="試合情報" style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"1.5px solid #c7d2fe",background:"#f8f9ff",fontSize:12,outline:"none",boxSizing:"border-box"}}/></div></div></div>)}</div>
<div style={{height:1,background:"#e0e7ff",margin:"0 0 14px"}}/>
<div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:"#be185d"}}>🔴 女子</span><OffToggle checked={s.girlsOff} onChange={v=>upd(s.date,"girlsOff",v)} label="練習"/></div>
{!s.girlsOff&&(<div style={{display:"grid",gap:8}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><label style={{fontSize:10,color:"#6b7280",fontWeight:700,display:"block",marginBottom:3}}>場所</label><LocationInput value={s.girlsLocation} onChange={v=>upd(s.date,"girlsLocation",v)}/></div><div><label style={{fontSize:10,color:"#6b7280",fontWeight:700,display:"block",marginBottom:3}}>時間</label><TimeInput start={s.girlsTimeStart} end={s.girlsTimeEnd} onStart={v=>upd(s.date,"girlsTimeStart",v)} onEnd={v=>upd(s.date,"girlsTimeEnd",v)}/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><label style={{fontSize:10,color:"#be185d",fontWeight:700,display:"block",marginBottom:3}}>当番</label><SmSelect value={s.girls} onChange={v=>upd(s.date,"girls",v)} options={girlsMembers} placeholder="選択"/></div><div><label style={{fontSize:10,color:"#be185d",fontWeight:700,display:"block",marginBottom:3}}>試合情報</label><input value={s.girlsMatch} onChange={e=>upd(s.date,"girlsMatch",e.target.value)} placeholder="試合情報" style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"1.5px solid #fbcfe8",background:"#fdf2f8",fontSize:12,outline:"none",boxSizing:"border-box"}}/></div></div></div>)}</div>
</div>):(<div style={{padding:"10px 13px 14px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div style={{background:s.boysOff?"#fef2f2":"#eff6ff",borderRadius:10,padding:"10px 12px",border:`1.5px solid ${s.boysOff?"#fca5a5":"#bfdbfe"}`}}><div style={{fontSize:10,color:"#1d4ed8",fontWeight:800,marginBottom:4}}>🔵 男子</div>{s.boysOff?<div style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>お休み</div>:<><div style={{fontSize:10,color:"#6b7280",marginBottom:2}}>{s.boysLocation}　{bTime}</div><div style={{fontSize:15,fontWeight:900,color:"#1e3a8a"}}>{s.boys||"未定"}</div></>}</div>
<div style={{background:s.girlsOff?"#fef2f2":"#fdf2f8",borderRadius:10,padding:"10px 12px",border:`1.5px solid ${s.girlsOff?"#fca5a5":"#fbcfe8"}`}}><div style={{fontSize:10,color:"#be185d",fontWeight:800,marginBottom:4}}>🔴 女子</div>{s.girlsOff?<div style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>お休み</div>:<><div style={{fontSize:10,color:"#6b7280",marginBottom:2}}>{s.girlsLocation}　{gTime}</div><div style={{fontSize:15,fontWeight:900,color:"#9d174d"}}>{s.girls||"未定"}</div></>}</div>
</div>{s.boysMatch&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"6px 12px",marginBottom:6,fontSize:12,color:"#1e3a8a"}}>🔵 男子試合：{s.boysMatch}</div>}{s.girlsMatch&&<div style={{background:"#fdf2f8",border:"1px solid #fbcfe8",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#9d174d"}}>🔴 女子試合：{s.girlsMatch}</div>}</div>)}
</div>)}</div>);}

function ScheduleView({rows,setRows,notice,setNotice,isAdmin,onSaveAll,saving,boysMembers,girlsMembers,holidaysSet,currentYM}){
  const upd=(date,field,value)=>setRows(prev=>prev.map(r=>r.date===date?{...r,[field]:value}:r));
  const boysM=rows.filter(r=>r.boysMatch);const girlsM=rows.filter(r=>r.girlsMatch);
  const handlePrint=()=>{const html=buildPrintHtml(rows,notice,boysM,girlsM,holidaysSet,currentYM);const win=window.open("about:blank","_blank");if(!win){alert("ポップアップがブロックされました。\nブラウザの設定でポップアップを許可してください。");return;}win.document.open();win.document.write(html);win.document.close();const doPrint=()=>{win.focus();win.print();};if(win.document.readyState==="complete"){setTimeout(doPrint,300);}else{win.onload=()=>setTimeout(doPrint,300);setTimeout(doPrint,1000);}};
  return(<div>
    {rows.map(s=><DayCard key={s.date} s={s} isAdmin={isAdmin} upd={upd} boysMembers={boysMembers} girlsMembers={girlsMembers} holidaysSet={holidaysSet}/>)}
    {(boysM.length>0||girlsM.length>0)&&(<div style={{marginTop:8,marginBottom:8,background:"#fff",borderRadius:14,border:"1.5px solid #e0e7ff",overflow:"hidden"}}><div style={{padding:"10px 16px",background:"linear-gradient(90deg,#1e3a8a,#312e81)",color:"#fff",fontSize:13,fontWeight:800}}>🏆 試合・イベント情報</div>{boysM.length>0&&(<div style={{padding:"10px 14px",borderBottom:girlsM.length>0?"1px solid #f3f4f6":"none"}}><div style={{marginBottom:6}}><Badge bg="#dbeafe" color="#1e40af">🔵 男子</Badge></div>{boysM.map(s=><div key={s.date} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #f9fafb"}}><span style={{fontSize:12,color:"#6b7280",minWidth:80,flexShrink:0}}>{fmtDate(s.date,holidaysSet)}</span><span style={{fontSize:12,color:"#1e3a8a",fontWeight:600}}>{s.boysMatch}</span></div>)}</div>)}{girlsM.length>0&&(<div style={{padding:"10px 14px"}}><div style={{marginBottom:6}}><Badge bg="#fce7f3" color="#9d174d">🔴 女子</Badge></div>{girlsM.map(s=><div key={s.date} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #f9fafb"}}><span style={{fontSize:12,color:"#6b7280",minWidth:80,flexShrink:0}}>{fmtDate(s.date,holidaysSet)}</span><span style={{fontSize:12,color:"#9d174d",fontWeight:600}}>{s.girlsMatch}</span></div>)}</div>)}</div>)}
    <div style={{marginBottom:12,background:"#fff",borderRadius:14,border:"1.5px solid #e0e7ff",overflow:"hidden"}}><div style={{padding:"10px 16px",background:"linear-gradient(90deg,#1e3a8a,#312e81)",color:"#fff",fontSize:13,fontWeight:800}}>📢 連絡事項</div><div style={{padding:"12px 14px"}}>{isAdmin?<textarea value={notice} onChange={e=>setNotice(e.target.value)} placeholder="保護者への連絡事項を入力してください..." rows={4} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #c7d2fe",background:"#f8f9ff",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.8}}/>:notice?<p style={{margin:0,fontSize:13,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{notice}</p>:<p style={{margin:0,fontSize:13,color:"#9ca3af"}}>連絡事項はありません</p>}</div></div>
    {isAdmin&&(<button onClick={onSaveAll} disabled={saving} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:saving?"#a5b4fc":"linear-gradient(135deg,#1e3a8a,#4f46e5)",color:"#fff",fontWeight:900,fontSize:16,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 4px 20px rgba(30,58,138,0.35)",letterSpacing:"0.03em",marginBottom:8}}>{saving?"⏳ 保存中...":"💾 この月の内容を保存する"}</button>)}
    <button onClick={handlePrint} style={{width:"100%",padding:"13px",borderRadius:14,border:"1.5px solid #1e3a8a",background:"#fff",color:"#1e3a8a",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>🖨️ PDF出力（印刷）</button>
  </div>);}

// ===== メインアプリ =====
export default function App() {
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [showLogin,     setShowLogin]     = useState(false);
  const [showNewModal,  setShowNewModal]  = useState(false);
  const [showMembers,   setShowMembers]   = useState(false);
  const [showHolidays,  setShowHolidays]  = useState(false);
  const [sessionToken,  setSessionToken]  = useState(null);
  const [sessionBusy,   setSessionBusy]   = useState(false);
  const [sessionErr,    setSessionErr]    = useState("");
  const [availableYMs,  setAvailableYMs]  = useState([]);
  const [currentYM,     setCurrentYM]     = useState(null);
  const [currentRows,   setCurrentRows]   = useState([]);
  const [currentNotice, setCurrentNotice] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveToast,     setSaveToast]     = useState("");
  const [error,         setError]         = useState(null);
  const [localData,     setLocalData]     = useState(lsLoad);
  const gasOk = isGasReady();

  const [boysMembers,    setBoysMembers]    = useState(() => lsLoad().__boys     || DEFAULT_BOYS_MEMBERS);
  const [girlsMembers,   setGirlsMembers]   = useState(() => lsLoad().__girls    || DEFAULT_GIRLS_MEMBERS);
  const [savingMembers,  setSavingMembers]  = useState(false);
  const [holidays,       setHolidays]       = useState(() => lsLoad().__holidays || DEFAULT_HOLIDAYS);
  const [savingHolidays, setSavingHolidays] = useState(false);
  const [publishedYMs,   setPublishedYMs]   = useState({});
  const [publishedLoaded,setPublishedLoaded]= useState(false);
  const holidaysSet = new Set(holidays);

  // 公開判定
  const isVisible = (ym) => isAdmin || publishedYMs[ym] === true;

  // ===== 初期化：直列実行で競合を防ぐ =====
  useEffect(() => {
    (async () => {
      let pub = {};

      if (gasOk) {
        try {
          const md = await gasReq({ action: "getMembers" });
          if (md.boys?.length)     setBoysMembers(md.boys);
          if (md.girls?.length)    setGirlsMembers(md.girls);
          if (md.holidays?.length) setHolidays(md.holidays);
          pub = md.published || {};
          setPublishedYMs(pub);
        } catch {}
      }
      setPublishedLoaded(true);

      // YM一覧取得
      if (!gasOk) {
        const keys = Object.keys(lsLoad()).filter(k => !k.startsWith("__")).sort().reverse().slice(0, 4);
        setAvailableYMs(keys);
        const pubKeys = keys.filter(k => pub[k] === true);
        setCurrentYM(pubKeys[0] || keys[0] || null);
        return;
      }
      try {
        setLoading(true);
        const ld = await gasReq({ action: "list" });
        const sorted = (ld.yms || []).sort().reverse().slice(0, 4);
        setAvailableYMs(sorted);
        // 公開中の最新月を選択（なければ管理者向けに最新月）
        const pubKeys = sorted.filter(k => pub[k] === true);
        setCurrentYM(pubKeys[0] || sorted[0] || null);
      } catch { setError("データの読み込みに失敗しました"); }
      finally { setLoading(false); }
    })();
  }, []); // 初回のみ

  // currentYM変化時にデータ取得
  useEffect(() => {
    if (!currentYM) return;
    if (!gasOk) { const d = localData[currentYM] || {}; setCurrentRows(d.rows || []); setCurrentNotice(d.notice || ""); return; }
    (async () => {
      setLoading(true); setError(null);
      try { const data = await gasReq({ action: "get", ym: currentYM }); setCurrentRows(data.rows || []); setCurrentNotice(data.notice || ""); }
      catch { setError("データ取得に失敗しました"); }
      finally { setLoading(false); }
    })();
  }, [currentYM, gasOk]);

  // ===== ハンドラ =====
  const handleSaveMembers = async (boys, girls) => {
    setSavingMembers(true);
    try { if (!gasOk) { lsSave({ ...lsLoad(), __boys: boys, __girls: girls }); } else { await gasPost({ action: "saveMembers", boys, girls }); } setBoysMembers(boys); setGirlsMembers(girls); setShowMembers(false); setSaveToast("✓ メンバーを保存しました！"); setTimeout(() => setSaveToast(""), 3000); }
    catch { setSaveToast("⚠️ 保存に失敗しました"); } finally { setSavingMembers(false); }
  };
  const handleSaveHolidays = async (list) => {
    setSavingHolidays(true);
    try { if (!gasOk) { lsSave({ ...lsLoad(), __holidays: list }); } else { await gasPost({ action: "saveHolidays", holidays: list }); } setHolidays(list); setShowHolidays(false); setSaveToast("✓ 祝日を保存しました！"); setTimeout(() => setSaveToast(""), 3000); }
    catch { setSaveToast("⚠️ 保存に失敗しました"); } finally { setSavingHolidays(false); }
  };
  const handleTogglePublish = async (ym) => {
    const nextVal = publishedYMs[ym] !== true;
    const next = { ...publishedYMs, [ym]: nextVal };
    setPublishedYMs(next);
    try { if (!gasOk) { lsSave({ ...lsLoad(), __published: next }); } else { await gasPost({ action: "savePublished", published: next }); } setSaveToast(nextVal ? "✓ 公開しました！" : "🔒 非公開にしました"); setTimeout(() => setSaveToast(""), 3000); }
    catch { setSaveToast("⚠️ 保存に失敗しました"); }
  };
  const handleLogin = async () => {
    if (!gasOk) { setIsAdmin(true); setShowLogin(false); return; }
    setSessionBusy(true); setSessionErr("");
    const token = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try { const res = await gasPost({ action: "startSession", token }); if (res.ok) { setSessionToken(token); sessionStorage.setItem(SESSION_KEY, token); setIsAdmin(true); setShowLogin(false); } else { setSessionErr("現在ほかの管理者がログイン中です。しばらくお待ちください。"); } }
    catch { setSessionErr("セッション確認に失敗しました。"); } finally { setSessionBusy(false); }
  };
  const handleLogout = async () => {
    if (sessionToken && gasOk) await gasPost({ action: "endSession", token: sessionToken });
    setSessionToken(null); sessionStorage.removeItem(SESSION_KEY); setIsAdmin(false);
  };
  useEffect(() => {
    const cleanup = () => { if (sessionToken && gasOk) gasPost({ action: "endSession", token: sessionToken }); };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, [sessionToken, gasOk]);

  const handleCreate = async (year, month, rows) => {
    const ym = toYM(year, month);
    const nextPub = { ...publishedYMs, [ym]: false }; // 新規は非公開
    if (!gasOk) {
      const updated = { ...localData, [ym]: { rows, notice: "" } };
      setLocalData(updated); lsSave(updated);
      setAvailableYMs(Object.keys(updated).filter(k => !k.startsWith("__")).sort().reverse().slice(0, 4));
      setPublishedYMs(nextPub); lsSave({ ...lsLoad(), __published: nextPub });
      setCurrentYM(ym); setCurrentRows(rows); setCurrentNotice(""); setShowNewModal(false); return;
    }
    setSaving(true);
    try {
      await gasPost({ action: "save", ym, rows, notice: "" });
      await gasPost({ action: "savePublished", published: nextPub });
      setPublishedYMs(nextPub);
      // YM一覧を再取得
      const ld = await gasReq({ action: "list" });
      const sorted = (ld.yms || []).sort().reverse().slice(0, 4);
      setAvailableYMs(sorted);
      setCurrentYM(ym); setCurrentRows(rows); setCurrentNotice("");
    } catch { setError("作成に失敗しました"); }
    finally { setSaving(false); setShowNewModal(false); }
  };
  const handleSaveAll = async () => {
    if (!currentYM) return; setSaving(true);
    try {
      if (!gasOk) { const updated = { ...localData, [currentYM]: { rows: currentRows, notice: currentNotice } }; setLocalData(updated); lsSave(updated); }
      else { await gasPost({ action: "save", ym: currentYM, rows: currentRows, notice: currentNotice }); }
      setSaveToast("✓ 保存しました！");
    } catch { setSaveToast("⚠️ 保存に失敗しました"); }
    finally { setSaving(false); setTimeout(() => setSaveToast(""), 3000); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "'Noto Sans JP','Helvetica Neue',Arial,sans-serif", paddingBottom: 60, maxWidth: 580, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#312e81)", padding: "16px 16px 12px", color: "#fff", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 4px 20px rgba(30,58,138,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🏀</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.1em" }}>ROCKFILLS</div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, whiteSpace: "nowrap" }}>ロックフィルズ通信</h1>
              {currentYM && <div style={{ fontSize: 10, opacity: 0.8 }}>{ymToLabel(currentYM)} 鍵当番表</div>}
            </div>
          </div>
          {isAdmin ? <Badge bg="#fef08a" color="#713f12">⚙️ 管理者</Badge>
            : <button onClick={() => setShowLogin(true)} style={{ flexShrink: 0, fontSize: 12, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>🔑 管理者</button>}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <button onClick={() => setShowNewModal(true)} style={{ flex: 1, minWidth: "calc(50% - 3px)", fontSize: 12, background: "rgba(255,255,255,0.92)", color: "#1e3a8a", border: "none", borderRadius: 8, padding: "7px 4px", cursor: "pointer", fontWeight: 700 }}>＋ 新規作成</button>
            <button onClick={() => setShowMembers(true)}  style={{ flex: 1, minWidth: "calc(50% - 3px)", fontSize: 12, background: "rgba(255,255,255,0.92)", color: "#1e3a8a", border: "none", borderRadius: 8, padding: "7px 4px", cursor: "pointer", fontWeight: 700 }}>👥 メンバー</button>
            <button onClick={() => setShowHolidays(true)} style={{ flex: 1, minWidth: "calc(50% - 3px)", fontSize: 12, background: "rgba(255,255,255,0.92)", color: "#1e3a8a", border: "none", borderRadius: 8, padding: "7px 4px", cursor: "pointer", fontWeight: 700 }}>🗓 祝日</button>
            <button onClick={handleLogout}                style={{ flex: 1, minWidth: "calc(50% - 3px)", fontSize: 12, background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 4px", cursor: "pointer" }}>ログアウト</button>
          </div>
        )}
        {publishedLoaded && availableYMs.length > 0 && (
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
            {availableYMs.filter(ym => isVisible(ym)).map(ym => {
              const isPublished = publishedYMs[ym] === true;
              const isActive = currentYM === ym;
              return (
                <div key={ym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <button onClick={() => setCurrentYM(ym)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: isActive ? "#fff" : "rgba(255,255,255,0.18)", color: isActive ? "#1e3a8a" : "#fff", fontWeight: isActive ? 800 : 400, fontSize: 12, cursor: "pointer", opacity: isAdmin && !isPublished ? 0.7 : 1 }}>
                    {ymToLabel(ym)}{isAdmin && !isPublished ? " 🔒" : ""}
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleTogglePublish(ym)} style={{ fontSize: 9, padding: "1px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: isPublished ? "#22c55e" : "#ef4444", color: "#fff", fontWeight: 700 }}>
                      {isPublished ? "公開中" : "非公開"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!gasOk && <div style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "8px 16px", fontSize: 12, color: "#92400e" }}>⚠️ GAS未接続：ローカル保存モードで動作中</div>}

      {showLogin    && <LoginModal onClose={() => { setShowLogin(false); setSessionErr(""); }} onLogin={handleLogin} busy={sessionBusy} sessionErr={sessionErr} />}
      {showNewModal && isAdmin && <NewMonthModal existingYMs={availableYMs} onClose={() => setShowNewModal(false)} onCreate={handleCreate} holidaysSet={holidaysSet} />}
      {showMembers  && isAdmin && <MembersModal boys={boysMembers} girls={girlsMembers} onSave={handleSaveMembers} onClose={() => setShowMembers(false)} saving={savingMembers} />}
      {showHolidays && isAdmin && <HolidaysModal holidays={holidays} onSave={handleSaveHolidays} onClose={() => setShowHolidays(false)} saving={savingHolidays} />}

      {saveToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: saveToast.startsWith("✓") ? "#22c55e" : "#ef4444", color: "#fff", padding: "10px 24px", borderRadius: 20, fontWeight: 700, fontSize: 14, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {saveToast}
        </div>
      )}

      <div style={{ padding: "14px 12px" }}>
        {error   && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#dc2626" }}>⚠️ {error}</div>}
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>⏳ 読み込み中...</div>}

        {!loading && publishedLoaded && availableYMs.filter(ym => isVisible(ym)).length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <p style={{ fontSize: 14, marginBottom: 4 }}>{isAdmin ? "まだ当番表がありません" : "現在公開中の当番表はありません"}</p>
            {isAdmin && <p style={{ fontSize: 12 }}>「＋ 新規作成」で作成してください</p>}
          </div>
        )}

        {!loading && publishedLoaded && currentYM && isVisible(currentYM) && currentRows.length > 0 && (
          <ScheduleView rows={currentRows} setRows={setCurrentRows} notice={currentNotice} setNotice={setCurrentNotice} isAdmin={isAdmin} onSaveAll={handleSaveAll} saving={saving} boysMembers={boysMembers} girlsMembers={girlsMembers} holidaysSet={holidaysSet} currentYM={currentYM} />
        )}
      </div>
    </div>
  );
}
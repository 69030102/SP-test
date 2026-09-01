const CONFIG = {
  FREE_MINUTES: 60,
  RATE_PER_HOUR: 20,
  CURRENCY: "฿"
};

let LANG = "th";

const STR = {
  th: {
    store_sub: "ทางเข้า · จุดออกบัตรอัตโนมัติ",
    home_title: "สแกน QR เพื่อรับบิลจอดรถ",
    home_sub: "ใช้กล้องมือถือสแกนโค้ดด้านล่าง ระบบจะออกบิลจอดรถให้ทันทีตามเวลาที่สแกน",
    scan_label: "SCAN TO ENTER",
    awaiting: "รอสแกน...",
    ticket_sub: "เก็บใบนี้ไว้ หรือบันทึกเป็นรูปภาพ แสดง QR ด้านล่างตอนออกจากลานจอด",
    label_id: "หมายเลขบัตร",
    label_checkin: "เวลาเข้าจอด",
    label_rate: "อัตราค่าจอด",
    stamp_text: "เข้าจอด\nแล้ว",
    exit_label: "SCAN TO EXIT",
    save_ticket_btn: "บันทึกบัตรลงมือถือ",
    rate_note: h => `ชั่วโมงแรกฟรี จากนั้นคิด ${CONFIG.CURRENCY}${h} ต่อชั่วโมง`,
    not_found_title: "ไม่พบข้อมูลบัตร",
    not_found_sub: "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ",
    back_home: "กลับหน้าแรก",
    staff_link: "สำหรับเจ้าหน้าที่ (สแกนออก) →",
    footer_note: "โปรดเก็บใบนี้ไว้จนกว่าจะออกจากลานจอด"
  },
  en: {
    store_sub: "Entry Terminal · Auto Ticketing",
    home_title: "Scan the QR to get a parking ticket",
    home_sub: "Use your phone camera to scan the code below. A ticket will be issued instantly.",
    scan_label: "SCAN TO ENTER",
    awaiting: "Awaiting scan...",
    ticket_sub: "Keep this ticket, or save it as an image. Show the QR below when you leave.",
    label_id: "Ticket No.",
    label_checkin: "Check-in time",
    label_rate: "Rate",
    stamp_text: "ENTRY\nOK",
    exit_label: "SCAN TO EXIT",
    save_ticket_btn: "Save ticket to phone",
    rate_note: h => `First hour free, then ${CONFIG.CURRENCY}${h} per hour`,
    not_found_title: "Ticket not found",
    not_found_sub: "This link is invalid or expired.",
    back_home: "Back to home",
    staff_link: "Staff exit scanner →",
    footer_note: "Please keep this ticket until you leave the car park"
  }
};

function tr(k, ...args){
  const v = STR[LANG][k];
  return typeof v === "function" ? v(...args) : v;
}

function dtLocale(){ return LANG === "th" ? "th-TH" : "en-GB"; }

function fmtDateTime(ms){
  const d = new Date(ms);
  const dateStr = d.toLocaleDateString(dtLocale(), { day:'2-digit', month:'2-digit', year:'numeric' });
  const timeStr = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
  return `<span class="num-val">${dateStr}&nbsp;&nbsp;${timeStr}</span>`;
}

function playDing(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1318.51, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.55);
  }catch(e){}
}

function vibrate(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

function parseHash(){
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = hash.split("?");
  const params = new URLSearchParams(qs || "");
  return { path: path || "/", params };
}

function buildUrl(path, params){
  const qs = new URLSearchParams(params).toString();
  return location.origin + location.pathname + "#" + path + (qs ? "?" + qs : "");
}

function lineItem(label, value){
  return `<div class="li"><span class="lbl">${label}</span><span class="fill"></span><span class="val">${value}</span></div>`;
}

function render(){
  const { path, params } = parseHash();
  const view = document.getElementById("view");
  view.innerHTML = "";

  if(path === "/") renderHome(view);
  else if(path === "/checkin") handleCheckin();
  else if(path === "/ticket") renderTicket(view, params);
  else renderNotFound(view);
}

function renderHome(view){
  view.innerHTML = `
    <div class="receipt-wrap fade-in">
      <div class="torn top"></div>
      <div class="receipt">
        <div class="store">
          <div class="store-name">SMART PARKING</div>
          <div class="store-sub">${tr('store_sub')}</div>
        </div>
        <div class="dash"></div>
        <p class="msg-title">${tr('home_title')}</p>
        <p class="msg-sub">${tr('home_sub')}</p>
        <div class="qr-label">${tr('scan_label')}</div>
        <div class="qr-wrap" id="qrcode"></div>
        <p class="status-line">${tr('awaiting')}</p>
      </div>
      <div class="torn bottom"></div>
    </div>
    <a class="staff-link" href="exit-scan.html">${tr('staff_link')}</a>
  `;
  const url = buildUrl("/checkin", {});
  new QRCode(document.getElementById("qrcode"), { text: url, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
}

function handleCheckin(){
  let ticketId = "";
  try {
    if(window.pyscript && pyscript.interpreter && pyscript.interpreter.globals){
      const pyGen = pyscript.interpreter.globals.get('gen_ticket_id_py');
      ticketId = pyGen();
    }
  } catch(e) {}

  if(!ticketId){
    const randSuffix = Math.random().toString(36).slice(2, 4).toUpperCase();
    ticketId = "P-" + Date.now().toString(36).toUpperCase().slice(-6) + randSuffix;
  }

  const t = Date.now();
  location.replace(buildUrl("/ticket", { id: ticketId, t }));
}

function renderTicket(view, params){
  const id = params.get("id");
  const t = Number(params.get("t"));
  if(!id || !t) return renderNotFound(view);

  view.innerHTML = `
    <div class="receipt-wrap">
      <div class="torn top"></div>
      <div class="receipt print-in" id="ticketCard">
        <div class="stamp stamp-in" id="entryStamp">${tr('stamp_text').replace('\n','<br>')}</div>
        <div class="store">
          <div class="store-name">SMART PARKING</div>
          <div class="store-sub">${tr('store_sub')}</div>
        </div>
        <div class="dash"></div>
        <p class="msg-sub" style="margin-bottom:12px;">${tr('ticket_sub')}</p>
        ${lineItem(tr('label_id'), `<span class="num-val">${id}</span>`)}
        ${lineItem(tr('label_checkin'), fmtDateTime(t))}
        ${lineItem(tr('label_rate'), `<span class="num-val">${CONFIG.CURRENCY}${CONFIG.RATE_PER_HOUR}/ชม.</span>`)}
        <div class="dash"></div>
        <div class="qr-label">${tr('exit_label')}</div>
        <div class="qr-wrap" id="qrcode"></div>
        <p class="footer-note">${tr('footer_note')}</p>
      </div>
      <div class="torn bottom"></div>
    </div>
    <button class="btn no-print" id="saveBtn">${tr('save_ticket_btn')}</button>
    <p class="rate-note">${tr('rate_note', CONFIG.RATE_PER_HOUR)}</p>
  `;

  const checkoutUrl = buildUrl("/checkout", { id, t });
  new QRCode(document.getElementById("qrcode"), { text: checkoutUrl, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });

  playDing();
  vibrate(60);

  document.getElementById("saveBtn").onclick = async () => {
    const btn = document.getElementById("saveBtn");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    try{
      if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
      
      const targetCard = document.getElementById("ticketCard");
      
      const canvas = await html2canvas(targetCard, { 
        backgroundColor: "#fbfaf4", 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: true,
        logging: false
      });
      
      const link = document.createElement("a");
      link.download = "parking-ticket-" + id + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  };
}

function renderNotFound(view){
  view.innerHTML = `
    <div class="receipt-wrap fade-in">
      <div class="torn top"></div>
      <div class="receipt error">
        <div class="store">
          <div class="store-name">SMART PARKING</div>
        </div>
        <div class="dash"></div>
        <p class="msg-title">${tr('not_found_title')}</p>
        <p class="msg-sub">${tr('not_found_sub')}</p>
        <a class="btn" href="#/" style="color:var(--ink); border-color:var(--ink);">${tr('back_home')}</a>
      </div>
      <div class="torn bottom"></div>
    </div>
  `;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  const langLabel = document.getElementById("langLabel");
  const langToggle = document.getElementById("langToggle");
  if(langToggle){
    langToggle.onclick = () => {
      LANG = LANG === "th" ? "en" : "th";
      if(langLabel) langLabel.textContent = LANG === "th" ? "EN" : "TH";
      render();
    };
  }
  
  if(document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if(!location.hash) location.hash = "/";
      render();
    });
  } else {
    if(!location.hash) location.hash = "/";
    render();
  }
});

(function(){
    // Create debug panel
    const container = document.createElement('div');
    container.id = 'inpageDebug';
    Object.assign(container.style, {
        position: 'fixed', right: '10px', bottom: '10px', zIndex: 9999,
        width: '360px', maxHeight: '45vh', overflow: 'auto',
        background: 'rgba(0,0,0,0.8)', color: '#fff', fontFamily: 'monospace',
        fontSize: '12px', padding: '8px', borderRadius: '6px', boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
    });

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:12px">Debug Console</strong>
            <button id="dbgClear" style="background:transparent;border:1px solid rgba(255,255,255,0.12);color:#fff;padding:2px 6px;border-radius:4px;cursor:pointer">Clear</button>
        </div>
        <div id="dbgOutput"></div>
    `;

    document.body.appendChild(container);
    const out = document.getElementById('dbgOutput');
    const clearBtn = document.getElementById('dbgClear');

    function append(msg, type='log'){
        const el = document.createElement('div');
        el.style.marginBottom = '6px';
        el.style.whiteSpace = 'pre-wrap';
        el.style.opacity = '0.95';
        if(type==='error') el.style.color = '#ff6b6b';
        else if(type==='warn') el.style.color = '#f59e0b';
        else el.style.color = '#cbd5e1';
        el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        out.appendChild(el);
        out.scrollTop = out.scrollHeight;
    }

    // Capture console
    ['log','info','warn','error'].forEach(level => {
        const orig = console[level];
        console[level] = function(...args){
            try{ append(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), level==='error'?'error':(level==='warn'?'warn':'log')); }catch(e){}
            orig.apply(console, args);
        };
    });

    // Window errors
    window.addEventListener('error', (e) => {
        append(`ERROR: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`, 'error');
    });

    window.addEventListener('unhandledrejection', (e) => {
        append(`UNHANDLED REJECTION: ${e.reason && e.reason.message ? e.reason.message : JSON.stringify(e.reason)}`, 'error');
    });

    clearBtn.addEventListener('click', () => { out.innerHTML = ''; });

    if(window.innerWidth < 600){
        container.style.display = 'none';
    }
})();

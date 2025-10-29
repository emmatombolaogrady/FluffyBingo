/* Bingo Mobile Prototype Logic - Multi Ticket Version */
(function(){
  // Lobby element references
  const lobbyEl = document.getElementById('lobby');
  const lobbyCountdownEl = document.getElementById('lobbyCountdown');
  const countNumEl = document.getElementById('countNum');
  const countInlineEl = document.getElementById('countInline');
  const lobbyReadyMsgEl = document.getElementById('lobbyReadyMsg');
  const startGameBtn = document.getElementById('startGameBtn');
  const roomButtons = Array.from(document.querySelectorAll('.lobby-btn[data-room]'));
  const shapeButtons = Array.from(document.querySelectorAll('.lobby-btn[data-shape]'));
  const stakeButtons = Array.from(document.querySelectorAll('.lobby-btn[data-stake]'));
  let selectedRoom = null;
  let selectedShape = null;
  let selectedStake = null;

  // Multi-ticket references
  const ticketEls = [
    document.getElementById('ticket1'),
    document.getElementById('ticket2'),
    document.getElementById('ticket3')
  ].filter(Boolean);
  const oneAwayContainers = [
    document.getElementById('oneAwayContainer1'),
    document.getElementById('oneAwayContainer2'),
    document.getElementById('oneAwayContainer3')
  ].filter(Boolean);

  const drawBtn = document.getElementById('drawBtn');
  const resetBtn = document.getElementById('resetBtn');
  const lastDrawEl = document.getElementById('lastDraw');
  const toastEl = document.getElementById('toast');
  const winAnnounceEl = document.getElementById('winAnnouncement');
  const oneAwayAnnounceEl = document.getElementById('oneAwayAnnounce');
  const winModal = document.getElementById('winModal');
  const winnersPanel = document.getElementById('winnersPanel');
  const closeWinnersBtn = document.getElementById('closeWinnersBtn');
  const lineModal = document.getElementById('lineModal');
  const lineModalTitle = document.getElementById('lineModalTitle');
  const lineModalMsg = document.getElementById('lineModalMsg');
  const progressFill = document.getElementById('progressFill');
  const progressBar = document.getElementById('progressBar');
  const bonusBtn = document.getElementById('bonusBtn');
  const bonusModal = document.getElementById('bonusModal');
  const bonusCaller = document.getElementById('bonusCaller');
  const closeBonusBtn = document.getElementById('closeBonusBtn');
  const bonusAnnounce = document.getElementById('bonusAnnounce');
  // Claw machine elements
  const clawEl = document.getElementById('claw');
  const clawGoBtn = document.getElementById('clawGoBtn');
  const prizeItemsContainer = document.getElementById('prizeItems');
  const clawStatus = document.getElementById('clawStatus');
  const clawWinnersEl = document.getElementById('clawWinners');

  let drawnNumbers = new Set();
  let ticketNumbersArr = []; // array of tickets, each column-major 5x5
  let gameOver = false;
  let completedRows = new Set(); // track ticketIndex:row combos
  let linePrizeCount = 0; // number of line prizes awarded (across all tickets)
  let inBonus = false;
  // Near-win (1TG) tracking state: maintain current active near-win row keys 'ticketIndex:row'
  let currentNearWinRows = new Set();
  // Claw machine state
  let clawPicks = 0; // number of completed picks
  let clawBusy = false; // prevents concurrent cycles
  let clawChosen = new Set(); // track picked prize item indices
  let clawTimers = []; // store timeouts for cleanup

  function init() {
    buildTickets();
    drawnNumbers.clear();
    gameOver = false;
    completedRows.clear();
    linePrizeCount = 0;
    currentNearWinRows.clear();
    lastDrawEl.textContent = '';
    hideToast();
    resetProgress();
    endBonus();
    // Clear any residual 1TG badges while retaining slot structure
    clearOneAwayBadges();
  }

  // Lobby logic
  function evaluateLobbyReady(){
    if(startGameBtn){
      const allChosen = !!(selectedRoom && selectedShape && selectedStake);
      startGameBtn.disabled = !allChosen;
      if(allChosen){
        startGameBtn.setAttribute('aria-label','All selections made. Start game');
        startGameBtn.textContent='Start Game';
      } else {
        // Provide inline hint of remaining selections
        const missing = [];
        if(!selectedRoom) missing.push('club');
        if(!selectedStake) missing.push('stake');
        if(!selectedShape) missing.push('bonus shape');
        startGameBtn.textContent = 'Choose '+ missing.join(', ');
        startGameBtn.setAttribute('aria-label','Please choose '+ missing.join(', ') + ' before starting the game');
      }
    }
  }
  function handleRoomSelect(btn){
    selectedRoom = btn.getAttribute('data-room');
    roomButtons.forEach(b=>b.classList.toggle('selected', b===btn));
    evaluateLobbyReady();
  }
  function handleShapeSelect(btn){
    selectedShape = btn.getAttribute('data-shape');
    shapeButtons.forEach(b=>b.classList.toggle('selected', b===btn));
    evaluateLobbyReady();
  }
  function handleStakeSelect(btn){
    selectedStake = btn.getAttribute('data-stake');
    stakeButtons.forEach(b=>b.classList.toggle('selected', b===btn));
    evaluateLobbyReady();
  }
  roomButtons.forEach(btn=> btn.addEventListener('click', ()=> handleRoomSelect(btn)) );
  shapeButtons.forEach(btn=> btn.addEventListener('click', ()=> handleShapeSelect(btn)) );
  stakeButtons.forEach(btn=> btn.addEventListener('click', ()=> handleStakeSelect(btn)) );

  function startLobbyCountdown(){
    if(lobbyCountdownEl.hidden === false) return;
    let count = 5;
    lobbyCountdownEl.hidden = false;
    lobbyReadyMsgEl.hidden = false;
    updateCountdown(count);
    beepCountdownNumber(count);
    const interval = setInterval(()=>{
      count--;
      if(count === 1){
        updateCountdown(count);
        beepCountdownNumber(count);
        setTimeout(()=>{ if(lobbyEl && !lobbyEl.classList.contains('fade-out')) lobbyEl.classList.add('fade-out'); },1000);
      } else if(count <= 0){
        clearInterval(interval);
        setTimeout(()=>{ finalizeLobbyStart(); },950);
      } else {
        updateCountdown(count);
        beepCountdownNumber(count);
      }
    },1000);
  }
  function updateCountdown(val){
    if(countNumEl){
      countNumEl.textContent = val;
      countNumEl.style.animation='none';
      void countNumEl.offsetWidth;
      countNumEl.style.animation='countPop .8s ease';
    }
    if(countInlineEl) countInlineEl.textContent = val;
  }
  function beepCountdownNumber(num){
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;
      if(!beepCountdownNumber.ctx) beepCountdownNumber.ctx = new AudioCtx();
      const ctx = beepCountdownNumber.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 440;
      const freq = baseFreq + (5 - num) * 90;
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.001;
      osc.connect(gain).connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.27);
    } catch(e){ console.warn('[CountdownBeep] Failed to beep number', num, e); }
  }
  function finalizeLobbyStart(){
    document.body.dataset.room = selectedRoom;
    document.body.dataset.bonusShape = selectedShape;
    document.body.dataset.stake = selectedStake;
    if(lobbyEl){
      lobbyEl.hidden = true;
      lobbyEl.parentNode && lobbyEl.parentNode.removeChild(lobbyEl);
    }
    drawBtn.disabled = false;
    bonusBtn && (bonusBtn.disabled = false);
    drawBtn.focus();
  }

  drawBtn.disabled = true;
  bonusBtn && (bonusBtn.disabled = true);

  function buildTickets(){
    ticketNumbersArr = [];
    // Column ranges: B:1-15 I:16-30 N:31-45 G:46-60 O:61-75
    const ranges = [ [1,15], [16,30], [31,45], [46,60], [61,75] ];
    ticketEls.forEach((tEl, tIndex)=>{
      if(!tEl) return;
      tEl.innerHTML='';
      // Reset one-away container slots structure (persistent placeholders for each row)
      const oa = oneAwayContainers[tIndex];
      if(oa){
        oa.innerHTML='';
        oa.setAttribute('aria-hidden','true');
        // Build 5 vertical slots aligned with ticket rows
        for(let r=0;r<5;r++){
          const slot = document.createElement('div');
          slot.className='one-away-slot';
          slot.dataset.row=r;
          slot.setAttribute('aria-hidden','true');
          oa.appendChild(slot);
        }
      }
      const ticketNumbers = [];
      for(let c=0;c<5;c++){
        const colSet = new Set();
        while(colSet.size<5){
          const [min,max]=ranges[c];
            colSet.add(Math.floor(Math.random()*(max-min+1))+min);
        }
        ticketNumbers[c] = Array.from(colSet);
      }
      ticketNumbers[2][2] = 'FREE';
      // Render grid row-major
      for(let r=0;r<5;r++){
        for(let c=0;c<5;c++){
          const val = ticketNumbers[c][r]; // note column-major storage
          const cell = document.createElement('div');
          cell.role='gridcell';
          cell.className='cell';
            if(val==='FREE'){ 
              cell.classList.add('free'); 
              cell.textContent='FREE';
              cell.setAttribute('aria-label','Free space');
            }
          else { cell.textContent=val; cell.dataset.num=val; }
          cell.dataset.row=r;
          cell.dataset.col=c;
          cell.dataset.ticket=tIndex;
          tEl.appendChild(cell);
        }
      }
      ticketNumbersArr[tIndex] = ticketNumbers;
    });
  }

  function drawNumber(){
    if(gameOver) return;
    if(drawnNumbers.size>=75){ endGame(); return; }
    let n; do { n = Math.floor(Math.random()*75)+1; } while(drawnNumbers.has(n));
    drawnNumbers.add(n);
    markTicket(n);
    lastDrawEl.textContent = n;
    // Special numbers get star treatment
    const special = [5,15,25,35,45,55,65,75];
    if(special.includes(n)){
      lastDrawEl.classList.add('star');
      animateStarToProgress(n);
      // ensure circle base styles removed? keep original class, star overrides shape
      // Remove star after 2s automatically; will revert to circle unless next special overrides again
      setTimeout(()=>{ if(!gameOver) {/* star revert handled next draw */} },2000);
    } else {
      // If previous was special, remove star to return to circle
      lastDrawEl.classList.remove('star');
    }
    fireToast('Number '+n+' drawn');
    vibrate([10]);
    checkWin();
    if(!gameOver) checkOneAway();
    // Debug: matched count
    let totalCells = 0, matchedCells = 0;
    ticketEls.forEach(tEl=>{
      const cells = Array.from(tEl.children);
      totalCells += cells.length;
      matchedCells += cells.filter(el=> el.classList.contains('matched') || el.classList.contains('free')).length;
    });
    console.debug('[Fluffy Bingo] Draw:', n, 'Matched cells total:', matchedCells, '/', totalCells);
  }

  function animateStarToProgress(number){
    if(!progressBar) return;
    // Create flying star clone
    const rectSource = lastDrawEl.getBoundingClientRect();
    const rectTarget = progressBar.getBoundingClientRect();
    const star = document.createElement('div');
    star.className='flying-star';
    star.textContent=number;
    // start position
    star.style.left = (rectSource.left + rectSource.width/2 - 50)+'px';
    star.style.top = (rectSource.top + rectSource.height/2 - 50)+'px';
    star.style.width='100px';
    star.style.height='100px';
    document.body.appendChild(star);
    requestAnimationFrame(()=>{
      star.style.transition='transform 0.9s cubic-bezier(.55,.1,.3,1), left 0.9s cubic-bezier(.55,.1,.3,1), top 0.9s cubic-bezier(.55,.1,.3,1), opacity 0.9s ease';
      star.style.opacity='1';
      // target center inside progress bar (slightly inset)
      const targetX = rectTarget.left + rectTarget.width*0.15;
      const targetY = rectTarget.top + rectTarget.height/2;
      star.style.left = (targetX - 50)+'px';
      star.style.top = (targetY - 50)+'px';
      star.style.transform='scale(.42) rotate(12deg)';
    });
    // After travel, fade out and increment progress slightly
    setTimeout(()=>{
      star.style.transition='opacity .4s ease';
      star.style.opacity='0';
      // Increment progress by 1 (capped at 24)
      const current = parseInt(progressBar.getAttribute('aria-valuenow'),10) || 0;
      const next = Math.min(24, current + 1);
      setProgress(next);
      setTimeout(()=>{ star.remove(); },450);
    },950);
  }


  function markTicket(n){
    ticketEls.forEach(tEl=>{
      const cell = tEl.querySelector('[data-num="'+n+'"]');
      if(cell){
        cell.classList.add('matched','flash');
        setTimeout(()=>cell.classList.remove('flash'),700);
        vibrate([25]);
      }
    });
  }

  function checkWin(){
    let fullHouseTicketIndexes = [];
    if(!gameOver){
      ticketEls.forEach((tEl, tIndex)=>{
        const cells = Array.from(tEl.children);
        const full = cells.every(el=> el.classList.contains('matched') || el.classList.contains('free'));
        if(full){ fullHouseTicketIndexes.push(tIndex); }
        for(let r=0;r<5;r++){
          const rowCells = cells.slice(r*5, r*5+5);
          const rowComplete = rowCells.every(c=> c.classList.contains('matched') || c.classList.contains('free'));
          const rowKey = tIndex+':' + r;
          if(rowComplete && !completedRows.has(rowKey)){
            completedRows.add(rowKey);
            // Row just completed: remove any near-win badge/state for this row
            if(currentNearWinRows.has(rowKey)){
              removeOneAwayBadge(tIndex, r);
              currentNearWinRows.delete(rowKey);
            }
          }
        }
      });
      // Determine the maximum number of completed rows on any single ticket
      let maxRowsOnTicket = 0;
      ticketEls.forEach((tEl, tIndex)=>{
        let completedCount = 0;
        for(let r=0;r<5;r++){
          const key = tIndex+':'+r;
          if(completedRows.has(key)) completedCount++;
        }
        if(completedCount > maxRowsOnTicket) maxRowsOnTicket = completedCount;
      });
      // Award line prize only when a NEW maximum is reached (1-4)
      if(maxRowsOnTicket > linePrizeCount && maxRowsOnTicket <= 4){
        linePrizeCount = maxRowsOnTicket; // reinterpret linePrizeCount as highest lines achieved on any ticket
        showLineModal(linePrizeCount);
        if(linePrizeCount === 1){
          clearOneAwayBadges();
          console.debug('[1TG] First line prize awarded (on a single ticket). Entering second-line gating phase.');
        } else if(linePrizeCount === 2){
          clearOneAwayBadges();
          console.debug('[1TG] Second line prize awarded (same ticket reaching 2 lines). Entering third-line gating phase.');
        } else if(linePrizeCount === 3){
          clearOneAwayBadges();
          console.debug('[1TG] Third line prize awarded (same ticket reaching 3 lines). Entering fourth-line gating phase.');
        } else if(linePrizeCount === 4){
          console.debug('[1TG] Fourth line prize awarded – final-phase full house gating will activate.');
        }
      }
    }
    if(fullHouseTicketIndexes.length){ endGame(true, fullHouseTicketIndexes); }
  }

  function endGame(fullHouse, winningTicketIndexes=[]){
    gameOver = true;
    if(fullHouse){
      // Accessible announcement listing winning tickets (1-based numbering)
      const ticketList = winningTicketIndexes.map(i=> 'Ticket '+ (i+1)).join(', ');
      const msg = winningTicketIndexes.length > 1 ? 'Full House! '+ticketList+' are fully matched' : 'Full House! '+ticketList+' is fully matched';
      fireToast(msg);
      lastDrawEl.textContent='FULL HOUSE!';
      winAnnounceEl.textContent=msg;
      showWinModal();
      highlightPrize('full');
      // Visual celebration per winning ticket
      celebrateFullHouseTickets(winningTicketIndexes);
    } else {
      fireToast('All numbers drawn');
      lastDrawEl.textContent='Finished';
    }
    drawBtn.disabled=true;
    if(!fullHouse){ drawBtn.focus(); }
    clearOneAwayBadges();
    if(fullHouse){ setProgress(24); }
  }

  function celebrateFullHouseTickets(winningTicketIndexes){
    winningTicketIndexes.forEach(tIdx=>{
      const ticketEl = ticketEls[tIdx];
      if(!ticketEl) return;
      const container = ticketEl.parentElement; // .single-ticket wrapper
      if(container){
        // Remove one-away glow if present (now transitioning to full win)
        container.classList.remove('one-away-fullhouse');
        container.classList.add('fullhouse-win');
        produceTicketConfetti(container);
      }
    });
  }

  function produceTicketConfetti(container){
    if(!container) return;
    // Remove existing pieces if re-triggered (unlikely but safe)
    container.querySelectorAll('.ticket-confetti-piece').forEach(p=>p.remove());
    const pieceCount = 32;
    const rect = container.getBoundingClientRect();
    for(let i=0;i<pieceCount;i++){
      const piece = document.createElement('div');
      piece.className='ticket-confetti-piece';
      // random horizontal spread within container
      const x = Math.random()*100; // percentage
      piece.style.left = x+'%';
      piece.style.top = '-6px';
      piece.style.animationDelay = (Math.random()*0.35).toFixed(2)+'s';
      piece.style.opacity = (0.75 + Math.random()*0.25).toString();
      container.appendChild(piece);
    }
    // Auto cleanup after animation duration + buffer
    setTimeout(()=>{
      container.querySelectorAll('.ticket-confetti-piece').forEach(p=>p.remove());
    }, 2600);
  }

  // Determine near-win (1TG) rows; persist badges until resolved.
  function checkOneAway(){
    // Final phase gating: if 4 line prizes already awarded, only show 1TG when a ticket is one number from full house.
    if(linePrizeCount >= 4){
      console.debug('[1TG] Final phase (ticket-level) active; linePrizeCount=', linePrizeCount);
      // Clear any prior row-level badges/highlights
      currentNearWinRows.forEach(prevKey=>{
        const [tIdxStr,rowStr] = prevKey.split(':');
        removeOneAwayBadge(parseInt(tIdxStr,10), parseInt(rowStr,10));
      });
      currentNearWinRows.clear();
      let ticketsOneAway = 0;
      ticketEls.forEach((tEl, tIndex)=>{
        const cells = Array.from(tEl.children);
        // Remove previous near-win highlight classes
        cells.forEach(c=> c.classList.remove('near-win'));
        // Count matched/free cells
        const playableCells = cells.filter(c=> !c.classList.contains('free'));
        const matchedPlayable = playableCells.filter(c=> c.classList.contains('matched')).length;
        const totalPlayable = playableCells.length; // should be 24 (FREE excluded)
        if(matchedPlayable === totalPlayable - 1){
          ticketsOneAway++;
          // Identify the lone unmatched playable cell
          const remaining = playableCells.find(c=> !c.classList.contains('matched'));
          if(remaining){
            remaining.classList.add('near-win');
            // Use its row to place a single badge (reuse existing slot system)
            const rowIndex = parseInt(remaining.dataset.row,10);
            console.debug('[1TG] Ticket', tIndex+1, 'is one away from full house. Lone cell at row', rowIndex+1);
            renderOneAwayBadge(rowIndex, tIndex);
            // Add pink glow to the ticket wrapper
            const wrapper = tEl.parentElement;
            if(wrapper){ wrapper.classList.add('one-away-fullhouse'); }
          }
        } else {
          // Ensure container hidden if not one away
          const container = oneAwayContainers[tIndex];
          if(container){
            container.querySelectorAll('.one-away-slot').forEach(slot=>{ slot.innerHTML=''; slot.setAttribute('aria-hidden','true'); });
            container.setAttribute('aria-hidden','true');
          }
          // Remove glow if previously applied
          const wrapper = tEl.parentElement;
          if(wrapper){ wrapper.classList.remove('one-away-fullhouse'); }
        }
      });
      if(oneAwayAnnounceEl){
        if(ticketsOneAway===0) oneAwayAnnounceEl.textContent='';
        else oneAwayAnnounceEl.textContent = ticketsOneAway===1 ? 'One ticket is one to go!' : ticketsOneAway+' tickets are one to go!';
      }
      return; // Skip standard row-level logic
    }
    // Second-line gating phase: after first line prize (linePrizeCount === 1) but before 4 lines.
    if(linePrizeCount === 1){
      console.debug('[1TG] Second-line gating phase active; linePrizeCount=1');
      // Clear previous badges/highlights (row-level set not used now)
      currentNearWinRows.forEach(prevKey=>{
        const [tIdxStr,rowStr] = prevKey.split(':');
        removeOneAwayBadge(parseInt(tIdxStr,10), parseInt(rowStr,10));
      });
      currentNearWinRows.clear();
      let candidateRows = 0;
      ticketEls.forEach((tEl, tIndex)=>{
        const cells = Array.from(tEl.children);
        // Count completed rows for ticket
        const ticketCompletedRows = [];
        for(let r=0;r<5;r++){
          const rowCells = cells.slice(r*5,r*5+5);
          const complete = rowCells.every(c=> c.classList.contains('matched') || c.classList.contains('free'));
          if(complete) ticketCompletedRows.push(r);
        }
        // Only consider tickets with exactly one completed row
        if(ticketCompletedRows.length === 1){
          for(let r=0;r<5;r++){
            if(ticketCompletedRows.includes(r)) continue; // skip already completed row
            const rowCells = cells.slice(r*5,r*5+5);
            const matchedCount = rowCells.filter(c=> c.classList.contains('matched') || c.classList.contains('free')).length;
            if(matchedCount === 4 && rowCells.some(c=> !c.classList.contains('matched') && !c.classList.contains('free'))){
              const rowKey = tIndex+':'+r;
              candidateRows++;
              // Highlight only the single unmatched cell
              rowCells.forEach(c=>{
                if(!c.classList.contains('matched') && !c.classList.contains('free')) c.classList.add('near-win');
              });
              renderOneAwayBadge(r, tIndex);
              currentNearWinRows.add(rowKey);
              console.debug('[1TG] Second-line candidate: Ticket', tIndex+1, 'Row', r+1);
            }
          }
        } else {
          // Remove any lingering near-win class for tickets not in this phase condition
          cells.forEach(c=> c.classList.remove('near-win'));
        }
      });
      if(oneAwayAnnounceEl){
        if(candidateRows===0) oneAwayAnnounceEl.textContent='';
        else oneAwayAnnounceEl.textContent = candidateRows===1 ? 'One row is one to go for 2 lines!' : candidateRows+' rows are one to go for 2 lines!';
      }
      return; // Skip initial row-level logic
    }
    // Third-line gating phase: after second line prize (linePrizeCount === 2) but before 4 lines.
    if(linePrizeCount === 2){
      console.debug('[1TG] Third-line gating phase active; linePrizeCount=2');
      currentNearWinRows.forEach(prevKey=>{
        const [tIdxStr,rowStr] = prevKey.split(':');
        removeOneAwayBadge(parseInt(tIdxStr,10), parseInt(rowStr,10));
      });
      currentNearWinRows.clear();
      let candidateRows = 0;
      ticketEls.forEach((tEl, tIndex)=>{
        const cells = Array.from(tEl.children);
        // Count completed rows for ticket
        const ticketCompletedRows = [];
        for(let r=0;r<5;r++){
          const rowCells = cells.slice(r*5,r*5+5);
          const complete = rowCells.every(c=> c.classList.contains('matched') || c.classList.contains('free'));
          if(complete) ticketCompletedRows.push(r);
        }
        // Only consider tickets with exactly two completed rows
        if(ticketCompletedRows.length === 2){
          for(let r=0;r<5;r++){
            if(ticketCompletedRows.includes(r)) continue; // skip already completed rows
            const rowCells = cells.slice(r*5,r*5+5);
            const matchedCount = rowCells.filter(c=> c.classList.contains('matched') || c.classList.contains('free')).length;
            if(matchedCount === 4 && rowCells.some(c=> !c.classList.contains('matched') && !c.classList.contains('free'))){
              const rowKey = tIndex+':'+r;
              candidateRows++;
              rowCells.forEach(c=>{
                if(!c.classList.contains('matched') && !c.classList.contains('free')) c.classList.add('near-win');
              });
              renderOneAwayBadge(r, tIndex);
              currentNearWinRows.add(rowKey);
              console.debug('[1TG] Third-line candidate: Ticket', tIndex+1, 'Row', r+1);
            }
          }
        } else {
          cells.forEach(c=> c.classList.remove('near-win'));
        }
      });
      if(oneAwayAnnounceEl){
        if(candidateRows===0) oneAwayAnnounceEl.textContent='';
        else oneAwayAnnounceEl.textContent = candidateRows===1 ? 'One row is one to go for 3 lines!' : candidateRows+' rows are one to go for 3 lines!';
      }
      return;
    }
    // Fourth-line gating phase: after third line prize (linePrizeCount === 3) but before 4 lines.
    if(linePrizeCount === 3){
      console.debug('[1TG] Fourth-line gating phase active; linePrizeCount=3');
      currentNearWinRows.forEach(prevKey=>{
        const [tIdxStr,rowStr] = prevKey.split(':');
        removeOneAwayBadge(parseInt(tIdxStr,10), parseInt(rowStr,10));
      });
      currentNearWinRows.clear();
      let candidateRows = 0;
      ticketEls.forEach((tEl, tIndex)=>{
        const cells = Array.from(tEl.children);
        // Count completed rows for ticket
        const ticketCompletedRows = [];
        for(let r=0;r<5;r++){
          const rowCells = cells.slice(r*5,r*5+5);
          const complete = rowCells.every(c=> c.classList.contains('matched') || c.classList.contains('free'));
          if(complete) ticketCompletedRows.push(r);
        }
        // Only consider tickets with exactly three completed rows
        if(ticketCompletedRows.length === 3){
          for(let r=0;r<5;r++){
            if(ticketCompletedRows.includes(r)) continue; // skip already completed rows
            const rowCells = cells.slice(r*5,r*5+5);
            const matchedCount = rowCells.filter(c=> c.classList.contains('matched') || c.classList.contains('free')).length;
            if(matchedCount === 4 && rowCells.some(c=> !c.classList.contains('matched') && !c.classList.contains('free'))){
              const rowKey = tIndex+':'+r;
              candidateRows++;
              rowCells.forEach(c=>{
                if(!c.classList.contains('matched') && !c.classList.contains('free')) c.classList.add('near-win');
              });
              renderOneAwayBadge(r, tIndex);
              currentNearWinRows.add(rowKey);
              console.debug('[1TG] Fourth-line candidate: Ticket', tIndex+1, 'Row', r+1);
            }
          }
        } else {
          cells.forEach(c=> c.classList.remove('near-win'));
        }
      });
      if(oneAwayAnnounceEl){
        if(candidateRows===0) oneAwayAnnounceEl.textContent='';
        else oneAwayAnnounceEl.textContent = candidateRows===1 ? 'One row is one to go for 4 lines!' : candidateRows+' rows are one to go for 4 lines!';
      }
      return;
    }
    // Standard row-level near-win logic (before final phase)
    const newNearSet = new Set();
    let totalNearRows = 0;
    console.debug('[1TG] Row-level phase active; linePrizeCount=', linePrizeCount);
    ticketEls.forEach((tEl, tIndex)=>{
      const cells = Array.from(tEl.children);
      cells.forEach(cell=> cell.classList.remove('near-win'));
      const states = cells.map(el=> el.classList.contains('matched') || el.classList.contains('free'));
      const matrix=[];for(let i=0;i<5;i++){matrix[i]=states.slice(i*5,i*5+5);} // row-major
      for(let r=0;r<5;r++){
        const row = matrix[r];
        const count = row.filter(Boolean).length;
        if(count===4 && row.some(v=>!v)){
          const rowKey = tIndex+':'+r;
          newNearSet.add(rowKey);
          totalNearRows++;
          const rowStart = r*5;
          for(let c=0;c<5;c++){
            const cell = cells[rowStart + c];
            if(!cell.classList.contains('matched')) cell.classList.add('near-win');
          }
          console.debug('[1TG] Row near-win detected: Ticket', tIndex+1, 'Row', r+1);
          if(!currentNearWinRows.has(rowKey)){
            renderOneAwayBadge(r, tIndex);
          }
        }
      }
    });
    currentNearWinRows.forEach(prevKey=>{
      if(!newNearSet.has(prevKey)){
        const [tIdxStr,rowStr] = prevKey.split(':');
        removeOneAwayBadge(parseInt(tIdxStr,10), parseInt(rowStr,10));
      }
    });
    currentNearWinRows = newNearSet;
    if(oneAwayAnnounceEl){
      if(totalNearRows===0) oneAwayAnnounceEl.textContent='';
      else oneAwayAnnounceEl.textContent = totalNearRows===1 ? 'One row is one to go!' : totalNearRows+' rows are one to go across tickets!';
    }
  }

  function renderOneAwayBadge(rowIndex, ticketIndex){
    const container = oneAwayContainers[ticketIndex];
    if(!container) return;
    const slot = container.querySelector('.one-away-slot[data-row="'+rowIndex+'"]');
    if(!slot) return;
    const existing = slot.querySelector('.one-away-badge');
    if(!existing){
      const badge = document.createElement('div');
      badge.className='one-away-badge';
      badge.textContent='1TG';
      badge.setAttribute('aria-label','One To Go on row '+(rowIndex+1));
      slot.appendChild(badge);
      console.debug('[1TG] Badge rendered (new): Ticket', ticketIndex+1, 'Row', rowIndex+1);
      slot.setAttribute('aria-hidden','false');
      container.setAttribute('aria-hidden','false');
    } else {
      // Keep existing badge static; ensure visibility but do not re-trigger layout
      if(slot.getAttribute('aria-hidden')==='true'){ slot.setAttribute('aria-hidden','false'); }
      if(container.getAttribute('aria-hidden')==='true'){ container.setAttribute('aria-hidden','false'); }
      console.debug('[1TG] Badge retained (static): Ticket', ticketIndex+1, 'Row', rowIndex+1);
    }
    // Force visibility if container was accidentally hidden by race conditions
    if(container.style.display==='none'){ container.style.display='grid'; }
  }
  function removeOneAwayBadge(ticketIndex,rowIndex){
    const container = oneAwayContainers[ticketIndex];
    if(!container) return;
    const slot = container.querySelector('.one-away-slot[data-row="'+rowIndex+'"]');
    if(!slot) return;
    slot.innerHTML='';
    slot.setAttribute('aria-hidden','true');
    // If all slots empty, hide container
    const anyActive = Array.from(container.querySelectorAll('.one-away-slot')).some(s=> s.querySelector('.one-away-badge'));
    if(!anyActive) container.setAttribute('aria-hidden','true');
  }
  function clearOneAwayBadges(){
    currentNearWinRows.clear();
    oneAwayContainers.forEach(c=>{ if(!c) return; c.querySelectorAll('.one-away-slot').forEach(slot=>{ slot.innerHTML=''; slot.setAttribute('aria-hidden','true'); }); c.setAttribute('aria-hidden','true'); });
  }

  function fireToast(msg){
    toastEl.textContent=msg;
    toastEl.hidden=false;
    toastEl.classList.remove('hide');
    setTimeout(()=>hideToast(),4000);
  }
  function hideToast(){ toastEl.hidden=true; }

  function vibrate(pattern){ if(navigator.vibrate){ try { navigator.vibrate(pattern); } catch(e){} } }

  drawBtn.addEventListener('click', drawNumber);
  resetBtn.addEventListener('click', ()=>{
    drawBtn.disabled=false;
    init();
    clearOneAwayBadges();
    ticketEls.forEach(tEl=> Array.from(tEl.children).forEach(cell=>cell.classList.remove('near-win')));
    // Remove full house celebration classes & residual ticket confetti
    ticketEls.forEach(tEl=>{ const container = tEl.parentElement; if(container){ container.classList.remove('fullhouse-win','one-away-fullhouse'); container.querySelectorAll('.ticket-confetti-piece').forEach(p=>p.remove()); } });
    hideWinModal();
    hideLineModal();
  });
  bonusBtn && bonusBtn.addEventListener('click', startCandyBonusSequence);

  // Recalculate overlay position on resize if visible
  window.addEventListener('resize', ()=>{ if(!gameOver){ requestAnimationFrame(()=>checkOneAway()); } });

  // Initialize on load
  // Show lobby overlay at start; game init deferred until after selections.
  if(lobbyEl){
    lobbyEl.hidden = false;
    const panel = lobbyEl.querySelector('.modal-panel');
    panel && panel.focus();
    // Attach start game click
    if(startGameBtn){
      startGameBtn.addEventListener('click', ()=>{
        if(startGameBtn.disabled) return;
        // Trigger countdown then start
        startLobbyCountdown();
      });
    }
  }
  // Build ticket early (can preview under translucent lobby), or could wait until start.
  init();

  function showWinModal(){
    if(!winModal) return;
    winModal.hidden=false;
    // focus panel for accessibility
    const panel = winModal.querySelector('.modal-panel');
    panel && panel.focus();
    document.addEventListener('keydown', escHandler);
    // Trigger confetti specific to win modal
    triggerConfetti('winConfettiContainer');
    // auto hide after 3s, then wait an additional 3s before showing winners panel per request
    setTimeout(()=>{ 
      hideWinModal(); 
      setTimeout(()=>{ showWinnersPanel(); },3000); 
    },3000);
  }
  function hideWinModal(){ if(!winModal) return; winModal.hidden=true; document.removeEventListener('keydown', escHandler); }
  // Winners panel logic
  function showWinnersPanel(){
    if(!winnersPanel) return;
    winnersPanel.hidden=false;
    const panel = winnersPanel.querySelector('.modal-panel');
    panel && panel.focus();
    document.addEventListener('keydown', winnersEscHandler);
  }
  function hideWinnersPanel(){
    if(!winnersPanel) return;
    winnersPanel.hidden=true;
    document.removeEventListener('keydown', winnersEscHandler);
  }
  function winnersEscHandler(e){ if(e.key==='Escape'){ hideWinnersPanel(); } }
  closeWinnersBtn && closeWinnersBtn.addEventListener('click', hideWinnersPanel);
  function escHandler(e){ if(e.key==='Escape'){ hideWinModal(); } }

  function showLineModal(prizeNumber){
    if(!lineModal) return;
    const panel = lineModal.querySelector('.modal-panel');
    let titleText = 'Line Prize!';
    let msgText = '';
    switch(prizeNumber){
      case 1: msgText = 'Congratulations! You have won the 1 line prize'; break;
      case 2: msgText = 'Congratulations! You have won the 2 line prize'; break;
      case 3: msgText = 'Congratulations! You have won the 3 line prize'; break;
      case 4: msgText = 'Congratulations! You have won the 4 line prize'; break;
      default: msgText = 'Line prize achieved';
    }
    if(lineModalTitle) lineModalTitle.textContent = titleText;
    if(lineModalMsg) lineModalMsg.textContent = msgText;
    lineModal.hidden=false;
    panel && panel.focus();
    setTimeout(()=>{ hideLineModal(); },3000);
    highlightPrize(prizeNumber);
  }
  function hideLineModal(){ if(!lineModal) return; lineModal.hidden=true; }

  /* ---------------- Candy Bonus Logic ---------------- */
  function startCandyBonusSequence(){
    if(inBonus) return;
    // Simulate full progress bar sparkling for 3s then open bonus
    setProgress(24);
    progressBar.classList.add('sparkle','bonus-glow');
    generateProgressStars();
    setTimeout(()=>{
      progressBar.classList.remove('sparkle','bonus-glow');
      clearProgressStars();
      openBonusModal();
    },3000);
  }

  function openBonusModal(){
    inBonus = true;
    // Remove status texts per request
    if(bonusCaller) bonusCaller.textContent = '';
    if(bonusAnnounce) bonusAnnounce.textContent = '';
    const intro = document.getElementById('bonusIntro');
    if(intro) intro.textContent='';
    bonusModal.hidden = false;
    const panel = bonusModal.querySelector('.modal-panel');
    panel && panel.focus();
    initClawBonus();
    scheduleAutoClawStart();
  }

  function endBonus(){
    inBonus = false;
    if(bonusModal) bonusModal.hidden = true;
    bonusCaller && (bonusCaller.textContent='');
    // Clear claw timers if any
    clawTimers.forEach(t=>clearTimeout(t));
    clawTimers=[]; clawBusy=false;
  }


  function generateProgressStars(){
    if(!progressBar) return;
    clearProgressStars();
    const starCount = 10;
    for(let i=0;i<starCount;i++){
      const s = document.createElement('div'); s.className='star';
      const x = Math.random()*100; const y = Math.random()*60 - 10;
      s.style.left = x+'%'; s.style.top = y+'%';
      s.style.animationDelay = (Math.random()*2.5).toFixed(2)+'s';
      progressBar.appendChild(s);
    }
  }
  function clearProgressStars(){ if(!progressBar) return; progressBar.querySelectorAll('.star').forEach(st=>st.remove()); }

  function triggerConfetti(targetId='confettiContainer'){
    const container = document.getElementById(targetId);
    if(!container) return; container.innerHTML=''; container.setAttribute('aria-hidden','false');
    const count = 40;
    for(let i=0;i<count;i++){
      const piece = document.createElement('div'); piece.className='confetti';
      const delay = (Math.random()*0.4).toFixed(2);
      const xOffset = (Math.random()*100 - 50);
      piece.style.left = (50 + xOffset)+'%'; piece.style.animationDelay = delay+'s';
      piece.style.opacity = (0.6 + Math.random()*0.4).toString();
      piece.style.transform = 'translateX(-50%) rotate('+Math.floor(Math.random()*360)+'deg)';
      container.appendChild(piece);
    }
    setTimeout(()=>{ container.innerHTML=''; container.setAttribute('aria-hidden','true'); },3000);
  }
  closeBonusBtn && closeBonusBtn.addEventListener('click', ()=>{ endBonus(); });

  function highlightPrize(prizeKey){
    const strip = document.getElementById('prizeStrip');
    if(!strip) return;
    const el = strip.querySelector('[data-prize="'+prizeKey+'"]');
    if(!el) return;
    if(prizeKey==='full'){
      el.classList.add('achieved','flash');
      setTimeout(()=> el.classList.remove('flash'),900);
    } else {
      // For line prizes 1-4, grey them out (claimed) and keep state.
      el.classList.add('claimed');
    }
  }

  /* ---------------- Claw Machine Logic ---------------- */
  function initClawBonus(){
    if(!prizeItemsContainer) return;
    prizeItemsContainer.innerHTML='';
    prizeItemsContainer.classList.add('organic');
    clawPicks = 0; clawBusy = false; clawChosen.clear();
    clawStatus && (clawStatus.textContent='');
    if(clawWinnersEl) clawWinnersEl.innerHTML='';
    // Organic positioned unique shape items
    const shapes = [
      {shape:'circle',  x:8,  y:8,  c1:'#ff6ec7', c2:'#6ecbff'},
      {shape:'diamond', x:40, y:6,  c1:'#ffab3d', c2:'#ffd966'},
      {shape:'hex',     x:72, y:10, c1:'#6effa0', c2:'#26d876'},
      {shape:'triangle',x:18, y:46, c1:'#a987ff', c2:'#6ecbff'},
      {shape:'pill',    x:56, y:40, c1:'#ff6ec7', c2:'#ffab3d'},
      {shape:'star',    x:78, y:50, c1:'#ffd966', c2:'#ffbf3f'},
      {shape:'blob',    x:30, y:64, c1:'#6ecbff', c2:'#8bffe1'},
      {shape:'oct',     x:60, y:66, c1:'#ff4d61', c2:'#ff9c73'}
    ];
    shapes.forEach((cfg,i)=>{
      const item=document.createElement('div');
      item.className='prize-item shape-'+cfg.shape; item.dataset.index=i;
      item.style.left=cfg.x+'%'; item.style.top=cfg.y+'%';
      item.style.background='linear-gradient(135deg,'+cfg.c1+','+cfg.c2+')';
      const span=document.createElement('span'); span.textContent=''; item.appendChild(span);
      prizeItemsContainer.appendChild(item);
    });
    // Reset claw position
    if(clawEl){
      clawEl.style.transform='translateX(-50%) translateY(0)';
      // ensure decorative line exists
      if(!clawEl.querySelector('.claw-line')){ const line=document.createElement('div'); line.className='claw-line'; clawEl.appendChild(line); }
    }
  }

  // (Go button removed – automated sequence)

  function runClawPickCycle(){
    if(!prizeItemsContainer || !clawEl) return;
    clawBusy = true;
    clawStatus && (clawStatus.textContent = 'Picking prize '+ (clawPicks+1) +' of 3...');
    // Choose a random unpicked item
    const items = Array.from(prizeItemsContainer.querySelectorAll('.prize-item'));
    const available = items.filter(it=> !clawChosen.has(parseInt(it.dataset.index,10)) );
    if(!available.length){ finishClawBonus(); return; }
    const target = available[Math.floor(Math.random()*available.length)];
    items.forEach(i=>i.classList.remove('active'));
    target.classList.add('active');
    const machineRect = clawEl.parentElement.getBoundingClientRect();
    const clawRect = clawEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if(machineRect.width === 0){ console.warn('[Claw] Machine width 0; abort'); clawBusy=false; return; }
    // Force claw centered horizontally (no horizontal movement)
    if(!clawEl.dataset.absolute){
      clawEl.style.transform='translateY(0)';
      const center = (machineRect.width/2) - (clawRect.width/2);
      clawEl.style.left = center+'px';
      clawEl.dataset.absolute='true';
      clawEl.style.transition='transform .4s ease';
    }
    // Compute vertical descent based on target vertical position only
    const baseTopOffset = 26;
    const desiredOverlap = 10;
    let descendY = (targetRect.top - machineRect.top) - baseTopOffset - desiredOverlap;
    const maxDescend = machineRect.height - 100;
    if(descendY > maxDescend) descendY = maxDescend;
    if(descendY < 12) descendY = 12;
    // Timings (slowed down): descent 1.2s, grab pause 700ms, ascent 1.25s
    const DESCENT_DURATION = 1200; // ms
    const GRAB_PAUSE = 700;       // ms after reaching bottom before ascent
    const ASCENT_DURATION = 1250; // ms
    const START_DELAY = 400;      // initial delay before motion begins
    clawTimers.push(setTimeout(()=>{
      clawEl.classList.add('descend');
      clawEl.style.transition='transform '+(DESCENT_DURATION/1000)+'s cubic-bezier(.55,.1,.3,1)';
      clawEl.style.transform='translateY('+descendY+'px)';
      // After descent completes
      clawTimers.push(setTimeout(()=>{
        clawEl.classList.add('grab');
        const carried = target.cloneNode(true);
        carried.classList.add('carried');
        carried.classList.remove('active');
        carried.style.left='50%';
        carried.style.top='34px';
        target.style.opacity='0';
        clawEl.appendChild(carried);
        // Pause while "holding" the item
        clawTimers.push(setTimeout(()=>{
          clawEl.classList.remove('descend');
          clawEl.classList.add('ascend');
          clawEl.style.transition='transform '+(ASCENT_DURATION/1000)+'s cubic-bezier(.55,.1,.3,1)';
          clawEl.style.transform='translateY(0)';
          // After ascent complete, reveal prize
          clawTimers.push(setTimeout(()=>{
            clawEl.classList.remove('grab','ascend');
            revealClawPrize(target, carried);
          }, ASCENT_DURATION + 50)); // slight buffer
        }, GRAB_PAUSE));
      }, DESCENT_DURATION + 20)); // slight buffer to ensure transition end
    }, START_DELAY));
  }

  function revealClawPrize(target, carried){
    if(!target) return;
    clawChosen.add(parseInt(target.dataset.index,10));
    // Deterministic prize order request: pick1=nana123, pick2=winwin, pick3=oak444
    let prizeLabel;
    const currentPickNumber = clawPicks + 1; // clawPicks counts completed picks
    switch(currentPickNumber){
      case 1: prizeLabel = 'nana123'; break;
      case 2: prizeLabel = 'winwin'; break;
      case 3: prizeLabel = 'oak444'; break; // assumption for unspecified third winner
      default: prizeLabel = 'nana123'; // fallback (should not occur in 3-pick sequence)
    }
    target.classList.remove('active');
    target.classList.add('won');
    target.textContent = prizeLabel;
    if(carried){
      const span = carried.querySelector('span') || carried;
      span.textContent = prizeLabel;
      carried.classList.add('won');
      // Fade carried out and reveal original at its place after short delay
      setTimeout(()=>{
        carried.style.transition='opacity .5s ease, transform .5s ease';
        carried.style.opacity='0';
        carried.style.transform='translateX(-50%) scale(.6)';
        setTimeout(()=>{ carried.remove(); target.style.opacity='1'; },520);
      },350);
    } else {
      target.style.opacity='1';
    }
    if(prizeLabel==='winwin'){
      // Removed extra glow for winwin per request
      clawStatus && (clawStatus.textContent='Jackpot! '+prizeLabel+' won');
    } else {
      clawStatus && (clawStatus.textContent='You won '+prizeLabel+'!');
    }
    // Always trigger confetti after each winner reveal
  triggerConfetti();
    // Append to winners list UI
    if(clawWinnersEl){
      const li=document.createElement('li');
      li.className='label-'+prizeLabel;
      const seq=document.createElement('span');
      seq.className='seq';
      seq.textContent= String(clawPicks+1);
      const labelSpan=document.createElement('span');
      labelSpan.className='label';
      labelSpan.textContent=prizeLabel;
      li.appendChild(seq); li.appendChild(labelSpan);
      clawWinnersEl.appendChild(li);
      if(clawWinnersEl.scrollHeight > clawWinnersEl.clientHeight){
        clawWinnersEl.scrollTo({top:clawWinnersEl.scrollHeight,behavior:'smooth'});
      }
    }
    clawPicks++;
    if(clawPicks>=3){
      finishClawBonus();
      return;
    }
    // Wait 3s then auto start next pick
    clawTimers.push(setTimeout(()=>{
      if(!inBonus) return; // aborted
      clawStatus && (clawStatus.textContent='Starting pick '+(clawPicks+1)+' of 3...');
      clawBusy=false;
      runClawPickCycle();
    },3000));
  }

  function finishClawBonus(){ clawStatus && (clawStatus.textContent='Bonus complete!'); clawBusy=false; clawTimers.push(setTimeout(()=>{ if(inBonus) endBonus(); },3500)); }

  function scheduleAutoClawStart(){ clawTimers.push(setTimeout(()=>{ if(!inBonus || clawBusy || clawPicks>0) return; clawStatus && (clawStatus.textContent='Starting pick 1 of 3...'); runClawPickCycle(); },2000)); }

  // Progress Bar Logic (manual control only; automatic threshold updates removed)
  function resetProgress(){ setProgress(0); }
  function setProgress(value){ if(!progressFill || !progressBar) return; const percent = (value/24)*100; progressFill.style.width = percent+'%'; progressBar.setAttribute('aria-valuenow', value); }

  /* ---------------- 1TG Mini Game Logic ---------------- */
  const oneTgGameBtn = document.getElementById('oneTgGameBtn');
  const oneTgGameModal = document.getElementById('oneTgGameModal');
  const oneTgCirclesEl = document.getElementById('oneTgCircles');
  const oneTgTapBtn = document.getElementById('oneTgTapBtn');
  const oneTgCloseBtn = document.getElementById('oneTgCloseBtn');
  const oneTgAnnounce = document.getElementById('oneTgAnnounce');
  const oneTgResultModal = document.getElementById('oneTgResultModal');
  const oneTgResultMsg = document.getElementById('oneTgResultMsg');
  const oneTgResultOkBtn = document.getElementById('oneTgResultOkBtn');
  let oneTgValues = [];
  let oneTgHighlighted = new Set();
  let oneTgGameActive = false;

  function openOneTgGame(){
    if(!oneTgGameModal) return;
    buildOneTgCircles();
    oneTgGameModal.hidden = false;
    const panel = oneTgGameModal.querySelector('.modal-panel');
    panel && panel.focus();
    oneTgGameActive = true;
    document.addEventListener('keydown', oneTgEscHandler);
  }
  function closeOneTgGame(){
    if(!oneTgGameModal) return;
    oneTgGameModal.hidden = true;
    oneTgGameActive = false;
    oneTgHighlighted.clear();
    oneTgCirclesEl && (oneTgCirclesEl.innerHTML='');
    document.removeEventListener('keydown', oneTgEscHandler);
    if(oneTgAnnounce) oneTgAnnounce.textContent='';
    oneTgTapBtn && (oneTgTapBtn.disabled=false);
  }
  function oneTgEscHandler(e){ if(e.key==='Escape'){ closeOneTgGame(); } }

  function buildOneTgCircles(){
    if(!oneTgCirclesEl) return;
    oneTgCirclesEl.innerHTML='';
    // Define 20 values (mix of stakes and free plays)
    oneTgValues = [
      '5p','10p','10p','20p','20p','5p','5p','10p','20p','5p',
      '1 Free Play','2 Free Plays','3 Free Plays','1 Free Play','2 Free Plays',
      '5p','10p','20p','1 Free Play','3 Free Plays'
    ];
    oneTgValues.forEach((val,i)=>{
      const circle = document.createElement('div');
      circle.className='one-tg-circle';
      circle.dataset.index=i;
      const span=document.createElement('span'); span.textContent=val; circle.appendChild(span);
      oneTgCirclesEl.appendChild(circle);
    });
  }

  function tapOneTg(){
    console.log('[1TG Game] Tap invoked. Active=', oneTgGameActive, 'Busy=', oneTgTapBtn && oneTgTapBtn.classList.contains('busy'));
    if(!oneTgGameActive){
      console.warn('[1TG Game] Tap ignored – game not active or modal closed');
      return;
    }
    if(oneTgTapBtn && oneTgTapBtn.classList.contains('busy')){ console.log('[1TG Game] Tap ignored – busy in animation'); return; }
    if(!oneTgValues.length){
      console.log('[1TG Game] Values array empty – rebuilding circles');
      buildOneTgCircles();
    }
    if(oneTgHighlighted.size >= oneTgValues.length){ console.log('[1TG Game] All circles already highlighted'); return; }
    const available = oneTgValues.map((_,i)=>i).filter(i=> !oneTgHighlighted.has(i));
    if(available.length === 0){ console.log('[1TG Game] No available indices left'); return; }
    if(oneTgTapBtn) oneTgTapBtn.classList.add('busy');
    // Choose two random picks
    const firstIdx = available.splice(Math.floor(Math.random()*available.length),1)[0];
    const secondIdx = available.length>0 ? available.splice(Math.floor(Math.random()*available.length),1)[0] : null;
    const pickedValues = [];
    function revealIndex(idx, isLast){
      const el = oneTgCirclesEl.querySelector('.one-tg-circle[data-index="'+idx+'"]');
      if(!el){ console.warn('[1TG Game] Missing circle element for index', idx); return; }
      el.classList.add('highlight','incoming');
      setTimeout(()=>{
        el.classList.remove('incoming');
        el.classList.add('revealed','flash-highlight');
        oneTgHighlighted.add(idx);
        pickedValues.push(oneTgValues[idx]);
        setTimeout(()=> el.classList.remove('flash-highlight'),750);
        if(isLast){
          if(oneTgAnnounce){ oneTgAnnounce.textContent = 'Highlighted: '+ pickedValues.join(' and '); }
          if(oneTgHighlighted.size === oneTgValues.length){
            oneTgCirclesEl.classList.add('finished');
            if(oneTgAnnounce){ oneTgAnnounce.textContent += ' All circles revealed.'; }
            oneTgTapBtn && (oneTgTapBtn.disabled=true);
          }
          // Show result popup
          showOneTgResult(pickedValues);
          if(oneTgTapBtn){ oneTgTapBtn.classList.remove('busy'); }
          console.log('[1TG Game] Sequential tap complete. Highlighted count=', oneTgHighlighted.size);
        }
      }, 420);
    }
    console.log('[1TG Game] Sequential picks selected:', firstIdx, secondIdx);
    revealIndex(firstIdx, false);
    if(secondIdx!==null){
      setTimeout(()=> revealIndex(secondIdx, true), 900); // second reveal after first finishes + buffer
    } else {
      // Only one circle left scenario
      setTimeout(()=>{ showOneTgResult(pickedValues); oneTgTapBtn && oneTgTapBtn.classList.remove('busy'); }, 900);
    }
  }

  function showOneTgResult(values){
    if(!oneTgResultModal || !oneTgResultMsg) return;
    oneTgResultMsg.textContent = 'Congratulations you have won '+ (values.length===2 ? values.join(' and ') : values[0]);
    oneTgResultModal.hidden = false;
    const panel = oneTgResultModal.querySelector('.modal-panel');
    panel && panel.focus();
  }
  function hideOneTgResult(){ if(oneTgResultModal){ oneTgResultModal.hidden = true; } }

  oneTgGameBtn && oneTgGameBtn.addEventListener('click', openOneTgGame);
  oneTgCloseBtn && oneTgCloseBtn.addEventListener('click', closeOneTgGame);
  if(oneTgTapBtn){
    oneTgTapBtn.addEventListener('click', tapOneTg);
    console.log('[1TG Game] Tap button listener attached');
  } else {
    console.warn('[1TG Game] Tap button element not found in DOM');
  }
  oneTgResultOkBtn && oneTgResultOkBtn.addEventListener('click', hideOneTgResult);

})();

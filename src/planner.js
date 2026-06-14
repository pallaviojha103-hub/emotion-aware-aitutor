/**
 * Zenith AI - Adaptive Study Planner Module
 * Features a Spaced Repetition (SRS) Engine, Mistake Matrix DB,
 * and custom canvas line chart rendering learner attention telemetry.
 */

export class AdaptivePlanner {
  constructor(chartCanvas, onMistakeReviewRequested) {
    this.chartCanvas = chartCanvas;
    this.ctx = chartCanvas ? chartCanvas.getContext('2d') : null;
    this.onMistakeReviewRequested = onMistakeReviewRequested;

    // Attention span historical data buffer (max 20 points)
    this.attentionHistory = [80, 82, 85, 83, 78, 85, 90, 88, 84, 85];
    
    // Expanded Spaced Repetition Deck
    this.flashcards = [
      {
        id: 'srs-1',
        topic: 'Quantum Physics',
        prompt: 'What is Quantum Superposition?',
        answer: 'The ability of a quantum system to occupy multiple physical states simultaneously until a measurement is made.',
        interval: 1, // days
        easeFactor: 2.5,
        streak: 1,
        dueDate: Date.now() - 1000 // due now
      },
      {
        id: 'srs-2',
        topic: 'Machine Learning',
        prompt: 'Explain the Vanishing Gradient Problem.',
        answer: 'During backpropagation, gradients shrink exponentially as they propagate backward through deep layers, halting weight updates.',
        interval: 1,
        easeFactor: 2.5,
        streak: 1,
        dueDate: Date.now() - 1000
      },
      {
        id: 'srs-3',
        topic: 'JavaScript Engine',
        prompt: 'What is the role of the Event Loop?',
        answer: 'To monitor the Call Stack and the Callback Queue. If the stack is empty, it pushes the first task from the queue to the stack.',
        interval: 2,
        easeFactor: 2.6,
        streak: 2,
        dueDate: Date.now() + 10000000 // due in future
      },
      {
        id: 'srs-4',
        topic: 'Algorithms',
        prompt: 'What is the worst-case time complexity of Quick Sort?',
        answer: 'O(N^2), which occurs when the pivot consistently divides the array into extremely unbalanced partitions (e.g. sorted arrays).',
        interval: 1,
        easeFactor: 2.4,
        streak: 0,
        dueDate: Date.now() - 1000
      },
      {
        id: 'srs-5',
        topic: 'Attention Mechanism',
        prompt: 'What is the mathematical formula for Scaled Dot-Product Attention?',
        answer: 'Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V',
        interval: 1,
        easeFactor: 2.5,
        streak: 0,
        dueDate: Date.now() - 1000
      },
      {
        id: 'srs-6',
        topic: 'Attention Mechanism',
        prompt: 'What do Q, K, and V vectors represent in self-attention?',
        answer: 'Queries (what a token is looking for), Keys (what tokens offer), and Values (the content vector of the token).',
        interval: 2,
        easeFactor: 2.6,
        streak: 1,
        dueDate: Date.now() - 1000
      },
      {
        id: 'srs-7',
        topic: 'Neuromorphic Spikes',
        prompt: 'Write the charging equation of the LIF Neuron model.',
        answer: 'tau * dv/dt = -(v - vRest) + Rm * I(t). The membrane charges from current I(t) and leaks back to vRest.',
        interval: 1,
        easeFactor: 2.5,
        streak: 0,
        dueDate: Date.now() - 1000
      },
      {
        id: 'srs-8',
        topic: 'Neuromorphic Spikes',
        prompt: 'What is a Neuromorphic Chip?',
        answer: 'A hardware architecture (e.g. Intel Loihi) that mimics biological brains using event-driven spiking neural pathways.',
        interval: 1,
        easeFactor: 2.5,
        streak: 0,
        dueDate: Date.now() - 1000
      }
    ];

    // Mistake Matrix Database
    this.mistakes = [
      {
        id: 'm-1',
        topic: 'Quantum Physics',
        question: 'Which principle states that position and momentum cannot be simultaneously measured with absolute precision?',
        wrongAnswer: 'Schrödinger Cat Paradox',
        correctAnswer: 'Heisenberg Uncertainty Principle',
        loggedAt: Date.now() - 3600000 * 2,
        reviewedCount: 0,
        status: 'Unresolved'
      }
    ];

    this.activeCardIndex = 0;
    this.initChart();
    this.attentionSessions = []; // stored captured sessions
    this.loadState();
  }

  ingestAttentionSession(session) {
    if (!session || !session.samples) return;
    this.attentionSessions.push(session);
    // keep recent 10
    if (this.attentionSessions.length > 10) this.attentionSessions.shift();
    // include a short summary into recommendations
    this.saveState();
    this.renderRecommendations();
  }

  saveState() {
    try {
      localStorage.setItem('zenith_attention_sessions', JSON.stringify(this.attentionSessions));
      localStorage.setItem('zenith_mistakes', JSON.stringify(this.mistakes));
    } catch (e) {
      // ignore
    }
  }

  loadState() {
    try {
      const s = localStorage.getItem('zenith_attention_sessions');
      if (s) this.attentionSessions = JSON.parse(s);
      const m = localStorage.getItem('zenith_mistakes');
      if (m) this.mistakes = JSON.parse(m);
    } catch (e) {
      // ignore parse errors
    }
  }

  // Spaced Repetition (SuperMemo SM-2 adaptation)
  gradeFlashcard(rating) {
    const card = this.getDueCards()[this.activeCardIndex];
    if (!card) return;

    // rating: 1 (Forgot), 2 (Struggled), 3 (Good), 4 (Perfect)
    if (rating >= 2) {
      if (card.streak === 0) {
        card.interval = 1;
      } else if (card.streak === 1) {
        card.interval = 3;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.streak += 1;
      // Adjust ease factor
      card.easeFactor = card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    } else {
      card.streak = 0;
      card.interval = 1;
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    }
    
    // Set next due date
    card.dueDate = Date.now() + card.interval * 86400 * 1000; // in days
    card.easeFactor = parseFloat(card.easeFactor.toFixed(2));
    
    this.renderSRSDeck();
  }

  getDueCards() {
    const now = Date.now();
    return this.flashcards.filter(c => c.dueDate <= now);
  }

  // Add mistake to the matrix
  logMistake(topic, question, wrongAnswer, correctAnswer) {
    // Avoid duplicate logs for identical questions
    const exists = this.mistakes.find(m => m.question === question && m.status === 'Unresolved');
    if (exists) return;

    const entry = {
      id: `m-${Date.now()}`,
      topic,
      question,
      wrongAnswer,
      correctAnswer,
      loggedAt: Date.now(),
      reviewedCount: 0,
      status: 'Unresolved'
    };

    // attach latest session if available
    const latestSession = this.attentionSessions[this.attentionSessions.length - 1];
    if (latestSession) {
      entry.sessionId = latestSession.id;
    }

    this.mistakes.push(entry);
    this.saveState();
    this.renderMistakeMatrix();
    this.renderRecommendations();
  }

  resolveMistake(id) {
    const mistake = this.mistakes.find(m => m.id === id);
    if (mistake) {
      mistake.status = 'Resolved';
      mistake.reviewedCount++;
      this.renderMistakeMatrix();
      this.renderRecommendations();
      this.saveState();
    }
  }

  // Telemetry updates
  addAttentionPoint(val) {
    this.attentionHistory.push(val);
    if (this.attentionHistory.length > 20) {
      this.attentionHistory.shift();
    }
    this.drawChart();
  }

  initChart() {
    if (this.chartCanvas) {
      window.addEventListener('resize', () => this.drawChart());
      // Wait for layout rendering
      setTimeout(() => this.drawChart(), 100);
    }
  }

  drawChart() {
    if (!this.ctx || !this.chartCanvas) return;

    const canvas = this.chartCanvas;
    const ctx = this.ctx;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height || 140;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Padding
    const px = 30;
    const py = 20;

    const graphWidth = w - px * 2;
    const graphHeight = h - py * 2;

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = py + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(w - px, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '8px monospace';
      ctx.fillText(`${100 - i * 25}%`, 8, y + 3);
    }

    const points = this.attentionHistory;
    if (points.length < 2) return;

    // Draw lines
    ctx.beginPath();
    const xStep = graphWidth / (points.length - 1);
    
    // Starting point coordinates
    const getCoords = (idx) => {
      const val = points[idx];
      const x = px + xStep * idx;
      const y = py + graphHeight - (val / 100) * graphHeight;
      return { x, y };
    };

    let start = getCoords(0);
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < points.length; i++) {
      const pt = getCoords(i);
      ctx.lineTo(pt.x, pt.y);
    }

    // Glowing stroke
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.8)';
    ctx.stroke();
    ctx.restore();

    // Fill under line
    ctx.beginPath();
    ctx.moveTo(px, py + graphHeight);
    ctx.lineTo(start.x, start.y);
    for (let i = 1; i < points.length; i++) {
      const pt = getCoords(i);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(px + graphWidth, py + graphHeight);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, py, 0, py + graphHeight);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Highlight final point
    const lastIdx = points.length - 1;
    const lastPt = getCoords(lastIdx);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00f2fe';
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderSRSDeck() {
    const dueCards = this.getDueCards();
    const srsContainer = document.getElementById('srs-card-container');
    if (!srsContainer) return;

    if (dueCards.length === 0) {
      srsContainer.innerHTML = `
        <div class="srs-empty">
          <div class="glow-icon">✨</div>
          <h4>ALL FLASHCARDS COMPLETED</h4>
          <p>SuperMemo algorithm estimates high recall retention. Next cards will load tomorrow.</p>
        </div>
      `;
      return;
    }

    // Cap active index
    if (this.activeCardIndex >= dueCards.length) {
      this.activeCardIndex = 0;
    }

    const card = dueCards[this.activeCardIndex];

    srsContainer.innerHTML = `
      <div class="srs-card-outer">
        <div class="srs-card-header">
          <span class="card-srs-topic">// TOPIC: ${card.topic}</span>
          <span class="card-srs-index">Card ${this.activeCardIndex + 1} of ${dueCards.length}</span>
        </div>
        
        <div class="srs-card-body" id="srs-card-click-area">
          <div class="srs-card-inner" id="srs-card-flip-wrap">
            <div class="srs-card-front">
              <p class="srs-prompt">${card.prompt}</p>
              <span class="srs-tap-prompt">Tap card to reveal formula / details</span>
            </div>
            <div class="srs-card-back">
              <p class="srs-answer">${card.answer}</p>
            </div>
          </div>
        </div>

        <div class="srs-nav-bar mt-2">
          <button class="srs-nav-btn" data-dir="-1">Previous</button>
          <button class="srs-nav-btn" data-dir="1">Next</button>
        </div>

        <div class="srs-card-footer hidden" id="srs-card-grades">
          <span class="grade-label">Rate your recall difficulty:</span>
          <div class="grade-buttons">
            <button class="grade-btn btn-forgot" data-grade="1">Forgot</button>
            <button class="grade-btn btn-struggled" data-grade="2">Hard</button>
            <button class="grade-btn btn-good" data-grade="3">Good</button>
            <button class="grade-btn btn-perfect" data-grade="4">Perfect</button>
          </div>
        </div>
      </div>
    `;

    // Hook events
    const flipWrap = document.getElementById('srs-card-flip-wrap');
    const gradesBar = document.getElementById('srs-card-grades');
    const clickArea = document.getElementById('srs-card-click-area');

    if (clickArea && flipWrap) {
      clickArea.addEventListener('click', () => {
        flipWrap.classList.toggle('flipped');
        if (gradesBar) {
          gradesBar.classList.remove('hidden');
        }
      });
    }

    const buttons = srsContainer.querySelectorAll('.grade-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // avoid reflipping
        const rating = parseInt(btn.dataset.grade);
        this.gradeFlashcard(rating);
      });
    });

    const navButtons = srsContainer.querySelectorAll('.srs-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = parseInt(btn.dataset.dir);
        const due = this.getDueCards();
        if (!due.length) return;
        this.activeCardIndex = (this.activeCardIndex + dir + due.length) % due.length;
        this.renderSRSDeck();
      });
    });
  }

  renderMistakeMatrix() {
    const matrixContainer = document.getElementById('mistake-matrix-tbody');
    if (!matrixContainer) return;

    const activeMistakes = this.mistakes.filter(m => m.status === 'Unresolved');

    if (activeMistakes.length === 0) {
      matrixContainer.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            No active concept errors recorded. Perfect quiz score streak!
          </td>
        </tr>
      `;
      return;
    }

    matrixContainer.innerHTML = activeMistakes.map(m => {
      const viewSessionBtn = m.sessionId ? `<button class="matrix-btn-session" data-session="${m.sessionId}">View Session</button>` : '';
      const elapsed = Math.round((Date.now() - m.loggedAt) / 60000);
      let timeText = elapsed <= 0 ? 'Just now' : `${elapsed}m ago`;
      if (elapsed > 60) timeText = `${Math.round(elapsed/60)}h ago`;

      return `
        <tr>
          <td>
            <span class="matrix-topic">${m.topic}</span>
          </td>
          <td>
            <div class="matrix-q">${m.question}</div>
            <div class="matrix-answers">
              <span class="matrix-wrong">Your input: ${m.wrongAnswer}</span>
              <span class="matrix-correct">Answer: ${m.correctAnswer}</span>
            </div>
          </td>
          <td>
            <span class="matrix-urgency urgent">HIGH</span>
          </td>
          <td class="text-right">
            <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
              ${viewSessionBtn}
              <button class="matrix-btn-action" data-id="${m.id}">Review</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind action buttons
    matrixContainer.querySelectorAll('.matrix-btn-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const mistake = this.mistakes.find(m => m.id === id);
        if (mistake && this.onMistakeReviewRequested) {
          this.onMistakeReviewRequested(mistake);
        }
      });
    });

    // View session buttons (if any)
    matrixContainer.querySelectorAll('.matrix-btn-session').forEach(btn => {
      btn.addEventListener('click', () => {
        const sessionId = btn.dataset.session;
        // call global app instance to open trend modal for session
        if (window && window.appInstance && typeof window.appInstance.openSessionTrend === 'function') {
          window.appInstance.openSessionTrend(sessionId);
        }
      });
    });
  }

  renderRecommendations() {
    const recContainer = document.getElementById('planner-recs');
    if (!recContainer) return;

    const focusVal = this.attentionHistory[this.attentionHistory.length - 1] || 80;
    const unresolvedMistakes = this.mistakes.filter(m => m.status === 'Unresolved');

    let recsHtml = '';

    // Recommendation logic based on current attention and items due
    if (focusVal > 80) {
      recsHtml = `
        <div class="rec-card premium-border">
          <div class="rec-icon">🎯</div>
          <div class="rec-content">
            <h5>Optimal Attention State (${focusVal}%)</h5>
            <p>Your brain synchronization is high. Excellent time to review hard concepts or start deep lessons.</p>
            <span class="rec-action-badge action-blue">Suggested: Start Lesson (Attention Mechanism)</span>
          </div>
        </div>
      `;
    } else if (focusVal < 50) {
      recsHtml = `
        <div class="rec-card alert-border">
          <div class="rec-icon">⚠️</div>
          <div class="rec-content">
            <h5>Low Engagement Warning (${focusVal}%)</h5>
            <p>Attention span is declining. We recommend switching to a highly interactive Socratic quiz session to re-trigger focus.</p>
            <span class="rec-action-badge action-pink">Suggested: Socratic Mode Quiz</span>
          </div>
        </div>
      `;
    } else {
      recsHtml = `
        <div class="rec-card standard-border">
          <div class="rec-icon">⚡</div>
          <div class="rec-content">
            <h5>Balanced Learning State (${focusVal}%)</h5>
            <p>Moderate focus levels. Good period for checking outstanding spaced repetition tasks.</p>
            <span class="rec-action-badge action-cyan">Suggested: Review due SRS Cards</span>
          </div>
        </div>
      `;
    }

    if (unresolvedMistakes.length > 0) {
      recsHtml += `
        <div class="rec-card alert-border mt-3">
          <div class="rec-icon">🔴</div>
          <div class="rec-content">
            <h5>Mistake Matrix Priority</h5>
            <p>You have ${unresolvedMistakes.length} unresolved conceptual errors in your log. Clear them to rebuild memory consolidation.</p>
            <span class="rec-action-badge action-orange">Priority Task: Resolve ${unresolvedMistakes[0].topic} error</span>
          </div>
        </div>
      `;
    }

    // include latest captured session summary if present
    const latestSession = this.attentionSessions[this.attentionSessions.length - 1];
    if (latestSession) {
      const avg = Math.round(latestSession.samples.reduce((s, p) => s + p.value, 0) / Math.max(1, latestSession.samples.length));
      recsHtml += `
        <div class="rec-card mt-3">
          <div class="rec-icon">📈</div>
          <div class="rec-content">
            <h5>Recent Focus Capture — ${avg}% avg</h5>
            <p>Captured ${Math.round(latestSession.duration)}s session. Use this snippet to guide short-term practice.</p>
            <span class="rec-action-badge action-cyan">Suggested: Review recent session and retry a Socratic quiz</span>
          </div>
        </div>
      `;
    }

    recContainer.innerHTML = recsHtml;
  }
}
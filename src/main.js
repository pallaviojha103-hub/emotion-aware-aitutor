/**
 * Zenith AI - Main System Orchestrator
 * Coordinates real-time data loops between:
 * - src/emotion.js (webcam / mesh tracking)
 * - src/tutor.js (dialogue adaptive styles)
 * - src/planner.js (analytics & Mistake Matrix)
 */

import { EmotionTracker } from './emotion.js';
import { AuraTutor } from './tutor.js';
import { AdaptivePlanner } from './planner.js';

class ZenithApp {
  constructor() {
    this.emotionTracker = null;
    this.tutor = null;
    this.planner = null;

    this.userScoreXP = 0;
    this.autoAdaptEnabled = true;

    this.init();
  }

  init() {
    // 1. Initial Uptime Tracker
    this.startUptimeCounter();

    // 2. DOM Elements
    const faceCanvas = document.getElementById('face-mesh-canvas');
    const webcamVideo = document.getElementById('webcam-feed');
    const chatContainer = document.getElementById('chat-logs');
    const plannerCanvas = document.getElementById('attention-history-canvas');

    // 3. Spaced Repetition / Mistake Review Callbacks
    const handleMistakeReview = (mistake) => {
      this.tutor.addUserMessage(`I want to review: "${mistake.question}"`);
      
      // Force change tutor mode to ELI5 to re-explain a mistake!
      this.tutor.addSystemMessage(`Adapting explanation style to ELI5 to clarify mistake in ${mistake.topic}`);
      this.autoAdaptEnabled = false; // Disable auto-adapt temporarily during mistake review
      const adaptCheckbox = document.getElementById('auto-adapt-checkbox');
      if (adaptCheckbox) adaptCheckbox.checked = false;

      // Update dropdown selection UI
      const styleSelect = document.getElementById('tutor-style-select');
      if (styleSelect) styleSelect.value = 'ELI5';

      this.tutor.setMode('ELI5');
      this.tutor.setTopic(mistake.topic);
      
      // Resolve/Update count
      this.planner.resolveMistake(mistake.id);
    };

    // 4. Initialize Sub-modules
    this.planner = new AdaptivePlanner(plannerCanvas, handleMistakeReview);
    
    // Quiz feedback dispatcher
    const handleQuizSubmission = (isCorrect, mistakeDetails) => {
      if (isCorrect) {
        this.userScoreXP += 10;
        const xpEl = document.getElementById('user-xp-display');
        if (xpEl) xpEl.innerText = `${this.userScoreXP} XP`;
        
        // Push focus point up
        this.emotionTracker.focus = Math.min(100, this.emotionTracker.focus + 5);
        this.emotionTracker.boredom = Math.max(0, this.emotionTracker.boredom - 8);
        this.emotionTracker.updateSlidersUI();
      } else {
        // Log to Planner Mistake Matrix and attach latest captured session if available
        const latestSession = this.planner.attentionSessions[this.planner.attentionSessions.length - 1];
        this.planner.logMistake(
          mistakeDetails.topic,
          mistakeDetails.question,
          mistakeDetails.wrongAnswer,
          mistakeDetails.correctAnswer
        );
        
        // Push confusion up, focus down
        this.emotionTracker.confusion = Math.min(100, this.emotionTracker.confusion + 12);
        this.emotionTracker.focus = Math.max(0, this.emotionTracker.focus - 8);
        this.emotionTracker.updateSlidersUI();
      }

      this.planner.addAttentionPoint(this.emotionTracker.focus);
      this.planner.renderRecommendations();
    };

    this.tutor = new AuraTutor(chatContainer, handleQuizSubmission);

    // Initial tutor navigation and welcome lesson
    this.initializeLessonNavigation();

    // Callback on real-time emotion telemetry
    const handleEmotionUpdate = (metrics) => {
      // Add point to planner analytics
      this.planner.addAttentionPoint(metrics.focus);
      this.planner.renderRecommendations();

      // Update HUD status text
      const focusSummaryText = document.getElementById('hud-focus-summary');
      const focusText = document.getElementById('hud-focus-value');
      const confusionText = document.getElementById('hud-confusion-value');
      const boredomText = document.getElementById('hud-boredom-value');

      if (focusSummaryText) focusSummaryText.innerText = `${metrics.focus}%`;
      if (focusText) focusText.innerText = `${metrics.focus}%`;
      if (confusionText) confusionText.innerText = `${metrics.confusion}%`;
      if (boredomText) boredomText.innerText = `${metrics.boredom}%`;

      // Adapt Tutor Mode if enabled
      if (this.autoAdaptEnabled) {
        const modeChanged = this.tutor.setMode(metrics.mode);
        if (modeChanged) {
          // Update dropdown selection UI
          const styleSelect = document.getElementById('tutor-style-select');
          if (styleSelect) styleSelect.value = metrics.mode;
        }
      }
    };

    this.emotionTracker = new EmotionTracker(faceCanvas, webcamVideo, handleEmotionUpdate);

    // Start Webcam scan
    this.emotionTracker.startCamera();

    // 5. Setup Action Listeners
    this.setupUIListeners();
    
    // 6. Draw Spaced Repetition initial cards
    this.planner.renderSRSDeck();
    this.planner.renderMistakeMatrix();
    this.planner.renderRecommendations();
  }

  setupUIListeners() {
    // Manual Style Select Dropdown
    const styleSelect = document.getElementById('tutor-style-select');
    if (styleSelect) {
      styleSelect.addEventListener('change', (e) => {
        const selectedMode = e.target.value;
        this.tutor.setMode(selectedMode);
      });
    }

    // Auto Adapt Checkbox toggle
    const adaptCheckbox = document.getElementById('auto-adapt-checkbox');
    if (adaptCheckbox) {
      adaptCheckbox.addEventListener('change', (e) => {
        this.autoAdaptEnabled = e.target.checked;
        this.tutor.addSystemMessage(`Real-time emotion adaptation loop: ${this.autoAdaptEnabled ? 'ONLINE' : 'OFFLINE (MANUAL OVERRIDE)'}`);
      });
    }

    // Camera toggle button
    const cameraToggleBtn = document.getElementById('camera-toggle-btn');
    if (cameraToggleBtn) {
      cameraToggleBtn.addEventListener('click', () => {
        if (this.emotionTracker.isActive) {
          this.emotionTracker.stopCamera();
          cameraToggleBtn.innerText = "START WEBCAM";
          cameraToggleBtn.className = "hud-btn btn-cyan";
        } else {
          this.emotionTracker.startCamera();
          cameraToggleBtn.innerText = "STOP WEBCAM";
          cameraToggleBtn.className = "hud-btn btn-magenta";
        }
      });
    }

    // Global Quiz HUD Controls
    const globalQuizDifficulty = document.getElementById('global-quiz-difficulty');
    const quizShuffleBtn = document.getElementById('quiz-shuffle-btn');
    const quizCountEl = document.getElementById('quiz-count');
    const quizTimerToggle = document.getElementById('quiz-timer-toggle');
    const quizTimerDisplay = document.getElementById('quiz-timer-display');

    const refreshQuizCount = () => {
      if (!this.tutor || !this.tutor.questionBank) return;
      const topic = this.tutor.currentTopic;
      const diff = (globalQuizDifficulty && globalQuizDifficulty.value) || 'any';
      let pool = this.tutor.questionBank.slice();
      if (topic) pool = pool.filter(q => q.topic === topic);
      if (diff && diff !== 'any') pool = pool.filter(q => q.difficulty === diff);
      if (!pool.length) pool = this.tutor.questionBank.slice();
      if (quizCountEl) quizCountEl.innerText = `${pool.length} Q`;
    };

    if (globalQuizDifficulty) {
      globalQuizDifficulty.addEventListener('change', (e) => {
        const val = e.target.value;
        if (this.tutor) {
          this.tutor.quizDifficulty = val;
          const q = this.tutor.getQuizForTopic(this.tutor.currentTopic, val);
          if (q) {
            this.tutor.currentQuizQuestion = q;
            this.tutor.updateQuizDisplay(q);
          }
        }

        // Calibrate and video visibility controls
        const calibrateBtn = document.getElementById('calibrate-btn');
        const videoVisibilityToggle = document.getElementById('video-visibility-toggle');
        if (calibrateBtn) {
          calibrateBtn.addEventListener('click', async () => {
            calibrateBtn.disabled = true;
            const old = calibrateBtn.innerText;
            calibrateBtn.innerText = 'Calibrating...';
            try {
              const baseline = await this.emotionTracker.calibrate(3);
              this.tutor.addSystemMessage(`Calibration complete — baseline motion ${baseline.toFixed(2)}`);
            } catch (e) {
              this.tutor.addSystemMessage('Calibration failed.');
            }
            calibrateBtn.innerText = old;
            calibrateBtn.disabled = false;
          });
        }

        if (videoVisibilityToggle) {
          videoVisibilityToggle.addEventListener('change', (e) => {
            const show = !!e.target.checked;
            this.emotionTracker.setVideoVisibility(show);
          });
          // initialize
          this.emotionTracker.setVideoVisibility(videoVisibilityToggle.checked);
        }

        // Trend modal and export handlers
        const viewTrendBtn = document.getElementById('view-trend-btn');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const exportPngBtn = document.getElementById('export-png-btn');
        const trendModal = document.getElementById('trend-modal');
        const closeTrendBtn = document.getElementById('close-trend-modal');
        const downloadTrendPng = document.getElementById('download-trend-png');

        if (viewTrendBtn && trendModal) {
          viewTrendBtn.addEventListener('click', () => {
            trendModal.style.display = 'flex';
            this.emotionTracker.renderLargeTrend();
          });
        }
        if (closeTrendBtn && trendModal) {
          closeTrendBtn.addEventListener('click', () => { trendModal.style.display = 'none'; });
        }
        // also close when clicking outside content
        if (trendModal) {
          trendModal.addEventListener('click', (e) => {
            if (e.target === trendModal) trendModal.style.display = 'none';
          });
        }

        if (exportCsvBtn) {
          exportCsvBtn.addEventListener('click', () => { this.emotionTracker.exportAttentionCSV(); });
        }
        if (exportPngBtn) {
          exportPngBtn.addEventListener('click', () => { this.emotionTracker.exportAttentionPNG(); });
        }
        if (downloadTrendPng) {
          downloadTrendPng.addEventListener('click', () => { this.emotionTracker.exportAttentionPNG(); });
        }
        refreshQuizCount();
      });
    }

    if (quizShuffleBtn) {
      quizShuffleBtn.addEventListener('click', () => {
        if (!this.tutor) return;
        const q = this.tutor.getQuizForTopic(this.tutor.currentTopic, this.tutor.quizDifficulty || 'any');
        if (q) {
          this.tutor.currentQuizQuestion = q;
          this.tutor.updateQuizDisplay(q);
        }
        refreshQuizCount();
      });
    }

    // Expose method to open session trend by id
    this.openSessionTrend = (sessionId) => {
      if (!sessionId) return;
      const session = this.planner.attentionSessions.find(s => s.id === sessionId);
      if (!session) return;
      if (trendModal) {
        trendModal.style.display = 'flex';
        this.emotionTracker.renderLargeTrend(session);
      }
    };

    // Timer implementation (simple countdown per question)
    let quizTimerId = null;
    let quizRemaining = 0;
    const stopQuizTimer = () => {
      if (quizTimerId) clearInterval(quizTimerId);
      quizTimerId = null;
      quizRemaining = 0;
      if (quizTimerDisplay) quizTimerDisplay.innerText = '00:00';
      if (quizTimerToggle) quizTimerToggle.innerText = 'Start Timer';
    };

    const disableQuizOptions = (disabled) => {
      const chatContainer = document.getElementById('chat-logs');
      if (!chatContainer) return;
      const btns = chatContainer.querySelectorAll('.quiz-opt-btn');
      btns.forEach(b => b.disabled = !!disabled);
    };

    if (quizTimerToggle) {
      quizTimerToggle.addEventListener('click', () => {
        if (quizTimerId) {
          stopQuizTimer();
          disableQuizOptions(false);
          return;
        }

        // Start a 30-second timer for the current question
        quizRemaining = 30;
        // Auto-capture attention session during this timed quiz
        try {
          this.emotionTracker.captureSession(30).then((session) => {
            if (this.planner && typeof this.planner.ingestAttentionSession === 'function') {
              this.planner.ingestAttentionSession(session);
              this.tutor.addSystemMessage(`Captured ${session.duration}s attention session (avg ${(session.samples.reduce((s,p)=>s+p.value,0)/session.samples.length).toFixed(1)}%).`);
            }
          });
        } catch (e) {
          // ignore capture errors
        }
        if (quizTimerDisplay) quizTimerDisplay.innerText = `00:${quizRemaining.toString().padStart(2,'0')}`;
        if (quizTimerToggle) quizTimerToggle.innerText = 'Stop Timer';
        disableQuizOptions(false);
        quizTimerId = setInterval(() => {
          quizRemaining -= 1;
          if (quizTimerDisplay) quizTimerDisplay.innerText = `00:${quizRemaining.toString().padStart(2,'0')}`;
          if (quizRemaining <= 0) {
            // Time's up: disable options and show feedback
            disableQuizOptions(true);
            const chatContainer = document.getElementById('chat-logs');
            const feedback = chatContainer ? chatContainer.querySelector('#quiz-result-feedback') : null;
            if (feedback) {
              feedback.className = 'quiz-feedback incorrect-alert animate-fade';
              feedback.innerHTML = `<span class="text-pink font-bold">⏱ TIME'S UP — Answer Logged</span><p class="text-xs text-muted mt-1">Try another shuffled question or restart the timer.</p>`;
            }
            stopQuizTimer();
          }
        }, 1000);
      });
    }

    // initial refresh of quiz counts
    setTimeout(refreshQuizCount, 500);

    // Chat submit query box
    const chatInput = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const submitQuery = () => {
      if (!chatInput) return;
      const text = chatInput.value.trim();
      if (!text) return;

      this.tutor.addUserMessage(text);
      chatInput.value = '';

      // Generate a mock intelligent dialogue response based on current mode and topic
      setTimeout(() => {
        this.simulateTutorResponse(text);
      }, 800);
    };

    if (sendBtn) sendBtn.addEventListener('click', submitQuery);
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitQuery();
        }
      });
    }
  }

  initializeLessonNavigation() {
    const topicTabsContainer = document.getElementById('topic-tabs');
    const subjectSelect = document.getElementById('subject-select');
    if (!topicTabsContainer || !subjectSelect) return;

    const subjects = this.tutor.getSubjectOptions();
    subjectSelect.innerHTML = subjects.map(subject => `
      <option value="${subject}">${subject}</option>
    `).join('');

    const renderTopicButtons = (subject) => {
      const topics = this.tutor.getTopicsBySubject(subject);
      topicTabsContainer.innerHTML = topics.map((topic, index) => `
        <button class="topic-tab-btn${index === 0 ? ' active' : ''}" data-topic="${topic}">${topic}</button>
      `).join('');
      this.bindTopicButtons();
      if (topics.length) {
        this.tutor.setTopic(topics[0]);
      }
    };

    renderTopicButtons(subjectSelect.value || subjects[0]);
    subjectSelect.addEventListener('change', (e) => {
      renderTopicButtons(e.target.value);
    });
  }

  bindTopicButtons() {
    const topicButtons = document.querySelectorAll('.topic-tab-btn');
    topicButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        topicButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const topic = btn.dataset.topic;
        this.tutor.setTopic(topic);
      });
    });
  }

  simulateTutorResponse(userMessage) {
    const lesson = this.tutor.lessons[this.tutor.currentTopic];
    if (!lesson) return;

    let response = '';

    if (this.tutor.currentMode === 'ELI5') {
      response = `That's a fantastic question! Think of it like baking a cake. If you add the sugar too early, it melts. Here, you're wondering how this affects the main system. Let's remember the big picture metaphor: the chef only cooks what is on the counter! Let me know if you want me to quiz you on this?`;
    } else if (this.tutor.currentMode === 'DEEP_DIVE') {
      response = `Analyzing query: "${userMessage}". In the formal limits, this corresponds to the boundary condition where the Hamiltonian is perturbed. Recall that the projection operator $P = |\\phi\\rangle\\langle\\phi|$ acts as a filter on our state vector. Let us investigate the computational implications of this boundary constraint in our sample code block.`;
    } else { // Socratic
      response = `Aha! You're analyzing the right coordinates. Let me ask you: if we shift the weights dynamically, does it resolve the telephone whisper drop, or make it worse? Try answering the active challenge question above to verify your model!`;
    }

    this.tutor.addTutorMessage(`
      <div class="adaptive-tutor-message animate-fade">
        <p>${response}</p>
      </div>
    `);
    this.tutor.typesetMath();
  }

  startUptimeCounter() {
    const counterEl = document.getElementById('uptime-counter');
    if (!counterEl) return;

    let seconds = 0;
    setInterval(() => {
      seconds++;
      const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      counterEl.innerText = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }
}

// Instantiate App on load
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new ZenithApp();
});
/**
 * Zenith AI - Emotion & Engagement Tracking Module
 * Handles camera integration, scans facial motion to estimate focus,
 * and renders a glowing, cybernetic face mesh visualization.
 */

export class EmotionTracker {
  constructor(canvas, video, onStateChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.video = video;
    this.onStateChange = onStateChange;

    // State parameters
    this.focus = 85;      // 0 - 100
    this.confusion = 10;  // 0 - 100
    this.boredom = 15;    // 0 - 100

    this.stream = null;
    this.isActive = false;
    this.isCameraRequested = false;
    
    // Animation/Simulation landmarks
    this.meshAnimationTimer = 0;
    this.lastFrameTime = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;

    // Movement tracking properties
    this.prevFrameData = null;
    this.baselineMotion = 0;
    this.attentionHistory = [];
    this.attentionSamples = []; // {ts, value}
    this.showVideo = true;
    this.motionScore = 0;

    // Bind event listeners for UI controls if they exist
    this.initControls();
  }

  async calibrate(seconds = 3) {
    // Capture baseline motion over a short window
    const samples = [];
    const start = performance.now();
    return new Promise((resolve) => {
      const collect = () => {
        samples.push(this.motionScore || 0);
        if (performance.now() - start < seconds * 1000) {
          setTimeout(collect, 150);
        } else {
          const avg = samples.reduce((a,b) => a+b, 0) / Math.max(1, samples.length);
          this.baselineMotion = avg;
          // Adjust focus mapping slightly based on baseline
          if (this.baselineMotion > 18) {
            this.focus = Math.max(30, this.focus - 5);
          } else if (this.baselineMotion < 2) {
            this.focus = Math.min(90, this.focus + 5);
          }
          this.updateSlidersUI();
          this.triggerStateCallback();
          resolve(this.baselineMotion);
        }
      };
      collect();
    });
  }

  captureSession(durationSec = 10) {
    // Actively record samples over durationSec and resolve with session object
    return new Promise((resolve) => {
      const samples = [];
      const start = Date.now();
      const interval = 250; // sample every 250ms
      const tId = setInterval(() => {
        samples.push({ ts: Date.now(), value: this.focus });
        if (Date.now() - start >= durationSec * 1000) {
          clearInterval(tId);
          const session = {
            id: `sess-${Date.now()}`,
            startTime: start,
            endTime: Date.now(),
            duration: durationSec,
            samples
          };
          resolve(session);
        }
      }, interval);
    });
  }

  setVideoVisibility(show) {
    this.showVideo = !!show;
    if (this.video) this.video.style.display = this.showVideo ? '' : 'none';
  }

  initControls() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindSliders();
    });
    this.bindSliders();
  }

  bindSliders() {
    const focusSlider = document.getElementById('sim-focus');
    const confusionSlider = document.getElementById('sim-confusion');
    const boredomSlider = document.getElementById('sim-boredom');

    if (focusSlider) {
      focusSlider.addEventListener('input', (e) => {
        this.focus = parseInt(e.target.value);
        this.updateSlidersUI();
        this.triggerStateCallback();
      });
    }
    if (confusionSlider) {
      confusionSlider.addEventListener('input', (e) => {
        this.confusion = parseInt(e.target.value);
        this.updateSlidersUI();
        this.triggerStateCallback();
      });
    }
    if (boredomSlider) {
      boredomSlider.addEventListener('input', (e) => {
        this.boredom = parseInt(e.target.value);
        this.updateSlidersUI();
        this.triggerStateCallback();
      });
    }
  }

  updateSlidersUI() {
    const focusVal = document.getElementById('sim-focus-val');
    const confusionVal = document.getElementById('sim-confusion-val');
    const boredomVal = document.getElementById('sim-boredom-val');

    if (focusVal) focusVal.innerText = `${this.focus}%`;
    if (confusionVal) confusionVal.innerText = `${this.confusion}%`;
    if (boredomVal) boredomVal.innerText = `${this.boredom}%`;

    const focusSlider = document.getElementById('sim-focus');
    const confusionSlider = document.getElementById('sim-confusion');
    const boredomSlider = document.getElementById('sim-boredom');

    if (focusSlider && focusSlider.value != this.focus) focusSlider.value = this.focus;
    if (confusionSlider && confusionSlider.value != this.confusion) confusionSlider.value = this.confusion;
    if (boredomSlider && boredomSlider.value != this.boredom) boredomSlider.value = this.boredom;
  }

  triggerStateCallback() {
    if (this.onStateChange) {
      this.onStateChange({
        focus: this.focus,
        confusion: this.confusion,
        boredom: this.boredom,
        mode: this.determineLearningMode()
      });
    }
  }

  determineLearningMode() {
    if (this.confusion > 40) {
      return 'ELI5';
    } else if (this.boredom > 45 || this.focus < 50) {
      return 'GAMIFIED';
    } else {
      return 'DEEP_DIVE';
    }
  }

  async startCamera() {
    if (this.isActive) return;
    this.isCameraRequested = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false
      });
      this.video.srcObject = this.stream;
      this.video.play();
      this.isActive = true;
      console.log("Webcam connected successfully.");
      
      const camStatusEl = document.getElementById('camera-status-text');
      if (camStatusEl) camStatusEl.innerText = "CAMERA: ACTIVE";
    } catch (err) {
      console.warn("Webcam access denied or unavailable. Running in Neural Simulation Mode.", err);
      this.isActive = false;
      const camStatusEl = document.getElementById('camera-status-text');
      if (camStatusEl) camStatusEl.innerText = "CAMERA: OFFLINE (SIMULATED)";
    }
    
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.isActive = false;
    this.isCameraRequested = false;
    this.stream = null;
    const camStatusEl = document.getElementById('camera-status-text');
    if (camStatusEl) camStatusEl.innerText = "CAMERA: SHUTDOWN";
  }

  tick() {
    if (!this.isCameraRequested) return;
    
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.updateMotionAnalysis();
    this.drawFaceMesh(now, dt);

    requestAnimationFrame(() => this.tick());
  }

  updateMotionAnalysis() {
    if (!this.isActive || !this.video || this.video.paused) {
      this.motionScore = 0.5 + Math.sin(performance.now() / 2000) * 0.2;
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 40;
    tempCanvas.height = 30;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
    
    try {
      const frameData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      if (this.prevFrameData) {
        let diff = 0;
        const total = frameData.data.length;
        for (let i = 0; i < total; i += 4) {
          const r1 = frameData.data[i], g1 = frameData.data[i+1], b1 = frameData.data[i+2];
          const r2 = this.prevFrameData.data[i], g2 = this.prevFrameData.data[i+1], b2 = this.prevFrameData.data[i+2];
          const l1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
          const l2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
          diff += Math.abs(l1 - l2);
        }
        
        this.motionScore = (diff / (total / 4)) / 255 * 100;
        
        if (this.motionScore > 18) { 
          this.focus = Math.max(25, this.focus - 0.2);
          this.boredom = Math.min(95, this.boredom + 0.1);
        } else if (this.motionScore < 0.2) { 
          this.focus = Math.max(30, this.focus - 0.05);
        } else { 
          this.focus = Math.min(100, this.focus + 0.1);
          this.boredom = Math.max(5, this.boredom - 0.15);
        }

        this.focus = Math.round(this.focus);
        this.boredom = Math.round(this.boredom);
        // push to attention history (keep short window)
        this.attentionHistory.push(this.focus);
        if (this.attentionHistory.length > 60) this.attentionHistory.shift();

        // push timestamped samples for session captures
        this.attentionSamples.push({ ts: Date.now(), value: this.focus });
        if (this.attentionSamples.length > 2000) this.attentionSamples.shift();
        this.renderMiniAttention();
        
        this.updateSlidersUI();
        this.triggerStateCallback();
      }
      this.prevFrameData = frameData;
    } catch (e) {
      // Cross-origin fallback
    }
  }

  drawFaceMesh(timestamp, dt) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);

    if (this.isActive && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      if (this.showVideo) {
        ctx.filter = "brightness(0.5) contrast(1.2) grayscale(0.8)";
        ctx.drawImage(this.video, 0, 0, w, h);
      } else {
        // subtle animated background when video hidden
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0,0,w,h);
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(w/2, h/2, 20 + i*10 + Math.sin(timestamp/500+i)*3, 0, Math.PI*2);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    this.blinkTimer += dt;
    if (this.isBlinking) {
      if (this.blinkTimer > 0.15) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    } else {
      const blinkThreshold = 4.0 - (this.boredom / 50); 
      if (this.blinkTimer > blinkThreshold) {
        this.isBlinking = true;
        this.blinkTimer = 0;
      }
    }

    const cx = w / 2;
    const cy = h / 2 - 10;

    const confusionOffset = (this.confusion / 100) * 12;
    const boredomEyeOffset = (this.boredom / 100) * 4;
    const boredomHeadDrop = (this.boredom / 100) * 15;
    
    let gazeX = 0;
    if (this.focus < 60) {
      gazeX = Math.sin(timestamp / 800) * 6;
    }

    const faceY = cy + boredomHeadDrop;

    const landmarks = {
      contour: [
        {x: cx - 50, y: faceY - 50},
        {x: cx - 60, y: faceY - 20},
        {x: cx - 60, y: faceY + 15},
        {x: cx - 45, y: faceY + 45},
        {x: cx - 20, y: faceY + 65},
        {x: cx, y: faceY + 75}, 
        {x: cx + 20, y: faceY + 65},
        {x: cx + 45, y: faceY + 45},
        {x: cx + 60, y: faceY + 15},
        {x: cx + 60, y: faceY - 20},
        {x: cx + 50, y: faceY - 50}
      ],
      browLeft: [
        {x: cx - 40, y: faceY - 45 + confusionOffset},
        {x: cx - 25, y: faceY - 48 + (confusionOffset * 1.5)},
        {x: cx - 10, y: faceY - 45 + (confusionOffset * 2)}
      ],
      browRight: [
        {x: cx + 10, y: faceY - 45 + (confusionOffset * 2)},
        {x: cx + 25, y: faceY - 48 + (confusionOffset * 1.5)},
        {x: cx + 40, y: faceY - 45 + confusionOffset}
      ],
      eyeLeft: [
        {x: cx - 30 + gazeX, y: faceY - 30},
        {x: cx - 20 + gazeX, y: faceY - 32 + boredomEyeOffset},
        {x: cx - 10 + gazeX, y: faceY - 30}
      ],
      eyeRight: [
        {x: cx + 10 + gazeX, y: faceY - 30},
        {x: cx + 20 + gazeX, y: faceY - 32 + boredomEyeOffset},
        {x: cx + 30 + gazeX, y: faceY - 30}
      ],
      nose: [
        {x: cx, y: faceY - 25},
        {x: cx, y: faceY},
        {x: cx - 10, y: faceY + 12},
        {x: cx, y: faceY + 15},
        {x: cx + 10, y: faceY + 12}
      ],
      mouthOuter: [
        {x: cx - 28, y: faceY + 30},
        {x: cx - 15, y: faceY + 24 - (confusionOffset / 2)},
        {x: cx, y: faceY + 26 + (this.confusion/10)},
        {x: cx + 15, y: faceY + 24 - (confusionOffset / 2)},
        {x: cx + 28, y: faceY + 30},
        {x: cx + 15, y: faceY + 38 + (this.boredom/8)},
        {x: cx, y: faceY + 40 + (this.boredom/6)},
        {x: cx - 15, y: faceY + 38 + (this.boredom/8)}
      ]
    };

    let themeColor = '#00f2fe'; 
    let glowColor = 'rgba(0, 242, 254, 0.4)';
    const mode = this.determineLearningMode();

    if (mode === 'ELI5') {
      themeColor = '#ffb302'; 
      glowColor = 'rgba(255, 179, 2, 0.4)';
    } else if (mode === 'GAMIFIED') {
      themeColor = '#ff007f'; 
      glowColor = 'rgba(255, 0, 127, 0.4)';
    }

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themeColor;
    ctx.fillStyle = themeColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColor;

    const laserY = (Math.sin(timestamp / 300) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.moveTo(10, laserY);
    ctx.lineTo(w - 10, laserY);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
    
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themeColor;

    this.drawPath(ctx, landmarks.contour, false);
    this.drawPath(ctx, landmarks.browLeft, false);
    this.drawPath(ctx, landmarks.browRight, false);
    
    if (this.isBlinking) {
      ctx.beginPath();
      ctx.moveTo(cx - 30 + gazeX, faceY - 30);
      ctx.lineTo(cx - 10 + gazeX, faceY - 30);
      ctx.moveTo(cx + 10 + gazeX, faceY - 30);
      ctx.lineTo(cx + 30 + gazeX, faceY - 30);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 30 + gazeX, faceY - 30);
      ctx.quadraticCurveTo(cx - 20 + gazeX, faceY - 36, cx - 10 + gazeX, faceY - 30);
      ctx.quadraticCurveTo(cx - 20 + gazeX, faceY - 24 + boredomEyeOffset, cx - 30 + gazeX, faceY - 30);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 10 + gazeX, faceY - 30);
      ctx.quadraticCurveTo(cx + 20 + gazeX, faceY - 36, cx + 30 + gazeX, faceY - 30);
      ctx.quadraticCurveTo(cx + 20 + gazeX, faceY - 24 + boredomEyeOffset, cx + 10 + gazeX, faceY - 30);
      ctx.stroke();

      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(cx - 20 + gazeX, faceY - 30, 2, 0, Math.PI * 2);
      ctx.arc(cx + 20 + gazeX, faceY - 30, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawPath(ctx, landmarks.nose, false);
    this.drawPath(ctx, landmarks.mouthOuter, true);

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;

    this.drawConnectLine(ctx, landmarks.browLeft[2], landmarks.nose[0]);
    this.drawConnectLine(ctx, landmarks.browRight[0], landmarks.nose[0]);
    this.drawConnectLine(ctx, landmarks.eyeLeft[0], landmarks.contour[1]);
    this.drawConnectLine(ctx, landmarks.eyeLeft[2], landmarks.nose[1]);
    this.drawConnectLine(ctx, landmarks.eyeRight[0], landmarks.nose[1]);
    this.drawConnectLine(ctx, landmarks.eyeRight[2], landmarks.contour[9]);
    this.drawConnectLine(ctx, landmarks.nose[3], landmarks.mouthOuter[2]);
    this.drawConnectLine(ctx, landmarks.mouthOuter[6], landmarks.contour[5]);
    this.drawConnectLine(ctx, landmarks.mouthOuter[0], landmarks.contour[3]);
    this.drawConnectLine(ctx, landmarks.mouthOuter[4], landmarks.contour[7]);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = themeColor;
    
    const allGroups = [
      landmarks.contour, landmarks.browLeft, landmarks.browRight,
      landmarks.eyeLeft, landmarks.eyeRight, landmarks.nose, landmarks.mouthOuter
    ];

    allGroups.forEach(group => {
      group.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.restore();
    ctx.font = '9px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText(`ENGAGEMENT DEVIATION: ${(this.motionScore * 10).toFixed(1)} RAD`, 15, h - 25);
    ctx.fillText(`VECTOR DENSITY: 68 POINTS/MS`, 15, h - 13);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`ATTENTION INDEX`, w - 110, h - 25);
    ctx.fillStyle = themeColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${this.focus}%`, w - 110, h - 13);
  }

  drawPath(ctx, points, close = false) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (close) ctx.closePath();
    ctx.stroke();
  }

  drawConnectLine(ctx, pt1, pt2) {
    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  }

  renderMiniAttention() {
    const canvas = document.getElementById('attention-mini-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(0,0,w,h);
    const data = this.getSmoothedData(this.attentionHistory.slice(-40), 3);
    if (!data.length) return;
    const max = 100; const min = 0;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = Math.floor((i / (data.length-1)) * (w-6)) + 3;
      const y = Math.floor(h - ((val - min) / (max - min)) * (h-8)) - 4;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = 'rgba(0,242,254,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  getSmoothedData(data, windowSize = 3) {
    if (!data || data.length === 0) return [];
    const out = [];
    for (let i = 0; i < data.length; i++) {
      let start = Math.max(0, i - Math.floor(windowSize/2));
      let end = Math.min(data.length - 1, i + Math.floor(windowSize/2));
      let sum = 0; let count = 0;
      for (let j = start; j <= end; j++) { sum += data[j]; count++; }
      out.push(sum / Math.max(1, count));
    }
    return out;
  }

  renderLargeTrend(session) {
    const canvas = document.getElementById('attention-large-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(0,0,w,h);
    let source = null;
    if (session && session.samples) {
      source = session.samples.map(s => s.value);
    } else {
      source = this.attentionHistory.slice(-200);
    }
    const data = this.getSmoothedData(source, 5);
    if (!data.length) return;

    // draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + i * ((h-20)/4);
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(w-10,y); ctx.stroke();
    }

    // axes labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px monospace';
    ctx.fillText('0', 8, h - 12);
    ctx.fillText('50', 8, h/2 + 4);
    ctx.fillText('100', 4, 16);

    // plot
    ctx.beginPath();
    const max = 100; const min = 0;
    data.forEach((val, i) => {
      const x = 40 + Math.floor((i / (data.length-1)) * (w-60));
      const y = Math.floor(h - 10 - ((val - min) / (max - min)) * (h-30));
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = 'rgba(0,242,254,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();

    // fill gradient
    ctx.lineTo(w-10, h-10);
    ctx.lineTo(40, h-10);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0, 'rgba(0,242,254,0.18)');
    grad.addColorStop(1, 'rgba(0,242,254,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  exportAttentionCSV() {
    const data = this.attentionHistory.slice();
    if (!data.length) return;
    const rows = ['index,value'];
    data.forEach((v,i) => rows.push(`${i},${v}`));
    const csv = rows.join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attention_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportAttentionPNG() {
    // render latest onto large canvas then download
    this.renderLargeTrend();
    const canvas = document.getElementById('attention-large-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `attention_trend_${Date.now()}.png`;
    a.click();
  }
}
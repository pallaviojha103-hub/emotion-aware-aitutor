/**
 * Zenith AI - AuraTutor Adaptive AI Lesson Module
 * Dynamically modifies explanations and interaction style based on engagement levels.
 * Renders analogies, LaTeX formulas, code, and interactive quiz components.
 * Integrated Web Audio Synthesizer for acoustic feedback.
 */

// Sound Synthesizer Class for audio feedback (Spike sounds, success beeps, adaptation sweeps)
export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type = 'sine', duration = 0.2, volume = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSuccess() {
    // Joyful arpeggio (C5 -> E5 -> G5)
    this.playTone(523.25, 'triangle', 0.1, 0.12);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.12), 80);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.22, 0.15), 160);
  }

  playError() {
    // Dissonant buzz (A3 -> G#3)
    this.playTone(220.00, 'sawtooth', 0.18, 0.12);
    setTimeout(() => this.playTone(207.65, 'sawtooth', 0.28, 0.12), 120);
  }

  playSpike() {
    // High-pitched electrical spark sound
    this.playTone(1800, 'sine', 0.05, 0.18);
    this.playTone(900, 'triangle', 0.08, 0.1);
  }

  playAdaptTone(mode) {
    if (mode === 'ELI5') {
      // Reassuring warm major third sweep
      this.playTone(329.63, 'sine', 0.4, 0.08); // E4
      setTimeout(() => this.playTone(415.30, 'sine', 0.5, 0.08), 120); // G#4
    } else if (mode === 'GAMIFIED') {
      // Energetic game arcade bleep
      this.playTone(440.00, 'triangle', 0.12, 0.1); // A4
      setTimeout(() => this.playTone(554.37, 'triangle', 0.12, 0.1), 100); // C#5
      setTimeout(() => this.playTone(659.25, 'triangle', 0.22, 0.1), 200); // E5
    } else { // DEEP_DIVE
      // Deep cybernetic chord
      this.playTone(130.81, 'sine', 0.6, 0.15); // C3
      this.playTone(196.00, 'sine', 0.6, 0.12); // G3
    }
  }
}

export class AuraTutor {
  constructor(chatContainer, onQuizSubmit) {
    this.chatContainer = chatContainer;
    this.onQuizSubmit = onQuizSubmit;

    this.currentTopic = 'Quantum Physics';
    this.currentMode = 'DEEP_DIVE'; 
    this.synth = new SoundSynthesizer();

    // Lif simulator canvas state
    this.lifSimTimer = null;
    
    // Knowledge Base
    this.lessons = {
      'Quantum Physics': {
        title: 'Quantum Superposition',
        eli5: {
          introduction: "Imagine a spinning coin. While it's spinning on the table, is it heads or tails? It's actually a blur of **both** at the same time! 🪙",
          explanation: "In the quantum world, tiny particles (like electrons) can be in multiple states simultaneously. This is called **Superposition**. Only when we look at them (measurement) do they stop spinning and pick a side (heads or tails).\n\nHere's a visual analogy widget below to test this concept:",
          widget: 'COIN_FLIPPER'
        },
        deep_dive: {
          introduction: "A quantum system is described by a state vector $|\\psi\\rangle$ in a Hilbert space. Under **Superposition**, we represent this state as a linear combination of basis states:",
          formula: "\\[|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle\\]\nwhere $\\alpha, \\beta \\in \\mathbb{C}$ are probability amplitudes, satisfying the normalization condition:\n\\[|\\alpha|^2 + |\\beta|^2 = 1\\]",
          explanation: "Upon measurement, the state collapses to $|0\\rangle$ with probability $|\\alpha|^2$ or $|1\\rangle$ with probability $|\\beta|^2$. This collapse is governed by the Born Rule and is fundamentally non-deterministic.",
          code: `// Quantum Circuit Simulation (Qiskit example)
from qiskit import QuantumCircuit, Aer, execute

# Create 1-qubit circuit
qc = QuantumCircuit(1, 1)

# Put qubit in superposition (Hadamard Gate)
qc.h(0)

# Measure the qubit
qc.measure(0, 0)
`
        },
        gamified: {
          question: "If a qubit is initialized in the state $|\\psi\\rangle = \\frac{1}{\\sqrt{2}}|0\\rangle + \\frac{1}{\\sqrt{2}}|1\\rangle$, what is the exact probability of measuring state $|1\\rangle$?",
          options: [
            { text: "0%", correct: false },
            { text: "50%", correct: true },
            { text: "100%", correct: false },
            { text: "70.7%", correct: false }
          ],
          correctExplanation: "The probability amplitude is $\\beta = \\frac{1}{\\sqrt{2}}$. Applying the Born Rule, $P(1) = |\\beta|^2 = |\\frac{1}{\\sqrt{2}}|^2 = \\frac{1}{2} = 50\\%$.",
          wrongHelp: "Remember: Probability = square of the absolute value of the coefficient ($\\|\\beta\\|^2$)."
        }
      },
      'Machine Learning': {
        title: 'Vanishing Gradients',
        eli5: {
          introduction: "Imagine a game of 'Telephone' with 50 people. The first person whispers a secret, but by the time it reaches the 50th person, the message is completely lost. 📞",
          explanation: "In deep neural networks, weights are updated using a signal called a 'gradient' sent backwards. In very deep networks, as this signal travels back through the layers, it gets multiplied by numbers smaller than 1. By the time it reaches the first layer, the signal is so tiny (vanished) that the layer learns absolutely nothing.",
          widget: 'TELEPHONE_CHAIN'
        },
        deep_dive: {
          introduction: "In deep feedforward networks, the gradient of the loss $L$ with respect to the weights $W^{[1]}$ of the first layer is computed via the chain rule:",
          formula: "\\[\\frac{\\partial L}{\\partial W^{[1]}} = \\frac{\\partial L}{\\partial a^{[L]}} \\left( \\prod_{l=2}^{L} \\frac{\\partial a^{[l]}}{\\partial a^{[l-1]}} \\right) \\frac{\\partial a^{[1]}}{\\partial W^{[1]}}\\]",
          explanation: "When using activation functions like Sigmoid or Tanh, where the maximum derivative is $\\le 0.25$, the product term $\\prod_{l=2}^{L} W^{[l]T} \\text{diag}(g'(z^{[l-1]}))$ approaches zero exponentially as depth $L \\to \\infty$, causing $\\frac{\\partial L}{\\partial W^{[1]}} \\to 0$.",
          code: `# Mitigation: ReLU & He Initialization
import torch.nn as nn

class DeepNet(nn.Module):
    def __init__(self):
        super().__init__()
        # Using ReLU activation prevents vanishing derivatives (derivative is 1 for x > 0)
        self.layers = nn.Sequential(
            nn.Linear(784, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 10)
        )
`
        },
        gamified: {
          question: "Which activation function is primary chosen to prevent the vanishing gradient problem in deep hidden layers?",
          options: [
            { text: "Sigmoid (Logistic)", correct: false },
            { text: "Hyperbolic Tangent (Tanh)", correct: false },
            { text: "Rectified Linear Unit (ReLU)", correct: true },
            { text: "Step Function", correct: false }
          ],
          correctExplanation: "ReLU has a constant derivative of 1.0 for all positive inputs, meaning gradients flow backward without shrinking.",
          wrongHelp: "Look for an activation function that does not saturate to 0 at high positive inputs."
        }
      },
      'JavaScript Engine': {
        title: 'Event Loop',
        eli5: {
          introduction: "Imagine a busy restaurant chef (the Call Stack) and a waiter bringing orders (Callback Queue). 🍳",
          explanation: "JavaScript can only do one thing at a time. The chef cooks orders one by one. If a dish takes hours (like fetching web data), JavaScript sends it to the kitchen helper (Web APIs). When it's ready, the waiter puts it in a queue. The Chef only looks at the queue when their counter is completely empty.",
          widget: 'CHEF_QUEUE'
        },
        deep_dive: {
          introduction: "JavaScript operates in a single-threaded runtime environment utilizing a Call Stack, a Heap, and a Task (Callback) Queue. The Event Loop algorithm executes continuously:",
          formula: "\\text{Loop: } \\text{While }(\\text{Stack is Empty}) \\implies \\text{Pop Task from Queue} \\to \\text{Push to Stack}",
          explanation: "Microtasks (e.g., Promise callbacks, MutationObserver) have higher priority than Macrotasks (e.g., setTimeout, setInterval, I/O events). The event loop empties the entire microtask queue before executing the next macrotask.",
          code: `// Execution Order Prediction
console.log('Start');
setTimeout(() => console.log('Timeout (Macro)'), 0);
Promise.resolve().then(() => console.log('Promise (Micro)'));
console.log('End');
`
        },
        gamified: {
          question: "In the JavaScript event loop, which of the following queues takes execution precedence over the Macrotask (Callback) queue?",
          options: [
            { text: "Render Queue", correct: false },
            { text: "Microtask Queue (Promises)", correct: true },
            { text: "Web API Thread Pool", correct: false },
            { text: "Heap Stack Allocation", correct: false }
          ],
          correctExplanation: "Promises enter the Microtask queue, which is fully drained after the current execution block completes and before any macrotask is processed.",
          wrongHelp: "Think of Promises and then() blocks, which run immediately after synchronous code."
        }
      },
      'Attention Mechanism': {
        title: 'GenAI Self-Attention',
        eli5: {
          introduction: "Imagine reading a chocolate cake recipe. When you look at the word 'bake', your brain automatically pays attention to 'oven' and 'temp' rather than 'bowl' or 'spoon'. 🍰",
          explanation: "That is what the **Attention Mechanism** does! It lets the AI map links between words in a sentence, no matter how far apart they are. In the interactive panel below, hover over different words in the sentence to see which other words the AI connects it to.",
          widget: 'ATTENTION_MAP'
        },
        deep_dive: {
          introduction: "The Scaled Dot-Product Attention mechanism projects input sequence vectors into Query ($Q$), Key ($K$), and Value ($V$) representations using learned weight matrices:",
          formula: "\\[\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V\\]",
          explanation: "The scaling factor $\\sqrt{d_k}$ is critical: for large values of $d_k$, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Dividing by $\\sqrt{d_k}$ prevents this saturation during backpropagation.",
          code: `# Scaled Dot-Product Attention in PyTorch
import torch
import torch.nn.functional as F
import math

def attention(Q, K, V):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    weights = F.softmax(scores, dim=-1)
    return torch.matmul(weights, V), weights
`
        },
        gamified: {
          question: "Why do we divide the query-key dot product by the scaling factor $\\sqrt{d_k}$ in the attention formulation?",
          options: [
            { text: "To normalize the length of sentences.", correct: false },
            { text: "To prevent the softmax function from saturating and producing vanishing gradients.", correct: true },
            { text: "To speed up matrix multiplication complexity.", correct: false },
            { text: "To project keys and values to the same dimension.", correct: false }
          ],
          correctExplanation: "Correct! Without the scaling factor, large dimensions scale dot-product values upward, causing softmax to saturate to flat values (0 or 1) with near-zero derivatives.",
          wrongHelp: "Think about what happens to the gradients of softmax when its input numbers have very large differences."
        }
      },
      'Neuromorphic Spikes': {
        title: 'LIF Spiking Neurons',
        eli5: {
          introduction: "Think of a spiking neuron like a water balloon. 🎈 Water drips in slowly (leak). If it fills up completely, it pops (spikes), resets, and starts over.",
          explanation: "Traditional computers send numbers, but biological brains communicate using tiny electrical pulses called spikes. This uses almost zero energy! In our simulator below, click 'Inject Pulse' to add membrane voltage. Watch it spike and reset!",
          widget: 'LIF_SIMULATOR'
        },
        deep_dive: {
          introduction: "The Leaky Integrate-and-Fire (LIF) model represents the membrane potential $v(t)$ of a neuron as a simple RC circuit: the input current $I(t)$ charges the capacitor, while the resistor leaks charge over time:",
          formula: "\\[\\tau_m \\frac{dv(t)}{dt} = -[v(t) - v_{rest}] + R_m I(t)\\]\nWhen $v(t) \\ge v_{th}$, the neuron emits a spike at $t = t_f$, and the potential is instantly reset to the reset value:\n\\[v(t^+) = v_{reset}\\]",
          explanation: "This model abstracts away the complex ion channel kinetics of the Hodgkin-Huxley model, while preserving temporal spike-time properties. This makes it highly efficient for hardware implementation on neuromorphic chips like Intel Loihi.",
          code: `// Spiking LIF Neuron Step Simulation
function stepLIF(v, I, dt, tau = 20, vRest = -70, vTh = -55, vReset = -75) {
  if (v >= vTh) {
    return { v: vReset, spiked: true };
  }
  // Euler integration step
  const dv = (-(v - vRest) + I) * (dt / tau);
  const nextV = v + dv;
  return { v: nextV, spiked: false };
}
`
        },
        gamified: {
          question: "In the LIF model, what happens to the membrane potential immediately after it exceeds the spiking threshold?",
          options: [
            { text: "It continues to grow exponentially.", correct: false },
            { text: "It remains at the threshold value indefinitely.", correct: false },
            { text: "It is reset instantly to a baseline potential (v_reset).", correct: true },
            { text: "It decays slowly with a time constant tau.", correct: false }
          ],
          correctExplanation: "Immediately after a spike is registered, the membrane potential resets to a low reset value and remains refractory.",
          wrongHelp: "Look at the reset condition: v(t^+) = v_reset."
        }
      },
      'Reinforcement Learning': {
        title: 'Reward-Based Agent Training',
        eli5: {
          introduction: "Imagine training a puppy to sit using treats. Each time the puppy sits, it gets a reward and learns to repeat the action. 🐶",
          explanation: "Reinforcement learning trains an agent using rewards and penalties instead of direct instructions. The agent explores actions and learns which ones give the best long-term reward.",
          widget: 'REWARD_LOOP'
        },
        deep_dive: {
          introduction: "Reinforcement learning optimizes a policy $\pi(a|s)$ using the expected return $G_t$ and the Bellman equation:",
          formula: "\[V^{\pi}(s) = \mathbb{E}_{\pi}[R_{t} + \gamma V^{\pi}(S_{t+1}) | S_t = s]\]",
          explanation: "The value of a state is the expected future reward starting there. Algorithms like Q-learning update action values using temporal difference errors.",
          code: `# Q-learning update step
Q[state, action] += alpha * (reward + gamma * Q[next_state, best_next_action] - Q[state, action])`
        },
        gamified: {
          question: "Which signal directly tells an RL agent whether its action was good or bad?",
          options: [
            { text: "Policy distribution", correct: false },
            { text: "Reward signal", correct: true },
            { text: "Loss gradient", correct: false },
            { text: "Entropy term", correct: false }
          ],
          correctExplanation: "The reward signal is the feedback that indicates whether the taken action produced a desirable outcome.",
          wrongHelp: "Ask yourself: in reinforcement learning, what is used to reinforce desired behaviors?"
        }
      },
      'Cryptography': {
        title: 'Secret-Key & Public-Key Fundamentals',
        eli5: {
          introduction: "Imagine writing a secret note that only one friend can open because they have the special key. 🔐",
          explanation: "Cryptography keeps data safe by transforming it into a secret code. The right key is needed to convert it back into a readable message.",
          widget: 'ENCRYPTION_SIM'
        },
        deep_dive: {
          introduction: "Modern encryption uses mathematical operations such as modular exponentiation. For RSA, the public key is $(n, e)$ and the private key is $d$:",
          formula: "\[c \equiv m^e \pmod{n}, \quad m \equiv c^d \pmod{n}\]",
          explanation: "Security comes from the difficulty of factoring the modulus $n$ into primes $p$ and $q$. Without the private exponent $d$, recovering the original message is computationally infeasible.",
          code: `// RSA encryption step
const cipher = BigInt(message) ** BigInt(e) % BigInt(n);`
        },
        gamified: {
          question: "In RSA, which of the following is kept private?",
          options: [
            { text: "Public exponent e", correct: false },
            { text: "Private exponent d", correct: true },
            { text: "Modulus n", correct: false },
            { text: "Plaintext message", correct: false }
          ],
          correctExplanation: "The private exponent d is kept secret and used to decrypt RSA ciphertext.",
          wrongHelp: "Remember: the public key is shared, the private key is never shared."
        }
      },
      'Bio-inspired AI': {
        title: 'Swarm Intelligence & Neural Plasticity',
        eli5: {
          introduction: "Imagine a flock of birds moving together without a leader, each one following simple rules and forming a beautiful pattern. 🐦",
          explanation: "Bio-inspired AI learns from nature. Swarm intelligence uses many simple agents working together, while neural plasticity means the network changes its connections over time based on experience.",
          widget: 'BIO_INSPIRED_FIELD'
        },
        deep_dive: {
          introduction: "Swarm intelligence can be modeled by agents updating positions based on velocity and neighborhood influence:",
          formula: "\[v_i(t+1) = w v_i(t) + c_1 r_1 (p_i - x_i(t)) + c_2 r_2 (g - x_i(t))\]",
          explanation: "Here, $p_i$ is each agent's best-known position and $g$ is the group best. The combination of local memory and group feedback produces emergent problem-solving behaviors.",
          code: `# Particle swarm optimization velocity update
v[i] = w * v[i] + c1 * r1 * (best_personal[i] - position[i]) + c2 * r2 * (best_global - position[i])`
        },
        gamified: {
          question: "Which behavior best illustrates swarm intelligence?",
          options: [
            { text: "A single model trained on historic data", correct: false },
            { text: "Many simple agents coordinating via local rules", correct: true },
            { text: "A deep network with millions of parameters", correct: false },
            { text: "A fixed lookup table", correct: false }
          ],
          correctExplanation: "Swarm intelligence emerges when many simple agents coordinate and learn from local interaction rules.",
          wrongHelp: "Think of birds, ants, or fish moving together without a central controller."
        }
      }
    };

    // Question bank loaded from external JSON (optional)
    this.questionBank = [];
    this.currentQuizQuestion = null;
    this.quizDifficulty = 'any';
    this.loadQuestionBank();

    this.messages = [];

    this.subjectTopics = {
      'All': Object.keys(this.lessons),
      'Quantum Systems': ['Quantum Physics', 'Attention Mechanism'],
      'Bio-Intelligent Systems': ['Neuromorphic Spikes', 'Bio-inspired AI'],
      'AI & Engineering': ['Machine Learning', 'JavaScript Engine', 'Reinforcement Learning', 'Cryptography']
    };
  }

  async loadQuestionBank() {
    try {
      const resp = await fetch('src/questions.json');
      if (!resp.ok) {
        console.warn('Question bank not found at src/questions.json');
        return;
      }
      const data = await resp.json();
      this.questionBank = Array.isArray(data.questions) ? data.questions : [];
    } catch (err) {
      console.warn('Failed to load question bank', err);
    }
  }

  getQuizForTopic(topic, difficulty = 'any') {
    if (!this.questionBank || !this.questionBank.length) return null;
    let pool = this.questionBank.slice();
    if (topic) pool = pool.filter(q => q.topic === topic);
    if (difficulty && difficulty !== 'any') pool = pool.filter(q => q.difficulty === difficulty);
    if (!pool.length) pool = this.questionBank.slice();
    const idx = Math.floor(Math.random() * pool.length);
    const q = pool[idx];
    if (!q) return null;
    const options = q.options.map((text, i) => ({ text, correct: i === q.correctIndex }));
    return {
      id: q.id,
      topic: q.topic,
      question: q.question,
      options,
      correctExplanation: q.explanation || '',
      wrongHelp: q.wrongHelp || 'Review the explanation after the attempt.'
    };
  }

  getSubjectOptions() {
    return Object.keys(this.subjectTopics);
  }

  getTopicsBySubject(subject) {
    return this.subjectTopics[subject] || Object.keys(this.lessons);
  }

  setTopic(topic) {
    if (this.lessons[topic]) {
      this.currentTopic = topic;
      this.triggerLesson();
    }
  }

  setMode(mode) {
    if (this.currentMode === mode) return false;
    this.currentMode = mode;
    console.log(`AuraTutor switching style to: ${mode}`);
    this.synth.playAdaptTone(mode);
    this.triggerLesson();
    return true;
  }

  triggerLesson() {
    const lesson = this.lessons[this.currentTopic];
    if (!lesson) return;

    this.addSystemMessage(`AI Tutor adapted to [${this.currentMode}] mode for "${lesson.title}"`);
    
    let content = '';

    if (this.currentMode === 'ELI5') {
      content = `
        <div class="adaptive-tutor-message eli5-theme animate-fade">
          <div class="tutor-header-row">
            <span class="tutor-avatar">👧</span>
            <div>
              <span class="tutor-name">AuraTutor (ELI5 Mode)</span>
              <span class="tutor-sub">Tone: Encouraging & Metaphorical</span>
            </div>
          </div>
          <p class="mt-2 text-gold"><strong>Analogy:</strong> ${lesson.eli5.introduction}</p>
          <p class="mt-2">${lesson.eli5.explanation}</p>
          ${this.getWidgetHTML(lesson.eli5.widget)}
        </div>
      `;
    } else if (this.currentMode === 'DEEP_DIVE') {
      content = `
        <div class="adaptive-tutor-message deep-dive-theme animate-fade">
          <div class="tutor-header-row">
            <span class="tutor-avatar">⚙️</span>
            <div>
              <span class="tutor-name">AuraTutor (Deep Dive Mode)</span>
              <span class="tutor-sub">Tone: Academic, Formal & Mathematical</span>
            </div>
          </div>
          <p class="mt-2">${lesson.deep_dive.introduction}</p>
          <div class="math-block mt-2 py-2 px-3">${lesson.deep_dive.formula}</div>
          <p class="mt-2 text-muted">${lesson.deep_dive.explanation}</p>
          <pre class="code-block mt-3"><code>${this.escapeHTML(lesson.deep_dive.code)}</code></pre>
        </div>
      `;
    } else { // GAMIFIED
      // Prefer lesson-provided gamified question, otherwise pull from external question bank
      const quizObj = lesson && lesson.gamified ? lesson.gamified : (this.getQuizForTopic ? this.getQuizForTopic(this.currentTopic) : null);
      this.currentQuizQuestion = quizObj;

      const optsHtml = (quizObj && quizObj.options ? quizObj.options : []).map((opt, i) => `
                <button class="quiz-opt-btn" data-index="${i}">${opt.text}</button>
              `).join('');

      const qText = quizObj ? quizObj.question : 'No quiz available for this topic.';

      content = `
        <div class="adaptive-tutor-message socratic-theme animate-fade">
          <div class="tutor-header-row">
            <span class="tutor-avatar">🧠</span>
            <div>
              <span class="tutor-name">AuraTutor (Socratic Mode)</span>
              <span class="tutor-sub">Tone: High Energy & Challenger</span>
            </div>
          </div>
          <div class="quiz-block mt-3">
            <div class="d-flex justify-content-between align-items-center">
              <span class="quiz-badge">⚡ ACTIVE RECALL CHALLENGE</span>
              <div class="quiz-controls">
                <label for="quiz-difficulty-select" class="text-xs text-muted">Difficulty:</label>
                <select id="quiz-difficulty-select" style="margin-left:8px; padding:4px 6px; font-size:0.8rem;">
                  <option value="any">Any</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <p class="quiz-q mt-2"><strong>${qText}</strong></p>
            <div class="quiz-options mt-3">
              ${optsHtml}
            </div>
            <div class="quiz-feedback mt-3 hidden" id="quiz-result-feedback"></div>
          </div>
        </div>
      `;
    }

    this.addTutorMessage(content);
    
    // Bind interaction triggers
    setTimeout(() => {
      this.bindWidgetInteractivity();
      this.bindQuizButtons();
      this.bindQuizDifficultySelector();
      this.typesetMath();
    }, 100);
  }

  bindQuizDifficultySelector() {
    const select = this.chatContainer.querySelector('#quiz-difficulty-select');
    if (!select) return;
    select.value = this.quizDifficulty || 'any';
    select.addEventListener('change', (e) => {
      this.quizDifficulty = e.target.value;
      const newQuiz = this.getQuizForTopic(this.currentTopic, this.quizDifficulty);
      if (newQuiz) {
        this.currentQuizQuestion = newQuiz;
        this.updateQuizDisplay(newQuiz);
      }
    });
  }

  updateQuizDisplay(quiz) {
    const qEl = this.chatContainer.querySelector('.quiz-q');
    const optsEl = this.chatContainer.querySelector('.quiz-options');
    const feedback = this.chatContainer.querySelector('#quiz-result-feedback');
    if (!qEl || !optsEl) return;
    qEl.innerHTML = `<strong>${quiz.question}</strong>`;
    optsEl.innerHTML = quiz.options.map((opt, i) => `\n                <button class="quiz-opt-btn" data-index="${i}">${opt.text}</button>\n              `).join('');
    if (feedback) {
      feedback.classList.add('hidden');
      feedback.innerHTML = '';
    }
    // Re-bind quiz buttons for new options
    this.bindQuizButtons();
  }

  getWidgetHTML(widgetType) {
    if (widgetType === 'COIN_FLIPPER') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Interactive Superposition Simulator</h5>
          <p class="text-xs text-muted">Click spin to simulate qubit measurement collapse</p>
          <div class="coin-container py-3 d-flex align-items-center justify-content-center">
            <div class="spinning-coin" id="widget-coin">Ψ</div>
          </div>
          <div class="d-flex justify-content-center gap-2">
            <button class="widget-btn" id="coin-spin-btn">Measure Qubit</button>
            <button class="widget-btn btn-sec" id="coin-super-btn">Reset to Superposition</button>
          </div>
          <div id="coin-result-text" class="text-center mt-2 text-sm text-cyan font-mono">Qubit State: α|0⟩ + β|1⟩ (Superposition)</div>
        </div>
      `;
    } else if (widgetType === 'TELEPHONE_CHAIN') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Telephone Chain (Gradient Flow) Simulator</h5>
          <div class="d-flex align-items-center justify-content-between gap-1 py-3" style="overflow-x: auto;">
            <div class="chain-node active">In</div>
            <div class="chain-arrow">➡</div>
            <div class="chain-node active">Layer 1 (w=0.4)</div>
            <div class="chain-arrow">➡</div>
            <div class="chain-node active">Layer 2 (w=0.3)</div>
            <div class="chain-arrow">➡</div>
            <div class="chain-node warn">Layer 3 (w=0.25)</div>
            <div class="chain-arrow">➡</div>
            <div class="chain-node error">Out (vanished)</div>
          </div>
          <p class="text-center text-xs text-pink mt-1" id="telephone-status">Gradient Signal at Layer 1: 0.003 (Near Zero!)</p>
          <div class="d-flex justify-content-center gap-2">
            <button class="widget-btn" id="fix-gradient-btn">Apply ReLU (derivative = 1.0)</button>
          </div>
        </div>
      `;
    } else if (widgetType === 'CHEF_QUEUE') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Event Loop Queue Monitor</h5>
          <div class="chef-kitchen-visual mt-2">
            <div class="kitchen-section">
              <h6>Stack (Sync Code)</h6>
              <div class="kitchen-plate font-mono" id="chef-stack">console.log('Start')</div>
            </div>
            <div class="kitchen-section">
              <h6>Web API (Async Work)</h6>
              <div class="kitchen-plate font-mono" id="kitchen-helper">Empty</div>
            </div>
            <div class="kitchen-section">
              <h6>Queue (Callback Tasks)</h6>
              <div class="kitchen-plate font-mono" id="waiter-queue">Timeout Callback</div>
            </div>
          </div>
          <div class="d-flex justify-content-center gap-2 mt-3">
            <button class="widget-btn" id="run-event-loop-btn">Step Event Loop</button>
          </div>
        </div>
      `;
    } else if (widgetType === 'ATTENTION_MAP') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Dynamic Attention Weight Matrix</h5>
          <p class="text-xs text-muted mb-2">Hover over words to see query-key attention strength</p>
          <div class="attention-sentence py-2 d-flex flex-wrap gap-2 justify-content-center">
            <span class="attention-word" data-links="chef:0.9,oven:0.1">The</span>
            <span class="attention-word" data-links="baked:0.8,cake:0.9">chef</span>
            <span class="attention-word highlight-trigger" data-links="chef:0.7,cake:0.9,oven:0.8">baked</span>
            <span class="attention-word" data-links="baked:0.5">a</span>
            <span class="attention-word" data-links="cake:0.9,baked:0.7">delicious</span>
            <span class="attention-word highlight-trigger" data-links="baked:0.9,chef:0.4">cake</span>
            <span class="attention-word" data-links="oven:0.8">in</span>
            <span class="attention-word" data-links="oven:0.9">the</span>
            <span class="attention-word highlight-trigger" data-links="baked:0.8,chef:0.2">oven</span>
          </div>
          <div id="attention-connection-status" class="text-center mt-2 text-xs text-cyan font-mono">Hover a word to query attention associations</div>
        </div>
      `;
    } else if (widgetType === 'LIF_SIMULATOR') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>LIF Membrane Potential Visualizer</h5>
          <p class="text-xs text-muted mb-2">Inject pulse current to hit the spike threshold (-55mV)</p>
          <div class="d-flex gap-3 align-items-center">
            <div class="lif-gauge-bg" style="width: 25px; height: 100px; background: rgba(255,255,255,0.05); border: 1.5px solid var(--border-glass); border-radius: 4px; position: relative; overflow: hidden;">
              <div id="lif-voltage-bar" style="width: 100%; height: 20%; background: var(--neon-cyan); position: absolute; bottom: 0; transition: height 0.1s ease; box-shadow: 0 0 8px var(--neon-cyan);"></div>
              <div style="width: 100%; height: 1px; background: var(--neon-pink); position: absolute; bottom: 70%; z-index: 5;"></div>
            </div>
            <div class="flex-1">
              <canvas id="lif-plot-canvas" width="160" height="100" style="background: #000; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;"></canvas>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <div id="lif-numeric-val" class="font-mono text-xs text-cyan">Potential: -70 mV</div>
            <button class="widget-btn" id="lif-inject-btn">Inject Current (+5mV)</button>
          </div>
        </div>
      `;
    } else if (widgetType === 'BIO_INSPIRED_FIELD') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Swarm Intelligence Field</h5>
          <p class="text-xs text-muted mb-2">Simulate flocking agents and observe emergent group behavior.</p>
          <div class="bio-swarm-panel">
            <div id="swarm-status" class="text-xs text-secondary">Swarm cohesion: 68%</div>
            <div class="bio-swarm-grid" id="bio-swarm-grid"></div>
            <div class="d-flex justify-content-center gap-2 mt-2">
              <button class="widget-btn" id="swarm-step-btn">Advance Swarm</button>
              <button class="widget-btn btn-sec" id="swarm-reset-btn">Reset Swarm</button>
            </div>
          </div>
        </div>
      `;
    } else if (widgetType === 'REWARD_LOOP') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Reward Loop Simulator</h5>
          <p class="text-xs text-muted mb-2">Teach the agent by rewarding successful actions.</p>
          <div class="d-flex flex-column gap-2">
            <div class="text-xs text-secondary">Current reward count: <span id="reward-count">0</span></div>
            <button class="widget-btn" id="reward-action-btn">Grant Reward</button>
            <button class="widget-btn btn-sec" id="reward-reset-btn">Reset Agent</button>
            <div id="reward-action-status" class="text-xs text-cyan mt-2">Agent currently exploring behaviors.</div>
          </div>
        </div>
      `;
    } else if (widgetType === 'ENCRYPTION_SIM') {
      return `
        <div class="custom-widget-card mt-3">
          <h5>Encryption Playground</h5>
          <p class="text-xs text-muted mb-2">Encode a short message using a simple key.</p>
          <div class="d-flex flex-column gap-2">
            <div class="font-mono text-xs" id="cipher-input-display">Plaintext: HELLO</div>
            <div class="font-mono text-xs" id="cipher-output-display">Ciphertext: ----</div>
            <button class="widget-btn" id="encrypt-btn">Encrypt Sample Message</button>
            <button class="widget-btn btn-sec" id="decrypt-btn">Decrypt Message</button>
          </div>
        </div>
      `;
    }
    return '';
  }

  bindWidgetInteractivity() {
    // 1. Coin flipper widget
    const spinBtn = document.getElementById('coin-spin-btn');
    const superBtn = document.getElementById('coin-super-btn');
    const coin = document.getElementById('widget-coin');
    const resText = document.getElementById('coin-result-text');

    if (spinBtn && coin && resText) {
      spinBtn.addEventListener('click', () => {
        coin.classList.remove('spin-active');
        coin.classList.add('collapsed');
        const collapsedState = Math.random() > 0.5 ? '1' : '0';
        coin.innerText = collapsedState;
        resText.innerText = `Measurement Result: |${collapsedState}⟩ (Collapsed!)`;
        this.synth.playSpike();
      });
    }
    if (superBtn && coin && resText) {
      superBtn.addEventListener('click', () => {
        coin.classList.remove('collapsed');
        coin.classList.add('spin-active');
        coin.innerText = 'Ψ';
        resText.innerText = `Qubit State: 1/√2 |0⟩ + 1/√2 |1⟩ (Superposition)`;
        this.synth.playTone(440, 'sine', 0.25, 0.1);
      });
    }

    // 2. Telephone chain widget
    const fixGradientBtn = document.getElementById('fix-gradient-btn');
    const statusTxt = document.getElementById('telephone-status');
    const nodes = document.querySelectorAll('.chain-node');

    if (fixGradientBtn && statusTxt) {
      fixGradientBtn.addEventListener('click', () => {
        nodes.forEach(n => {
          n.className = 'chain-node active';
          if (n.innerText.includes('Out')) n.innerText = 'Out (1.0)';
        });
        statusTxt.innerText = "He initialization + ReLU applied. Gradients flowing optimally at 1.0!";
        statusTxt.className = "text-center text-xs text-green mt-1";
        this.synth.playSuccess();
      });
    }

    // 3. Chef queue
    const runLoopBtn = document.getElementById('run-event-loop-btn');
    const stack = document.getElementById('chef-stack');
    const helper = document.getElementById('kitchen-helper');
    const queue = document.getElementById('waiter-queue');

    if (runLoopBtn && stack && helper && queue) {
      let step = 0;
      runLoopBtn.addEventListener('click', () => {
        step = (step + 1) % 4;
        this.synth.playTone(300 + step * 80, 'triangle', 0.08, 0.08);
        if (step === 0) {
          stack.innerText = "console.log('Start')";
          helper.innerText = "Empty";
          queue.innerText = "Timeout Callback";
        } else if (step === 1) {
          stack.innerText = "Empty";
          helper.innerText = "Fetch Data (Pending)";
          queue.innerText = "Timeout Callback";
        } else if (step === 2) {
          stack.innerText = "Empty";
          helper.innerText = "Empty";
          queue.innerText = "Timeout Callback -> Microtask";
        } else {
          stack.innerText = "Timeout Callback (Executing!)";
          helper.innerText = "Empty";
          queue.innerText = "Empty";
          this.synth.playSpike();
        }
      });
    }

    // 4. Attention Map Widget
    const words = document.querySelectorAll('.attention-word');
    const attnStatus = document.getElementById('attention-connection-status');
    if (words.length > 0 && attnStatus) {
      words.forEach(word => {
        word.addEventListener('mouseenter', () => {
          // Play micro synth sound
          this.synth.playTone(600 + Math.random() * 200, 'sine', 0.05, 0.05);

          const links = word.dataset.links.split(',');
          // Reset highlights
          words.forEach(w => {
            w.style.color = '';
            w.style.textShadow = '';
            w.style.background = '';
          });

          // Highlight target word
          word.style.color = 'var(--neon-pink)';
          word.style.textShadow = '0 0 5px var(--neon-pink)';
          word.style.background = 'rgba(255, 0, 127, 0.1)';

          // Highlight linked words
          const linksText = links.map(link => {
            const [targetName, weight] = link.split(':');
            // Find target span
            words.forEach(w => {
              if (w.innerText.toLowerCase().replace(/[^a-z]/g, '') === targetName.toLowerCase()) {
                w.style.color = 'var(--neon-cyan)';
                w.style.textShadow = '0 0 4px var(--neon-cyan)';
                w.style.background = `rgba(0, 242, 254, ${parseFloat(weight) * 0.18})`;
              }
            });
            return `${targetName.toUpperCase()}: ${(parseFloat(weight)*100).toFixed(0)}%`;
          }).join(' | ');

          attnStatus.innerText = `Focus Links -> ${linksText}`;
        });

        word.addEventListener('mouseleave', () => {
          words.forEach(w => {
            w.style.color = '';
            w.style.textShadow = '';
            w.style.background = '';
          });
          attnStatus.innerText = "Hover a word to query attention associations";
        });
      });
    }

    // 5. LIF Neuron simulator
    const injectBtn = document.getElementById('lif-inject-btn');
    const vBar = document.getElementById('lif-voltage-bar');
    const numVal = document.getElementById('lif-numeric-val');
    const plotCanvas = document.getElementById('lif-plot-canvas');

    if (injectBtn && vBar && numVal && plotCanvas) {
      const pCtx = plotCanvas.getContext('2d');
      let voltage = -70; // mV
      const vRest = -70;
      const vTh = -55;
      const vReset = -75;
      
      const history = Array(40).fill(vRest);
      
      const drawPlot = () => {
        pCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        pCtx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
        pCtx.lineWidth = 0.5;

        // Threshold line
        const thY = plotCanvas.height - (vTh - vReset) / (vRest - vReset) * (plotCanvas.height * 0.6);
        pCtx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
        pCtx.beginPath();
        pCtx.moveTo(0, thY);
        pCtx.lineTo(plotCanvas.width, thY);
        pCtx.stroke();

        // Voltage trace
        pCtx.strokeStyle = 'var(--neon-cyan)';
        pCtx.lineWidth = 1.5;
        pCtx.beginPath();
        const xStep = plotCanvas.width / (history.length - 1);
        for(let i=0; i<history.length; i++) {
          const val = history[i];
          const pct = (val - vReset) / (vRest - vReset + 10);
          const y = plotCanvas.height - pct * plotCanvas.height;
          if (i === 0) pCtx.moveTo(0, y);
          else pCtx.lineTo(i * xStep, y);
        }
        pCtx.stroke();
      };

      // Periodic leak simulation
      if (this.lifSimTimer) clearInterval(this.lifSimTimer);
      this.lifSimTimer = setInterval(() => {
        if (voltage > vRest) {
          // leak back to resting potential
          voltage -= 0.6;
          if (voltage < vRest) voltage = vRest;
          numVal.innerText = `Potential: ${voltage.toFixed(1)} mV`;
          
          const fillPct = (voltage - vReset) / (vRest - vReset + 10) * 100;
          vBar.style.height = `${Math.max(0, fillPct)}%`;
        }
        history.push(voltage);
        history.shift();
        drawPlot();
      }, 100);

      injectBtn.addEventListener('click', () => {
        voltage += 5.0;
        
        this.synth.playTone(350 + (voltage + 70) * 10, 'sine', 0.1, 0.08);

        if (voltage >= vTh) {
          // SPIKE!
          voltage = 20; // action potential peak
          numVal.innerText = `SPIKE EMITTED! (0 mV)`;
          vBar.style.height = `100%`;
          vBar.style.background = 'var(--neon-pink)';
          vBar.style.boxShadow = '0 0 15px var(--neon-pink)';
          
          this.synth.playSpike();

          // Flash target card border or highlight screen
          const card = document.getElementById('tutor-card');
          if (card) {
            card.classList.add('flash-cyan');
            setTimeout(() => card.classList.remove('flash-cyan'), 200);
          }

          history.push(voltage);
          history.shift();
          
          voltage = vReset; // reset
          setTimeout(() => {
            vBar.style.background = '';
            vBar.style.boxShadow = '';
          }, 150);
        } else {
          const fillPct = (voltage - vReset) / (vRest - vReset + 10) * 100;
          vBar.style.height = `${Math.max(0, fillPct)}%`;
          numVal.innerText = `Potential: ${voltage.toFixed(1)} mV`;
        }
        
        history.push(voltage);
        history.shift();
        drawPlot();
      });

      drawPlot();
    }

    // 6. Bio-inspired AI Swarm simulator interactions
    const swarmGrid = document.getElementById('bio-swarm-grid');
    const swarmStatus = document.getElementById('swarm-status');
    const swarmStepBtn = document.getElementById('swarm-step-btn');
    const swarmResetBtn = document.getElementById('swarm-reset-btn');
    if (swarmGrid && swarmStatus && swarmStepBtn && swarmResetBtn) {
      const cells = [];
      swarmGrid.innerHTML = '';
      for (let i = 0; i < 16; i += 1) {
        const cell = document.createElement('div');
        cell.className = 'bio-swarm-cell';
        swarmGrid.appendChild(cell);
        cells.push(cell);
      }

      let cohesion = 68;
      const updateSwarm = () => {
        cells.forEach((cell, idx) => {
          const angle = (Date.now() / 300) + idx * 0.8;
          const x = Math.round(Math.sin(angle) * 4);
          const y = Math.round(Math.cos(angle) * 3);
          cell.style.transform = `translate(${x}px, ${y}px)`;
          cell.style.opacity = 0.5 + Math.sin(angle) * 0.25;
        });
        swarmStatus.innerText = `Swarm cohesion: ${cohesion}%`;
      };

      swarmStepBtn.addEventListener('click', () => {
        cohesion = Math.min(100, cohesion + 4);
        updateSwarm();
        this.synth.playTone(440 + cohesion * 2, 'triangle', 0.1, 0.08);
      });

      swarmResetBtn.addEventListener('click', () => {
        cohesion = 60;
        updateSwarm();
        this.synth.playTone(280, 'sine', 0.14, 0.08);
      });

      updateSwarm();
    }

    // 7. Reward loop widget interactions
    const rewardBtn = document.getElementById('reward-action-btn');
    const rewardResetBtn = document.getElementById('reward-reset-btn');
    const rewardCountEl = document.getElementById('reward-count');
    const rewardStatus = document.getElementById('reward-action-status');
    if (rewardBtn && rewardResetBtn && rewardCountEl && rewardStatus) {
      let rewardCount = 0;
      rewardBtn.addEventListener('click', () => {
        rewardCount += 1;
        rewardCountEl.innerText = rewardCount;
        rewardStatus.innerText = rewardCount >= 3 ? 'Agent is learning the best path!' : 'Positive reward received. Continue reinforcing.';
        this.synth.playSuccess();
      });
      rewardResetBtn.addEventListener('click', () => {
        rewardCount = 0;
        rewardCountEl.innerText = rewardCount;
        rewardStatus.innerText = 'Agent reset. Start rewarding again to establish habit.';
        this.synth.playTone(220, 'sawtooth', 0.2, 0.1);
      });
    }

    // 7. Encryption simulator interactions
    const encryptBtn = document.getElementById('encrypt-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    const cipherInputDisplay = document.getElementById('cipher-input-display');
    const cipherOutputDisplay = document.getElementById('cipher-output-display');
    if (encryptBtn && decryptBtn && cipherInputDisplay && cipherOutputDisplay) {
      const plaintext = 'HELLO';
      const key = 3;
      let encrypted = '';
      encryptBtn.addEventListener('click', () => {
        encrypted = plaintext.split('').map(ch => {
          const code = ch.charCodeAt(0) - 65;
          return String.fromCharCode(((code + key) % 26) + 65);
        }).join('');
        cipherOutputDisplay.innerText = `Ciphertext: ${encrypted}`;
        this.synth.playTone(440, 'triangle', 0.12, 0.08);
      });
      decryptBtn.addEventListener('click', () => {
        if (!encrypted) return;
        const decrypted = encrypted.split('').map(ch => {
          const code = ch.charCodeAt(0) - 65;
          return String.fromCharCode(((code - key + 26) % 26) + 65);
        }).join('');
        cipherOutputDisplay.innerText = `Decrypted: ${decrypted}`;
        this.synth.playTone(330, 'sine', 0.18, 0.08);
      });
    }
  }

  bindQuizButtons() {
    const lesson = this.lessons[this.currentTopic];
    if (this.currentMode !== 'GAMIFIED') return;

    const btns = this.chatContainer.querySelectorAll('.quiz-opt-btn');
    const feedback = this.chatContainer.querySelector('#quiz-result-feedback');

    const quiz = this.currentQuizQuestion || (lesson && lesson.gamified ? lesson.gamified : null);
    if (!quiz) return;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.disabled = true);

        const index = parseInt(btn.dataset.index);
        const selectedOption = quiz.options[index];

        if (selectedOption && selectedOption.correct) {
          btn.classList.add('correct');
          feedback.innerHTML = `
            <span class="text-green font-bold">✓ CORRECT ANSWER (+10 XP)</span>
            <p class="text-xs text-muted mt-1">${quiz.correctExplanation || ''}</p>
          `;
          feedback.className = "quiz-feedback correct-alert animate-fade";
          
          this.synth.playSuccess();

          if (this.onQuizSubmit) {
            this.onQuizSubmit(true, null);
          }
        } else {
          btn.classList.add('incorrect');
          btns.forEach(b => {
            const idx = parseInt(b.dataset.index);
            if (quiz.options[idx] && quiz.options[idx].correct) {
              b.classList.add('correct');
            }
          });

          feedback.innerHTML = `
            <span class="text-pink font-bold">✗ INCORRECT ANSWER (Logged to Mistake Matrix)</span>
            <p class="text-xs text-muted mt-1"><strong>Reason:</strong> ${selectedOption ? selectedOption.text : ''} is wrong. ${quiz.wrongHelp || ''}</p>
          `;
          feedback.className = "quiz-feedback incorrect-alert animate-fade";

          this.synth.playError();

          if (this.onQuizSubmit) {
            this.onQuizSubmit(false, {
              topic: quiz.topic || this.currentTopic,
              question: quiz.question || (lesson && lesson.gamified ? lesson.gamified.question : ''),
              wrongAnswer: selectedOption ? selectedOption.text : '',
              correctAnswer: (quiz.options.find(o => o.correct) || {}).text || ''
            });
          }
        }
      });
    });
  }

  typesetMath() {
    if (window.MathJax) {
      try {
        window.MathJax.typesetPromise();
      } catch (err) {
        console.warn("MathJax typesetting failed", err);
      }
    }
  }

  addTutorMessage(htmlContent) {
    const msgEl = document.createElement('div');
    msgEl.className = 'message-bubble tutor-bubble animate-fade';
    msgEl.innerHTML = htmlContent;
    this.chatContainer.appendChild(msgEl);
    this.scrollToBottom();
  }

  addSystemMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'system-message text-center font-mono my-2';
    msgEl.innerHTML = `<span class="sys-tag">// SYSTEM:</span> <span class="sys-text">${text}</span>`;
    this.chatContainer.appendChild(msgEl);
    this.scrollToBottom();
  }

  addUserMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'message-bubble user-bubble animate-fade';
    msgEl.innerHTML = `
      <div class="user-msg-header">
        <span class="user-avatar">👤</span>
        <span class="user-name">You</span>
      </div>
      <p class="user-text mt-1">${this.escapeHTML(text)}</p>
    `;
    this.chatContainer.appendChild(msgEl);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
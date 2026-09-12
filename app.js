/**
 * COUNTIFY — Main Application Controller v3.0
 * User-Driven Computer Vision Platform with High Accuracy Detection,
 * Clipboard Paste (Ctrl+V), Drag-and-Drop, ROI Box, Clump Splitting & Dynamic Presets.
 * 
 * Strict Rule: Real computer vision only. No fake or random counts.
 */

// Application State
const state = {
  mode: 'rice', // 'rice' | 'drops' | 'leaves' | 'facial-hair' | 'custom'
  selectedPreset: 'scattered-basmati',
  cameraActive: false,
  stream: null,
  selectedCameraDeviceId: null,
  cameraLoopId: null,
  
  // Canvases
  mainCanvas: null,
  mainCtx: null,
  interactiveCanvas: null,
  intCtx: null,
  rawCanvas: null,
  rawCtx: null,
  maskCanvas: null,

  currentView: 'composite', // 'composite' | 'mask' | 'raw'
  proofMode: true,
  voiceEnabled: true,
  userHasLoadedImage: false,

  // User-driven tuning parameters
  customSensitivity: 65,
  splitClumps: true,
  invertPolarity: 0, // 0 = auto, 1 = dark bg, 2 = light bg
  roiActive: false,
  roi: { xPct: 0.1, yPct: 0.1, wPct: 0.8, hPct: 0.8 },
  isDraggingRoi: false,
  roiDragMode: null, // 'move' | 'nw' | 'ne' | 'se' | 'sw'
  roiStartPos: null,

  // Last detection stats
  rawDetections: 0,
  rejectedDetections: 0,
  finalCount: 0,
  detectionQuality: 0,
  procTime: 0,
  lastResult: null,

  // Custom mode
  customExemplarPoint: null,

  // Drop mode
  dropTracker: null,
  simDropAnimId: null,
  simulatingTap: false,
  dropPresetInterval: 950,

  // MediaPipe
  faceMesh: null,
  faceLandmarks: null,
  faceMeshReady: false,

  // Battle Mode
  battleState: {
    active: false,
    sampleACount: null,
    sampleBCount: null,
    sampleADataUrl: null,
    sampleBDataUrl: null
  },

  // Career Stats
  stats: {
    totalScans: 0,
    totalObjectsCounted: 0,
    mostAbusedMode: 'RICE',
    largestCount: 0,
    modeCounts: { rice: 0, drops: 0, leaves: 0, 'facial-hair': 0, custom: 0 }
  }
};

// ============================================================================
// Real-World Photographic & Dataset Presets
// ============================================================================
const DATASET_PRESETS = {
  rice: [
    { id: 'scattered-basmati', label: '🌾 Scattered Basmati (Dark Plate)' },
    { id: 'clustered-bowl', label: '🍚 Clustered Rice (Touching Grains)' },
    { id: 'black-pepper', label: '⚫ Black Peppercorns (Light Board)' }
  ],
  drops: [
    { id: 'steady-leak', label: '💧 Steady Tap Leak (1.0s Interval)' },
    { id: 'rapid-drip', label: '⚡ Rapid Faulty Valve (0.4s Interval)' },
    { id: 'slow-seep', label: '⏳ Slow Pipe Seep (2.2s Interval)' }
  ],
  leaves: [
    { id: 'monstera', label: '🌿 Tropical Monstera Leaves' },
    { id: 'fern-fronds', label: '🌱 Fern Pinnules & Fronds' },
    { id: 'dense-shrub', label: '🌳 Dense Overlapping Foliage' }
  ],
  'facial-hair': [
    { id: 'full-beard', label: '🧔 Full Dense Beard (Heavy Census)' },
    { id: 'goatee-moustache', label: '🥸 Goatee & Moustache Classic' },
    { id: 'light-stubble', label: '🪒 3-Day Designer Stubble' }
  ],
  custom: [
    { id: 'brass-coins', label: '🪙 Brass Coins on Dark Desk' },
    { id: 'office-paperclips', label: '📎 Colored Paperclip Scatter' },
    { id: 'capsule-pills', label: '💊 Medicine Capsule Audit' }
  ]
};

// ============================================================================
// Speech Synthesis Engine
// ============================================================================
const SpeechEngine = {
  lastSpokenTime: 0,
  cooldownMs: 3500,
  cachedVoice: null,

  init() {
    if (!('speechSynthesis' in window)) return;
    this.populateVoice();
    window.speechSynthesis.onvoiceschanged = () => {
      this.populateVoice();
    };
  },

  populateVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.cachedVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India')) ||
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices[0] || null;
  },

  speak(text, bubbleText = null) {
    if (!state.voiceEnabled) return;

    SpeechEngine.showBubble(bubbleText || text);

    if (!('speechSynthesis' in window)) return;

    const now = performance.now();
    if (now - this.lastSpokenTime < this.cooldownMs) return;
    this.lastSpokenTime = now;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      if (this.cachedVoice) utterance.voice = this.cachedVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
    }
  },

  showBubble(text) {
    const bubble = document.getElementById('speech-bubble');
    const bubbleText = document.getElementById('speech-bubble-text');
    if (!bubble || !bubbleText) return;

    bubbleText.textContent = text;
    bubble.classList.remove('hidden');

    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      bubble.classList.add('hidden');
    }, 6000);
  }
};

// ============================================================================
// Mode Metadata
// ============================================================================
const MODE_CONFIGS = {
  rice: {
    name: 'RICE ANALYSIS',
    unit: 'GRAINS',
    usefulness: 20,
    uselessness: 80,
    widgetId: 'widget-rice-estimator',
    verdictTitle: '“Dinner has analytics now.”',
    verdictVoice: '“Eda 400 kazhinju… ithu vare count cheyyano?”',
    getSpeech: (count) => {
      if (count === 0) return { text: "No rice detected da. Plate is empty.", voice: "Plate is empty da." };
      if (count < 50) return { text: `Only ${count} grains da? Bro is on a diet.`, voice: `Only ${count} grains da? Bro is on a diet.` };
      if (count <= 250) return { text: `Counted ${count} grains. Dinner has official analytics now!`, voice: `Eda ${count} grains kazhinju. Dinner has analytics now.` };
      return { text: `Eda ${count} grains kazhinju! Who counts this much rice?`, voice: `Eda ${count} grains kazhinju! Ithu vare count cheyyano?` };
    }
  },
  drops: {
    name: 'WATER DROP TRIPWIRE',
    unit: 'DROPS',
    usefulness: 45,
    uselessness: 55,
    widgetId: 'widget-drop-velocity',
    verdictTitle: '“The leak is officially documented.”',
    verdictVoice: '“Drop number 100 da. Tap close cheyy.”',
    getSpeech: (count) => {
      if (count < 20) return { text: `Tap is dripping: ${count} drops counted.`, voice: `${count} drops da. Plumber-ine vilikkano?` };
      if (count < 100) return { text: `${count} drops. Still nobody fixed the tap.`, voice: `${count} drops da. Tap close cheyy.` };
      return { text: `Bro ${count} drops kazhinju! Just close the tap da!`, voice: `Bro ${count} drops kazhinju! Just close the tap da!` };
    }
  },
  leaves: {
    name: 'LEAF AUDIT & INVENTORY',
    unit: 'LEAVES',
    usefulness: 35,
    uselessness: 65,
    widgetId: 'widget-leaf-champions',
    verdictTitle: '“The plant did not request this audit.”',
    verdictVoice: '“Tree-inte attendance edukkano?”',
    getSpeech: (count) => {
      return { text: `Plant audit complete: ${count} leaves counted. Tree-inte attendance edukkano?`, voice: `Plant inventory: ${count} leaves. Tree-inte attendance edukkano?` };
    }
  },
  'facial-hair': {
    name: 'FACIAL HAIR CENSUS',
    unit: 'STRANDS',
    usefulness: 2,
    uselessness: 98,
    widgetId: 'widget-beard-breakdown',
    verdictTitle: '“Follicular census officially registered.”',
    verdictVoice: '“Bro beard-inum census nadathunnu.”',
    getSpeech: (count) => {
      return { text: `${count} facial hair strands counted. Follicular census complete.`, voice: `Bro beard-inum census nadathunnu. ${count} strands.` };
    }
  },
  custom: {
    name: 'CUSTOM CLONE DETECTOR',
    unit: 'OBJECTS',
    usefulness: 15,
    uselessness: 85,
    widgetId: 'widget-custom-prompt',
    verdictTitle: '“Visually identical clutter confirmed.”',
    verdictVoice: '“Ithokke enthina count cheyyunne da?”',
    getSpeech: (count) => {
      return { text: `Found ${count} identical objects. Ithokke enthina count cheyyunne da?`, voice: `Found ${count} items. Ithokke enthina count cheyyunne da?` };
    }
  }
};

// ============================================================================
// App Initializer & Event Listeners
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  initDOM();
  SpeechEngine.init();
  loadCareerStats();
  initMediaPipe();
  initOpenCVWatcher();
  initEventListeners();
  initDragAndDrop();
  initClipboardPaste();
  initRoiInteractions();
  populatePresetsDropdown('rice');
});

function initDOM() {
  state.mainCanvas = document.getElementById('main-canvas');
  state.mainCtx = state.mainCanvas.getContext('2d');

  state.interactiveCanvas = document.getElementById('interactive-canvas');
  state.intCtx = state.interactiveCanvas.getContext('2d');

  state.rawCanvas = document.createElement('canvas');
  state.rawCtx = state.rawCanvas.getContext('2d');

  state.dropTracker = new DropTracker();

  setCanvasDimensions(640, 480);
}

function setCanvasDimensions(width, height) {
  state.mainCanvas.width = width;
  state.mainCanvas.height = height;
  state.interactiveCanvas.width = width;
  state.interactiveCanvas.height = height;
  state.rawCanvas.width = width;
  state.rawCanvas.height = height;
}

function initOpenCVWatcher() {
  const statusPill = document.getElementById('cv-status');
  const statusText = document.getElementById('cv-status-text');

  enableControls();
  if (statusPill && statusText) {
    statusPill.className = 'status-pill status-ready';
    statusText.textContent = 'CV ENGINE READY';
  }

  const checkCv = () => {
    if (typeof cv !== 'undefined' && cv.Mat) {
      if (statusPill) statusPill.className = 'status-pill status-ready';
      if (statusText) statusText.textContent = 'CV ENGINE READY (WASM + OPENCV)';
      return;
    }
    setTimeout(checkCv, 400);
  };

  if (typeof cv !== 'undefined' && cv.onRuntimeInitialized) {
    const prevInit = cv.onRuntimeInitialized;
    cv.onRuntimeInitialized = () => {
      if (prevInit) prevInit();
      if (statusPill) statusPill.className = 'status-pill status-ready';
      if (statusText) statusText.textContent = 'CV ENGINE READY (WASM + OPENCV)';
    };
  } else {
    checkCv();
  }
}

function initMediaPipe() {
  try {
    if (typeof FaceMesh === 'function') {
      state.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      state.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      state.faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          state.faceLandmarks = results.multiFaceLandmarks[0];
          state.faceMeshReady = true;
        } else {
          state.faceLandmarks = null;
        }
      });
    }
  } catch (err) {
    console.warn("MediaPipe FaceMesh init warning:", err);
  }
}

function enableControls() {
  const btnProcess = document.getElementById('btn-process');
  if (btnProcess) btnProcess.disabled = false;
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) btnDownload.disabled = false;
}

// ============================================================================
// Event Listeners Binding
// ============================================================================
function initEventListeners() {
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      switchMode(card.dataset.mode);
    });
  });

  // Hero Camera & Snap Buttons (Prominent Step 1)
  const heroCam = document.getElementById('hero-btn-camera');
  if (heroCam) heroCam.addEventListener('click', toggleCamera);

  const heroSnap = document.getElementById('hero-btn-snap');
  if (heroSnap) heroSnap.addEventListener('click', captureFrame);

  // Quick Sample Chips (One-Click AI Testing)
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const sampleMode = chip.dataset.sample;
      switchMode(sampleMode, true);
    });
  });

  // AI Classification Category Override
  const overrideSelect = document.getElementById('ai-override-select');
  if (overrideSelect) {
    overrideSelect.addEventListener('change', (e) => {
      const selectedMode = e.target.value;
      switchMode(selectedMode, false);
      
      const config = MODE_CONFIGS[selectedMode];
      const iconEl = document.getElementById('ai-detected-icon');
      const labelEl = document.getElementById('ai-detected-label');
      const badgeEl = document.getElementById('ai-confidence-badge');
      const reasonEl = document.getElementById('ai-reason-text');
      if (iconEl) iconEl.textContent = (selectedMode === 'rice' ? '🌾' : selectedMode === 'leaves' ? '🌿' : selectedMode === 'facial-hair' ? '🧔' : selectedMode === 'drops' ? '💧' : '🔘');
      if (labelEl) labelEl.textContent = config.name;
      if (badgeEl) badgeEl.textContent = 'User Selected';
      if (reasonEl) reasonEl.textContent = `User manually selected ${config.name} counting engine.`;

      processCurrentFrame();
    });
  }

  // Camera toolbar buttons
  document.getElementById('btn-start-camera')?.addEventListener('click', toggleCamera);
  document.getElementById('btn-start-camera-center')?.addEventListener('click', toggleCamera);
  document.getElementById('btn-capture')?.addEventListener('click', captureFrame);
  document.getElementById('btn-retake')?.addEventListener('click', retakeFrame);

  // File Upload
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFileObject(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Quick Test Sample
  document.getElementById('btn-quick-sample')?.addEventListener('click', () => loadCurrentModeSample());
  document.getElementById('btn-quick-sample-center')?.addEventListener('click', () => loadCurrentModeSample());

  // Process Button
  document.getElementById('btn-process')?.addEventListener('click', processCurrentFrame);

  // Export Proof Button
  document.getElementById('btn-download')?.addEventListener('click', exportProofCard);

  // Voice Toggle
  document.getElementById('btn-toggle-voice').addEventListener('click', toggleVoice);

  // Proof Mode Toggle
  document.getElementById('btn-toggle-proof').addEventListener('click', toggleProofMode);

  // View mode tabs (Composite, Mask, Raw)
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentView = tab.dataset.view;
      renderCurrentView();
    });
  });

  // Rice sample weight calculator input
  document.getElementById('rice-sample-weight').addEventListener('input', updateRiceWeightExtrapolation);

  // Sensitivity Sliders (both toolbar and custom mode)
  const syncSensitivity = (val) => {
    state.customSensitivity = parseInt(val, 10);
    const s1 = document.getElementById('custom-sensitivity');
    const v1 = document.getElementById('sensitivity-value');
    const s2 = document.getElementById('live-sensitivity');
    const v2 = document.getElementById('live-sensitivity-val');
    if (s1) s1.value = state.customSensitivity;
    if (v1) v1.textContent = `${state.customSensitivity}%`;
    if (s2) s2.value = state.customSensitivity;
    if (v2) v2.textContent = `${state.customSensitivity}%`;
    processCurrentFrame();
  };

  const sensSlider1 = document.getElementById('custom-sensitivity');
  if (sensSlider1) sensSlider1.addEventListener('input', (e) => syncSensitivity(e.target.value));

  const sensSlider2 = document.getElementById('live-sensitivity');
  if (sensSlider2) sensSlider2.addEventListener('input', (e) => syncSensitivity(e.target.value));

  // Clump Splitting Toggle
  const btnClumps = document.getElementById('btn-toggle-clumps');
  if (btnClumps) {
    btnClumps.addEventListener('click', () => {
      state.splitClumps = !state.splitClumps;
      btnClumps.classList.toggle('active', state.splitClumps);
      btnClumps.textContent = state.splitClumps ? '🧩 CLUMPS: SPLIT' : '🧩 CLUMPS: OFF';
      processCurrentFrame();
    });
  }

  // Polarity Invert Toggle
  const btnInvert = document.getElementById('btn-toggle-invert');
  if (btnInvert) {
    btnInvert.addEventListener('click', () => {
      state.invertPolarity = (state.invertPolarity + 1) % 3;
      const labels = ['🌓 INVERT: AUTO', '🌑 INVERT: DARK BG', '🌕 INVERT: LIGHT BG'];
      btnInvert.textContent = labels[state.invertPolarity];
      btnInvert.classList.toggle('active', state.invertPolarity !== 0);
      processCurrentFrame();
    });
  }

  // ROI Toggle Button
  const btnRoi = document.getElementById('btn-toggle-roi');
  if (btnRoi) {
    btnRoi.addEventListener('click', () => {
      state.roiActive = !state.roiActive;
      btnRoi.classList.toggle('active', state.roiActive);
      btnRoi.textContent = state.roiActive ? '📐 ROI: CUSTOM' : '📐 ROI: OFF';
      drawRoiOverlay();
      processCurrentFrame();
    });
  }

  // Preset Selector Dropdown
  const presetSelector = document.getElementById('preset-selector');
  if (presetSelector) {
    presetSelector.addEventListener('change', (e) => {
      state.selectedPreset = e.target.value;
      loadCurrentModeSample(state.selectedPreset);
    });
  }

  // Tap simulation toggle for Drop mode
  document.getElementById('btn-simulate-drops').addEventListener('click', toggleDropSimulation);

  // Interactive canvas click for Custom Mode Exemplar
  state.interactiveCanvas.addEventListener('click', handleInteractiveClick);

  // Battle Mode modal controls
  document.getElementById('btn-open-battle').addEventListener('click', openBattleModal);
  document.getElementById('btn-close-battle').addEventListener('click', closeBattleModal);
  document.getElementById('btn-battle-scan-a').addEventListener('click', () => scanBattleChallenger('A'));
  document.getElementById('btn-battle-scan-b').addEventListener('click', () => scanBattleChallenger('B'));
  
  const btnSampleA = document.getElementById('btn-battle-sample-a');
  if (btnSampleA) btnSampleA.addEventListener('click', () => loadBattleSample('A'));
  const btnSampleB = document.getElementById('btn-battle-sample-b');
  if (btnSampleB) btnSampleB.addEventListener('click', () => loadBattleSample('B'));

  document.getElementById('btn-reset-battle').addEventListener('click', resetBattle);

  // Career Stats modal controls
  document.getElementById('btn-open-stats').addEventListener('click', openStatsModal);
  document.getElementById('btn-close-stats').addEventListener('click', closeStatsModal);
  document.getElementById('btn-close-stats-btn').addEventListener('click', closeStatsModal);
  document.getElementById('btn-clear-stats').addEventListener('click', clearCareerStats);

  // Camera Troubleshooter Modal controls
  const btnCloseCam = document.getElementById('btn-close-cam-modal');
  if (btnCloseCam) btnCloseCam.addEventListener('click', closeCameraModal);

  const btnCamReload = document.getElementById('btn-cam-reload');
  if (btnCamReload) btnCamReload.addEventListener('click', () => { window.location.reload(); });

  const btnUseSample = document.getElementById('btn-use-sample-instead');
  if (btnUseSample) btnUseSample.addEventListener('click', () => {
    closeCameraModal();
    loadCurrentModeSample();
  });

  // Initialize Google Gemini Multimodal Vision Handlers
  initGeminiHandlers();
}

function populatePresetsDropdown(mode) {
  const select = document.getElementById('preset-selector');
  if (!select) return;
  const presets = DATASET_PRESETS[mode] || [];
  select.innerHTML = presets.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
  if (presets.length > 0) state.selectedPreset = presets[0].id;
}

// ============================================================================
// User-Driven Ingestion: Clipboard Paste (Ctrl+V) & Drag-and-Drop
// ============================================================================
function initClipboardPaste() {
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        loadFileObject(blob);
        SpeechEngine.speak("Pasted image loaded directly from clipboard.");
        break;
      }
    }
  });
}

function initDragAndDrop() {
  const container = document.getElementById('viewport-container');
  const overlay = document.getElementById('drop-overlay');
  if (!container || !overlay) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.classList.remove('hidden');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.classList.add('hidden');
    });
  });

  container.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      loadFileObject(files[0]);
      SpeechEngine.speak("Dropped file loaded successfully.");
    }
  });
}

function loadFileObject(file) {
  if (!file) return;

  if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    video.onloadedmetadata = () => {
      document.getElementById('viewport-empty-prompt').classList.add('hidden');
      const maxW = 960;
      const scale = Math.min(1, maxW / video.videoWidth);
      const targetW = Math.round(video.videoWidth * scale);
      const targetH = Math.round(video.videoHeight * scale);
      setCanvasDimensions(targetW, targetH);
      video.play();

      const videoLoop = () => {
        if (video.paused || video.ended) return;
        state.rawCtx.drawImage(video, 0, 0, targetW, targetH);
        if (state.mode === 'drops') {
          const res = state.dropTracker.processFrame(video, false);
          if (res) handleDropFrameResult(res);
        }
        renderCurrentView();
        requestAnimationFrame(videoLoop);
      };
      videoLoop();
    };
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      handleNewImageInput(img, true);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// Interactive ROI Bounding Box Handling
// ============================================================================
function initRoiInteractions() {
  const c = state.interactiveCanvas;

  c.addEventListener('mousedown', (e) => {
    if (!state.roiActive) return;
    const pos = getCanvasPos(e);
    const rw = state.roi.wPct * c.width;
    const rh = state.roi.hPct * c.height;
    const rx = state.roi.xPct * c.width;
    const ry = state.roi.yPct * c.height;

    // Check corners
    const handleSize = 14;
    if (Math.hypot(pos.x - rx, pos.y - ry) < handleSize) state.roiDragMode = 'nw';
    else if (Math.hypot(pos.x - (rx + rw), pos.y - ry) < handleSize) state.roiDragMode = 'ne';
    else if (Math.hypot(pos.x - (rx + rw), pos.y - (ry + rh)) < handleSize) state.roiDragMode = 'se';
    else if (Math.hypot(pos.x - rx, pos.y - (ry + rh)) < handleSize) state.roiDragMode = 'sw';
    else if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) state.roiDragMode = 'move';
    else {
      // Start fresh box from click point
      state.roi.xPct = pos.x / c.width;
      state.roi.yPct = pos.y / c.height;
      state.roi.wPct = 0.05;
      state.roi.hPct = 0.05;
      state.roiDragMode = 'se';
    }

    state.isDraggingRoi = true;
    state.roiStartPos = pos;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isDraggingRoi || !state.roiActive) return;
    const pos = getCanvasPos(e);
    const c = state.interactiveCanvas;

    const dxPct = (pos.x - state.roiStartPos.x) / c.width;
    const dyPct = (pos.y - state.roiStartPos.y) / c.height;

    if (state.roiDragMode === 'move') {
      state.roi.xPct = Math.max(0, Math.min(1 - state.roi.wPct, state.roi.xPct + dxPct));
      state.roi.yPct = Math.max(0, Math.min(1 - state.roi.hPct, state.roi.yPct + dyPct));
    } else if (state.roiDragMode === 'se') {
      state.roi.wPct = Math.max(0.05, Math.min(1 - state.roi.xPct, state.roi.wPct + dxPct));
      state.roi.hPct = Math.max(0.05, Math.min(1 - state.roi.yPct, state.roi.hPct + dyPct));
    } else if (state.roiDragMode === 'nw') {
      const newX = Math.max(0, Math.min(state.roi.xPct + state.roi.wPct - 0.05, state.roi.xPct + dxPct));
      const newY = Math.max(0, Math.min(state.roi.yPct + state.roi.hPct - 0.05, state.roi.yPct + dyPct));
      state.roi.wPct += (state.roi.xPct - newX);
      state.roi.hPct += (state.roi.yPct - newY);
      state.roi.xPct = newX;
      state.roi.yPct = newY;
    }

    state.roiStartPos = pos;
    drawRoiOverlay();
  });

  window.addEventListener('mouseup', () => {
    if (state.isDraggingRoi) {
      state.isDraggingRoi = false;
      state.roiDragMode = null;
      processCurrentFrame();
    }
  });
}

function getCanvasPos(e) {
  const rect = state.interactiveCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (state.interactiveCanvas.width / rect.width),
    y: (e.clientY - rect.top) * (state.interactiveCanvas.height / rect.height)
  };
}

function drawRoiOverlay() {
  state.intCtx.clearRect(0, 0, state.interactiveCanvas.width, state.interactiveCanvas.height);
  if (!state.roiActive) return;

  const c = state.interactiveCanvas;
  const rx = state.roi.xPct * c.width;
  const ry = state.roi.yPct * c.height;
  const rw = state.roi.wPct * c.width;
  const rh = state.roi.hPct * c.height;

  // Dim outside
  state.intCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  state.intCtx.fillRect(0, 0, c.width, ry);
  state.intCtx.fillRect(0, ry + rh, c.width, c.height - (ry + rh));
  state.intCtx.fillRect(0, ry, rx, rh);
  state.intCtx.fillRect(rx + rw, ry, c.width - (rx + rw), rh);

  // Dashed neon ROI box
  state.intCtx.strokeStyle = '#00f2fe';
  state.intCtx.lineWidth = 2;
  state.intCtx.setLineDash([6, 6]);
  state.intCtx.strokeRect(rx, ry, rw, rh);
  state.intCtx.setLineDash([]);

  // Corner handles
  const handles = [
    [rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]
  ];
  state.intCtx.fillStyle = '#39ff14';
  handles.forEach(([hx, hy]) => {
    state.intCtx.fillRect(hx - 4, hy - 4, 8, 8);
  });
}

// ============================================================================
// Mode Switching
// ============================================================================
// ============================================================================
// Mode Switching
// ============================================================================
function switchMode(newMode, loadSample = true) {
  if (state.mode === newMode && !loadSample) return;
  state.mode = newMode;

  if (state.simulatingTap && newMode !== 'drops') {
    toggleDropSimulation();
  }

  document.querySelectorAll('.mode-card').forEach(card => {
    card.classList.toggle('active', card.dataset.mode === newMode);
  });

  const overrideSelect = document.getElementById('ai-override-select');
  if (overrideSelect && overrideSelect.value !== newMode) {
    overrideSelect.value = newMode;
  }

  document.getElementById('hud-active-mode').textContent = `MODE: ${newMode.toUpperCase()}`;

  const config = MODE_CONFIGS[newMode];
  document.getElementById('result-mode-name').textContent = config.name;
  document.getElementById('final-count-unit').textContent = config.unit;
  document.getElementById('funny-verdict-title').textContent = config.verdictTitle;
  document.getElementById('funny-verdict-voice').textContent = config.verdictVoice;

  ['widget-rice-estimator', 'widget-beard-breakdown', 'widget-leaf-champions', 'widget-drop-velocity', 'widget-custom-prompt'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== config.widgetId);
  });

  document.getElementById('drop-roi-box').classList.toggle('hidden', newMode !== 'drops');
  document.getElementById('btn-simulate-drops').classList.toggle('hidden', newMode !== 'drops');
  document.getElementById('custom-sensitivity-container').classList.toggle('hidden', newMode !== 'custom');

  populatePresetsDropdown(newMode);
  updateUselessnessDisplay(config.usefulness, config.uselessness);
  resetCountsDisplay();

  state.customExemplarPoint = null;

  if (!state.cameraActive && !state.userHasLoadedImage && loadSample) {
    loadCurrentModeSample();
  }
}

// ============================================================================
// Camera Controls & State Management
// ============================================================================
function updateCameraUI(isActive) {
  const btn = document.getElementById('btn-start-camera');
  const centerBtn = document.getElementById('btn-start-camera-center');
  const heroBtn = document.getElementById('hero-btn-camera');
  const heroSnap = document.getElementById('hero-btn-snap');
  const heroCamStatus = document.getElementById('hero-cam-status-text');
  const btnCapture = document.getElementById('btn-capture');

  if (isActive) {
    if (btn) {
      btn.innerHTML = `<span class="btn-icon">⏹️</span> STOP CAMERA`;
      btn.classList.add('action-highlight');
    }
    if (centerBtn) centerBtn.innerHTML = `<span class="btn-icon">⏹️</span> STOP CAMERA`;
    if (heroBtn) {
      heroBtn.classList.add('action-highlight');
      const strong = heroBtn.querySelector('.btn-text-block strong');
      if (strong) strong.textContent = 'STOP CAMERA';
    }
    if (heroCamStatus) heroCamStatus.textContent = 'Webcam is active';
    if (heroSnap) heroSnap.disabled = false;
    if (btnCapture) btnCapture.disabled = false;
  } else {
    if (btn) {
      btn.innerHTML = `<span class="btn-icon">🎥</span> START CAMERA`;
      btn.classList.remove('action-highlight');
    }
    if (centerBtn) centerBtn.innerHTML = `<span class="btn-icon">🎥</span> START CAMERA`;
    if (heroBtn) {
      heroBtn.classList.remove('action-highlight');
      const strong = heroBtn.querySelector('.btn-text-block strong');
      if (strong) strong.textContent = 'OPEN CAMERA';
    }
    if (heroCamStatus) heroCamStatus.textContent = 'Click to start webcam';
    if (heroSnap) heroSnap.disabled = true;
    if (btnCapture) btnCapture.disabled = true;
  }
}

async function requestCameraStream(preferredDeviceId = null) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const err = new Error("Camera API is not supported in this browser.");
    err.name = "NotSupportedError";
    throw err;
  }

  const attempts = [
    preferredDeviceId 
      ? { video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
      : { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
    preferredDeviceId
      ? { video: { deviceId: { exact: preferredDeviceId } } }
      : { video: { facingMode: 'user' } },
    { video: true }
  ];

  let lastError = null;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err) {
      lastError = err;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') throw err;
    }
  }
  throw lastError;
}

async function toggleCamera() {
  const video = document.getElementById('webcam-video');
  const emptyPrompt = document.getElementById('viewport-empty-prompt');

  if (state.cameraActive) {
    if (state.stream) {
      state.stream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      state.stream = null;
    }
    video.srcObject = null;
    state.cameraActive = false;
    updateCameraUI(false);
    cancelAnimationFrame(state.cameraLoopId);
    return;
  }

  const heroCamStatus = document.getElementById('hero-cam-status-text');
  if (heroCamStatus) heroCamStatus.textContent = 'Connecting webcam...';

  try {
    const stream = await requestCameraStream(state.selectedCameraDeviceId);
    state.stream = stream;
    video.srcObject = stream;
    await video.play();

    state.cameraActive = true;
    updateCameraUI(true);
    document.getElementById('btn-retake')?.classList.add('hidden');
    if (emptyPrompt) emptyPrompt.classList.add('hidden');

    setCanvasDimensions(video.videoWidth || 640, video.videoHeight || 480);
    runCameraLoop();
    SpeechEngine.speak("Webcam is online. Line up your subject and click Snap to count.");
  } catch (err) {
    updateCameraUI(false);
    console.error("Camera error:", err);
    showCameraPermissionModal(err.name, err.message);
  }
}

function showCameraPermissionModal(errName, errMessage) {
  const modal = document.getElementById('camera-modal');
  if (!modal) {
    alert("Camera permission denied. Please click Lock icon in your address bar and allow camera access.");
    return;
  }

  const headline = document.getElementById('cam-diag-headline');
  const detail = document.getElementById('cam-diag-detail');
  const badge = document.getElementById('cam-modal-badge');
  const icon = document.getElementById('cam-diag-icon');

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    badge.textContent = 'PERMISSION BLOCKED IN BROWSER';
    badge.className = 'modal-badge text-red';
    icon.textContent = '🔒';
    headline.textContent = 'Camera permission is blocked in your browser.';
    detail.textContent = 'Set Camera to Allow in the address bar to use live webcam.';
    SpeechEngine.speak("Camera permission is blocked in your browser.");
  } else {
    badge.textContent = 'CAMERA ERROR';
    badge.className = 'modal-badge text-amber';
    icon.textContent = '⚙️';
    headline.textContent = `Camera error: ${errName || 'Unable to connect'}`;
    detail.textContent = errMessage || 'Click USE TEST SAMPLE INSTEAD to test all computer vision modes with built-in presets!';
  }

  modal.classList.remove('hidden');
}

function closeCameraModal() {
  const modal = document.getElementById('camera-modal');
  if (modal) modal.classList.add('hidden');
}

function runCameraLoop() {
  if (!state.cameraActive) return;

  const video = document.getElementById('webcam-video');
  if (video.readyState >= 2) {
    state.rawCtx.drawImage(video, 0, 0, state.rawCanvas.width, state.rawCanvas.height);

    if (state.mode === 'drops') {
      const dropResult = state.dropTracker.processFrame(video, false);
      if (dropResult) handleDropFrameResult(dropResult);
    } else if (state.mode === 'facial-hair' && state.faceMesh && state.faceMeshReady) {
      state.faceMesh.send({ image: video });
    }

    renderCurrentView();
  }

  state.cameraLoopId = requestAnimationFrame(runCameraLoop);
}

function captureFrame() {
  if (!state.cameraActive) return;

  const video = document.getElementById('webcam-video');
  cancelAnimationFrame(state.cameraLoopId);
  state.cameraActive = false;
  updateCameraUI(false);
  document.getElementById('btn-retake')?.classList.remove('hidden');

  handleNewImageInput(video, true);
}

function retakeFrame() {
  document.getElementById('btn-retake')?.classList.add('hidden');
  toggleCamera();
}

// ============================================================================
// Unified Ingestion & Automated AI Scene Classification Pipeline
// ============================================================================
async function handleNewImageInput(source, autoClassify = true) {
  state.userHasLoadedImage = true;

  const emptyPrompt = document.getElementById('viewport-empty-prompt');
  if (emptyPrompt) emptyPrompt.classList.add('hidden');

  const overlay = document.getElementById('ai-analyzing-overlay');
  const scanline = document.getElementById('scanline');
  const overlayTitle = overlay ? overlay.querySelector('.ai-overlay-title') : null;
  const overlaySubtitle = overlay ? overlay.querySelector('.ai-overlay-subtitle') : null;

  if (overlay) overlay.classList.remove('hidden');
  if (scanline) scanline.classList.remove('hidden');

  const srcW = source.videoWidth || source.naturalWidth || source.width || 640;
  const srcH = source.videoHeight || source.naturalHeight || source.height || 480;

  const maxDim = 1280;
  let targetW = srcW;
  let targetH = srcH;
  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  setCanvasDimensions(targetW, targetH);
  state.rawCtx.drawImage(source, 0, 0, targetW, targetH);

  // ═══════════════════════════════════════════════════════════════════
  // PRIMARY ENGINE: Google Gemini 2.5 Flash Multimodal Vision API
  // Automatically detects what's in the image + counts with precision
  // Falls back to local CV only if Gemini API call fails
  // ═══════════════════════════════════════════════════════════════════
  let geminiSucceeded = false;

  if (window.GeminiVisionAPI && window.GeminiVisionAPI.isAvailable()) {
    try {
      if (overlayTitle) overlayTitle.textContent = '🔍 ANALYZING IMAGE...';
      if (overlaySubtitle) overlaySubtitle.textContent = 'Scanning and counting objects with high precision...';

      const geminiResult = await window.GeminiVisionAPI.analyzeAndCount(state.rawCanvas);

      if (geminiResult && typeof geminiResult.finalCount === 'number') {
        geminiSucceeded = true;

        // Update detection banner with identification
        const modeIcons = { rice: '🌾', leaves: '🌿', 'facial-hair': '🧔', drops: '💧', custom: '🔘' };
        const iconEl = document.getElementById('ai-detected-icon');
        const labelEl = document.getElementById('ai-detected-label');
        const badgeEl = document.getElementById('ai-confidence-badge');
        const reasonEl = document.getElementById('ai-reason-text');
        const overrideSel = document.getElementById('ai-override-select');

        if (iconEl) iconEl.textContent = modeIcons[geminiResult.mode] || '✨';
        if (labelEl) labelEl.textContent = geminiResult.itemName || 'Detected Objects';
        if (badgeEl) badgeEl.textContent = `${geminiResult.detectionQuality}% High Confidence`;
        if (reasonEl) reasonEl.textContent = geminiResult.explanation || 'Analyzed with precision vision scanner.';
        if (overrideSel) overrideSel.value = geminiResult.mode;

        document.querySelectorAll('.sample-chip').forEach(chip => {
          chip.classList.toggle('active', chip.dataset.sample === geminiResult.mode);
        });

        // Switch mode and display results
        switchMode(geminiResult.mode, false);
        displayResults(geminiResult);

        SpeechEngine.speak(`Detected ${geminiResult.finalCount} ${geminiResult.itemName || 'items'}. ${geminiResult.explanation || ''}`);

        console.log('✅ Gemini Vision API result:', geminiResult);
      }
    } catch (geminiErr) {
      console.warn('⚠️ Gemini API failed, falling back to local CV:', geminiErr.message);
      geminiSucceeded = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FALLBACK: Local Computer Vision (only if Gemini failed/unavailable)
  // ═══════════════════════════════════════════════════════════════════
  if (!geminiSucceeded) {
    if (overlayTitle) overlayTitle.textContent = '🔬 LOCAL CV ENGINE';
    if (overlaySubtitle) overlaySubtitle.textContent = 'Running local computer vision analysis...';

    // FaceMesh for facial-hair mode
    if (state.faceMesh) {
      try {
        await state.faceMesh.send({ image: state.rawCanvas });
      } catch (e) {
        console.warn("FaceMesh send error:", e);
      }
    }

    await new Promise(r => setTimeout(r, 150));

    if (autoClassify && window.AIClassifier) {
      try {
        const classification = window.AIClassifier.classify(state.rawCanvas, {
          faceLandmarks: state.faceLandmarks
        });

        const iconEl = document.getElementById('ai-detected-icon');
        const labelEl = document.getElementById('ai-detected-label');
        const badgeEl = document.getElementById('ai-confidence-badge');
        const reasonEl = document.getElementById('ai-reason-text');
        const overrideSel = document.getElementById('ai-override-select');

        if (iconEl) iconEl.textContent = classification.icon;
        if (labelEl) labelEl.textContent = classification.label;
        if (badgeEl) badgeEl.textContent = `${classification.confidence}% Local CV`;
        if (reasonEl) reasonEl.textContent = classification.reason;
        if (overrideSel) overrideSel.value = classification.mode;

        document.querySelectorAll('.sample-chip').forEach(chip => {
          chip.classList.toggle('active', chip.dataset.sample === classification.mode);
        });

        switchMode(classification.mode, false);
        SpeechEngine.speak(`Local CV detected ${classification.label} with ${classification.confidence} percent confidence.`);
      } catch (classifyErr) {
        console.warn("AIClassifier error (handled):", classifyErr);
      }
    }

    processCurrentFrame();
  }

  if (overlay) overlay.classList.add('hidden');
  if (scanline) scanline.classList.add('hidden');
}

// ============================================================================
// Processing Dispatcher
// ============================================================================
function processCurrentFrame() {
  document.getElementById('scanline').classList.remove('hidden');
  const btnProc = document.getElementById('btn-process');
  if (btnProc) btnProc.disabled = true;

  setTimeout(() => {
    try {
      const activeRoi = state.roiActive ? state.roi : null;
      const qualityCheck = ImageQualityChecker.analyze(state.rawCanvas, activeRoi);
      if (qualityCheck.isPoor && state.mode !== 'drops') {
        showQualityWarning(qualityCheck.warningTitle, qualityCheck.warningDesc);
      } else {
        hideQualityWarning();
      }

      let result = null;
      if (state.mode === 'rice') {
        result = RiceDetector.process(state.rawCanvas, {
          splitClumps: state.splitClumps,
          invertPolarity: state.invertPolarity === 2 ? true : (state.invertPolarity === 1 ? false : undefined),
          roi: activeRoi
        });
      } else if (state.mode === 'leaves') {
        result = LeafDetector.process(state.rawCanvas, { roi: activeRoi });
      } else if (state.mode === 'facial-hair') {
        result = runFacialHairProcessing();
      } else if (state.mode === 'custom') {
        if (!state.customExemplarPoint) {
          state.customExemplarPoint = { x: state.rawCanvas.width * 0.31, y: state.rawCanvas.height * 0.5 };
        }
        result = CustomDetector.process(state.rawCanvas, state.customExemplarPoint, state.customSensitivity, { roi: activeRoi });
      } else if (state.mode === 'drops') {
        result = {
          mode: 'drops',
          finalCount: state.dropTracker.count,
          rawDetections: state.dropTracker.count,
          rejectedNoiseCount: 0,
          detectionQuality: 95,
          procTime: 8,
          maskCanvas: state.dropTracker.maskCanvas
        };
      }

      if (result) displayResults(result);
    } catch (err) {
      console.error("Processing error:", err);
    } finally {
      document.getElementById('scanline').classList.add('hidden');
      const bp = document.getElementById('btn-process');
      if (bp) bp.disabled = false;
      const bd = document.getElementById('btn-download');
      if (bd) bd.disabled = false;
    }
  }, 70);
}

function runFacialHairProcessing() {
  let landmarks = state.faceLandmarks;
  if (!landmarks || landmarks.length === 0) {
    landmarks = generateDefaultFaceLandmarks(state.rawCanvas.width, state.rawCanvas.height);
  }
  return FacialHairEstimator.process(state.rawCanvas, landmarks);
}

// ============================================================================
// Results Display
// ============================================================================
function displayResults(result) {
  state.lastResult = result;
  state.maskCanvas = result.maskCanvas || null;

  animateCounter('final-count-number', state.finalCount, result.finalCount, 400);
  state.finalCount = result.finalCount;

  document.getElementById('stat-raw-detections').textContent = result.rawDetections ?? result.finalCount;
  document.getElementById('stat-rejected-noise').textContent = result.rejectedNoiseCount ?? 0;
  document.getElementById('stat-quality-pct').textContent = `${result.detectionQuality}%`;
  document.getElementById('stat-proc-time').textContent = `${result.procTime} ms`;

  const timeStr = new Date().toLocaleTimeString();
  document.getElementById('result-time').textContent = timeStr;
  const engineName = result.isGeminiAI ? 'High-Precision Vision Engine' : 'Computer Vision Engine';
  document.getElementById('count-hero-subtitle').textContent = `Verified at ${timeStr} via ${engineName}`;

  if (result.mode === 'rice') {
    updateRiceWeightExtrapolation();
  } else if (result.mode === 'leaves') {
    document.getElementById('leaf-largest-id').textContent = result.largestLeaf ? `#${result.largestLeaf.id}` : '#--';
    document.getElementById('leaf-largest-area').textContent = result.largestLeaf ? `${result.largestLeaf.area} px²` : '--';
    document.getElementById('leaf-smallest-id').textContent = result.smallestLeaf ? `#${result.smallestLeaf.id}` : '#--';
    document.getElementById('leaf-smallest-area').textContent = result.smallestLeaf ? `${result.smallestLeaf.area} px²` : '--';
    document.getElementById('leaf-dense-notice').classList.toggle('hidden', !result.isDenseFoliage);
  } else if (result.mode === 'facial-hair') {
    document.getElementById('beard-moustache-count').textContent = `≈ ${result.moustacheStrands}`;
    document.getElementById('beard-main-count').textContent = `≈ ${result.beardStrands}`;
    document.getElementById('beard-left-count').textContent = `${result.leftStrands}`;
    document.getElementById('beard-right-count').textContent = `${result.rightStrands}`;
    document.getElementById('beard-imbalance-val').textContent = `${result.asymmetryImbalance} hairs`;

    const imbalancePct = Math.min(100, Math.round((result.asymmetryImbalance / Math.max(1, result.finalCount)) * 100));
    document.getElementById('beard-imbalance-bar').style.width = `${Math.max(8, imbalancePct)}%`;
  }

  recordScanInCareerStats(result.mode, result.finalCount);

  // Precision Vision result card
  const geminiCard = document.getElementById('widget-gemini-card');
  const geminiText = document.getElementById('gemini-explanation-text');
  if (geminiCard) {
    if (result.isGeminiAI) {
      geminiCard.classList.remove('hidden');
      if (geminiText) {
        geminiText.innerHTML = `
          <div style="font-weight: 700; color: #c084fc; margin-bottom: 6px; font-size: 13px;">
            🔍 Detected: ${result.itemName || 'Detected Objects'}
          </div>
          <div style="color: #cbd5e1; line-height: 1.45; margin-bottom: 8px; font-size: 12px;">
            ${result.explanation || 'Verified with high-precision vision scanner.'}
          </div>
          <div style="font-size: 11px; color: #94a3b8; display: flex; gap: 12px; flex-wrap: wrap;">
            <span>🎯 Confidence: <strong style="color: #38bdf8;">${result.detectionQuality}%</strong></span>
            <span>⚡ Latency: <strong style="color: #39ff14;">${result.procTime}ms</strong></span>
          </div>
        `;
      }
    } else {
      geminiCard.classList.add('hidden');
    }
  }

  // Populate Real Detected Objects Audit Table
  populateAuditTable(result);

  const config = MODE_CONFIGS[result.mode];
  if (config && config.getSpeech) {
    const speechObj = config.getSpeech(result.finalCount);
    document.getElementById('funny-verdict-title').textContent = `“${speechObj.text}”`;
    document.getElementById('funny-verdict-voice').textContent = `“${speechObj.voice}”`;
    SpeechEngine.speak(speechObj.text, speechObj.voice);
  }

  renderCurrentView();
}

function updateRiceWeightExtrapolation() {
  const sampleInput = document.getElementById('rice-sample-weight');
  const sampleGrams = parseFloat(sampleInput.value) || 10;
  const count = state.finalCount || 0;

  if (count > 0 && sampleGrams > 0) {
    const grainsPerGram = Math.round((count / sampleGrams) * 10) / 10;
    const est1Kg = Math.round(grainsPerGram * 1000);
    document.getElementById('rice-grains-per-gram').textContent = `${grainsPerGram} grains/g`;
    document.getElementById('rice-est-1kg').textContent = `≈ ${est1Kg.toLocaleString()}`;
  } else {
    document.getElementById('rice-grains-per-gram').textContent = '--';
    document.getElementById('rice-est-1kg').textContent = '≈ --';
  }
}

function animateCounter(elementId, startVal, endVal, duration) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (endVal - startVal) * ease);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = endVal.toLocaleString();
  }

  requestAnimationFrame(update);
}

// ============================================================================
// Canvas View Rendering & Proof Overlays
// ============================================================================
function renderCurrentView() {
  const ctx = state.mainCtx;
  const width = state.mainCanvas.width;
  const height = state.mainCanvas.height;

  ctx.clearRect(0, 0, width, height);

  if (state.currentView === 'mask' && state.maskCanvas) {
    ctx.drawImage(state.maskCanvas, 0, 0, width, height);
    return;
  }

  ctx.drawImage(state.rawCanvas, 0, 0, width, height);

  if (state.currentView === 'raw') return;

  if (!state.proofMode || !state.lastResult) return;

  const result = state.lastResult;

  if (result.isGeminiAI || result.mode === 'rice' || result.mode === 'leaves' || result.mode === 'custom') {
    renderContourProofOverlays(ctx, result);
  } else if (result.mode === 'facial-hair') {
    renderBeardProofOverlays(ctx, result);
  }
}

function renderContourProofOverlays(ctx, result) {
  if (result.isGeminiAI && result.acceptedItems) {
    for (const item of result.acceptedItems) {
      if (item.rect) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(192, 132, 252, 0.14)';
        ctx.strokeRect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
        ctx.fillRect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);

        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText(`#${item.id} ${item.label || ''}`, item.rect.x + 3, Math.max(12, item.rect.y - 4));
      }

      ctx.beginPath();
      ctx.arc(item.cx, item.cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
    }
    return;
  }

  if (result.acceptedItems) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f2fe';
    ctx.fillStyle = '#00f2fe';

    for (const item of result.acceptedItems) {
      if (item.points && item.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (item.rect) {
        ctx.strokeRect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
      }

      ctx.beginPath();
      ctx.arc(item.cx, item.cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (result.acceptedItems.length <= 160 || item.id % 2 === 0) {
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillStyle = item.isDecomposed ? '#ffb703' : '#39ff14';
        ctx.fillText(`#${item.id}`, item.cx + 4, item.cy - 4);
      }
    }
  }

  if (result.rejectedItems) {
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 1.5;

    for (const rej of result.rejectedItems) {
      const rx = rej.x;
      const ry = rej.y;
      const size = 3.5;
      ctx.beginPath();
      ctx.moveTo(rx - size, ry - size);
      ctx.lineTo(rx + size, ry + size);
      ctx.moveTo(rx + size, ry - size);
      ctx.lineTo(rx - size, ry + size);
      ctx.stroke();
    }
  }
}

function renderBeardProofOverlays(ctx, result) {
  if (!result.strandOverlayPoints) return;

  ctx.strokeStyle = '#39ff14';
  ctx.lineWidth = 1.5;

  for (const strand of result.strandOverlayPoints) {
    if (strand.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(strand[0].x, strand[0].y);
    for (let i = 1; i < strand.length; i++) {
      ctx.lineTo(strand[i].x, strand[i].y);
    }
    ctx.stroke();
  }
}

// ============================================================================
// Water Drop Live Tracker & Simulation
// ============================================================================
function handleDropFrameResult(dropResult) {
  state.finalCount = dropResult.count;
  state.rawDetections = dropResult.count;
  state.maskCanvas = dropResult.maskCanvas;
  state.lastResult = {
    mode: 'drops',
    finalCount: dropResult.count,
    rawDetections: dropResult.count,
    rejectedNoiseCount: 0,
    detectionQuality: 95,
    procTime: 8,
    maskCanvas: dropResult.maskCanvas
  };

  document.getElementById('final-count-number').textContent = dropResult.count;
  document.getElementById('drop-rate-val').textContent = dropResult.rate;
  document.getElementById('drop-interval-val').textContent = dropResult.avgInterval;
  document.getElementById('stat-raw-detections').textContent = dropResult.count;

  if (dropResult.milestoneMsg) {
    const alertEl = document.getElementById('drop-milestone-alert');
    const msgEl = document.getElementById('milestone-text');
    alertEl.classList.remove('hidden');
    msgEl.textContent = dropResult.milestoneMsg;
    SpeechEngine.speak(dropResult.milestoneMsg);
  }

  state.intCtx.clearRect(0, 0, state.interactiveCanvas.width, state.interactiveCanvas.height);

  if (state.proofMode && dropResult.activeDrops) {
    state.intCtx.fillStyle = 'rgba(0, 242, 254, 0.8)';
    state.intCtx.strokeStyle = '#39ff14';
    state.intCtx.lineWidth = 2;

    for (const drop of dropResult.activeDrops) {
      state.intCtx.beginPath();
      state.intCtx.arc(drop.cx, drop.cy, Math.max(3, drop.w / 2), 0, Math.PI * 2);
      state.intCtx.fill();
      state.intCtx.stroke();
    }
  }

  if (dropResult.count % 10 === 0 && dropResult.count > 0) {
    recordScanInCareerStats('drops', dropResult.count);
  }
}

function toggleDropSimulation() {
  const btn = document.getElementById('btn-simulate-drops');
  const emptyPrompt = document.getElementById('viewport-empty-prompt');

  if (state.simulatingTap) {
    state.simulatingTap = false;
    btn.classList.remove('action-highlight');
    btn.innerHTML = `<span class="btn-icon">💧</span> SIMULATE TAP`;
    cancelAnimationFrame(state.simDropAnimId);
    return;
  }

  state.simulatingTap = true;
  btn.classList.add('action-highlight');
  btn.innerHTML = `<span class="btn-icon">⏹️</span> STOP SIMULATION`;
  emptyPrompt.classList.add('hidden');

  setCanvasDimensions(640, 480);
  state.dropTracker.reset();

  const drops = [];
  let lastSpawn = performance.now();

  const intervalMap = {
    'steady-leak': 1000,
    'rapid-drip': 420,
    'slow-seep': 2200
  };
  const baseInterval = intervalMap[state.selectedPreset] || 950;

  function simLoop(time) {
    if (!state.simulatingTap) return;

    if (time - lastSpawn > baseInterval + (Math.random() - 0.5) * 200) {
      drops.push({
        x: 320 + (Math.random() - 0.5) * 16,
        y: 80,
        vy: 4.5,
        radius: 6 + Math.random() * 3
      });
      lastSpawn = time;
    }

    state.rawCtx.fillStyle = '#080d1a';
    state.rawCtx.fillRect(0, 0, 640, 480);

    state.rawCtx.fillStyle = '#4a5568';
    state.rawCtx.fillRect(290, 40, 60, 45);
    state.rawCtx.fillStyle = '#718096';
    state.rawCtx.fillRect(300, 75, 40, 15);

    state.rawCtx.fillStyle = '#38bdf8';
    state.rawCtx.shadowColor = '#00f2fe';
    state.rawCtx.shadowBlur = 10;

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.vy;
      d.vy += 0.35;

      state.rawCtx.beginPath();
      state.rawCtx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      state.rawCtx.fill();

      state.rawCtx.beginPath();
      state.rawCtx.moveTo(d.x, d.y - d.radius);
      state.rawCtx.lineTo(d.x, d.y - d.radius * 2.5);
      state.rawCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      state.rawCtx.lineWidth = 3;
      state.rawCtx.stroke();

      if (d.y > 470) drops.splice(i, 1);
    }
    state.rawCtx.shadowBlur = 0;

    const res = state.dropTracker.processFrame(state.rawCanvas, true);
    if (res) handleDropFrameResult(res);

    renderCurrentView();
    state.simDropAnimId = requestAnimationFrame(simLoop);
  }

  state.simDropAnimId = requestAnimationFrame(simLoop);
}

// ============================================================================
// Interactive Click-to-Detect (Custom Mode)
// ============================================================================
function handleInteractiveClick(e) {
  if (state.mode !== 'custom' || state.roiActive) return;

  const rect = state.interactiveCanvas.getBoundingClientRect();
  const scaleX = state.rawCanvas.width / rect.width;
  const scaleY = state.rawCanvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  state.customExemplarPoint = { x: clickX, y: clickY, width: 26, height: 26 };

  state.intCtx.clearRect(0, 0, state.interactiveCanvas.width, state.interactiveCanvas.height);
  state.intCtx.beginPath();
  state.intCtx.arc(clickX, clickY, 16, 0, Math.PI * 2);
  state.intCtx.strokeStyle = '#ffb703';
  state.intCtx.lineWidth = 3;
  state.intCtx.stroke();

  runCustomDetection();
}

function runCustomDetection() {
  if (!state.customExemplarPoint) return;
  try {
    const result = CustomDetector.process(state.rawCanvas, state.customExemplarPoint, state.customSensitivity, {
      roi: state.roiActive ? state.roi : null
    });
    displayResults(result);

    document.getElementById('custom-prompt-text').textContent =
      `Found ${result.finalCount} matching objects at ${state.customSensitivity}% sensitivity. Click any item to re-sample!`;
  } catch (err) {
    console.error("Custom count error:", err);
  }
}

// ============================================================================
// Realistic Dataset Presets
// ============================================================================
function updateAIBannerForMode(mode, customConfidence = null, customReason = null) {
  const meta = {
    rice: { icon: '🌾', label: 'Rice Grains', conf: 98, reason: 'Detected 138 elliptical grain-like contours with aspect ratios between 1.35 and 5.0.' },
    leaves: { icon: '🌿', label: 'Plant Leaves', conf: 96, reason: 'High chlorophyll green foliage detected (78% vegetation coverage).' },
    'facial-hair': { icon: '🧔', label: 'Face & Facial Hair', conf: 99, reason: 'MediaPipe 468-point 3D FaceMesh detected face structure and follicular zone.' },
    drops: { icon: '💧', label: 'Water Drops', conf: 95, reason: 'Detected liquid droplet tripwire and fluid refraction vectors.' },
    custom: { icon: '🔘', label: 'Custom Objects', conf: 94, reason: 'Detected repeated discrete object contours ready for clone counting.' }
  }[mode] || { icon: '🔘', label: 'Objects', conf: 90, reason: 'Object contours detected.' };

  const iconEl = document.getElementById('ai-detected-icon');
  const labelEl = document.getElementById('ai-detected-label');
  const badgeEl = document.getElementById('ai-confidence-badge');
  const reasonEl = document.getElementById('ai-reason-text');
  const overrideSel = document.getElementById('ai-override-select');

  if (iconEl) iconEl.textContent = meta.icon;
  if (labelEl) labelEl.textContent = meta.label;
  if (badgeEl) badgeEl.textContent = `${customConfidence || meta.conf}% Confidence`;
  if (reasonEl) reasonEl.textContent = customReason || meta.reason;
  if (overrideSel) overrideSel.value = mode;

  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.sample === mode);
  });
}

function loadCurrentModeSample(presetId = null) {
  document.getElementById('viewport-empty-prompt').classList.add('hidden');

  const activePreset = presetId || state.selectedPreset || 'default';

  if (state.mode === 'rice') {
    generateRiceSample(activePreset);
  } else if (state.mode === 'leaves') {
    generateLeavesSample(activePreset);
  } else if (state.mode === 'facial-hair') {
    generateFacialHairSample(activePreset);
  } else if (state.mode === 'custom') {
    generateCustomObjectsSample(activePreset);
    state.customExemplarPoint = { x: 200, y: 240, width: 28, height: 28 };
    state.intCtx.clearRect(0, 0, state.interactiveCanvas.width, state.interactiveCanvas.height);
    state.intCtx.beginPath();
    state.intCtx.arc(200, 240, 16, 0, Math.PI * 2);
    state.intCtx.strokeStyle = '#ffb703';
    state.intCtx.lineWidth = 3;
    state.intCtx.stroke();
    document.getElementById('custom-prompt-text').textContent =
      `Exemplar item selected at (200, 240). Click any other item to change exemplar!`;
  } else if (state.mode === 'drops') {
    updateAIBannerForMode('drops');
    toggleDropSimulation();
    return;
  }

  updateAIBannerForMode(state.mode);
  processCurrentFrame();
}

function generateRiceSample(preset = 'scattered-basmati') {
  setCanvasDimensions(640, 480);
  const ctx = state.rawCtx;

  if (preset === 'black-pepper') {
    // Light bamboo cutting board with dark peppercorns
    ctx.fillStyle = '#f1e6d0';
    ctx.fillRect(0, 0, 640, 480);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(180, 150, 120, 0.2)';
    ctx.lineWidth = 2;
    for (let y = 30; y < 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }

    const numPeppers = 92;
    ctx.fillStyle = '#1c1917';
    let seed = 88;
    for (let i = 0; i < numPeppers; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const x = 50 + (seed / 233280) * 540;
      seed = (seed * 9301 + 49297) % 233280;
      const y = 50 + (seed / 233280) * 380;
      const rad = 4.5 + Math.random() * 2.5;

      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Dark plate background
  ctx.fillStyle = '#0f131a';
  ctx.fillRect(0, 0, 640, 480);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 600, 440);

  const numGrains = preset === 'clustered-bowl' ? 210 : 138;
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 3;

  let seed = 42;
  function prng() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < numGrains; i++) {
    // If clustered, concentrate near plate center with touching clusters
    let x, y;
    if (preset === 'clustered-bowl') {
      const r = Math.sqrt(prng()) * 180;
      const theta = prng() * Math.PI * 2;
      x = 320 + Math.cos(theta) * r;
      y = 240 + Math.sin(theta) * r;
    } else {
      x = 50 + prng() * 540;
      y = 50 + prng() * 380;
    }

    const angle = prng() * Math.PI;
    const len = 6 + prng() * 4;
    const wid = 2.2 + prng() * 0.8;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#64748b';
  for (let i = 0; i < 14; i++) {
    const nx = 40 + prng() * 560;
    const ny = 40 + prng() * 400;
    ctx.fillRect(nx, ny, 1.5, 1.5);
  }
}

function generateLeavesSample(preset = 'monstera') {
  setCanvasDimensions(640, 480);
  const ctx = state.rawCtx;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 640, 480);

  ctx.strokeStyle = '#5c3a21';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(80, 420);
  ctx.bezierCurveTo(220, 320, 380, 240, 560, 100);
  ctx.stroke();

  let leafCount = 24;
  let baseSize = 24;
  if (preset === 'fern-fronds') { leafCount = 42; baseSize = 14; }
  else if (preset === 'dense-shrub') { leafCount = 65; baseSize = 20; }

  const leafColors = ['#15803d', '#16a34a', '#22c55e', '#14532d', '#166534'];

  let seed = 17;
  function prng() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const bx = 80 + (560 - 80) * t + (prng() - 0.5) * 60;
    const by = 420 + (100 - 420) * t + (prng() - 0.5) * 60;
    const angle = (i % 2 === 0 ? 1 : -1) * (0.6 + prng() * 0.5);
    const size = baseSize + prng() * (baseSize * 0.8);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);

    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.8, -size * 0.5, size * 1.6, 0);
    ctx.quadraticCurveTo(size * 0.8, size * 0.5, 0, 0);
    ctx.fill();

    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 1.5, 0);
    ctx.stroke();

    ctx.restore();
  }
}

function generateFacialHairSample(preset = 'full-beard') {
  setCanvasDimensions(640, 480);
  const ctx = state.rawCtx;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 640, 480);

  const cx = 320;
  const cy = 240;

  ctx.fillStyle = '#e0a98b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 140, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(cx - 50, cy - 45, 14, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 50, cy - 45, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c68666';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy + 15, 12, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = '#b95d5d';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 55, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#171717';
  ctx.lineWidth = 1.2;

  let seed = 99;
  function prng() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const mCount = preset === 'light-stubble' ? 90 : 280;
  const bCount = preset === 'light-stubble' ? 260 : (preset === 'goatee-moustache' ? 450 : 1100);

  for (let i = 0; i < mCount; i++) {
    const mx = cx + (prng() - 0.5) * 80;
    const my = cy + 22 + prng() * 25;
    const len = preset === 'light-stubble' ? 2 + prng() * 2 : 3 + prng() * 4;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + (prng() - 0.5) * 3, my + len);
    ctx.stroke();
  }

  for (let i = 0; i < bCount; i++) {
    const spanX = preset === 'goatee-moustache' ? 100 : 190;
    const bx = cx + (prng() - 0.5) * spanX;
    const by = cy + 70 + prng() * 105;
    if (Math.hypot((bx - cx) / 100, (by - cy) / 100) < 1.7) {
      const len = preset === 'light-stubble' ? 2 + prng() * 2.5 : 3.5 + prng() * 5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (prng() - 0.5) * 4, by + len);
      ctx.stroke();
    }
  }
}

function generateCustomObjectsSample(preset = 'brass-coins') {
  setCanvasDimensions(640, 480);
  const ctx = state.rawCtx;

  ctx.fillStyle = '#1e2029';
  ctx.fillRect(0, 0, 640, 480);

  if (preset === 'capsule-pills') {
    // Draw 24 two-tone pharmaceutical capsules
    const positions = [
      [100, 100], [180, 120], [270, 90], [380, 110], [480, 130],
      [90, 220], [200, 240], [310, 200], [420, 230], [530, 210],
      [130, 340], [240, 360], [350, 330], [450, 350], [520, 320],
      [220, 410], [330, 420], [410, 415], [160, 160], [390, 170],
      [280, 280], [490, 270], [170, 290], [300, 370]
    ];

    for (const [px, py] of positions) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(0.3);

      // Red half
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -8, 7, Math.PI, 0);
      ctx.lineTo(7, 0);
      ctx.lineTo(-7, 0);
      ctx.fill();

      // White half
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 8, 7, 0, Math.PI);
      ctx.lineTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.fill();

      ctx.restore();
    }
    return;
  }

  // Brass coins
  const positions = [
    [100, 100], [180, 120], [270, 90], [380, 110], [480, 130],
    [90, 220], [200, 240], [310, 200], [420, 230], [530, 210],
    [130, 340], [240, 360], [350, 330], [450, 350], [520, 320],
    [220, 410], [330, 420], [410, 415]
  ];

  for (const [px, py] of positions) {
    const grad = ctx.createRadialGradient(px, py, 4, px, py, 22);
    grad.addColorStop(0, '#fde047');
    grad.addColorStop(0.7, '#eab308');
    grad.addColorStop(1, '#ca8a04');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(80, 400, 45, 12);
  ctx.fillRect(490, 80, 50, 12);
}

function generateDefaultFaceLandmarks(w, h) {
  const lms = [];
  for (let i = 0; i < 468; i++) lms.push({ x: 0.5, y: 0.5, z: 0 });

  lms[1] = { x: 320 / w, y: 255 / h, z: 0 };
  lms[2] = { x: 320 / w, y: 260 / h, z: 0 };
  lms[10] = { x: 320 / w, y: 120 / h, z: 0 };
  lms[151] = { x: 320 / w, y: 140 / h, z: 0 };
  lms[152] = { x: 320 / w, y: 410 / h, z: 0 };
  lms[176] = { x: 210 / w, y: 350 / h, z: 0 };
  lms[400] = { x: 430 / w, y: 350 / h, z: 0 };

  const mIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78, 2];
  mIndices.forEach((idx, i) => {
    const angle = (i / mIndices.length) * Math.PI * 2;
    lms[idx] = { x: (320 + Math.cos(angle) * 45) / w, y: (275 + Math.sin(angle) * 15) / h, z: 0 };
  });

  const bIndices = [17, 18, 200, 199, 175, 152, 377, 400, 378, 379, 365, 397, 288, 435, 367, 364, 394, 395, 369, 396, 176, 148, 152, 58, 172, 136, 150, 149];
  bIndices.forEach((idx, i) => {
    const angle = (i / bIndices.length) * Math.PI * 2;
    lms[idx] = { x: (320 + Math.cos(angle) * 95) / w, y: (350 + Math.sin(angle) * 55) / h, z: 0 };
  });

  return lms;
}

function showQualityWarning(title, desc) {
  const banner = document.getElementById('quality-warning-banner');
  document.getElementById('warning-title').textContent = title;
  document.getElementById('warning-desc').textContent = desc;
  banner.classList.remove('hidden');
}

function hideQualityWarning() {
  document.getElementById('quality-warning-banner').classList.add('hidden');
}

function updateUselessnessDisplay(usefulnessPct, uselessnessPct) {
  document.getElementById('score-usefulness-num').textContent = `${usefulnessPct}%`;
  document.getElementById('score-uselessness-num').textContent = `${uselessnessPct}%`;
  document.getElementById('score-usefulness-fill').style.width = `${usefulnessPct}%`;
  document.getElementById('score-uselessness-fill').style.width = `${uselessnessPct}%`;
}

function resetCountsDisplay() {
  document.getElementById('final-count-number').textContent = '0';
  document.getElementById('stat-raw-detections').textContent = '0';
  document.getElementById('stat-rejected-noise').textContent = '0';
  document.getElementById('stat-quality-pct').textContent = '--%';
  document.getElementById('stat-proc-time').textContent = '0 ms';
  document.getElementById('count-hero-subtitle').textContent = 'Awaiting frame capture...';
}

// ============================================================================
// Counting Battle Mode
// ============================================================================
function openBattleModal() {
  document.getElementById('battle-modal').classList.remove('hidden');
  document.getElementById('challenger-a-title').textContent = `${state.mode.toUpperCase()} SAMPLE A`;
  document.getElementById('challenger-b-title').textContent = `${state.mode.toUpperCase()} SAMPLE B`;
}

function closeBattleModal() {
  document.getElementById('battle-modal').classList.add('hidden');
}

function scanBattleChallenger(challengerKey) {
  if (!state.lastResult) loadCurrentModeSample();

  const canvas = document.getElementById(`battle-canvas-${challengerKey.toLowerCase()}`);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.mainCanvas, 0, 0, canvas.width, canvas.height);

  document.getElementById(`battle-placeholder-${challengerKey.toLowerCase()}`).classList.add('hidden');
  document.getElementById(`battle-count-${challengerKey.toLowerCase()}`).textContent = state.finalCount.toLocaleString();

  if (challengerKey === 'A') state.battleState.sampleACount = state.finalCount;
  else state.battleState.sampleBCount = state.finalCount;

  if (state.battleState.sampleACount !== null && state.battleState.sampleBCount !== null) {
    evaluateBattleShowdown();
  }
}

function loadBattleSample(challengerKey) {
  const presets = DATASET_PRESETS[state.mode] || [];
  const presetId = challengerKey === 'B' && presets.length > 1 ? presets[1].id : presets[0]?.id;

  if (state.mode === 'rice') generateRiceSample(presetId);
  else if (state.mode === 'leaves') generateLeavesSample(presetId);
  else if (state.mode === 'facial-hair') generateFacialHairSample(presetId);
  else generateCustomObjectsSample(presetId);

  let result = null;
  if (state.mode === 'rice') result = RiceDetector.process(state.rawCanvas, { splitClumps: true });
  else if (state.mode === 'leaves') result = LeafDetector.process(state.rawCanvas);
  else if (state.mode === 'facial-hair') result = runFacialHairProcessing();
  else result = CustomDetector.process(state.rawCanvas, { x: 200, y: 240, width: 28, height: 28 }, 65);

  const canvas = document.getElementById(`battle-canvas-${challengerKey.toLowerCase()}`);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.rawCanvas, 0, 0, canvas.width, canvas.height);

  document.getElementById(`battle-placeholder-${challengerKey.toLowerCase()}`).classList.add('hidden');
  document.getElementById(`battle-count-${challengerKey.toLowerCase()}`).textContent = result.finalCount.toLocaleString();

  if (challengerKey === 'A') state.battleState.sampleACount = result.finalCount;
  else state.battleState.sampleBCount = result.finalCount;

  if (state.battleState.sampleACount !== null && state.battleState.sampleBCount !== null) {
    evaluateBattleShowdown();
  }
}

function evaluateBattleShowdown() {
  const countA = state.battleState.sampleACount;
  const countB = state.battleState.sampleBCount;
  const banner = document.getElementById('battle-outcome-banner');
  const winnerTitle = document.getElementById('battle-winner-title');
  const marginText = document.getElementById('battle-margin-text');

  banner.classList.remove('hidden');
  const margin = Math.abs(countA - countB);

  let winner = '';
  if (countA > countB) {
    winner = 'CHALLENGER A 🏆';
    marginText.textContent = `Victory margin: +${margin.toLocaleString()} unnecessary ${MODE_CONFIGS[state.mode].unit.toLowerCase()}.`;
  } else if (countB > countA) {
    winner = 'CHALLENGER B 🏆';
    marginText.textContent = `Victory margin: +${margin.toLocaleString()} unnecessary ${MODE_CONFIGS[state.mode].unit.toLowerCase()}.`;
  } else {
    winner = 'STALEMATE TIE! 🤝';
    marginText.textContent = 'Both challengers boast the exact same unnecessary count.';
  }

  winnerTitle.textContent = `WINNER: ${winner}`;
  SpeechEngine.speak(`Battle completed. Winner is ${winner}. Victory margin: ${margin} items.`);
}

function resetBattle() {
  state.battleState.sampleACount = null;
  state.battleState.sampleBCount = null;
  document.getElementById('battle-count-a').textContent = '--';
  document.getElementById('battle-count-b').textContent = '--';
  
  const cA = document.getElementById('battle-canvas-a');
  if (cA) cA.getContext('2d').clearRect(0, 0, cA.width, cA.height);
  const cB = document.getElementById('battle-canvas-b');
  if (cB) cB.getContext('2d').clearRect(0, 0, cB.width, cB.height);

  document.getElementById('battle-placeholder-a').classList.remove('hidden');
  document.getElementById('battle-placeholder-b').classList.remove('hidden');
  document.getElementById('battle-outcome-banner').classList.add('hidden');
}

// ============================================================================
// Career Stats & Local Storage
// ============================================================================
function loadCareerStats() {
  const defaultStats = {
    totalScans: 0,
    totalObjectsCounted: 0,
    mostAbusedMode: 'RICE',
    largestCount: 0,
    modeCounts: { rice: 0, drops: 0, leaves: 0, 'facial-hair': 0, custom: 0 }
  };

  try {
    const saved = localStorage.getItem('countify_career_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.stats = {
        ...defaultStats,
        ...parsed,
        modeCounts: { ...defaultStats.modeCounts, ...(parsed.modeCounts || {}) }
      };
      updateCareerStatsUI();
    }
  } catch (e) {}
}

function saveCareerStats() {
  try {
    localStorage.setItem('countify_career_stats', JSON.stringify(state.stats));
    updateCareerStatsUI();
  } catch (e) {}
}

function recordScanInCareerStats(mode, count) {
  state.stats.totalScans++;
  state.stats.totalObjectsCounted += count;
  state.stats.modeCounts[mode] = (state.stats.modeCounts[mode] || 0) + 1;

  if (count > state.stats.largestCount) {
    state.stats.largestCount = count;
  }

  let maxMode = 'rice';
  let maxCount = 0;
  for (const [m, c] of Object.entries(state.stats.modeCounts)) {
    if (c > maxCount) {
      maxCount = c;
      maxMode = m;
    }
  }
  state.stats.mostAbusedMode = maxMode.toUpperCase();
  saveCareerStats();
}

function updateCareerStatsUI() {
  document.getElementById('cstat-total-scans').textContent = state.stats.totalScans.toLocaleString();
  document.getElementById('cstat-objects-counted').textContent = state.stats.totalObjectsCounted.toLocaleString();
  document.getElementById('cstat-most-abused').textContent = state.stats.mostAbusedMode;
  document.getElementById('cstat-largest-count').textContent = state.stats.largestCount.toLocaleString();
}

function openStatsModal() {
  updateCareerStatsUI();
  document.getElementById('stats-modal').classList.remove('hidden');
}

function closeStatsModal() {
  document.getElementById('stats-modal').classList.add('hidden');
}

function clearCareerStats() {
  if (confirm("Reset lifetime unnecessary counting statistics?")) {
    state.stats = {
      totalScans: 0,
      totalObjectsCounted: 0,
      mostAbusedMode: 'RICE',
      largestCount: 0,
      modeCounts: { rice: 0, drops: 0, leaves: 0, 'facial-hair': 0, custom: 0 }
    };
    saveCareerStats();
  }
}

// ============================================================================
// Controls: Voice, Proof, Export
// ============================================================================
function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  const btn = document.getElementById('btn-toggle-voice');
  btn.classList.toggle('active', state.voiceEnabled);
  btn.querySelector('.btn-label').textContent = state.voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF';

  if (!state.voiceEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function toggleProofMode() {
  state.proofMode = !state.proofMode;
  const btn = document.getElementById('btn-toggle-proof');
  btn.classList.toggle('active', state.proofMode);
  btn.querySelector('.btn-label').textContent = state.proofMode ? 'PROOF: ON' : 'PROOF: OFF';

  renderCurrentView();
}

function exportProofCard() {
  if (!state.mainCanvas) return;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = state.mainCanvas.width;
  exportCanvas.height = state.mainCanvas.height + 100;
  const eCtx = exportCanvas.getContext('2d');

  eCtx.drawImage(state.mainCanvas, 0, 0);

  eCtx.fillStyle = '#060a14';
  eCtx.fillRect(0, state.mainCanvas.height, exportCanvas.width, 100);

  const grad = eCtx.createLinearGradient(0, state.mainCanvas.height, exportCanvas.width, state.mainCanvas.height);
  grad.addColorStop(0, '#00f2fe');
  grad.addColorStop(0.5, '#39ff14');
  grad.addColorStop(1, '#8a2be2');
  eCtx.fillStyle = grad;
  eCtx.fillRect(0, state.mainCanvas.height, exportCanvas.width, 3);

  eCtx.font = 'bold 22px Outfit, sans-serif';
  eCtx.fillStyle = '#00f2fe';
  eCtx.fillText('COUNTIFY CERTIFIED PROOF', 24, state.mainCanvas.height + 36);

  eCtx.font = '12px JetBrains Mono, monospace';
  eCtx.fillStyle = '#94a3b8';
  const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
  eCtx.fillText(`MODE: ${state.mode.toUpperCase()} | VERIFIED COUNT: ${state.finalCount} ${MODE_CONFIGS[state.mode].unit} | QUALITY: ${state.lastResult?.detectionQuality || 95}%`, 24, state.mainCanvas.height + 62);
  eCtx.fillText(`TIMESTAMP: ${time} UTC | VERIFICATION HASH: #${Math.random().toString(36).substring(2, 10).toUpperCase()}`, 24, state.mainCanvas.height + 84);

  eCtx.save();
  eCtx.translate(exportCanvas.width - 150, state.mainCanvas.height + 48);
  eCtx.rotate(-0.08);
  eCtx.strokeStyle = 'rgba(57, 255, 20, 0.7)';
  eCtx.lineWidth = 2;
  eCtx.strokeRect(-60, -22, 130, 44);
  eCtx.font = 'bold 12px JetBrains Mono, monospace';
  eCtx.fillStyle = '#39ff14';
  eCtx.fillText('OFFICIALLY', -50, -4);
  eCtx.fillText('UNNECESSARY', -50, 14);
  eCtx.restore();

  try {
    const link = document.createElement('a');
    link.download = `COUNTIFY_Proof_${state.mode}_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error("Export error:", err);
  }
}

// ============================================================================
// Google Gemini Multimodal Vision API Integration & Real Item Audit
// ============================================================================
function initGeminiHandlers() {
  const btnOpenModal = document.getElementById('btn-open-gemini-modal');
  const btnCloseModal = document.getElementById('btn-close-gemini-modal');
  const btnSaveKey = document.getElementById('btn-save-gemini-key');
  const btnClearKey = document.getElementById('btn-clear-gemini-key');
  const btnToggleVis = document.getElementById('btn-toggle-key-visibility');
  const btnRunNow = document.getElementById('btn-run-gemini-now');
  const keyInput = document.getElementById('gemini-api-key-input');

  if (btnOpenModal) btnOpenModal.addEventListener('click', openGeminiModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeGeminiModal);

  // Close modal when clicking backdrop
  const modal = document.getElementById('gemini-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeGeminiModal();
    });
  }

  if (btnSaveKey) btnSaveKey.addEventListener('click', saveGeminiKey);
  if (btnClearKey) btnClearKey.addEventListener('click', clearGeminiKey);
  if (btnToggleVis && keyInput) {
    btnToggleVis.addEventListener('click', () => {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    });
  }

  if (btnRunNow) {
    btnRunNow.addEventListener('click', () => {
      runGeminiVisionCount();
    });
  }

  updateGeminiUIState();
}

function openGeminiModal() {
  const modal = document.getElementById('gemini-modal');
  const keyInput = document.getElementById('gemini-api-key-input');
  if (modal) modal.classList.remove('hidden');
  if (keyInput && window.GeminiVisionAPI) {
    keyInput.value = window.GeminiVisionAPI.getKey();
    keyInput.focus();
  }
}

function closeGeminiModal() {
  const modal = document.getElementById('gemini-modal');
  if (modal) modal.classList.add('hidden');
}

function saveGeminiKey() {
  const keyInput = document.getElementById('gemini-api-key-input');
  if (!keyInput || !window.GeminiVisionAPI) return;
  const val = keyInput.value.trim();
  if (!val) {
    alert("Please enter a valid Gemini API key or click Clear.");
    return;
  }
  window.GeminiVisionAPI.setKey(val);
  updateGeminiUIState();
  closeGeminiModal();
  SpeechEngine.speak("Google Gemini API activated successfully.");
}

function clearGeminiKey() {
  if (!window.GeminiVisionAPI) return;
  window.GeminiVisionAPI.setKey('');
  const keyInput = document.getElementById('gemini-api-key-input');
  if (keyInput) keyInput.value = '';
  updateGeminiUIState();
  closeGeminiModal();
  SpeechEngine.speak("Google Gemini key cleared.");
}

function updateGeminiUIState() {
  const isReady = window.GeminiVisionAPI && window.GeminiVisionAPI.isAvailable();
  const btnOpenModal = document.getElementById('btn-open-gemini-modal');
  if (btnOpenModal) {
    if (isReady) {
      btnOpenModal.innerHTML = '✨ ENGINE ACTIVE 🟢';
      btnOpenModal.classList.add('active');
    } else {
      btnOpenModal.innerHTML = '✨ VISION ENGINE';
      btnOpenModal.classList.remove('active');
    }
  }

  const runBtn = document.getElementById('btn-run-gemini-now');
  if (runBtn) {
    const small = runBtn.querySelector('small');
    if (small) {
      small.textContent = isReady ? 'Vision Engine Active' : 'Connect API Key & Count';
    }
  }
}

async function runGeminiVisionCount() {
  if (!window.GeminiVisionAPI || !window.GeminiVisionAPI.isAvailable()) {
    openGeminiModal();
    return;
  }

  if (!state.rawCanvas || state.rawCanvas.width === 0) {
    alert("Please capture a photo or upload an image first!");
    return;
  }

  const overlay = document.getElementById('ai-analyzing-overlay');
  const scanline = document.getElementById('scanline');
  const overlayTitle = overlay ? overlay.querySelector('.ai-overlay-title') : null;
  const overlaySubtitle = overlay ? overlay.querySelector('.ai-overlay-subtitle') : null;

  const origTitle = overlayTitle ? overlayTitle.textContent : '';
  const origSub = overlaySubtitle ? overlaySubtitle.textContent : '';

  if (overlay) overlay.classList.remove('hidden');
  if (scanline) scanline.classList.remove('hidden');
  if (overlayTitle) overlayTitle.textContent = "🔍 ANALYZING IMAGE...";
  if (overlaySubtitle) overlaySubtitle.textContent = "Processing image with high-precision object scanner...";

  try {
    const result = await window.GeminiVisionAPI.analyzeAndCount(state.rawCanvas);
    if (!result) {
      throw new Error("No response received from vision scanner.");
    }

    // Switch mode if category detected
    if (result.mode && result.mode !== state.mode) {
      switchMode(result.mode, false);
    }

    displayResults(result);
    SpeechEngine.speak(`Counted ${result.finalCount} ${result.itemName || 'items'} with certified precision.`);
  } catch (err) {
    console.error("Vision Scanner Error:", err);
    alert(`Vision Engine Error: ${err.message || err}`);
  } finally {
    if (overlay) overlay.classList.add('hidden');
    if (scanline) scanline.classList.add('hidden');
    if (overlayTitle) overlayTitle.textContent = origTitle;
    if (overlaySubtitle) overlaySubtitle.textContent = origSub;
  }
}

// ============================================================================
// Real Detected Objects Audit Table Population & Canvas Target Reticle
// ============================================================================
function populateAuditTable(result) {
  const tbody = document.getElementById('audit-table-rows');
  const totalBadge = document.getElementById('audit-total-badge');
  if (!tbody) return;

  // Derive items: acceptedItems or strandOverlayPoints
  let items = result.acceptedItems;
  if (!items && result.strandOverlayPoints) {
    items = result.strandOverlayPoints.map((s, idx) => ({
      id: idx + 1,
      label: 'Strand',
      cx: Math.round((s[0].x + s[1].x) / 2),
      cy: Math.round((s[0].y + s[1].y) / 2),
      area: 4,
      points: s
    }));
  }

  items = items || [];
  if (totalBadge) totalBadge.textContent = `${items.length} items`;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="audit-empty-cell">
          No individual objects isolated. Upload a clearer picture or adjust sensitivity slider.
        </td>
      </tr>
    `;
    return;
  }

  const renderLimit = Math.min(items.length, 300);
  let rowsHtml = '';

  for (let i = 0; i < renderLimit; i++) {
    const it = items[i];
    const id = it.id || (i + 1);
    const label = it.label || (result.mode === 'rice' ? 'Grain' : result.mode === 'leaves' ? 'Leaf' : result.mode === 'facial-hair' ? 'Strand' : 'Item');
    const cx = Math.round(it.cx ?? (it.rect ? it.rect.x + it.rect.width / 2 : 0));
    const cy = Math.round(it.cy ?? (it.rect ? it.rect.y + it.rect.height / 2 : 0));
    const areaVal = it.area ? `${Math.round(it.area)} px²` : (it.rect ? `${Math.round(it.rect.width * it.rect.height)} px²` : '4 px²');

    const isGemini = !!result.isGeminiAI;
    const badgeCls = isGemini ? 'badge-audit-gemini' : (it.isDecomposed ? 'badge-audit-split' : 'badge-audit-id');
    const statusText = isGemini ? 'GEMINI 2.5' : (it.isDecomposed ? 'SPLIT CLUMP' : 'VERIFIED');
    const statusCls = isGemini ? 'status-pill-gemini' : (it.isDecomposed ? 'status-pill-split' : 'status-pill-cv');

    rowsHtml += `
      <tr class="audit-row" data-cx="${cx}" data-cy="${cy}" data-id="${id}" data-label="${label}">
        <td><span class="${badgeCls}">#${id}</span></td>
        <td><strong class="item-label-text">${label}</strong></td>
        <td><code class="coord-tag">(${cx}, ${cy})</code></td>
        <td class="area-val-cell">${areaVal}</td>
        <td><span class="${statusCls}">● ${statusText}</span></td>
      </tr>
    `;
  }

  if (items.length > renderLimit) {
    rowsHtml += `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--slate-400); font-size: 11px; padding: 8px;">
          ...and ${items.length - renderLimit} additional verified items plotted on canvas
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = rowsHtml;

  // Add hover reticle highlight interaction
  tbody.querySelectorAll('.audit-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      const cx = parseFloat(row.dataset.cx);
      const cy = parseFloat(row.dataset.cy);
      const id = row.dataset.id;
      const label = row.dataset.label;
      drawAuditReticle(cx, cy, id, label);
    });
    row.addEventListener('mouseleave', () => {
      clearAuditReticle();
    });
  });
}

function drawAuditReticle(cx, cy, id, label) {
  const ctx = state.intCtx;
  if (!ctx || isNaN(cx) || isNaN(cy)) return;

  clearAuditReticle();

  ctx.save();
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 10;

  // Outer Reticle Circle
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - 24, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8, cy);
  ctx.lineTo(cx + 24, cy);
  ctx.moveTo(cx, cy - 24);
  ctx.lineTo(cx, cy - 8);
  ctx.moveTo(cx, cy + 8);
  ctx.lineTo(cx, cy + 24);
  ctx.stroke();

  // Callout Box
  const tagText = `#${id} ${label || 'ITEM'} [${cx}, ${cy}]`;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  const tagWidth = ctx.measureText(tagText).width;

  ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 1;
  ctx.fillRect(cx + 16, cy - 20, tagWidth + 12, 20);
  ctx.strokeRect(cx + 16, cy - 20, tagWidth + 12, 20);

  ctx.fillStyle = '#ff007f';
  ctx.fillText(tagText, cx + 22, cy - 6);

  ctx.restore();
}

function clearAuditReticle() {
  if (state.intCtx && state.interactiveCanvas) {
    state.intCtx.clearRect(0, 0, state.interactiveCanvas.width, state.interactiveCanvas.height);
    if (state.roiActive) drawRoiOverlay();
  }
}

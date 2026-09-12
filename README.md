# COUNTIFY
> ### “Solving the world’s least important counting problems.”
> *“If it exists, we’ll unnecessarily count it.”*

---

## 1. What is COUNTIFY?

**COUNTIFY** is an intentionally useless yet technically genuine computer-vision web application. It applies genuine, non-trivial image processing and computer vision techniques to solve problems nobody asked to have solved:
- Counting individual grains of rice scattered on a dinner plate
- Estimating visible facial hair strands and moustache-to-beard symmetry
- Auditing leaves on houseplants and trees
- Tracking dripping tap droplets across a virtual motion tripwire
- Counting duplicate clutter using interactive click-to-detect

### The Core Rule: Real Computer Vision Only
**COUNTIFY does NOT generate fake or randomized numbers.**
Every single count is mathematically extracted from camera pixels or uploaded frames using **OpenCV.js**, **MediaPipe FaceMesh**, and the **HTML5 Canvas API**. The comedy is in the presentation, the uselessness rating, and the live Malayali-English audio commentary—not the technical detection.

---

## 2. Why is it Intentionally Useless?

While the global tech ecosystem rushes to deploy AI to summarize emails or generate corporate decks, humanity has left critical questions unanswered:
* *“Exactly how many grains of basmati rice are on my plate right now?”*
* *“Is my left cheek sporting 48 more beard hairs than my right cheek?”*
* *“Has my leaking bathroom faucet dripped 100 drops without anyone calling a plumber?”*

COUNTIFY steps up to waste cutting-edge computer vision resources on answering these urgent non-problems with mathematical rigor and proof.

---

## 3. How Each Mode Works (Technical Architecture)

```text
Camera / Upload / Preset Sample
               │
               ▼
      ImageQualityChecker (Brightness, Contrast, Laplacian Sharpness)
               │
   ┌───────────┴──────────────────────────────────────────────┐
   ▼                         ▼              ▼                 ▼
RiceDetector            LeafDetector   DropTracker   FacialHairEstimator
(Otsu Threshold &       (HSV Space &   (Tripwire &   (MediaPipe Mesh &
 Morphology & Filter)   Watershed)     Background)   Sobel Ridge Filters)
   │                         │              │                 │
   └───────────┬─────────────┴──────────────┴─────────────────┘
               ▼
         ProofOverlay (Numbered Centroids, Contours, Rejection Markers)
               │
         FunnyReactionEngine + Web Speech API
               │
         Certified Result Card & LocalStorage Session Stats
```

### Mode 1 — Rice Counter (🌾)
1. **Grayscale & Filtering**: Converts frame to single-channel luminance, applies $5 \times 5$ Gaussian blur to eliminate camera sensor grain.
2. **Dynamic Polarity Thresholding**: Samples 4-corner ambient lighting to detect whether the background is dark ceramic or light paper; applies Otsu's binarization (`cv.THRESH_BINARY | cv.THRESH_OTSU`).
3. **Morphological Opening**: Employs a $3 \times 3$ structuring element to suppress dust and salt speckles.
4. **Contour Analysis**: Computes contour area, aspect ratio ($> 1.25$ for elongated grains), and moments ($m_{10}/m_{00}, m_{01}/m_{00}$) for centroids.
5. **Noise Filtering**: Rejects undersized debris ($< \text{minArea}$) and oversized clumps ($> \text{maxArea}$); highlights rejected noise with red 'X' markers in Proof Mode.
6. **Sample Weight Extrapolation**: Given sample grams (e.g. 10g), computes grains/gram and project estimated count in 1 kg.

### Mode 2 — Facial Hair Counter (🧔)
1. **Face Mesh Landmark Triangulation**: MediaPipe FaceMesh isolates 468 3D facial landmarks.
2. **Anatomical Sub-Region Masking**:
   - Moustache region: landmarks below nose base (landmarks 2, 164) down to upper vermilion border (0, 37, 267).
   - Beard / Chin region: mental crease to jawline (17, 18, 152, 176, 377, 400).
   - Cheek & Jawline: lateral boundaries (234 to 454).
3. **Ridge & Thin-Structure Enhancement**: Applies morphological Top-Hat filtering (`cv.MORPH_TOPHAT`) and Canny edge gradients to reveal thin, dark follicular structures against skin tone.
4. **Strand Approximation**: Analyzes connected line segments and arc lengths across left and right facial hemispheres to calculate:
   - Visible Moustache Strands
   - Visible Beard Strands
   - Left vs. Right Hair Asymmetry Imbalance

### Mode 3 — Leaf Counter (🌿)
1. **HSV Color Segmentation**: Converts RGB to HSV; thresholds foliage green ($H \in [25, 90]$, $S \in [35, 255]$, $V \in [30, 255]$).
2. **Morphological Closing & Opening**: Bridges internal leaf veins and detaches slender petioles/stems.
3. **Contour Extraction**: Identifies individual leaf contours, bounding rectangles, and surface areas in pixels.
4. **Champions Identification**: Highlights the Largest Leaf (`#ID`, area) and Smallest Leaf (`#ID`, area).
5. **Dense Foliage Fallback**: If green coverage exceeds $55\%$ with overlapping clump morphology, switches to an area-calibrated visible leaf estimate with a clear disclaimer.

### Mode 4 — Water Drop Counter (💧)
1. **Real-time ROI Monitoring**: Restricts vision processing to a user-configurable bounding zone below the faucet spout.
2. **Background Frame Differencing**: Calculates absolute delta between consecutive smoothed frames (`cv.absdiff`).
3. **Droplet Contour Tracking**: Tracks droplet centroids downwards along the gravity vector across consecutive frames.
4. **Virtual Tripwire Line**: A horizontal counting threshold at $55\%$ ROI height registers droplet passage exactly once per droplet ID, preventing duplicate triggers.
5. **Flow Dynamics**: Computes live drops/min rate and average inter-drop interval in seconds.
6. **Milestone Alerts**: Fires achievement unlocks at 100 drops (*“100 drops and nobody fixed the tap”*) and 500 drops (*“Bro just close the tap 💀”*).

### Mode 5 — Custom Click-to-Count Mode (🔘)
1. **Interactive Exemplar Selection**: User clicks on any exemplar item (coin, bottle cap, button, screw) in the canvas.
2. **Feature Extraction**: Extracts the clicked pixel's HSV profile and local bounding area.
3. **Similarity Search**: Scans the image for contours matching the exemplar within tolerance parameters governed by the live **Similarity Sensitivity Slider** ($10\% - 95\%$).
4. **Dynamic Recount**: Adjusting the slider immediately re-filters candidates without re-uploading.

---

## 4. Proof Mode & Technical Evidence (REQUIRED)

COUNTIFY refuses to operate as a "black box":
- **Proof Mode Toggle (ON / OFF)**:
  - **Neon Outlines**: Every accepted item is delineated with a neon boundary.
  - **Numbered Badges**: Every single detection carries a unique numbered tag (`#1`, `#2`, `#3`...).
  - **Centroids**: Cyan/lime target markers pinpoint exact geometric centers.
  - **Noise Rejection**: Red crosshairs mark rejected dust, glare, or oversized clusters.
- **View Tabs**:
  - `COMPOSITE`: Full image with detection overlays.
  - `BINARY MASK`: Raw binary threshold / edge mask directly from OpenCV memory.
  - `RAW SOURCE`: Original camera snapshot.

---

## 5. Live Voice Commentary & Malayalam-English Humor

Equipped with the **Browser SpeechSynthesis API**, COUNTIFY delivers sarcastic quips with built-in cooldowns:
- **Rice**: *“Eda 400 kazhinju… ithu vare count cheyyano? Dinner has analytics now.”*
- **Facial Hair**: *“Bro beard-inum census nadathunnu.”*
- **Leaves**: *“Plant inventory completed. Tree-inte attendance edukkano?”*
- **Drops**: *“Drop number 100 da. Tap close cheyy.”*
- **Custom**: *“Ithokke enthina count cheyyunne da?”*

Toggleable anytime with the **VOICE: ON/OFF** button. Displays visual dialogue bubbles even if audio is muted or unsupported.

---

## 6. Counting Battle Mode (⚔️)

A competitive head-to-head arena for comparing unnecessary quantities:
1. **Challenger A**: Scan Sample A (Plate A / Person A / Plant A).
2. **Challenger B**: Scan Sample B (Plate B / Person B / Plant B).
3. **Showdown**: Automatic delta calculation, victory margin declaration, and trophy crowning.

---

## 7. Career Stats & Local Storage

Tracks lifetime unnecessary statistics stored 100% locally in `localStorage`:
- **Total Scans Executed**
- **Objects Unnecessarily Counted**
- **Most Abused Mode**
- **Largest Single Count**
- **Useful Real-World Tasks Completed**: Always **`0`**.

---

## 8. Tech Stack

- **HTML5 & CSS3**: Cyber-dark glassmorphism, responsive CSS grid, CRT scanlines, neon glow tokens.
- **Vanilla JavaScript (ES6+)**: Modular detectors, zero framework overhead.
- **OpenCV.js**: WebAssembly compilation of OpenCV 4.x for real-time edge, contour, morphological, and HSV processing.
- **MediaPipe FaceMesh**: 468-point 3D facial landmark mesh for facial hair zone extraction.
- **HTML5 Canvas API**: High-performance multi-layer rendering (source, processing, interactive overlay).
- **Web Speech API (`SpeechSynthesis`)**: Live commentary audio engine.

**No backend. No database. No API keys. No cloud uploads.**

---

## 9. How to Run Locally

### Prerequisites
- Python 3.x installed (standard on macOS/Linux/Windows).
- Any modern web browser (Google Chrome, Microsoft Edge, Firefox, Brave, Safari).

### Launching the App
In your terminal, navigate to the `countify` project directory:

```bash
cd scratch/countify
python -m http.server 8000
```

Open your browser and navigate to:
```text
http://localhost:8000
```

*(Or open `index.html` directly in any browser with webcam permissions enabled).*

---

## 10. Privacy Guarantee

COUNTIFY runs **100% locally on your device**:
- Webcam video feeds never leave your browser memory.
- Uploaded photos are processed directly in client-side WebAssembly buffers.
- No telemetry, analytics, cookies, or cloud servers are used.

---

## 11. Known Limitations & Accuracy Considerations

- **Rice Mode**: Requires high contrast against a dark background with grains spread apart (touching grains may be identified as composite clusters).
- **Water Drop Mode**: Best results achieved when the camera is held steady (tripod or rested on a stable surface) to avoid motion-blur artifacts.
- **Facial Hair Mode**: Estimates *visible* surface strand structures from high-pass edge features; cannot detect subsurface follicles.
- **Lighting**: Brightness levels under 30 or above 230 trigger the on-screen Image Quality Warning.

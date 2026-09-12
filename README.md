<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# Countify 🎯


## Basic Details
### Team Name: #includers


### Team Members
- Team Lead: Aryan V - Adi shankara institute of engineering and technology 
- Member 2: Clive Stiyan D Coth - Adi shankara institute of engineering and technology

### Project Description
Countify is a multi-mode computer-vision application designed to count things nobody has ever desperately needed to count.

From individual rice grains and leaves to water drops and visible beard/moustache hairs, Countify uses real image processing to produce completely unnecessary statistics — with proof overlays, confidence metrics, and sarcastic commentary.

### The Problem (that doesn't exist)
Humanity has successfully landed on the Moon, built artificial intelligence, and connected billions of people through the internet.

Yet some critical questions remain unanswered:

How many rice grains are actually sitting on this plate?
How many visible hairs are in someone's beard and moustache?
Does the left side of your beard have more hair than the right?
How many leaves does this random plant have?
Exactly how many drops have fallen from that leaking tap?
How many identical random objects are lying in front of you?

Nobody asked these questions.

Nobody needed the answers.

So naturally, we built Countify.

### The Solution (that nobody asked for)
Countify turns your webcam into an unnecessarily powerful counting machine.

Choose a mode, point the camera at something, and Countify uses different computer-vision techniques to analyze and count it.

Current modes include:

🌾 Rice Mode — detects and counts individual rice grains.
🧔 Facial Hair Mode — estimates visible beard and moustache strands.
🌿 Leaf Mode — detects and counts visible leaves.
💧 Water Drop Mode — tracks falling drops and counts them across a virtual tripwire.
🔘 Custom Mode — detects repeated similar objects from a selected example.

And because simply displaying a number would be far too normal, Countify also provides:

numbered detection overlays
contour visualization
rejected-noise statistics
image-quality analysis
uselessness ratings
Malayalam-English voice commentary
counting battles
lifetime counting statistics

The counting is real.

The reason for counting is questionable.

## Technical Details
### Technologies/Components Used
For Software:
Languages Used
HTML5
CSS3
JavaScript ES6+
Frameworks / APIs Used
OpenCV.js
MediaPipe FaceMesh
HTML5 Canvas API
WebRTC / getUserMedia() Camera API
Web Speech API / SpeechSynthesis
Browser LocalStorage
Google Gemini multimodal integration for assisted image analysis
Libraries Used
OpenCV.js — thresholding, morphology, contours, HSV processing, edge detection and motion analysis
MediaPipe FaceMesh — facial landmark detection and beard/moustache region extraction
MediaPipe Camera Utils — webcam integration
Canvas API — visual detection overlays and image processing
SpeechSynthesis API — live sarcastic voice commentary
Tools Used
VS Code / Code Editor
Google Chrome / Chromium-based browser
Python local HTTP server
Git & GitHub
Browser DevTools
For Hardware

No dedicated hardware is required.

The project only needs:

A laptop/desktop
Webcam
Speaker for voice commentary
Optional external camera for better image quality

For testing different modes:

Rice grains
Plant/leaves
Beard/moustache owner 😭
Dripping water source
Random repeated objects
For Hardware:
- [List main components]
- [List specifications]
- [List tools required]

### Implementation
             📷 Camera / Uploaded Image
                       │
                       ▼
               🔍 Image Quality Check
                       │
                       ▼
              Select Processing Type
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Static Objects  Facial Region  Motion Objects
          │            │            │
          ▼            ▼            ▼
     Contours /     FaceMesh +    Tracking +
     Segmentation   Hair Analysis  Tripwire
          │            │            │
          └────────────┼────────────┘
                       ▼
                   Count Engine
                       │
                       ▼
              Noise / Duplicate Removal
                       │
                       ▼
                Detection Quality
                       │
                       ▼
                  Proof Overlay
                       │
                       ▼
              Funny Reaction Engine
                       │
                       ▼
                  🎯 RESULT 💀
# Installation
Clone the repository:

git clone <YOUR-GITHUB-REPOSITORY-URL>
cd countify

No package installation is required for the main browser application.

Python 3 is recommended for serving the project locally.

# Run
Option 1 — Windows

Run:

start-server.bat

The application opens at:

http://localhost:8080
Option 2 — Terminal

From the project directory:

python -m http.server 8080

Then open:

http://localhost:8080

For the standalone camera/detector test page:

http://localhost:8080/test-camera.html

Camera permissions must be enabled in the browser.

### Project Documentation
For Software:

# Screenshots (Add at least 3)
<img width="1903" height="1000" alt="tree" src="https://github.com/user-attachments/assets/ec8557bb-be92-47c7-93ab-367ecc37c82f" />
<img width="1855" height="992" alt="rice" src="https://github.com/user-attachments/assets/46867e16-3e15-4a03-a23b-e8ff87fb7e6a" />
<img width="1874" height="1017" alt="random" src="https://github.com/user-attachments/assets/9c5f0568-5f9c-495a-be85-1c3bc5e116b8" />


# Diagrams

flowchart TD
    A[📷 Camera / Image Upload] --> B[🔍 Image Quality Analysis]

    B --> C{🎯 Selected Mode}

    C -->|🌾 Rice| D[Rice Detector]
    C -->|🌿 Leaves| E[Leaf Detector]
    C -->|🧔 Facial Hair| F[FaceMesh + Hair Estimator]
    C -->|💧 Water Drops| G[Motion Tracker]
    C -->|🔘 Custom| H[Similarity Detector]

    D --> I[Detection Filter]
    E --> I
    F --> I
    G --> I
    H --> I

    I --> J[🔢 Count Engine]
    J --> K[🧾 Proof Overlay]
    K --> L[📊 Detection Statistics]
    L --> M[😂 Funny Reaction Engine]
    M --> N[✅ Final Result]
```



# Schematic & Circuit

Countify is primarily a **software-based computer vision project**, so no external electronic circuit or microcontroller is required.

The hardware interaction is limited to the laptop/desktop system, webcam, and speaker.

```text
          ┌───────────────┐
          │    Webcam     │
          └───────┬───────┘
                  │
                  ▼
       ┌─────────────────────┐
       │ Laptop / Computer   │
       │                     │
       │  Countify Web App   │
       │  OpenCV.js          │
       │  MediaPipe          │
       │  Camera API         │
       └─────────┬───────────┘
                 │
          ┌──────┴──────┐
          ▼             ▼
   ┌────────────┐  ┌────────────┐
   │  Display   │  │  Speaker   │
   │ Detection  │  │ Commentary │
   │ + Results  │  │   Output   │
   └────────────┘  └────────────┘
```

*The webcam captures live images or video and sends them to the Countify application running on the computer. The application performs computer-vision processing using OpenCV.js and MediaPipe, displays the detected objects and count on the screen, and optionally generates funny voice commentary through the system speaker.*

## Schematic

```text
Camera Input
     │
     ▼
Browser Camera API
     │
     ▼
Image / Video Frame
     │
     ▼
Computer Vision Processing
(OpenCV.js / MediaPipe)
     │
     ▼
Detection + Filtering
     │
     ▼
Counting Engine
     │
     ├──────────────► Visual Proof Overlay
     │
     └──────────────► Voice Commentary
                           │
                           ▼
                     System Speaker
```

*The schematic shows the complete input-processing-output flow of Countify. Camera frames are processed locally in the browser, passed through the selected computer-vision detector, filtered and counted, and finally presented through visual overlays and optional audio commentary.*

### Hardware Components

* Laptop or desktop computer
* Built-in or USB webcam
* Display/monitor
* Built-in or external speaker

**No Arduino, Raspberry Pi, sensors, breadboard, or additional circuit components are required.**


# Build Photos
![Components](Add photo of your components here)
*List out all components shown*

![Build](Add photos of build process here)
*Explain the build steps*

![Final](Add photo of final product here)
*Explain the final build*

### Project Demo
# Video


*Explain what the video demonstrates*

# Additional Demos
[Add any extra demo materials/links]

## Team Contributions
Aryan V:Overall system design, frontend development, computer-vision integration, feature implementation, testing, documentation, and presentation.
Clive Stiyan D Coth: Project ideation,Computer-vision testing, detector tuning, feature validation, UI support, debugging, documentation, and demo preparation.
---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)




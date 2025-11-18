Vortex – Stopwatch Web Application

Vortex is a front-end stopwatch project built using HTML, CSS, and JavaScript.
It provides precise time tracking with lap recording, keyboard shortcuts, responsive UI design, and a modern animated interface.

Live Demo

https://parthp137.github.io/PRODIGY_WD_02/

Features
Stopwatch Functionality

Start, pause, and reset the timer

Lap time recording

Accurate millisecond tracking

Lap counter

Full persistence using localStorage

Supports continuous timing even if the page is refreshed

Keyboard Shortcuts

Spacebar → Start / Pause

Enter → Create Lap

R → Reset stopwatch

L → Create Lap

UI / UX Enhancements

Large centered display

Neon glow animations

Animated background

Lap drawer with smooth transitions

Dedicated Laps page

Scroll-reactive navigation bar

Active link indicators

Mobile responsive layout

Navigation System

Fixed navbar

Highlighted active section

Mobile hamburger menu

CSV export for laps

Copy laps to clipboard

Tech Stack

Frontend: HTML, CSS, JavaScript
Tools: VS Code, Git, GitHub Pages

Design Overview

The application uses a modern, futuristic theme with:

Animated background

Glass-morphism card design

Dynamic neon accents

Large readable timer

Smooth transitions and ripple effects

Separate pages for Stopwatch and Laps

The layout adapts seamlessly across desktop and mobile screens.

Limitations

No backend integration

Laps stored only in browser localStorage

No multi-device sync

No user login system

Future Enhancements

Cloud sync for laps

Split time mode

Countdown timer mode

Export to JSON / Excel

Sound alerts

Theme toggle (Dark/Light)

Project Structure
├── index.html         # Main stopwatch page
├── laps.html          # Full-screen laps page
├── style.css          # Styling, animations, layout
├── script.js          # Stopwatch logic and interactivity
├── images/            # Backgrounds & assets (optional)
└── README.md

How to Run
1. Clone the repository
git clone https://github.com/parthp137/PRODIGY_WD_02.git
cd PRODIGY_WD_02

2. Open in a browser

Open index.html directly
OR

3. Start a local server (optional)
python -m http.server 8000

4. Visit in browser
http://localhost:8000

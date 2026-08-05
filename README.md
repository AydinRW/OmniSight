# OmniSight
A linear annual desktop calendar built for structured long-term planning, milestone tracking and personalized schedule management.

## Project Overview
OmniSight is an Electron-powered Windows desktop calendar tool designed around a **full-year linear layout** (12 months displayed in one scrollable page), tailored for personal annual stage planning, periodic task tracking, and cross-day event arrangement.

This is currently an **early initial prototype (V1 Alpha)**. Core functional frameworks are implemented, and continuous optimization, feature expansion and experience polishing will be carried out in subsequent iterations.

## Core Design Concept
Different from traditional monthly/weekly calendar apps, OmniSight lays out the entire calendar year on a single scrollable page. It visualizes your whole-year plans intuitively, making it easier to arrange long-term goals, phased study plans, recurring routines and multi-day continuous events.

## Current Implemented Features
### 1. Layout & View System
- Full-year static layout matching the linear calendar template: Months arranged vertically from Jan to Dec, weekdays laid out horizontally in a fixed cycle
- Vertical scrollable single-page year view: Cells auto-expand vertically if multiple tasks exist in one date, no content truncation
- Year switching function: Independent data storage for each year, schedules from different years are isolated without conflict
- Gray disabled placeholder for invalid dates; themed background colors for specified months for visual distinction

### 2. Two Modes to Create Events
#### Mode 1: Drag-to-draw event bars (Draft & Confirm workflow)
1. Click a single cell or drag horizontally across continuous dates to generate a dashed preview bar (for single-day or cross-day events)
2. Hold `Ctrl` + multi-click to create multiple independent single-day draft bars for scattered dates
3. Unconfirmed draft bars will disappear automatically if clicking blank areas or other cells (abandon draft easily)
4. Confirm drafted bars via the sidebar button to fill event name, notes and custom color; preview dashed bars will turn into solid persistent bars
5. Single cell supports vertical stacking of multiple event bars; cross-day events render as a single seamless long bar across relevant cells

#### Mode 2: Scheduled recurring batch events
Create periodic repeating tasks via a dedicated button: fill in event name, start date, end date and repeat interval (days).
The program automatically calculates all matching dates and generates corresponding single-day event bars in batches (e.g., Start: Jan 1, interval: 2 days → valid dates: Jan 1, Jan 4, Jan 7... until exceeding the end date).

### 3. Basic Interaction & Data Persistence
- Hover over any event bar to preview full event name and remarks
- Double-click solid event bars to edit content/color; right-click to delete single or entire cross-day events
- All schedules saved locally as JSON files, separated by year; data remains intact after software restart

## Tech Stack
- Framework: Electron (HTML / CSS / Vanilla JavaScript)
- Runtime: Node.js (local file read/write for data persistence)
- Target Platform: Windows 10 / Windows 11

## Roadmap & Future Iterations
This prototype lays the foundation, and further updates will cover:
1. Visual optimization: Custom calendar themes, tag classification for event categories
2. Reminder system: Desktop pop-up alerts for upcoming scheduled events
3. Data utility: Schedule export (CSV/Markdown), milestone marking & annual review statistics
4. Advanced planning tools: Goal breakdown, phase progress tracking, study plan templates
5. Compatibility: Minor layout adaptation for high-DPI screens, shortcut customization

## Installation (Alpha Version)
1. Clone this repository to your local machine
2. Ensure Node.js is installed on your device
3. Run `npm install` to install dependencies
4. Launch via `npm start` for development, or package to standalone `.exe` for permanent use

## Contribution
Issues, feature suggestions and feedback are welcome via GitHub Issues. As the project evolves from the initial prototype, constructive input will help shape subsequent versions of OmniSight.

## License
MIT License

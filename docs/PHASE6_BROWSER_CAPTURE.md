# Phase 6: Browser Extension & Visual/Desktop Context Architecture

This document describes the Phase 6 implementation of the Browser Extension Context Architecture for Clipad V3.

## Architecture

The Phase 6 architecture unifies external client ingestion (such as browser extensions) with the existing V3 Capture and Intelligence layers, ensuring maximum reuse and security.

### 1. Unified Pipeline
Instead of creating duplicate `browser_captures` or `browser_memory` tables, Phase 6 connects directly to the existing `clipad_v3_captures` system:

**Browser Extension** -> **API Boundary** (`clipadBrowserCaptureService.js`) -> **Capture Service** (`clipadCaptureService.js`) -> **Contextualization** (`clipadContextualizationService.js`) -> **Memory / Entities**

### 2. API Boundary & Privacy (`clipadBrowserCaptureService.js`)
A dedicated service acts as the gateway for browser extension requests. Before calling the central capture service, it enforces strict privacy rules:
- Validates the `BROWSER_CAPTURE_ENABLED` feature flag.
- Checks the user's personal `clipad_v3_capture_settings`.
- Rejects requests if `is_capture_enabled` is false.
- Rejects requests if the target `domain` is in the `excluded_domains` array (e.g., banks, private sites).

### 3. Metadata & Contextualization
Browser captures are ingested as `CAPTURE_TYPE: LINK` and `SOURCE_TYPE: browser_extension`. 
Crucial metadata is appended securely:
- `url`
- `domain`
- `pageTitle`
- `selectedText`
- `captureMode`
- `extensionVersion`

The `clipadBrowserCaptureService.js` formats this metadata into structured text before passing it to the existing `createCapture()` service, meaning the existing AI pipeline handles it perfectly without modification.

### 4. User Interface
A new component, `BrowserCaptureSettings.jsx`, has been injected into the `CaptureInbox.jsx` (which lives in the `/integrations` route). This allows users to:
- Toggle the extension capture entirely ON or OFF.
- Add domains to their "Never Capture" list.
- Remove domains from their exclusion list.

### 5. Security & Isolation
- **Row-Level Security (RLS)**: The `clipad_v3_capture_settings` table ensures users can only read and mutate their own configuration settings.
- **Default Privacy**: All browser captures default to `PERSONAL` visibility. 
- **Future Desktop Context**: The `DESKTOP_CAPTURE_ENABLED` flag is prepared in the system but remains safely dormant/disabled for future implementation phases.

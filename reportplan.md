we need to have a section where we can design tools, something like tools builder, our current tool we need is a accessibility tool that allows the auditor to enter his findings, each finding will be displayed as a raw under a table with "add new" button which opens a popup, the popup contains the following:
Popup Fields:

=============================================================
- Basic Info
Service Name (Dropdown or text)
Issue Title (Short text)
Issue Description (Multiline text)
=============================================================
- Classification
Severity / Priority
High
Medium
Low
=============================================================
Accessibility Categories → dropdown menu, when select any main category title, a sub category appears related to the selected category:

🖼️ Images
Subs:
Missing alt text
Decorative images incorrectly announced
Icons without labels
CAPTCHA without alternatives
Image-based buttons without description

📝 Content
Subs:
Missing or incorrect headings structure (H1–H6)
Poor readability (complex language)
Missing page titles
Incorrect language declaration
Abbreviations not explained

🎨 Color & Contrast
Subs:
Low text contrast
Low contrast for UI components (buttons, borders)
Reliance on color alone (e.g., errors shown only in red)
Placeholder text too light to read
Disabled states not distinguishable

🎮 Keyboard & Navigation
Subs:
Not accessible via keyboard only
Missing or invisible focus indicator
Incorrect tab order
Keyboard traps (can’t exit component)
Missing skip links
Navigation inconsistency

📋 Forms & Inputs
Subs:
Missing labels for inputs
Placeholder used instead of label
Missing error messages
Errors not clearly explained
Required fields not indicated
No input instructions
Incorrect field associations

🎥 Multimedia
Subs:
Missing captions for videos
Missing transcripts for audio
No audio descriptions
Auto-playing media without control
No pause/stop controls

📱 Touch & Mobile
Subs:
Small tap targets
Gesture-only interactions (drag, swipe)
No alternative to complex gestures
Elements too close together
No support for screen orientation
Motion-based interactions without fallback

🧱 Structure & Semantics
Subs:
Missing or incorrect ARIA roles
Improper HTML structure
Screen reader cannot interpret elements
Custom components not accessible
Missing landmarks (nav, main, etc.)
Duplicate IDs or broken relationships

⏱️ Timing & Interaction
Subs:
Time limits without warning
No option to extend time
Auto-refresh without control
Animations that cannot be paused
Moving content (carousels) without controls


🔊 Assistive Technology Compatibility
Subs:
Screen reader issues
Voice control problems
Zoom / magnification issues

🔐 Authentication & Security (WCAG 2.2 focus)
Subs:
Cognitive complexity in login
CAPTCHA barriers
Memory-based challenges (e.g., passwords without aids)

===========================================
- Media Upload
Upload Image / Video
(Optional) Caption for media
=============================================================
- Page URL: TEXT FIELD
=============================================================
Recommendations : text field
=============================================================

Save
Cancel

- each entry can be edited later
- entries are displayed like a table in the tool on the screen
- the entire entries can be exported as a report

each report should contains the following:
- cover page displaying client logo and name, report date
- introduction "it should be generated via AI based on the table entries"
- statistics: this is coming also from AI analysis for the report table, it can display how many issues are and on which categories
- the issues report: the table of issues and findings, the page URL should be clickable and not shown as a link "showing an entire link would not be good, just the link connected to "click here" text, also for the evidence should be specified "video/image" with click here, clicking it would download a video or image "as long as it's inside the PDF"
- our recommendations: a summary of recommendations generated also by AI that is taken from the recommendation column in the report
- end cover

- the generated report pages should not be portrait, landscape so the table can take good size
- under the project there could be many reports
- each report should display the user name who performed the analysis
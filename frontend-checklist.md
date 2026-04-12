# Frontend Task Checklist

## Project Setup
- [ ] Create `public/` directory structure (`css/`, `js/`, `assets/`)
- [ ] Set up `styles.css` with CSS custom properties for the Makerere color scheme
- [ ] Create base HTML template with shared meta tags, favicon, and font imports
- [ ] Add Makerere University logo and branding assets
- [ ] Include `marked.js` for markdown rendering in bot responses
- [ ] Include `DOMPurify` for sanitizing rendered HTML from bot output
- [ ] Set up responsive viewport meta tag and mobile-first media queries

## Landing Page (`index.html`)
- [ ] Hero section with AskMak branding and tagline
- [ ] Brief explanation of what the chatbot does
- [ ] "Try as Guest" button linking to guest chat
- [ ] "Sign In" and "Sign Up" buttons for students
- [ ] Feature highlights section (24/7 support, instant answers, personalized help)
- [ ] Footer with Makerere University attribution and links
- [ ] Responsive layout for mobile, tablet, and desktop
- [ ] Smooth scroll and subtle entrance animations

## Authentication Pages
### Sign Up (`signup.html`)
- [ ] Full name input field
- [ ] Email input restricted to `@students.mak.ac.ug` domain
- [ ] Client-side email domain validation with real-time feedback
- [ ] Password field with visibility toggle
- [ ] Password strength indicator (min 8 chars, mixed case, number)
- [ ] Confirm password field with match validation
- [ ] Terms of service checkbox
- [ ] Submit button with loading spinner state
- [ ] Link to sign-in page for existing users
- [ ] Error message display for server-side validation failures
- [ ] Success state redirecting to email verification notice

### Sign In (`login.html`)
- [ ] Email input field
- [ ] Password field with visibility toggle
- [ ] "Forgot password?" link (can be a placeholder for v1)
- [ ] Submit button with loading state
- [ ] Error display for invalid credentials
- [ ] Link to sign-up page for new users
- [ ] Redirect to chat page on successful login

### Email Verification (`verify.html`)
- [ ] Display message asking user to check their university email
- [ ] Input field for verification code
- [ ] Resend code button with cooldown timer
- [ ] Success redirect to chat page

## Chat Interface (`chat.html`)
### Layout
- [ ] Collapsible sidebar for chat history (slides in on mobile)
- [ ] Main chat area taking remaining width
- [ ] Fixed header with AskMak logo, user menu, and sidebar toggle
- [ ] Fixed bottom input area that stays above the mobile keyboard

### Sidebar
- [ ] "New Chat" button at the top
- [ ] List of previous chats with titles and timestamps
- [ ] Chat items grouped by "Today", "Yesterday", "Previous 7 Days", "Older"
- [ ] Click to load a previous chat
- [ ] Right-click or three-dot menu on each chat: Rename, Delete
- [ ] Search bar to filter/search across chat history (authenticated users only)
- [ ] Scroll loading for long chat lists
- [ ] Visual indicator for the currently active chat
- [ ] Guest mode: show chats from cookie session with "Sign up to keep history" banner

### Chat Area
- [ ] Welcome message on new chat with quick action buttons below it
- [ ] Quick action buttons: "Fee Structure", "Academic Calendar", "IT Support", "Contacts", "Admissions"
- [ ] User messages aligned right with Makerere red accent
- [ ] Bot messages aligned left with light gray background
- [ ] Markdown rendering in bot messages (headings, lists, bold, links, tables)
- [ ] Clickable source links at the bottom of bot responses when RAG sources are used
- [ ] Typing indicator (animated dots) while bot is generating
- [ ] Token-by-token streaming via SSE for the "live typing" effect
- [ ] Thumbs up / thumbs down feedback buttons on each bot message
- [ ] "Escalate to support" button when bot indicates low confidence
- [ ] Auto-scroll to latest message with "scroll to bottom" button when scrolled up
- [ ] Timestamps on messages (hover or inline)
- [ ] Empty state illustration for new chats
- [ ] Copy button on bot messages

### Image Display in Chat
- [ ] Render inline images in bot responses (campus maps, diagrams, referenced knowledge base images)
- [ ] Images load from presigned MinIO URLs
- [ ] Lightbox/modal on image click for full-size viewing
- [ ] Fallback placeholder if image fails to load
- [ ] Display image thumbnails attached to user messages (upload confirmations)

### Input Area
- [ ] Multi-line text input that grows up to 4 lines
- [ ] Send button (disabled when input is empty, enabled when text is present)
- [ ] Enter to send, Shift+Enter for new line
- [ ] Character limit indicator (e.g., 2000 chars)
- [ ] Disabled state with message while bot is responding
- [ ] Image attachment button (paperclip or image icon)
- [ ] File picker filtered to image types (jpg, png, gif, webp)
- [ ] Image preview thumbnail in the input area before sending
- [ ] Remove/cancel button on the image preview
- [ ] Drag-and-drop image support on the chat area
- [ ] Paste image from clipboard support (Ctrl+V / Cmd+V)
- [ ] Upload progress indicator for large images
- [ ] File size validation (max 10MB) with error message

### User Menu
- [ ] User avatar/initials dropdown in the header
- [ ] Menu items: Settings, Memory Management, Dark Mode toggle, Sign Out
- [ ] Guest mode: show "Sign In" and "Sign Up" instead

## Settings Page / Modal
- [ ] Display user profile info (name, email)
- [ ] Change password form
- [ ] View and delete stored memories (personalization data)
- [ ] Chat export option (download as text file)
- [ ] Delete account option with confirmation
- [ ] Dark mode preference toggle (persisted)

## Dark Mode
- [ ] CSS custom properties that swap for dark mode
- [ ] Dark background using `#231F20`, light text
- [ ] Accent colors (red `#ed1c24`, gold `#d2ab67`) remain vibrant on dark surfaces
- [ ] Bot message bubbles use a darker gray instead of `#cdcccb`
- [ ] Toggle stored in localStorage and synced with user preference if authenticated
- [ ] Respect `prefers-color-scheme` system setting as default

## Guest Mode Specifics
- [ ] Generate and store guest UUID in a signed cookie on first visit
- [ ] Load chat history from cookie-linked chats
- [ ] Show persistent banner: "Sign up with your Mak email to save history and unlock personalization"
- [ ] Lower rate limit feedback: show "You've reached the guest limit. Sign up for more." message
- [ ] On signup, prompt to merge guest chats into the new account

## Responsive Design
- [ ] Mobile (< 768px): full-screen chat, sidebar as overlay drawer, hamburger toggle
- [ ] Tablet (768px - 1024px): narrower sidebar, adjusted spacing
- [ ] Desktop (> 1024px): persistent sidebar, comfortable spacing
- [ ] Touch-friendly tap targets (min 44px)
- [ ] No horizontal scroll on any viewport
- [ ] Test on common devices: iPhone SE, iPhone 14, Samsung Galaxy, iPad

## Accessibility
- [ ] Semantic HTML (`nav`, `main`, `aside`, `header`, `footer`, `button`)
- [ ] ARIA labels on icon-only buttons (send, menu, close, attach image)
- [ ] Focus management: trap focus in modals, return focus on close
- [ ] Keyboard navigation: Tab through interactive elements, Escape to close modals/sidebar
- [ ] Sufficient color contrast ratios (WCAG AA minimum)
- [ ] Screen reader friendly chat message flow
- [ ] Alt text on all images (bot-provided images, uploaded images, reference images)
- [ ] Skip-to-content link

## Error Handling & Edge Cases
- [ ] Network offline banner with retry option
- [ ] Graceful handling of SSE connection drops (auto-reconnect)
- [ ] Error message display when API calls fail
- [ ] Loading skeletons for chat history and messages while fetching
- [ ] Empty state for no search results
- [ ] Confirmation dialogs for destructive actions (delete chat, delete account)
- [ ] Session expiry handling: redirect to login with "session expired" message
- [ ] Image upload failure handling with retry option
- [ ] Expired presigned URL handling (re-fetch URL if image fails to load)

## JavaScript Modules
- [ ] `auth.js` — login, signup, logout, token refresh, email validation
- [ ] `chat.js` — message sending, SSE streaming, chat CRUD, scroll behavior
- [ ] `sidebar.js` — chat list rendering, grouping, search, rename, delete
- [ ] `theme.js` — dark mode toggle, system preference detection, persistence
- [ ] `api.js` — centralized fetch wrapper with auth headers, error handling, base URL
- [ ] `upload.js` — image attachment handling, drag-and-drop, clipboard paste, file validation, upload to backend
- [ ] `utils.js` — markdown rendering, sanitization, time formatting, debounce

## Performance
- [ ] Lazy load older messages on scroll up (pagination)
- [ ] Debounce search input in sidebar
- [ ] Minimize DOM updates during SSE streaming (batch or requestAnimationFrame)
- [ ] Compress and optimize image assets
- [ ] Use `defer` on script tags
- [ ] Cache static assets with appropriate headers (handled by Express static middleware)
- [ ] Lazy load images in chat history (use `loading="lazy"` on img tags)
- [ ] Client-side image compression before upload (resize to max 2048px, compress quality)

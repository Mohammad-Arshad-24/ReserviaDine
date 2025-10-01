# Design Guidelines: Restaurant Pre-Order System with Location Tracking

## Design Approach
**Reference-Based: Food Delivery & Modern SaaS Hybrid**
Drawing inspiration from DoorDash's clean food presentation, Uber Eats' visual hierarchy, and Linear's refined typography/spacing. This creates a trustworthy, appetite-appealing experience while maintaining the precision needed for location tracking and payment features.

**Key Design Principles:**
- Visual appetite appeal through high-quality food imagery
- Trust-building through clear payment states and order tracking
- Spatial clarity for location-based features
- Effortless mode switching between light/dark themes

## Color Palette

### Light Mode (Bright & Pleasant)
- **Primary:** 25 85% 95% (Soft cream/off-white background)
- **Surface:** 0 0% 100% (Pure white cards)
- **Brand Primary:** 15 85% 55% (Warm coral-orange for CTAs, food-friendly)
- **Brand Secondary:** 200 75% 45% (Teal for secondary actions)
- **Text Primary:** 220 15% 20% (Deep charcoal)
- **Text Secondary:** 220 10% 45% (Medium gray)
- **Success:** 145 65% 45% (Fresh green for confirmations)
- **Border:** 220 15% 88% (Subtle dividers)

### Dark Mode (Dark Blue & Gradient Purple)
- **Primary Background:** 240 35% 12% (Deep blue-black)
- **Surface:** 245 30% 18% (Dark blue cards)
- **Gradient Overlay:** Linear from 260 80% 35% to 280 70% 50% (Purple-to-violet, use sparingly on hero/CTAs)
- **Brand Primary:** 15 90% 60% (Bright coral, stands out in dark)
- **Brand Secondary:** 280 65% 60% (Vibrant purple accent)
- **Text Primary:** 220 20% 95% (Soft white)
- **Text Secondary:** 220 15% 70% (Light gray)
- **Success:** 145 55% 55% (Bright green)
- **Border:** 240 20% 25% (Subtle blue-gray dividers)

## Typography
**Font Stack:** 
- Primary: 'Inter' (Google Fonts) - Clean, modern, excellent readability
- Accent: 'Poppins' (Google Fonts) - For headings, adds personality

**Scale:**
- Display (Hero): 48px/56px, Poppins SemiBold
- H1: 36px/44px, Poppins SemiBold
- H2: 28px/36px, Poppins Medium
- H3: 20px/28px, Inter SemiBold
- Body: 16px/24px, Inter Regular
- Small: 14px/20px, Inter Regular
- Caption: 12px/16px, Inter Medium

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 8, 12, 16, 24
- Micro spacing (icons, badges): 2
- Component internal: 4, 8
- Section padding: 12, 16 (mobile), 24 (desktop)
- Page margins: 16, 24

**Grid System:**
- Mobile: Single column, 16px gutters
- Tablet: 2 columns for menu items, 16px gaps
- Desktop: 3-4 columns for menu grid, 24px gaps
- Max content width: 1280px (max-w-7xl)

## Component Library

### Navigation
- **Header:** Sticky top nav with logo, location indicator, cart icon (with item count badge), profile/auth
- **Mobile:** Hamburger menu with slide-in drawer
- **Mode Toggle:** Sun/moon icon button in header, smooth transition between themes

### Authentication
- **Login/Signup Card:** Centered modal-style card (max-w-md)
- Replit Auth buttons with provider icons (Google, GitHub, Email)
- Split view: Image/illustration on left (hidden mobile), form on right
- Gradient accent in dark mode on card background edge

### Menu & Food Display
- **Menu Cards:** Image-first design, rounded corners (rounded-xl), overlay gradient for text readability
- Card structure: Food image (aspect-ratio-4/3), dish name, description (2 lines max), price prominent, "Add to Cart" button
- **Grid Layout:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-6
- Hover state: Subtle lift (shadow-lg), scale-102

### Cart & Checkout
- **Cart Sidebar:** Slide-in from right, fixed positioning
- Item list with quantity controls (+/- buttons), remove option
- Subtotal/Deposit/Balance breakdown clearly separated
- Prominent "Confirm Pre-Order" CTA button

### Payment Interface
- Stripe embedded checkout in modal or dedicated page
- Trust indicators: Lock icon, "Secure Payment" badge
- Amount breakdown before payment: Advance deposit (₹X) + Balance due at pickup (₹Y)

### Location Tracking
- **Map Component:** Small map preview showing user location and restaurant
- **Distance Indicator:** Large, clear display "X.X km away" with update animation
- **Arrival Status:** Progress bar or circular progress showing proximity percentage
- Alert banner when approaching: Bright, gradient background (purple in dark mode), "Almost there! We're preparing your order"

### Order Status
- **Status Cards:** Timeline/stepper design showing: Payment Confirmed → Preparing → Ready for Pickup
- Real-time updates with subtle pulse animation on active step
- Estimated ready time displayed prominently
- "Your location is being tracked" indicator with GPS icon

### Dashboard
- **Order History:** Card-based list with thumbnail images, order date, total, status badge
- **Active Order:** Hero card at top with live tracking, larger emphasis

## Page-Specific Layouts

### Landing/Home Page
- **Hero:** Full-width image of delicious food with gradient overlay (purple in dark mode), centered headline "Skip the Wait, Pre-Order & Go", subheadline explaining the concept, "Get Started" CTA
- **How It Works:** 3-step visual explanation with icons (Order & Pay → We Track → Pick Up)
- **Featured Restaurants:** Carousel or grid of partner restaurants with images
- **App Features:** 2-column layout highlighting location tracking, advance payment benefits
- **Trust Section:** Small payment/security badges

### Restaurant Menu Page
- **Restaurant Header:** Banner image, name, cuisine type, estimated prep time
- **Category Tabs:** Sticky horizontal scroll tabs (Appetizers, Mains, Desserts, Drinks)
- **Menu Grid:** As described in component library
- **Sticky Cart Summary:** Bottom bar (mobile) or right sidebar (desktop) showing item count and subtotal

### Order Tracking Page
- **Live Map:** Top half of screen showing user moving toward restaurant
- **Order Details:** Bottom half with status timeline, items ordered, amounts
- **Arrival Alert:** Full-width banner replacing map when within geofence

## Images
- **Hero Image:** High-quality food photography with shallow depth of field, warm tones
- **Menu Items:** Each dish needs professional food photo, consistent lighting and styling
- **How It Works Section:** Iconography with subtle illustrations showing phone with location pin, chef preparing food, happy customer picking up
- **Restaurant Cards:** Storefront or signature dish photos

## Interactions & Animations
- **Mode Toggle:** Smooth color transitions (300ms ease), no layout shift
- **Location Updates:** Gentle pulse on distance indicator when updating
- **Cart Badge:** Pop animation when item count changes
- **Status Changes:** Fade-in of new status step with check mark animation
- Minimize other animations to maintain performance with location tracking
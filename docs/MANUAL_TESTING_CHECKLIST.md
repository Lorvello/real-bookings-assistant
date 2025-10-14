# 📋 Pre-Launch Manual Testing Checklist

## Visual & Responsive Testing

### Mobile Devices
- [ ] Test on iPhone (375px width)
- [ ] Test on Android phone (360px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1024px, 1440px)
- [ ] Landscape orientation works
- [ ] All buttons are tappable (min 44x44px)

### Design Consistency
- [ ] Dark mode toggle works across all pages
- [ ] Forms have proper validation feedback
- [ ] Loading states visible during API calls
- [ ] Error messages are user-friendly (Dutch)
- [ ] Success toasts appear and auto-dismiss
- [ ] Modals close with ESC key and X button
- [ ] Dropdowns render correctly and don't overflow
- [ ] Date picker shows correct timezone
- [ ] Calendar grid aligns properly

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter key submits forms
- [ ] ESC key closes modals
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps

### Screen Reader Support
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have descriptive text
- [ ] ARIA labels on icons
- [ ] Heading hierarchy correct (H1 → H2 → H3)

### Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Links distinguishable from text
- [ ] Error states use color + icon
- [ ] Focus states don't rely on color alone

## Browser Compatibility

- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)
- [ ] Mobile Safari (iOS 16+)
- [ ] Chrome Mobile (Android 12+)

## Performance Testing

- [ ] Page load time < 3 seconds (3G network)
- [ ] Time to interactive < 5 seconds
- [ ] No console errors or warnings
- [ ] Run app for 5 minutes (no memory leaks)
- [ ] Images lazy load below fold
- [ ] Animations run at 60 FPS
- [ ] Bundle size < 500KB (gzipped)

## Business Logic Validation

### Booking Flow
- [ ] Customer can view available time slots
- [ ] Customer can create booking with valid data
- [ ] Confirmation email sent immediately
- [ ] Confirmation page shows booking details
- [ ] Calendar owner receives notification

### Calendar Management
- [ ] Owner can create calendar
- [ ] Calendar URL is shareable
- [ ] Service types display correctly
- [ ] Availability settings save properly
- [ ] Blocked time shows in calendar

### WhatsApp Integration
- [ ] QR code scannable with WhatsApp
- [ ] Messages appear in conversation view
- [ ] Bot responds to keywords
- [ ] Contact data syncs correctly

### Payment Flow
- [ ] Stripe checkout opens in new window
- [ ] Test card (4242...) processes successfully
- [ ] Payment confirmation updates booking status
- [ ] Receipt email sent to customer
- [ ] Refund flow works

### Admin Dashboard
- [ ] All bookings load (test with 100+)
- [ ] Search/filter works
- [ ] Export to CSV downloads correctly
- [ ] Real-time updates work (test with 2 browsers)
- [ ] Charts and graphs render

## Security Checks

- [ ] Cannot access other users' data
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection enabled
- [ ] Rate limiting works (test rapid requests)
- [ ] Session expires after timeout
- [ ] Logout clears all auth data

## Data Integrity

- [ ] Booking times stored in UTC
- [ ] Timezone conversions accurate
- [ ] DST transitions handled correctly
- [ ] No duplicate bookings possible
- [ ] Cancellations update status correctly
- [ ] Deleted calendars don't break app

---

**Test Completion Date:** __________  
**Tested By:** __________  
**Issues Found:** __________  
**Sign-off:** __________

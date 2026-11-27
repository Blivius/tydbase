# Accessibility Review: Caught-Write Demo

## Overview
This document provides an accessibility review of the caught-write demo component at `apps/site/src/components/caught-write.tsx`. The review focuses on keyboard navigation, screen reader announcements, and responsive behavior at 200% zoom and 390px width.

## Evaluation Criteria
- Keyboard-only use and focus order after actions (Approve, Reject, Run it again)
- Screen reader announcements (status region, diff table caption, "becomes" indicators)
- Responsive behavior at 200% zoom and 390px screen width

## Findings

### 1. Keyboard Navigation

#### Strengths
- All interactive elements (buttons) are keyboard accessible
- Buttons have appropriate disabled states when not applicable
- The component follows logical tab order

#### Issues
- **Focus Management**: After clicking Approve, Reject, or "Run it again", focus returns to the top of the component. Users must navigate back to where they were to continue interacting.
- **Missing Focus Indicators**: While buttons have visible focus styles, the focus indicator could be more prominent for keyboard users.
- **"Run it again" Button**: This button appears after an outcome but doesn't receive focus automatically, requiring users to navigate to it.

#### Recommendations
1. Implement proper focus management after actions:
   - After Approve/Reject, return focus to the "Run it again" button
   - After "Run it again", return focus to the first action button
2. Enhance focus visibility with more distinct styles
3. Consider adding a "skip to main content" link at the top of the component

### 2. Screen Reader Announcements

#### Strengths
- Status region uses `role="status"` with `aria-live="polite"`
- Table has a proper caption with `sr-only` class
- Changes in diff table include "becomes" text in `sr-only` span

#### Issues
- **Status Region**: The status region announces the same information as the visible text, which is redundant for screen reader users.
- **Table Caption**: The caption is hidden (`sr-only`), which means screen reader users don't know what the table represents without navigating to it.
- **"Becomes" Text**: The "becomes" text is only visible to screen readers, but the visual arrow (→) is hidden. This creates an inconsistent experience.

#### Recommendations
1. Consider making the status region visible to sighted users but still accessible to screen readers
2. Make the table caption visible or provide an alternative way to describe the table
3. Consider making the "→" symbol visible to all users while keeping the "becomes" text for screen readers

### 3. Responsive Behavior

#### Strengths
- The component uses responsive classes (hidden/sm:table-cell)
- The table has horizontal scrolling on small screens
- Text scales appropriately at 200% zoom

#### Issues
- **390px Width**: At this narrow width, the "Total" column is hidden (as intended), but the remaining columns become very cramped.
- **Button Layout**: The action buttons (Approve/Reject) stack vertically on small screens, which is good for mobile but may be unexpected at 390px.
- **Horizontal Scrolling**: The table requires horizontal scrolling at narrow widths, which can be challenging for some users.

#### Recommendations
1. At 390px width, consider further optimizing the layout:
   - Reduce padding and spacing
   - Possibly make the "Order" column narrower
2. Ensure horizontal scrolling is smooth and accessible
3. Test with various zoom levels to ensure text remains readable

## Summary of Recommendations

### Priority 1 (Critical)
1. Implement proper focus management after user actions
2. Ensure all interactive elements are keyboard accessible

### Priority 2 (High)
1. Improve screen reader announcements for status and table information
2. Make the "becomes" text consistent between visual and screen reader experiences

### Priority 3 (Medium)
1. Optimize layout for 390px width
2. Enhance horizontal scrolling experience

## Testing Recommendations

1. **Keyboard Testing**:
   - Tab through all interactive elements
   - Test after each action (Approve, Reject, Run it again)
   - Verify focus is visible and logical

2. **Screen Reader Testing**:
   - Use NVDA, JAWS, and VoiceOver
   - Test status announcements
   - Verify table navigation
   - Check "becomes" text announcements

3. **Responsive Testing**:
   - Test at 390px width with 200% zoom
   - Test horizontal scrolling
   - Verify text remains readable

## Conclusion
The caught-write demo has a solid foundation for accessibility but can be improved with better focus management and screen reader support. The responsive design works well at most sizes but could be optimized for the specific 390px width scenario.

## Additional Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Keyboard Accessibility](https://www.w3.org/WAI/WCAG21/techniques/keyboard/)
- [Screen Reader Testing](https://www.deque.com/blog/screen-reader-testing/)

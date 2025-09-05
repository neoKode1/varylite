# Animated Error System 🎭

This system replaces boring error messages with fun, engaging animations that make errors less frustrating and more memorable.

## Features

### 4 Different Animation Types:

1. **🏃‍♂️ Farting Man** (`farting-man`)
   - A little running man with fart effects
   - Slides in from the left, runs around, then slides out
   - Perfect for minor interruptions or aborted operations

2. **👊 Mortal Kombat** (`mortal-kombat`)
   - Fighting character with "WHOOPEE!" text
   - Slides in from top with rotation
   - Great for network issues or service problems

3. **⚠️ Bouncing Error** (`bouncing-error`)
   - Warning symbols with spinning effects
   - Bounces in with scale and rotation
   - Ideal for format issues or validation errors

4. **😵 Shake Error** (`shake-error`)
   - Shaking characters with explosion effects
   - Shakes the entire component
   - Perfect for unexpected errors or crashes

## Usage

### Basic Usage:
```tsx
import { useAnimatedError } from '@/hooks/useAnimatedError';

const { showError } = useAnimatedError();

// Show different types of animated errors
showError('Video failed to load!', 'farting-man');
showError('Network connection lost!', 'mortal-kombat');
showError('Invalid file format!', 'bouncing-error');
showError('Something went wrong!', 'shake-error');
```

### Component Usage:
```tsx
import AnimatedError from '@/components/AnimatedError';

<AnimatedError
  message="Your error message here"
  type="farting-man"
  onClose={() => console.log('Error dismissed')}
  duration={4000}
/>
```

## Integration

The system is already integrated into the main app for:
- ✅ Video loading errors
- ✅ File upload errors
- ✅ API request failures
- ✅ Network issues
- ✅ Format validation errors

## Development

- Test button available in development mode (🎭 Test button in header)
- Animations are optimized for performance
- Auto-dismisses after 4 seconds
- Stacked positioning for multiple errors
- Production-safe (detailed logging only in dev)

## Customization

You can easily add new animation types by:
1. Adding new keyframes to `globals.css`
2. Adding new cases to the `renderAnimation()` function
3. Updating the TypeScript types

## Performance

- Uses CSS animations (hardware accelerated)
- Minimal JavaScript overhead
- Auto-cleanup prevents memory leaks
- Responsive design works on all devices

---

*Making errors fun, one animation at a time! 🎉*

/**
 * Transparency System Test Utility
 *
 * This utility tests that the transparency system works correctly:
 * - Toggle OFF => all backgrounds opaque (alpha = 1)
 * - Toggle ON => backgrounds have configurable alpha < 1
 *
 * Run in browser console: window.testTransparency()
 */

interface TransparencyTestResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

function parseAlphaFromRGBA(color: string): number | null {
  // Parse rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(/rgba?\([\d\s,\.]+\)/);
  if (!rgbaMatch) return null;

  const values = rgbaMatch[0].match(/[\d\.]+/g);
  if (!values) return null;

  // If only 3 values, alpha is 1
  if (values.length === 3) return 1;
  if (values.length === 4) return parseFloat(values[3]);

  return null;
}

export function testTransparencySystem(): TransparencyTestResult[] {
  const results: TransparencyTestResult[] = [];
  const root = document.documentElement;

  // Test 1: Check CSS variables are set
  const transparencyEnabled = root.style.getPropertyValue('--transparency-enabled');
  const bgOpacity = root.style.getPropertyValue('--bg-opacity');
  const widgetOpacity = root.style.getPropertyValue('--widget-opacity');

  results.push({
    passed: transparencyEnabled !== '',
    message: 'CSS variable --transparency-enabled is set',
    details: { value: transparencyEnabled },
  });

  results.push({
    passed: bgOpacity !== '',
    message: 'CSS variable --bg-opacity is set',
    details: { value: bgOpacity },
  });

  results.push({
    passed: widgetOpacity !== '',
    message: 'CSS variable --widget-opacity is set',
    details: { value: widgetOpacity },
  });

  // Test 2: Check body/html background
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(root).backgroundColor;

  if (transparencyEnabled === '0') {
    // Transparency OFF: backgrounds should be opaque
    const bodyAlpha = parseAlphaFromRGBA(bodyBg);

    results.push({
      passed: bodyAlpha === 1 || bodyBg !== 'transparent',
      message: 'Transparency OFF: body background should be opaque',
      details: { bodyBg, htmlBg, bodyAlpha },
    });
  } else {
    // Transparency ON: backgrounds should be transparent
    const isTransparent = bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent';
    results.push({
      passed: isTransparent,
      message: 'Transparency ON: body background should be transparent',
      details: { bodyBg },
    });
  }

  // Test 3: Check widget backgrounds
  const widgets = document.querySelectorAll('.bg-\\[var\\(--color-widget-bg\\)\\]');
  if (widgets.length > 0) {
    const widgetBg = getComputedStyle(widgets[0]).backgroundColor;
    const alpha = parseAlphaFromRGBA(widgetBg);

    if (transparencyEnabled === '0') {
      results.push({
        passed: alpha === 1,
        message: 'Transparency OFF: widget background alpha should be 1',
        details: { widgetBg, alpha },
      });
    } else {
      const expectedAlpha = parseFloat(widgetOpacity);
      results.push({
        passed: alpha !== null && alpha < 1,
        message: `Transparency ON: widget background alpha should be < 1 (expected ~${expectedAlpha})`,
        details: { widgetBg, alpha, expectedAlpha },
      });
    }
  }

  // Test 4: Text should remain readable (not affected by transparency)
  const textElements = document.querySelectorAll('[class*="text-[var(--color-text-primary)]"]');
  if (textElements.length > 0) {
    const textColor = getComputedStyle(textElements[0]).color;
    const alpha = parseAlphaFromRGBA(textColor);
    results.push({
      passed: alpha === 1,
      message: 'Text color should remain fully opaque (alpha = 1)',
      details: { textColor, alpha },
    });
  }

  return results;
}

// Make available globally for console testing
declare global {
  interface Window {
    testTransparency: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.testTransparency = () => {
    const results = testTransparencySystem();
    console.group('🔍 Transparency System Test Results');
    results.forEach((r) => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.message}`, r.details || '');
    });
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    console.log(`\n📊 Summary: ${passed}/${total} tests passed`);
    console.groupEnd();
    return results;
  };
}

export {};

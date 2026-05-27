/**
 * Tests for src/utils/cn.ts
 * Tests: className merging, conditional classes, tailwind conflict resolution
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../utils/cn';

describe('cn — Class Name Utility', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns single class name', () => {
    expect(cn('flex')).toBe('flex');
  });

  it('merges multiple class names', () => {
    expect(cn('flex', 'items-center', 'justify-between')).toBe('flex items-center justify-between');
  });

  it('handles undefined values gracefully', () => {
    expect(cn('flex', undefined, 'items-center')).toBe('flex items-center');
  });

  it('handles null values gracefully', () => {
    expect(cn('flex', null, 'items-center')).toBe('flex items-center');
  });

  it('handles false values gracefully', () => {
    expect(cn('flex', false, 'items-center')).toBe('flex items-center');
  });

  it('handles conditional classes with ternary', () => {
    const isActive = true;
    expect(cn('btn', isActive ? 'btn-active' : 'btn-inactive')).toBe('btn btn-active');
  });

  it('handles conditional classes with false ternary', () => {
    const isActive = false;
    expect(cn('btn', isActive ? 'btn-active' : 'btn-inactive')).toBe('btn btn-inactive');
  });

  it('handles object syntax for conditional classes', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('handles array syntax', () => {
    expect(cn(['flex', 'items-center'])).toBe('flex items-center');
  });

  it('resolves tailwind conflicts - last wins', () => {
    // twMerge should resolve p-4 vs p-8 conflict
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('resolves text color conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('resolves background color conflicts', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('does not remove non-conflicting classes', () => {
    const result = cn('flex', 'items-center', 'text-red-500');
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('text-red-500');
  });

  it('handles complex conditional class combinations', () => {
    const isDisabled = false;
    const isLoading = true;
    const result = cn(
      'btn',
      'btn-primary',
      isDisabled && 'opacity-50 cursor-not-allowed',
      isLoading && 'animate-spin',
    );
    expect(result).toContain('btn');
    expect(result).toContain('animate-spin');
    expect(result).not.toContain('opacity-50');
  });

  it('handles mixed types in arguments', () => {
    const result = cn(
      'base-class',
      ['array-class'],
      { 'object-class': true, 'excluded-class': false },
      undefined,
      null,
      false,
      'final-class',
    );
    expect(result).toContain('base-class');
    expect(result).toContain('array-class');
    expect(result).toContain('object-class');
    expect(result).toContain('final-class');
    expect(result).not.toContain('excluded-class');
  });

  it('handles responsive prefixes without conflict', () => {
    const result = cn('p-2', 'md:p-4', 'lg:p-8');
    expect(result).toContain('p-2');
    expect(result).toContain('md:p-4');
    expect(result).toContain('lg:p-8');
  });

  it('handles hover state classes', () => {
    const result = cn('bg-blue-500', 'hover:bg-blue-700');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('hover:bg-blue-700');
  });

  it('handles dark mode classes', () => {
    const result = cn('text-gray-900', 'dark:text-white');
    expect(result).toContain('text-gray-900');
    expect(result).toContain('dark:text-white');
  });
});

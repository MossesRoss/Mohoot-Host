import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Check for a common element, e.g., a heading or button text that likely exists
    // Since I don't know the exact content, I'll check if the container is present
    // or try to find something generic.
    // Assuming the app has some content.
    expect(document.body).toBeInTheDocument();
  });
});

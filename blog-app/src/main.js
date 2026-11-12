import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './BlogApp.js';

const root = document.getElementById('blog-root');
if (!root) throw new Error('Apokolips blog root was not found.');

class BlogErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Apokolips blog error:', error); }
  render() {
    if (this.state.failed) return React.createElement('main', { className: 'blog-error' },
      React.createElement('p', null, 'APOKOLIPS BLOG'),
      React.createElement('h1', null, 'The journal could not be loaded.'),
      React.createElement('p', null, 'Refresh the page to try again.'),
      React.createElement('a', { href: 'index.html' }, 'Return to homepage ↗')
    );
    return this.props.children;
  }
}

createRoot(root).render(React.createElement(BlogErrorBoundary, null, React.createElement(App)));

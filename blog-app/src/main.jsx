import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const mount = document.getElementById('blog-root');
if (!mount) throw new Error('Apokolips blog mount point is missing.');

class BlogErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Apokolips blog render failed:', error); }
  render() {
    if (this.state.failed) return <main className="blog-fatal"><p>APOKOLIPS / BLOG</p><h1>The journal could not be loaded.</h1><p>Please refresh the page. Your shared comments and reactions remain saved.</p><a href="./index.html">Return to Apokolips</a></main>;
    return this.props.children;
  }
}

createRoot(mount).render(<BlogErrorBoundary><App /></BlogErrorBoundary>);

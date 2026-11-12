import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../style.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Apokolips root element was not found.');

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error('Apokolips homepage render error:', error); }
  render() {
    if (this.state.hasError) return <main style={{minHeight:'100vh',background:'#050609',color:'#f2f4f8',padding:'12vh 8vw',fontFamily:'Arial,sans-serif'}}><p style={{color:'#8bd8ed'}}>APOKOLIPS</p><h1>Ideas become something real.</h1><p>The homepage encountered an error. Please refresh the page.</p><a style={{color:'#9ec4ff'}} href="./My-project.html">Open projects ↗</a></main>;
    return this.props.children;
  }
}

createRoot(rootElement).render(<AppErrorBoundary><App /></AppErrorBoundary>);

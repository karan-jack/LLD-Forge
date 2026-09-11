import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProblemList from './pages/ProblemList';
import ProblemDetail from './pages/ProblemDetail';
import Attempt from './pages/Attempt';
import Feedback from './pages/Feedback';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" className="logo">LLD Practice Platform</Link>
          <nav className="header-nav">
            <Link to="/" className="nav-link">Problems</Link>
            <Link to="/history" className="nav-link">Attempt History</Link>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ProblemList />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/attempt/:id" element={<Attempt />} />
            <Route path="/feedback/:id" element={<Feedback />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateSession from './components/CreateSession';
import SessionHost from './components/SessionHost';
import JoinSession from './components/JoinSession';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<CreateSession />} />
          <Route path="/session/:id" element={<SessionHost />} />
          <Route path="/join/:id" element={<JoinSession />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

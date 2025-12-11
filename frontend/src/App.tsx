import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateSession from './components/CreateSession';
import SessionHost from './components/SessionHost';
import JoinSession from './components/JoinSession';

function App() {
  try {
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
  } catch (error) {
    console.error('App error:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading App</h1>
          <p className="text-gray-700 mb-4">Please check the console for details.</p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {String(error)}
          </pre>
        </div>
      </div>
    );
  }
}

export default App;

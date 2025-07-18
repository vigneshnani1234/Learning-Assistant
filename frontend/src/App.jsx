import { useState } from 'react'; // <-- CRITICAL: Make sure useState is imported
import './App.css';
import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Login from './components/Login.jsx';
import Home from './components/Home.jsx';
import Query from './components/Query.jsx';
import Answer from './components/Answer.jsx';

function App() {
  // CRITICAL: These three lines MUST be here, at the top of the App function.
  // This is where researchResult, setResearchResult, etc. are created.
  const [researchResult, setResearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div>
      <Routes>
        <Route path='/' element={
          <>
            <SignedIn><Home /></SignedIn>
            <SignedOut><Login /></SignedOut>
          </>
        } />
        
        {/* Here we PASS the state and setters as props */}
        <Route 
          path='/query' 
          element={
            <Query 
              setResearchResult={setResearchResult} 
              setIsLoading={setIsLoading}
              isLoading={isLoading}
              setError={setError}
              error={error}
            />
          } 
        />
        
        {/* Here we PASS the result data as a prop */}
        <Route 
          path='/answer' 
          element={
            <Answer 
              result={researchResult} 
              isLoading={isLoading} 
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
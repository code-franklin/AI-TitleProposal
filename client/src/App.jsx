import React from 'react';
import './App.css';

import Search from './search'
import Login from './login'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {


  return (
    <div className="App">
      <Router>

        <Routes>

       
          <Route path="/" element={<Login/>} />
          <Route path="/Search" element={<Search/>} />

        </Routes>
    </Router>
    </div>
  );
}


export default App;
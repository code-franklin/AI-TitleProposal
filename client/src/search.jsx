import React, { useState } from 'react';
import axios from 'axios';

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [panelists, setPanelists] = useState([]);
  
  const [topAdvisors, setTopAdvisors] = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  
  
  const user = JSON.parse(localStorage.getItem("user"));

  const handleSearch = async () => {
    try {
      const response = await fetch("http://localhost:5000/createProposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id,
          proposalTitle: title,
          proposalText: proposal,
        }),
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          setTopAdvisors(data.results); // Setting top advisors from backend response
          setTitle('');  // Clear title field if needed
          setProposal('');  // Clear proposal field if needed
          console.log("Proposal submitted successfully!", data);
        } else {
          setError(data.message || "No advisors found matching specializations.");
        }
      } else {
        setError("Error submitting proposal.");
      }
    } catch (error) {
      console.error("Error submitting proposal:", error.message);
      setError("An error occurred while submitting the proposal.");
    }
  };
  

  const handleSearch1 = async () => {
    try {
      const words = query.split(" ").map(word => word.trim().toLowerCase());
      const response = await axios.post('http://localhost:5000/createProposal', { query: words });
      if (response.data.status === "ok") {
        setResults(response.data.results);
      } else {
        setError("No advisors found matching specializations.");
      }
    } catch (err) {
      setError('Error searching advisors');
      console.error("Error searching advisors:", err);
    }
  };

  const handleAdvisorSelect = async (advisorId) => {
    setSelectedAdvisor(advisorId);

    try {
      const response = await axios.post('http://localhost:5000/api/get-panelists', { advisorId });
      if (response.data.panelists) {
        // Filter the panelists to only include Technical Expert, Statistician, and Subject Expert
        const filteredPanelists = response.data.panelists.filter(panelist =>
          ['Technical Expert', 'Statistician', 'Subject Expert'].includes(panelist.role)
        );
        setPanelists(filteredPanelists);
      } else {
        setError("Error fetching panelists.");
      }
    } catch (err) {
      setError("Error fetching panelists.");
      console.error("Error fetching panelists:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/"; // Update the path based on your routing setup
  };

  console.log("User : ", user);
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '20px' }}>Search Advisors</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter Title"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        />
        <input
          type="text"
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          placeholder="Enter Proposal"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        />

        <button
          onClick={handleSearch}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
      </div>

      <button onClick={handleLogout} > Log out</button>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <ul style={{ listStyleType: 'none', padding: '0' }}>
      {topAdvisors.map((result) => {
        const { advisor, matchPercentage, specializations } = result;
        return (
          <li
            key={advisor._id}
            style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '10px' }}
          >
            <strong>{advisor.name}</strong> - Match: {matchPercentage}% - Specializations: {specializations.join(", ")}
            <button
              onClick={() => handleAdvisorSelect(advisor._id)}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              Select Advisor
            </button>
          </li>
        );
      })}
    </ul>


      {/* Panelists Section */}
      {panelists.length > 0 && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Panelists</h2>
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {panelists.map((panelist, index) => (
              <li key={index} style={{ padding: '10px', backgroundColor: '#f1f1f1', borderRadius: '4px', marginBottom: '10px' }}>
                <strong>{panelist.name}</strong> - Role: {panelist.role}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;

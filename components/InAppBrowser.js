import React, { useState } from 'react';

const InAppBrowser = ({ initialUrl, onExit }) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);

  const handleGo = () => {
    let finalUrl = inputValue;
    if (!/^https?:\/\//i.test(inputValue)) {
      finalUrl = 'https://' + inputValue;
    }
    setUrl(finalUrl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#111' }}>
      <div style={{ display: 'flex', padding: '10px', backgroundColor: '#222' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGo()}
          style={{ flex: 1, padding: '5px', borderRadius: '3px', border: '1px solid #444', backgroundColor: '#333', color: 'white' }}
        />
        <button onClick={handleGo} style={{ marginLeft: '10px', padding: '5px 10px', borderRadius: '3px', border: 'none', backgroundColor: '#0070f3', color: 'white', cursor: 'pointer' }}>Go</button>
        <button onClick={onExit} style={{ marginLeft: '10px', padding: '5px 10px', borderRadius: '3px', border: 'none', backgroundColor: '#f44336', color: 'white', cursor: 'pointer' }}>Exit</button>
      </div>
      <iframe src={url} style={{ flex: 1, border: 'none' }} title="In-App Browser"></iframe>
    </div>
  );
};

export default InAppBrowser;
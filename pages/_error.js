import React from 'react';
import { useRouter } from 'next/router';

function Error({ statusCode }) {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h1>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </h1>
      <p>
        We are sorry for the inconvenience.
      </p>
      <button onClick={() => router.push('/')} style={{
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        background: '#0070f3',
        color: 'white',
        cursor: 'pointer'
      }}>
        Go back home
      </button>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
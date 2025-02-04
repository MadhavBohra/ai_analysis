"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import '@/app/history/styles.css';

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Initialize router

  useEffect(() => {
    // Fetch the history data from the API
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8001/history/');
        const data = await response.json();
        setHistoryData(data);
      } catch (error) {
        console.error('Error fetching history data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='master-container'>
      <h1>History Details</h1>
      <table className="history-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Premise</th>
            <th>Hypothesis</th>
            <th>Hallucination Score</th>
            <th>Emotion Scores</th>
          </tr>
        </thead>
        <tbody>
          {historyData.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.premise_text}</td>
              <td>{item.hypothesis_text}</td>
              <td>{item.hallucination_score}</td>
              <td>
                <ul>
                  {Object.entries(item.emotion_scores)
                    .sort((a, b) => b[1] - a[1]) // Sort emotions by score (highest first)
                    .slice(0, 5) // Take the top 5
                    .map(([emotion, score]) => (
                      <li key={emotion}>
                        {emotion}: {score.toFixed(3)}
                      </li>
                    ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Back to Home Button */}
      <button className="back-button" onClick={() => router.replace('/')}>
        Back to Home
      </button>
    </div>
  );
};

export default History;

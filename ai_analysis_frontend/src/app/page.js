"use client";
import { useState, useEffect} from "react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, BarElement } from "chart.js";
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import '@/app/styles.css';
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement,BarElement);
import ReactMarkdown from "react-markdown"; // Import Markdown Renderer



export default function Home() {

  const [history, setHistory] = useState([]);
  const [currentScore, setCurrentScore] = useState(null);
  const [aiModel, setAiModel] = useState(""); // Stores the AI model name (DeepSeek/Gemini)
  const [thinkingProcess, setThinkingProcess] = useState("");
  const [apiResponse, setApiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  // Emotion categories
  const router = useRouter(); // Initialize router

  // Emotion X
  const [emotions, setEmotions] = useState([]);
  // Emotion Y
  const [emotionScores, setEmotionScores] = useState([]);
  const [topEmotion, setTopEmotion] = useState("N/A"); // Default top emotion
  const [hallucinationScore, setHallucinationScore] = useState("N/A"); // Default hallucination score
  const [analyzing, setAnalyzing] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Hallucination X
  const [testNumbers, setTestNumbers] = useState([]);
  // Hallucination Y
  const [testScores, setTestScores] = useState([]);

  const emotionColors = {
    "neutral": "#A9A9A9",    // Gray for neutral
    "approval": "#4CAF50",   // Green for approval
    "caring": "#FFEB3B",     // Yellow for caring
    "optimism": "#FF9800",   // Orange for optimism
    "curiosity": "#2196F3",  // Blue for curiosity
    "desire": "#FF4081",     // Pink for desire
    "annoyance": "#F44336",  // Red for annoyance
    "realization": "#9C27B0",// Purple for realization
    "confusion": "#607D8B",  // Blue-gray for confusion
    "disapproval": "#D32F2F",// Dark Red for disapproval
    "excitement": "#FF5722", // Deep orange for excitement
    "love": "#E91E63",       // Pink for love
    "admiration": "#3F51B5", // Indigo for admiration
    "anger": "#F44336",      // Red for anger
    "joy": "#FFEB3B",        // Yellow for joy
    "gratitude": "#8BC34A",  // Light green for gratitude
    "relief": "#03A9F4",     // Light blue for relief
    "disappointment": "#9E9E9E", // Gray for disappointment
    "amusement": "#FF9800",  // Orange for amusement
    "sadness": "#2196F3",    // Blue for sadness
    "fear": "#9E9E9E",       // Gray for fear
    "remorse": "#D32F2F",    // Dark red for remorse
    "surprise": "#FFC107",   // Amber for surprise
    "nervousness": "#FF5722", // Deep orange for nervousness
    "disgust": "#8BC34A",    // Green for disgust
    "pride": "#FFC107",      // Amber for pride
    "grief": "#9E9E9E",      // Gray for grief
    "embarrassment": "#FFEB3B" // Yellow for embarrassment
};


  // Function to add a new test result

  const chartOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: true, // Show tooltips when hovering
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (tooltipItem) {
            return `Score: ${tooltipItem.raw}`; // Custom label formatting
          },
        },
      },
    },
  };

  const fetchAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      const response = await fetch("http://localhost:8001/analyze/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          premiseText: inputText,
          hypothesisText: hypothesis,
        }),
      });
  
      const data = await response.json();
  
      // Update Hallucination Score History
      if (data.hallucination_score !== undefined) {
        setHallucinationScore(data.hallucination_score.toFixed(2));
        data.hallucination_scores.push(data.hallucination_score);
        setTestScores(data.hallucination_scores.map((entry) => entry));
        setTestNumbers(data.hallucination_scores.map((entry, index) => `Test ${index + 1}`));
        console.log(testScores);
      }
  
      // Extract emotions and their scores
      if (Array.isArray(data.emotion_scores) && data.emotion_scores.length > 0) {
        const sortedEmotions = [...data.emotion_scores[0]] // ✅ Ensure safe copying
          .sort((a, b) => b.score - a.score) // ✅ Sort by highest score
          .slice(0, 5); // Take top 5 emotions
  
        // Update all state variables in a batch to avoid unnecessary re-renders
        setEmotions(sortedEmotions.map((e) => e.label));
        setEmotionScores(sortedEmotions.map((e) => e.score));
        setTopEmotion(sortedEmotions.length > 0 ? sortedEmotions[0].label : "N/A"); 

        fetchHistory();
      }
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8001/history/");
      
      if (response.status === 404) {
        // Handle the case where the resource is not found
        console.error("History not found (404)");
        return; // Don't set history if 404
      }
  
      // Only proceed if the status is 200 OK
      const data = await response.json();
      setHistory(data); // Assuming your backend returns a list of history entries
      console.log(data);
    } catch (error) {
      console.error("Error fetching history data:", error);
    }
  };

  // Fetching history data when the page loads
  useEffect(() => {

    fetchHistory();
  }, []);
  


  const chartData = {
    labels: testNumbers,
    datasets: [
      {
        label: "Hallucination Score",
        data: testScores,
        borderColor: "#FF5733",
        backgroundColor: "rgba(255, 87, 51, 0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#FF5733",
      },
    ],
  };


  const barChartData = {
    labels: emotions, // Emotion Labels (X-axis)
    datasets: [
      {
        label: "Emotion Score",
        data: emotionScores, // Emotion Scores (Y-axis)
        backgroundColor: [emotionColors[emotions[0]], emotionColors[emotions[1]], emotionColors[emotions[2]], emotionColors[emotions[3]], emotionColors[emotions[4]]], // Different bar colors
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Hides the dataset label
      },
      // need to work on the tooltip
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.label}: ${tooltipItem.raw.toFixed(2)}`; // Tooltip format
          },
        },
      },
    },

  };


  // UI functions :

  // Function to simulate typing effect

  // wrong function left here // So, I can explain the error : 

  // The set Interval is called multiple times causing the error

  // const simulateTyping = (text, setTextFunction, callback = null) => {
  //   let index = 0;
  //   setTextFunction(""); // Reset first
  
  //   const interval = setInterval(() => {
  //     if (index < text.length) {
  //       setTextFunction((prev) => prev + text[index]); // Append correctly
  //       index++;
  //     } else {
  //       clearInterval(interval);
  //       if (callback) callback();
  //     }
  //   }, 50);
  // };



  // const simulateTyping = (text, setTextFunction, callback = null) => {
  //   setTextFunction(""); // Reset text
  
  //   let index = 0;
  
  //   const typeNext = () => {
  //     if (index < text.length) {
  //       setTextFunction((prev) => prev + text[index]); // Append next character
  //       console.log(index);
  //       index++;
  //       setTimeout(typeNext, 50); // Call itself recursively
  //     } else if (callback) {
  //       callback(); // Call callback when done
  //     }
  //   };
  
  //   typeNext(); // Start typing
  // };



  // let typingInterval = null; // Store the interval ID

  // const simulateTyping = (text, setTextFunction, callback = null) => {
  //   // Clear any existing interval to avoid overlapping
  //   if (typingInterval) {
  //     clearInterval(typingInterval);
  //     typingInterval = null;
  //   }
  
  //   setTextFunction(""); // Reset text
  //   let index = 0; // Start index
  
  //   typingInterval = setInterval(() => {
  //     if (index < text.length) {
  //       setTextFunction((prev) => prev + text[index]); // Append next character
  //       console.log(index); // Debugging index
  //       index++;
  //     } else {
  //       clearInterval(typingInterval); // Stop typing once complete
  //       typingInterval = null;
  //       if (callback) callback(); // Call callback when done
  //     }
  //   }, 30);
  // };
  


  // Backend API Calls :

  // LLM API Call :
  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setIsAnimating(false); // Reset animation
    setLoading(true);
    setApiResponse("");
    setThinkingProcess("");
    setAiModel("");

    try {
      const response = await fetch("http://localhost:8001/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText: inputText }),
      });

      const data = await response.json();

      if (data.error) {
        setApiResponse("Error fetching response.");
      } else {
        console.log(data.response);
        setAiModel(data.model); // Set AI Model (DeepSeek/Gemini)
        setHypothesis(data.response);
        // simulateTyping(data.response, setApiResponse);
        setApiResponse(data.response);
        setIsAnimating(true); // Reset animation


      }
    } catch (error) {
      console.error("Error calling API:", error);
      setApiResponse("Error: Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };


  const loadHistoryDetails = (index) => {
    console.log(index);

    if (history[index] && history[index].emotion_scores) {
      setIsAnimating(false); // Reset animation

      // Convert emotion_scores object into an array of { label, score }
      const emotionScoresArray = Object.entries(history[index].emotion_scores)
        .map(([label, score]) => ({ label, score }));
  
      // Sort the emotions by score in descending order and take the top 5
      const sortedEmotions = emotionScoresArray
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
  
      // Update state with sorted emotions
      setEmotions(sortedEmotions.map((e) => e.label));
      setEmotionScores(sortedEmotions.map((e) => e.score));
      setTopEmotion(sortedEmotions.length > 0 ? sortedEmotions[0].label : "N/A");
      setApiResponse(history[index].hypothesis_text);
      setInputText(history[index].premise_text);
      console.log("Yes Animation");

      // update hallucination graph :
      setTestNumbers(history.slice(0, index + 1).map((entry) => `Test ${entry.id}`));
      setTestScores(history.slice(0, index + 1).map((entry) => entry.hallucination_score));
      setHallucinationScore(history[index].hallucination_score);



      // setIsAnimating(true); // Reset animation
      setTimeout(() => {
        setIsAnimating(true); // Reset animation after 2 seconds
      }, 500);
    }
  };


  
  return (
    <div className="master-container">
      <div className="heading">
        <h1>Analysis AI</h1>
      </div>
      <div className="container">
        <div id="history-section">
          <h2>History</h2>
          <div className="history-container">
          {history?.map((entry, index) => {
              const emotionScores = entry.emotion_scores;

              // Find the maximum score
              const maxScore = Math.max(...Object.values(emotionScores));
            
              // Find the emotion with the maximum score
              const topEmotion = Object.keys(emotionScores).find(
                (emotion) => emotionScores[emotion] === maxScore
              );

              // Capitalize the first letter of the top emotion
              const capitalizedEmotion = topEmotion.charAt(0).toUpperCase() + topEmotion.slice(1);
            return (
              <div className="history-card" key={index} onClick={() => loadHistoryDetails(index)}>
                <h4>Test Number : {entry.id}</h4>
                <h4>Top Emotion : {capitalizedEmotion}</h4>
                <p>Hallucination Score : {entry.hallucination_score}</p>
                <p>Emotion Score: {maxScore.toFixed(2)}</p>
              </div>
            );
          })}
            {/* <h4>No Previous Test Results Found</h4> */}
          </div>
          <button className="history-button" onClick={() => router.replace('/history')}>See History Details</button>
          <div>
            
          </div>
        </div>
        <div id="prompt-section">
          <label htmlFor="textInput" className="label">Enter your prompt here:</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              id="textInput"
              placeholder="Type your prompt here..."
              className="input-box"
              rows="5"  // Controls initial height
            ></textarea>
            <button id="generate-button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </button>
            <p>Model Details : <b>DeepSeek-R1-Distill-Qwen-32B </b></p>
        </div>
      </div>
      <div id="result-container" className="container">
        <div id="chart-section">
          <h2>Analysis Results :</h2>
          <div id="results"></div>
          <h3>Hallucination Score : <span className="red-text">{hallucinationScore}</span> </h3>
          <h3>Hallucination Score Chart</h3>
          <Line data={chartData} options={chartOptions}/>
          <h3>Emotion : {topEmotion}</h3>
          <h3>Emotion Chart</h3>
          <Bar data={barChartData} options={barChartOptions} />
        </div>
        <div id="response-section">
            <label className="label">
              {aiModel ? `Response of ${aiModel}:` : "AI Response:"}
            </label>



            {/* AI Response (with typing effect) */}
            <div className="markdown-container">
            <div className={`typing-container ${isAnimating ? "animate" : ""}`}>
          <ReactMarkdown>{apiResponse}</ReactMarkdown>
          </div>
            </div>
            <button className="analyze-button" onClick={fetchAnalysis}>{analyzing? "Analyzing..." : "Analyze"}</button>
      </div>
      </div>
    </div>
  );
}

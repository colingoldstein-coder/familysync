import './UpdatePrompt.css';

export default function UpdatePrompt({ onRefresh }) {
  return (
    <div className="update-prompt">
      <div className="update-prompt-inner">
        <span className="update-prompt-icon">&#x2728;</span>
        <p>A new version of FamilySync is available.</p>
        <button onClick={onRefresh} className="btn btn-primary btn-small">Refresh</button>
      </div>
    </div>
  );
}

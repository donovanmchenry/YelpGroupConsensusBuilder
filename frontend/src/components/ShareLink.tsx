import { useState } from 'react';

interface Props {
  sessionId: string;
}

export default function ShareLink({ sessionId }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/${sessionId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Share This Link
      </h2>
      <div className="flex gap-3">
        <input
          type="text"
          value={link}
          readOnly
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={copyLink}
          className="px-6 py-3 bg-yelp-red text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-3">
        Friends can join and submit their preferences
      </p>
    </div>
  );
}

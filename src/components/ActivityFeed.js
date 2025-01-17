import React from 'react';

const ActivityFeed = ({ activities }) => {
  return (
    <div className="p-4 bg-gray-900 text-white rounded">
      <h2 className="text-xl font-bold mb-4">Activity Feed</h2>
      <ul className="space-y-4">
        {activities.map((activity, index) => (
          <li key={index} className="border-b border-gray-700 pb-2">
            <p>
              <strong>{activity.user}</strong> is watching{' '}
              <em>{activity.show}</em>.
            </p>
            <span className="text-sm text-gray-400">{activity.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityFeed;

import type { PlanResponse } from '../types/plan';

export function Itinerary({ data }: { data: PlanResponse }) {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>行程概览</h3>
        {data.source && (
          <span className={`badge ${data.source === 'deepseek' ? 'badge-ai' : ''}`}>{data.source === 'deepseek' ? 'AI · DeepSeek' : 'AI · Fallback'}</span>
        )}
      </div>
      <p>
        目的地：{data.destination}；日期：{data.startDate} - {data.endDate}；人数：{data.partySize}
      </p>
      {!!data.preferences?.length && <p>偏好：{data.preferences.join('、')}</p>}
      <h4>每日安排</h4>
      <ul>
        {data.itinerary.map((day) => (
          <li key={day.date}>
            <strong>{day.date}</strong>
            <ul>
              {day.activities.map((a, idx) => (
                <li key={idx}>{a.time} - {a.name}（{a.type}）</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <h4>预算拆分（{data.currency}）</h4>
      <ul>
        {Object.entries(data.budget).map(([k, v]) => (
          <li key={k}>{k}: {v as number}</li>
        ))}
      </ul>
    </div>
  );
}
import type { PlanResponse } from '../types/plan';

export function Itinerary({ data }: { data: PlanResponse }) {
  return (
    <div>
      <h3>行程与预算</h3>
      <p>
        目的地：{data.destination}，日期：{data.startDate} - {data.endDate}，人数：{data.partySize}
      </p>
      <p>偏好：{data.preferences.join('、') || '无'}</p>
      <ul>
        {data.itinerary.map((d) => (
          <li key={d.day}>
            <strong>第 {d.day} 天：</strong> {d.title}（{d.activities.join('，')}）
          </li>
        ))}
      </ul>
      <div>
        <strong>预算估计：</strong> {data.budget.estimate} {data.budget.currency}
        <ul>
          {Object.entries(data.budget.breakdown).map(([k, v]) => (
            <li key={k}>
              {k}：{v} {data.budget.currency}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
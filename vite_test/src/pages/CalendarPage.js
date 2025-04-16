import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";
export default function CalendarPage() {
    const [date, setDate] = useState(new Date());
    return (<div className="flex flex-col items-center space-y-6">
      <h1 className="text-3xl font-bold text-center mt-6">📆 日历</h1>
      <div className="bg-white rounded-xl shadow p-6">
        <Calendar onChange={setDate} value={date}/>
      </div>
    </div>);
}
//# sourceMappingURL=CalendarPage.js.map
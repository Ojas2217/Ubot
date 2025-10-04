import { useState } from "react";
function App() {
  const [user, setUser] = useState("John");
  const [status, setStatus] = useState(true); //true-> working, false -> break
  const [takeBreak, setTakeBreak] = useState(true); //true-> take break, false -> keep working

  const RenderButton = () => {
    if (takeBreak) {
      return (
        <button className=" bg-red-500" onClick={(e) => setStatus(false)}>
          {" "}
          Take a break{" "}
        </button>
      );
    } else {
      return (
        <button className=" bg-[#3ba26f]" onClick={(e) => setStatus(true)}>
          {" "}
          Start working
        </button>
      );
    }
  };
  return (
    <div className=" flex flex-col w-full bg-[#303030] space-x-10 items-start justify-start  border-gray-500  p-4 space-y-4">
      <div className="welcome flex flex-row w-full bg-[#303030] space-x-10 items-start h-full justify-start p-8 ">
        <div className=" userWelcome h-88 w-256 bg-black text-white flex flex-col items-start p-6 rounded-4xl shadow-2xl">
          <h1>Welcome back {user}!</h1>
        </div>
        <div className=" userProf h-88 w-144 bg-black text-white flex flex-col items-start p-6 rounded-4xl shadow-2xl">
          <h1> Your profile </h1>
        </div>
      </div>

      <div className=" flex flex-row w-full bg-[#303030] space-x-10 items-start h-screen justify-start p-8 ">
        <div className=" userWelcome h-88 w-400 bg-black text-white flex flex-col items-start p-6 space-y-4 rounded-4xl shadow-2xl">
          <h1>Current status: {status ? "Working" : "On a break"} </h1>
          <div className=" flex flex-row space-x-4">
            <h2>System recommendation: </h2>
            <RenderButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

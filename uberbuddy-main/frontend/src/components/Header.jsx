export default function Header() {
    return (

        <div className=" bg-[#303030]  p-4  ">
            <header className=" head bg-black border-2 border-gray-900 shadow-2xl rounded-4xl w-full h-24 pt-4 pb-4 pl-8 pr-8 filter backdrop-blur text-white flex items-center justify-between ">
                <a href="/dashboard" className=" text-2xl">Dashboard</a>
                <div className=" text-5xl">Uzz</div>
                <a href="/preferences" className=" text-2xl">Preferences</a>
            </header>
        </div>

    )
}
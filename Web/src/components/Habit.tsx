

interface HabitProps {
  completed: number
}

export function Habit(props: HabitProps){
  return (
    <div className="bg-zinc-900 text-white w-10 h-10 m-2 flex text-center items-center justify-center">{props.completed}</div>
  )
}
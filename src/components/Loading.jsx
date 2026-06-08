export default function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-[#5a2d82] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-[#5a2d82] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-[#5a2d82] rounded-full animate-bounce"></div>
      </div>
    </div>
  )
}

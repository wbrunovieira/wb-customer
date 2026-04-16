export default function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`}>
      <span
        className="h-1 w-1 rounded-full bg-current opacity-60"
        style={{ animation: 'wb-dot-bounce 1.2s ease-in-out infinite', animationDelay: '0ms' }}
      />
      <span
        className="h-1 w-1 rounded-full bg-current opacity-60"
        style={{ animation: 'wb-dot-bounce 1.2s ease-in-out infinite', animationDelay: '200ms' }}
      />
      <span
        className="h-1 w-1 rounded-full bg-current opacity-60"
        style={{ animation: 'wb-dot-bounce 1.2s ease-in-out infinite', animationDelay: '400ms' }}
      />
    </span>
  )
}

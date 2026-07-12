export function RouteSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <span
        aria-label="Loading"
        role="status"
        className="block h-12 w-12 rounded-full border-[3px] border-[#0b57d0]/20 border-t-[#0b57d0] animate-spin"
      />
    </div>
  );
}

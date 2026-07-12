export function RouteSpinner() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center p-8">
      <span
        aria-label="Loading"
        role="status"
        className="block h-10 w-10 rounded-full border-[3px] border-[#0b57d0]/20 border-t-[#0b57d0] animate-spin"
      />
    </div>
  );
}

// The body of every 404 page: the global one (no route matched) and the guides one (a guides
// page called notFound()).
export default function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 px-4 text-center">
      <h1 className="text-4xl font-bold tool-heading">404</h1>
      <p className="text-gray-500 dark:text-gray-400">This page could not be found.</p>
    </div>
  );
}

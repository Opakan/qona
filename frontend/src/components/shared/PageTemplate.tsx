export default function PageTemplate({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6 lg:py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

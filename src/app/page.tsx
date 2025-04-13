import TrendingRepos from './components/TrendingRepos';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#161b22] text-[#f0f6fc] p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Weekly GitHub Trending</h1>
      <TrendingRepos />
    </main>
  );
}

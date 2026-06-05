export function Header(title: string) {
  return `
    <header class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <h1 class="text-2xl font-bold">${title}</h1>
      </div>
    </header>
  `;
}

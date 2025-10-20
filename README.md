``` js
function createRashedAbdullah() {
  const info = {
    name: "Rashed Abdullah",
    identity: ["Web Developer", "Educator", "Entrepreneur"],
    origin: "Bangladesh",
    email: "rashed.abdullah.dev@gmail.com",
    website: "https://dirasah.org",
  };

  const stack = {
    frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    backend: ["Node.js", "Express", "Prisma", "PostgreSQL"],
    tools: ["Git", "Figma", "Vercel"],
    focus: ["Performance", "UX", "AI Integration", "Clean Architecture"],
  };

  const say = {
    introduce: () =>
      `👋 Hi, I'm ${info.name}, a ${info.identity.join(", ")} from ${info.origin}.`,
    craft: () =>
      `🛠️ I build digital experiences using ${stack.frontend
        .slice(0, 3)
        .join(", ")} and architect systems with ${stack.backend.join(", ")}.`,
    philosophy: () =>
      `💡 Philosophy → "Code should feel like poetry — clean, intentional, and human-centered."`,
    learn: () =>
      `📚 Currently exploring: ${stack.focus.join(", ")}.`,
    contact: () =>
      `📧 ${info.email}\n🌐 ${info.website}`,
  };

  return Object.freeze({
    ...info,
    stack,
    say,
  });
}
```

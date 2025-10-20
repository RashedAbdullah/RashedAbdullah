``` js
function createRashedAbdullah() {
  const info = {
    name: "Rashed Abdullah",
    identity: ["Web Developer", "Educator"],
    origin: "Bangladesh",
    email: "maarashed@gmail.com",
    website: "https://rashedabdullah.com",
  };

  const stack = {
    frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    backend: ["Node.js", "Express.js", "Prisma", "PostgreSQL", "MongoDB"],
    tools: ["Git", "Figma", "Vercel"],
    focus: ["Performance", "UX", "API Integration", "Clean Architecture"],
  };

 const philosophy = `
  "I believe great software is not just functional — 
  It's thoughtful, aesthetic, and built with empathy."
  `;

  return Object.freeze({
    ...info,
    stack,
    philosophy,
  });
}
```
